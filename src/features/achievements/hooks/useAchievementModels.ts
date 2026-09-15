import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ModelType, AchievementRarity } from '../types/achievement.types';
import { calculateGlow } from '../utils/glowCalculator';

export interface ModelRenderConfig {
  type: ModelType;
  rarity: AchievementRarity;
  glowColor: string;
  currentProgress?: number;
  targetProgress?: number;
  isUnlocked: boolean;
  scale?: number;
  rotationSpeed?: number;
}

// GLB Asset Paths
const GLB_ASSET_MAP: Partial<Record<ModelType, string>> = {
  shield: '/src/assets/achievements/shield.glb',
  flame: '/src/assets/achievements/flame.glb',
  crown: '/src/assets/achievements/crown.glb',
  trophy: '/src/assets/achievements/trophy.glb',
  swords: '/src/assets/achievements/swords.glb',
  star: '/src/assets/achievements/star.glb',
  infinity: '/src/assets/achievements/infinity.glb'
};

// Cache loaded GLTFs in memory so they are instantly reused across cards
const gltfCache = new Map<string, THREE.Group>();

export function useAchievementModels(config: ModelRenderConfig) {
  const {
    type,
    rarity,
    glowColor,
    currentProgress = 0,
    targetProgress = 100,
    isUnlocked,
    scale = 1.0,
    rotationSpeed = 0.01
  } = config;

  const [loadedGltfGroup, setLoadedGltfGroup] = useState<THREE.Group | null>(null);

  // Load Real GLB Model
  useEffect(() => {
    const glbUrl = GLB_ASSET_MAP[type];
    if (!glbUrl) return;

    if (gltfCache.has(glbUrl)) {
      setLoadedGltfGroup(gltfCache.get(glbUrl)!.clone(true));
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        gltfCache.set(glbUrl, gltf.scene);
        setLoadedGltfGroup(gltf.scene.clone(true));
      },
      undefined,
      (error) => {
        console.warn(`Could not load GLB asset for ${type}, using high-res fallback`, error);
      }
    );
  }, [type]);

  // Construct or Style Model with PBR Rarity Materials & Progress Glow
  const modelObject = useMemo(() => {
    const glowComputed = calculateGlow({
      baseColor: glowColor,
      rarity,
      currentProgress,
      targetProgress,
      isUnlocked,
      time: 0
    });

    const isMythic = rarity === 'mythic';
    const primaryColor = isUnlocked ? new THREE.Color(glowColor) : new THREE.Color('#94a3b8');
    const goldColor = isUnlocked ? new THREE.Color('#f59e0b') : new THREE.Color('#64748b');
    const steelColor = isUnlocked ? new THREE.Color('#e2e8f0') : new THREE.Color('#475569');
    const bronzeColor = isUnlocked ? new THREE.Color('#b45309') : new THREE.Color('#334155');
    const marbleColor = isUnlocked ? new THREE.Color('#f8fafc') : new THREE.Color('#1e293b');
    const velvetColor = isUnlocked ? new THREE.Color('#9f1239') : new THREE.Color('#334155');

    // Dynamic Rarity PBR Materials
    const polishedGoldMaterial = new THREE.MeshStandardMaterial({
      color: isMythic ? new THREE.Color('#fcd34d') : goldColor,
      metalness: isUnlocked ? 0.95 : 0.3,
      roughness: isUnlocked ? 0.18 : 0.7,
      emissive: isUnlocked
        ? isMythic
          ? new THREE.Color('#f59e0b')
          : new THREE.Color('#78350f')
        : new THREE.Color('#000000'),
      emissiveIntensity: isUnlocked ? 0.35 : 0.0
    });

    const brushedSteelMaterial = new THREE.MeshStandardMaterial({
      color: steelColor,
      metalness: isUnlocked ? 0.9 : 0.4,
      roughness: isUnlocked ? 0.25 : 0.65,
      emissive: isUnlocked ? new THREE.Color('#475569') : new THREE.Color('#000000'),
      emissiveIntensity: isUnlocked ? 0.15 : 0.0
    });

    const bronzeMetalMaterial = new THREE.MeshStandardMaterial({
      color: bronzeColor,
      metalness: isUnlocked ? 0.85 : 0.3,
      roughness: isUnlocked ? 0.3 : 0.7
    });

    const darkMarbleMaterial = new THREE.MeshStandardMaterial({
      color: marbleColor,
      metalness: 0.1,
      roughness: 0.2
    });

    const royalVelvetMaterial = new THREE.MeshStandardMaterial({
      color: velvetColor,
      roughness: 0.9,
      metalness: 0.05
    });

    const gemMaterial = (color: THREE.Color | string) =>
      new THREE.MeshPhysicalMaterial({
        color: typeof color === 'string' ? new THREE.Color(color) : color,
        transmission: isUnlocked ? 0.85 : 0.2,
        opacity: 1,
        transparent: true,
        roughness: 0.05,
        ior: 2.1,
        thickness: 1.8,
        emissive: typeof color === 'string' ? new THREE.Color(color) : color,
        emissiveIntensity: isUnlocked ? glowComputed.emissiveFactor * 0.7 : 0.05
      });

    const primaryGemMaterial = gemMaterial(primaryColor);
    const rubyMaterial = gemMaterial('#e11d48');
    const sapphireMaterial = gemMaterial('#2563eb');
    const emeraldMaterial = gemMaterial('#059669');

    // If loaded GLB is available, clone and apply dynamic PBR shaders
    if (loadedGltfGroup) {
      const glbClone = loadedGltfGroup.clone(true);
      glbClone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const matName = (mesh.material as THREE.Material)?.name || '';

          if (matName.includes('Gold') || matName.includes('Border') || matName.includes('Rim')) {
            mesh.material = polishedGoldMaterial;
          } else if (matName.includes('Steel') || matName.includes('Plate')) {
            mesh.material = brushedSteelMaterial;
          } else if (matName.includes('Bronze') || matName.includes('Handle')) {
            mesh.material = bronzeMetalMaterial;
          } else if (matName.includes('Marble')) {
            mesh.material = darkMarbleMaterial;
          } else if (matName.includes('Velvet')) {
            mesh.material = royalVelvetMaterial;
          } else if (matName.includes('Ruby')) {
            mesh.material = rubyMaterial;
          } else if (matName.includes('Sapphire')) {
            mesh.material = sapphireMaterial;
          } else if (matName.includes('Emerald')) {
            mesh.material = emeraldMaterial;
          } else {
            mesh.material = primaryGemMaterial;
          }
        }
      });

      glbClone.scale.set(scale, scale, scale);
      return glbClone;
    }

    // High-Resolution Procedural Fallback Group
    const group = new THREE.Group();

    switch (type) {
      case 'flame': {
        const brazierBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.3, 0.6, 32), polishedGoldMaterial);
        brazierBowl.position.y = -0.4;
        group.add(brazierBowl);

        const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 16, 48), polishedGoldMaterial);
        rimTorus.rotateX(Math.PI / 2);
        rimTorus.position.y = -0.1;
        group.add(rimTorus);

        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.9, 24), polishedGoldMaterial);
        handle.position.y = -0.95;
        group.add(handle);

        const flameOuterGeo = new THREE.ConeGeometry(0.7, 1.8, 32, 16, true);
        const pos = flameOuterGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i);
          pos.setX(i, pos.getX(i) + Math.sin(y * 4) * 0.16);
          pos.setZ(i, pos.getZ(i) + Math.cos(y * 3.5) * 0.12);
        }
        flameOuterGeo.computeVertexNormals();
        const flameOuter = new THREE.Mesh(flameOuterGeo, gemMaterial('#ea580c'));
        flameOuter.position.y = 0.45;
        group.add(flameOuter);

        const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 24), gemMaterial('#fbbf24'));
        flameCore.position.y = 0.25;
        group.add(flameCore);
        break;
      }

      case 'shield': {
        const shieldShape = new THREE.Shape();
        shieldShape.moveTo(0, 1.3);
        shieldShape.bezierCurveTo(0.85, 1.3, 1.05, 0.7, 0.95, 0.0);
        shieldShape.bezierCurveTo(0.85, -0.8, 0.35, -1.25, 0, -1.55);
        shieldShape.bezierCurveTo(-0.35, -1.25, -0.85, -0.8, -0.95, 0.0);
        shieldShape.bezierCurveTo(-1.05, 0.7, -0.85, 1.3, 0, 1.3);

        const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
          depth: 0.22,
          bevelEnabled: true,
          bevelSegments: 5,
          bevelSize: 0.08,
          bevelThickness: 0.08
        });
        shieldGeo.center();
        const shieldPlate = new THREE.Mesh(shieldGeo, brushedSteelMaterial);
        group.add(shieldPlate);

        const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 1), polishedGoldMaterial);
        crest.scale.set(1.1, 1.1, 0.5);
        crest.position.z = 0.22;
        group.add(crest);

        const rubyInsignia = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), rubyMaterial);
        rubyInsignia.position.z = 0.36;
        group.add(rubyInsignia);
        break;
      }

      case 'crown': {
        const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.85, 0.35, 36, 1, true), polishedGoldMaterial);
        baseRing.position.y = -0.45;
        group.add(baseRing);

        const velvetDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
          royalVelvetMaterial
        );
        velvetDome.position.y = -0.38;
        group.add(velvetDome);

        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.85, 6), polishedGoldMaterial);
          spike.position.set(Math.cos(angle) * 0.88, 0.1, Math.sin(angle) * 0.88);
          spike.rotation.y = angle;
          group.add(spike);

          const jewelMat = i % 2 === 0 ? rubyMaterial : sapphireMaterial;
          const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), jewelMat);
          jewel.position.set(Math.cos(angle) * 0.88, 0.65, Math.sin(angle) * 0.88);
          group.add(jewel);
        }

        const topOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), sapphireMaterial);
        topOrb.position.y = 0.55;
        group.add(topOrb);
        break;
      }

      case 'trophy': {
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.32, 1.1, 32), polishedGoldMaterial);
        cup.position.y = 0.38;
        group.add(cup);

        const marbleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.45, 8), darkMarbleMaterial);
        marbleBase.position.y = -0.72;
        group.add(marbleBase);

        const leftHandle = new THREE.Mesh(
          new THREE.TorusGeometry(0.42, 0.07, 16, 32, Math.PI * 1.1),
          polishedGoldMaterial
        );
        leftHandle.rotateZ(Math.PI / 2);
        leftHandle.position.set(-0.72, 0.45, 0);
        group.add(leftHandle);

        const rightHandle = new THREE.Mesh(
          new THREE.TorusGeometry(0.42, 0.07, 16, 32, Math.PI * 1.1),
          polishedGoldMaterial
        );
        rightHandle.rotateZ(-Math.PI / 2);
        rightHandle.position.set(0.72, 0.45, 0);
        group.add(rightHandle);

        const starTopper = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), primaryGemMaterial);
        starTopper.position.set(0, 1.15, 0);
        group.add(starTopper);
        break;
      }

      case 'swords': {
        const createBlade = (rotZ: number) => {
          const bladeGroup = new THREE.Group();
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.05), brushedSteelMaterial);
          blade.position.y = 0.3;
          bladeGroup.add(blade);

          const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, 0.06), polishedGoldMaterial);
          fuller.position.y = 0.3;
          bladeGroup.add(fuller);

          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.12), polishedGoldMaterial);
          guard.position.y = -0.75;
          bladeGroup.add(guard);

          const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), rubyMaterial);
          pommel.position.y = -1.22;
          bladeGroup.add(pommel);

          bladeGroup.rotation.z = rotZ;
          return bladeGroup;
        };

        group.add(createBlade(Math.PI / 4.2));
        group.add(createBlade(-Math.PI / 4.2));

        const bossMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 16), polishedGoldMaterial);
        bossMesh.rotateX(Math.PI / 2);
        bossMesh.position.z = 0.16;
        group.add(bossMesh);
        break;
      }

      case 'infinity':
      default: {
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.065, 16, 48), polishedGoldMaterial);
        group.add(ring1);

        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 16, 48), brushedSteelMaterial);
        ring2.rotateX(Math.PI / 2.5);
        group.add(ring2);

        const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.045, 16, 48), polishedGoldMaterial);
        ring3.rotateY(Math.PI / 2.5);
        group.add(ring3);

        const cosmicCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), sapphireMaterial);
        group.add(cosmicCore);
        break;
      }
    }

    group.scale.set(scale, scale, scale);
    return group;
  }, [type, rarity, glowColor, currentProgress, targetProgress, isUnlocked, scale, loadedGltfGroup]);

  return {
    modelObject,
    rotationSpeed
  };
}
