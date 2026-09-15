import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Polyfill FileReader for Node.js environment
if (typeof globalThis.FileReader === 'undefined') {
  class FileReaderPolyfill {
    constructor() {
      this.result = null;
      this.onload = null;
      this.onloadend = null;
      this.onerror = null;
    }

    async readAsArrayBuffer(blob) {
      try {
        const buffer = await blob.arrayBuffer();
        this.result = buffer;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      } catch (err) {
        if (this.onerror) this.onerror(err);
      }
    }
  }
  globalThis.FileReader = FileReaderPolyfill;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../src/assets/achievements');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Materials
const goldMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  metalness: 0.95,
  roughness: 0.18,
  name: 'GoldMaterial'
});

const steelMat = new THREE.MeshStandardMaterial({
  color: 0xdde3ea,
  metalness: 0.9,
  roughness: 0.22,
  name: 'SteelMaterial'
});

const bronzeMat = new THREE.MeshStandardMaterial({
  color: 0xb45309,
  metalness: 0.85,
  roughness: 0.35,
  name: 'BronzeMaterial'
});

const marbleMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  metalness: 0.1,
  roughness: 0.25,
  name: 'MarbleMaterial'
});

const velvetMat = new THREE.MeshStandardMaterial({
  color: 0x881337,
  roughness: 0.9,
  metalness: 0.05,
  name: 'VelvetMaterial'
});

const rubyMat = new THREE.MeshPhysicalMaterial({
  color: 0xe11d48,
  transmission: 0.8,
  opacity: 1,
  transparent: true,
  roughness: 0.05,
  ior: 2.1,
  thickness: 1.8,
  name: 'RubyGemMaterial'
});

const sapphireMat = new THREE.MeshPhysicalMaterial({
  color: 0x2563eb,
  transmission: 0.8,
  opacity: 1,
  transparent: true,
  roughness: 0.05,
  ior: 2.1,
  thickness: 1.8,
  name: 'SapphireGemMaterial'
});

const emeraldMat = new THREE.MeshPhysicalMaterial({
  color: 0x059669,
  transmission: 0.8,
  opacity: 1,
  transparent: true,
  roughness: 0.05,
  ior: 2.1,
  thickness: 1.8,
  name: 'EmeraldGemMaterial'
});

// Helper exporter
function exportToGLB(object, filename) {
  const exporter = new GLTFExporter();
  exporter.parse(
    object,
    (gltf) => {
      const buffer = Buffer.from(gltf);
      const filePath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filePath, buffer);
      console.log(`Successfully generated: ${filename} (${buffer.length} bytes)`);
    },
    (error) => {
      console.error(`Error exporting ${filename}:`, error);
    },
    { binary: true }
  );
}

// 1. PALADIN AEGIS SHIELD (shield.glb)
function createShieldModel() {
  const group = new THREE.Group();
  group.name = 'ShieldModel';

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
  const shieldPlate = new THREE.Mesh(shieldGeo, steelMat);
  shieldPlate.name = 'ShieldPlate';
  group.add(shieldPlate);

  const borderShape = new THREE.Shape();
  borderShape.moveTo(0, 1.35);
  borderShape.bezierCurveTo(0.9, 1.35, 1.1, 0.75, 1.0, 0.0);
  borderShape.bezierCurveTo(0.9, -0.85, 0.4, -1.3, 0, -1.6);
  borderShape.bezierCurveTo(-0.4, -1.3, -0.9, -0.85, -1.0, 0.0);
  borderShape.bezierCurveTo(-1.1, 0.75, -0.9, 1.35, 0, 1.35);

  const borderGeo = new THREE.ExtrudeGeometry(borderShape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.04,
    bevelThickness: 0.04
  });
  borderGeo.center();
  const borderMesh = new THREE.Mesh(borderGeo, goldMat);
  borderMesh.position.z = 0.12;
  borderMesh.name = 'GoldBorder';
  group.add(borderMesh);

  const crestGeo = new THREE.OctahedronGeometry(0.48, 1);
  crestGeo.scale(1.1, 1.1, 0.5);
  const crest = new THREE.Mesh(crestGeo, goldMat);
  crest.position.z = 0.22;
  crest.name = 'LionCrest';
  group.add(crest);

  const rubyInsignia = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), rubyMat);
  rubyInsignia.position.z = 0.36;
  rubyInsignia.name = 'RubyInsignia';
  group.add(rubyInsignia);

  const rivetGeo = new THREE.SphereGeometry(0.045, 8, 8);
  const rivetCoords = [
    [-0.7, 0.9, 0.16],
    [0.7, 0.9, 0.16],
    [-0.75, 0.2, 0.16],
    [0.75, 0.2, 0.16],
    [-0.45, -0.7, 0.16],
    [0.45, -0.7, 0.16],
    [0, -1.3, 0.16]
  ];
  rivetCoords.forEach(([x, y, z], idx) => {
    const rivet = new THREE.Mesh(rivetGeo, goldMat);
    rivet.position.set(x, y, z);
    rivet.name = `Rivet_${idx}`;
    group.add(rivet);
  });

  return group;
}

// 2. CEREMONIAL FLAME TORCH (flame.glb)
function createFlameModel() {
  const group = new THREE.Group();
  group.name = 'FlameModel';

  const brazierGeo = new THREE.CylinderGeometry(0.75, 0.3, 0.6, 32);
  const brazier = new THREE.Mesh(brazierGeo, goldMat);
  brazier.position.y = -0.4;
  brazier.name = 'BrazierBowl';
  group.add(brazier);

  const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 16, 48), goldMat);
  rimTorus.rotateX(Math.PI / 2);
  rimTorus.position.y = -0.1;
  rimTorus.name = 'BrazierRim';
  group.add(rimTorus);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.9, 24), goldMat);
  handle.position.y = -0.95;
  handle.name = 'TorchHandle';
  group.add(handle);

  const gripRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 12, 24), steelMat);
  gripRing.rotateX(Math.PI / 2);
  gripRing.position.y = -0.85;
  group.add(gripRing);

  const flameOuterGeo = new THREE.ConeGeometry(0.7, 1.8, 32, 16, true);
  const pos = flameOuterGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setX(i, x + Math.sin(y * 4) * 0.16);
    pos.setZ(i, z + Math.cos(y * 3.5) * 0.12);
  }
  flameOuterGeo.computeVertexNormals();
  const flameOuter = new THREE.Mesh(flameOuterGeo, rubyMat);
  flameOuter.position.y = 0.45;
  flameOuter.name = 'FlameOuter';
  group.add(flameOuter);

  const flameCore = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.2, 24), goldMat);
  flameCore.position.y = 0.25;
  flameCore.name = 'FlameCore';
  group.add(flameCore);

  return group;
}

// 3. IMPERIAL CORONATION CROWN (crown.glb)
function createCrownModel() {
  const group = new THREE.Group();
  group.name = 'CrownModel';

  const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.85, 0.35, 36, 1, true), goldMat);
  baseRing.position.y = -0.45;
  group.add(baseRing);

  const velvetDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
    velvetMat
  );
  velvetDome.position.y = -0.38;
  group.add(velvetDome);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.85, 6), goldMat);
    spike.position.set(Math.cos(angle) * 0.88, 0.1, Math.sin(angle) * 0.88);
    spike.rotation.y = angle;
    group.add(spike);

    const jewelMat = i % 2 === 0 ? rubyMat : sapphireMat;
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), jewelMat);
    jewel.position.set(Math.cos(angle) * 0.88, 0.65, Math.sin(angle) * 0.88);
    group.add(jewel);

    const lowerJewel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), emeraldMat);
    lowerJewel.position.set(Math.cos(angle) * 0.92, -0.45, Math.sin(angle) * 0.92);
    group.add(lowerJewel);
  }

  const topOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), sapphireMat);
  topOrb.position.y = 0.55;
  group.add(topOrb);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), goldMat);
  crossV.position.y = 0.82;
  group.add(crossV);

  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.08), goldMat);
  crossH.position.y = 0.86;
  group.add(crossH);

  return group;
}

// 4. CHAMPIONSHIP VICTORY TROPHY (trophy.glb)
function createTrophyModel() {
  const group = new THREE.Group();
  group.name = 'TrophyModel';

  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.32, 1.1, 32), goldMat);
  cup.position.y = 0.38;
  group.add(cup);

  const cupLip = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.06, 16, 48), goldMat);
  cupLip.rotateX(Math.PI / 2);
  cupLip.position.y = 0.92;
  group.add(cupLip);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16), goldMat);
  stem.position.y = -0.3;
  group.add(stem);

  const knop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), sapphireMat);
  knop.position.y = -0.28;
  group.add(knop);

  const marbleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.45, 8), marbleMat);
  marbleBase.position.y = -0.72;
  group.add(marbleBase);

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.05), goldMat);
  plaque.position.set(0, -0.7, 0.42);
  group.add(plaque);

  const leftHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.07, 16, 32, Math.PI * 1.1),
    goldMat
  );
  leftHandle.rotateZ(Math.PI / 2);
  leftHandle.position.set(-0.72, 0.45, 0);
  group.add(leftHandle);

  const rightHandle = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.07, 16, 32, Math.PI * 1.1),
    goldMat
  );
  rightHandle.rotateZ(-Math.PI / 2);
  rightHandle.position.set(0.72, 0.45, 0);
  group.add(rightHandle);

  const starTopper = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), goldMat);
  starTopper.position.set(0, 1.15, 0);
  group.add(starTopper);

  return group;
}

// 5. CROSSED KNIGHT SWORDS (swords.glb)
function createSwordsModel() {
  const group = new THREE.Group();
  group.name = 'SwordsModel';

  const createBlade = (rotZ) => {
    const bladeGroup = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.05), steelMat);
    blade.position.y = 0.3;
    bladeGroup.add(blade);

    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, 0.06), goldMat);
    fuller.position.y = 0.3;
    bladeGroup.add(fuller);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.12), goldMat);
    guard.position.y = -0.75;
    bladeGroup.add(guard);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 12), bronzeMat);
    grip.position.y = -0.98;
    bladeGroup.add(grip);

    const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 1), rubyMat);
    pommel.position.y = -1.22;
    bladeGroup.add(pommel);

    bladeGroup.rotation.z = rotZ;
    return bladeGroup;
  };

  group.add(createBlade(Math.PI / 4.2));
  group.add(createBlade(-Math.PI / 4.2));

  const bossMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.16, 16), goldMat);
  bossMesh.rotateX(Math.PI / 2);
  bossMesh.position.z = 0.16;
  group.add(bossMesh);

  const bossGem = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), sapphireMat);
  bossGem.position.z = 0.28;
  group.add(bossGem);

  return group;
}

// 6. 5-POINTED BEVELED GOLDEN STAR MEDAL (star.glb)
function createStarModel() {
  const group = new THREE.Group();
  group.name = 'StarModel';

  const starGeo = new THREE.OctahedronGeometry(0.95, 0);
  starGeo.scale(1.2, 1.2, 0.45);
  const starMesh = new THREE.Mesh(starGeo, goldMat);
  group.add(starMesh);

  const subStarGeo = new THREE.OctahedronGeometry(0.7, 0);
  subStarGeo.rotateZ(Math.PI / 4);
  subStarGeo.scale(1.1, 1.1, 0.5);
  const subStar = new THREE.Mesh(subStarGeo, steelMat);
  group.add(subStar);

  const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), rubyMat);
  coreMesh.position.z = 0.15;
  group.add(coreMesh);

  const medalRim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 16, 48), goldMat);
  medalRim.position.z = 0;
  group.add(medalRim);

  return group;
}

// 7. CELESTIAL ARMILLARY SPHERE (infinity.glb)
function createInfinityModel() {
  const group = new THREE.Group();
  group.name = 'InfinityModel';

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.065, 16, 48), goldMat);
  group.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.055, 16, 48), steelMat);
  ring2.rotateX(Math.PI / 2.5);
  group.add(ring2);

  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.045, 16, 48), goldMat);
  ring3.rotateY(Math.PI / 2.5);
  group.add(ring3);

  const cosmicCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), sapphireMat);
  group.add(cosmicCore);

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 16), goldMat);
  stand.position.y = -1.0;
  group.add(stand);

  const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.2, 16), marbleMat);
  basePlate.position.y = -1.2;
  group.add(basePlate);

  return group;
}

// Execute Exports
console.log('Generating realistic 3D GLB assets in:', OUTPUT_DIR);
exportToGLB(createShieldModel(), 'shield.glb');
exportToGLB(createFlameModel(), 'flame.glb');
exportToGLB(createCrownModel(), 'crown.glb');
exportToGLB(createTrophyModel(), 'trophy.glb');
exportToGLB(createSwordsModel(), 'swords.glb');
exportToGLB(createStarModel(), 'star.glb');
exportToGLB(createInfinityModel(), 'infinity.glb');
