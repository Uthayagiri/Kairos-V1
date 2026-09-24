import React, { useMemo, useState, useEffect } from 'react';
import { animated, useSpring } from '@react-spring/three';
import * as THREE from 'three';
import { Rarity } from './rarityConfig';

export interface PhoenixWingsProps {
  unlocked: boolean;
  progress?: number;
  glowIntensity?: number;
  rarity?: Rarity;
  forceTrigger?: number;
  triggerKey?: string | number;
}

/**
 * 7 Distinct Feather Tiers matching the reference artwork:
 * From bottom cyan/blue feathers up through magenta/orange to soaring apex gold.
 */
export const PHOENIX_FEATHER_TIERS = [
  {
    index: 0,
    name: 'Bottom Cyan Covert',
    color: '#00e5ff',
    emissive: '#00b4d8',
    delayMs: 0, // Opens first at bottom
    shape: () => {
      const s = new THREE.Shape();
      // Root at shield flank
      s.moveTo(0.16, -0.22);
      s.bezierCurveTo(0.24, -0.26, 0.34, -0.24, 0.42, -0.16);
      s.bezierCurveTo(0.36, -0.10, 0.26, -0.12, 0.18, -0.16);
      s.closePath();
      return s;
    },
  },
  {
    index: 1,
    name: 'Lower Azure Pinion',
    color: '#2979ff',
    emissive: '#3a86ff',
    delayMs: 140, // Opens second
    shape: () => {
      const s = new THREE.Shape();
      s.moveTo(0.18, -0.14);
      s.bezierCurveTo(0.28, -0.16, 0.44, -0.10, 0.54, -0.02);
      s.bezierCurveTo(0.44, 0.04, 0.30, -0.02, 0.20, -0.06);
      s.closePath();
      return s;
    },
  },
  {
    index: 2,
    name: 'Lower-Middle Purple Pinion',
    color: '#7c4dff',
    emissive: '#8338ec',
    delayMs: 280, // Opens third
    shape: () => {
      const s = new THREE.Shape();
      s.moveTo(0.20, -0.04);
      s.bezierCurveTo(0.32, -0.04, 0.50, 0.04, 0.62, 0.14);
      s.bezierCurveTo(0.50, 0.18, 0.34, 0.10, 0.22, 0.04);
      s.closePath();
      return s;
    },
  },
  {
    index: 3,
    name: 'Middle Magenta Pinion',
    color: '#ff007f',
    emissive: '#ff006e',
    delayMs: 420, // Opens fourth
    shape: () => {
      const s = new THREE.Shape();
      s.moveTo(0.22, 0.06);
      s.bezierCurveTo(0.36, 0.08, 0.54, 0.20, 0.66, 0.32);
      s.bezierCurveTo(0.52, 0.34, 0.36, 0.24, 0.24, 0.14);
      s.closePath();
      return s;
    },
  },
  {
    index: 4,
    name: 'Upper-Middle Sunset Orange Pinion',
    color: '#ff6d00',
    emissive: '#fb5607',
    delayMs: 560, // Opens fifth
    shape: () => {
      const s = new THREE.Shape();
      s.moveTo(0.24, 0.16);
      s.bezierCurveTo(0.38, 0.22, 0.54, 0.38, 0.64, 0.50);
      s.bezierCurveTo(0.50, 0.48, 0.36, 0.36, 0.25, 0.24);
      s.closePath();
      return s;
    },
  },
  {
    index: 5,
    name: 'Upper Radiant Gold Pinion',
    color: '#ffd600',
    emissive: '#ffbe0b',
    delayMs: 700, // Opens sixth
    shape: () => {
      const s = new THREE.Shape();
      s.moveTo(0.25, 0.26);
      s.bezierCurveTo(0.38, 0.38, 0.52, 0.56, 0.60, 0.68);
      s.bezierCurveTo(0.46, 0.60, 0.34, 0.46, 0.26, 0.32);
      s.closePath();
      return s;
    },
  },
  {
    index: 6,
    name: 'Apex Sunfire Crown Scythe',
    color: '#fff59d',
    emissive: '#fff066',
    delayMs: 840, // Opens seventh (Apex wingtip soaring high!)
    shape: () => {
      const s = new THREE.Shape();
      s.moveTo(0.26, 0.34);
      s.bezierCurveTo(0.34, 0.52, 0.46, 0.68, 0.54, 0.78);
      s.bezierCurveTo(0.46, 0.72, 0.36, 0.56, 0.28, 0.40);
      s.closePath();
      return s;
    },
  },
];

interface IndividualFeatherProps {
  mesh: THREE.Mesh;
  delayMs: number;
  unlocked: boolean;
  triggerKey: string | number;
}

const IndividualFeather: React.FC<IndividualFeatherProps> = ({
  mesh,
  delayMs,
  unlocked,
  triggerKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!unlocked) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [unlocked, triggerKey, delayMs]);

  // Spring animation for smooth unfolding from base pivot with natural overshoot
  const { springScale, springRotationZ, springRotationY, springPosX } = useSpring({
    springScale: isOpen ? 1.0 : 0.0,
    springRotationZ: isOpen ? 0.0 : -0.75,
    springRotationY: isOpen ? 0.0 : 0.35,
    springPosX: isOpen ? 0.0 : -0.10,
    config: isOpen
      ? { tension: 160, friction: 14, mass: 1.05 }
      : { tension: 220, friction: 22, mass: 0.9 },
  });

  return (
    <animated.group
      position-x={springPosX}
      position-z={0}
      scale={springScale}
      rotation-z={springRotationZ}
      rotation-y={springRotationY}
    >
      {/* Front Face Sculpted Feather (+Z) */}
      <primitive object={mesh.clone()} position={[0, 0, 0.005]} />
      {/* Back Face Mirrored Feather (-Z) — 100% Symmetrical 360° Visibility */}
      <primitive
        object={mesh.clone()}
        position={[0, 0, -0.005]}
        rotation={[0, Math.PI, 0]}
        scale={[-1, 1, 1]}
      />
    </animated.group>
  );
};

export const PhoenixWings: React.FC<PhoenixWingsProps> = ({
  unlocked,
  glowIntensity = 1.0,
  triggerKey = 'phoenix-wings',
}) => {
  // Pre-generate the 7 extruded 3D feather meshes with high-end PBR materials
  const featherMeshes = useMemo(() => {
    return PHOENIX_FEATHER_TIERS.map((tier) => {
      const shape = tier.shape();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.020 + tier.index * 0.0015,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.006,
        bevelThickness: 0.005,
      });

      const mat = new THREE.MeshPhysicalMaterial({
        color: unlocked ? new THREE.Color(tier.color) : new THREE.Color('#334155'),
        metalness: unlocked ? 0.85 : 0.2,
        roughness: unlocked ? 0.12 : 0.7,
        clearcoat: unlocked ? 0.95 : 0,
        clearcoatRoughness: 0.04,
        iridescence: unlocked ? 0.35 : 0,
        iridescenceIOR: 1.6,
        emissive: unlocked ? new THREE.Color(tier.emissive) : new THREE.Color('#000000'),
        emissiveIntensity: unlocked ? Math.max(glowIntensity * 1.2, 0.7) : 0,
        side: THREE.DoubleSide,
      });

      return new THREE.Mesh(geo, mat);
    });
  }, [unlocked, glowIntensity]);

  return (
    <group position={[0, 0, -0.012]}>
      {/* ========================================================================= */}
      {/* RIGHT WING (7 Sequentially Unfolding Feathers from Bottom to Top)          */}
      {/* ========================================================================= */}
      <group>
        {PHOENIX_FEATHER_TIERS.map((tier) => (
          <IndividualFeather
            key={`r-feather-${tier.index}-${triggerKey}`}
            mesh={featherMeshes[tier.index]}
            delayMs={tier.delayMs}
            unlocked={unlocked}
            triggerKey={triggerKey}
          />
        ))}
      </group>

      {/* ========================================================================= */}
      {/* LEFT WING (Mirrored 7 Sequentially Unfolding Feathers)                     */}
      {/* ========================================================================= */}
      <group scale={[-1, 1, 1]}>
        {PHOENIX_FEATHER_TIERS.map((tier) => (
          <IndividualFeather
            key={`l-feather-${tier.index}-${triggerKey}`}
            mesh={featherMeshes[tier.index]}
            delayMs={tier.delayMs}
            unlocked={unlocked}
            triggerKey={triggerKey}
          />
        ))}
      </group>
    </group>
  );
};
