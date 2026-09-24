import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { ModelType } from '../types/achievement.types';
import { RARITY_CONFIG, Rarity, SlotMaterialConfig } from './rarityConfig';
import { CenterEmblem } from './CenterEmblem';
import { PhoenixWings } from './PhoenixWings';
import { AuraShell } from './AuraShell';
import { AchievementParticles } from './AchievementParticles';
import { NovaShockwave } from './NovaShockwave';
import { useUnlockAnimation } from './useUnlockAnimation';

export interface DefenseShieldModelProps {
  name: string;
  rarity: Rarity;
  modelType?: ModelType;
  category?: string;
  id?: string;
  progress: number;
  unlocked: boolean;
  autoRotate?: boolean;
  forceTrigger?: number;
}

function createPBRMaterial(slot: SlotMaterialConfig, locked: boolean, glowIntensity: number) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: slot.color,
    metalness: slot.metalness,
    roughness: slot.roughness,
    clearcoat: slot.clearcoat ?? 0.7,
    clearcoatRoughness: slot.clearcoatRoughness ?? 0.05,
    transmission: slot.transmission ?? 0,
    thickness: slot.thickness ?? 0,
    ior: slot.ior ?? 1.5,
    iridescence: slot.iridescence ?? 0.25,
    iridescenceIOR: slot.iridescenceIOR ?? 1.5,
    emissive: slot.emissive ? new THREE.Color(slot.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: slot.emissive ? Math.max(glowIntensity, 0.5) : 0,
    side: THREE.DoubleSide,
  });

  if (locked) {
    const hsl = { h: 0, s: 0, l: 0 };
    mat.color.getHSL(hsl);
    mat.color.setHSL(hsl.h, hsl.s * 0.2, Math.max(hsl.l * 0.45, 0.14));
    mat.metalness = Math.min(mat.metalness, 0.35);
    mat.roughness = Math.min(mat.roughness + 0.35, 1);
    mat.emissiveIntensity = 0;
    mat.clearcoat = 0;
  }

  return mat;
}

/**
 * Heraldic Phoenix Guardian Shield Chassis (matching reference artwork).
 * Features sharp top peak, angled shoulders, sweeping waist curves tapering to a pointed bottom V-apex.
 */
function createShieldShape(scale = 1.0) {
  const shape = new THREE.Shape();
  const topPeakY = 0.48 * scale;
  const shoulderY = 0.34 * scale;
  const shoulderX = 0.34 * scale;
  const waistY = 0.04 * scale;
  const waistX = 0.36 * scale;
  const lowerY = -0.24 * scale;
  const lowerX = 0.24 * scale;
  const bottomApexY = -0.48 * scale;

  shape.moveTo(0, topPeakY);
  shape.lineTo(shoulderX, shoulderY);
  shape.bezierCurveTo(waistX, waistY, lowerX, lowerY, 0, bottomApexY);
  shape.bezierCurveTo(-lowerX, lowerY, -waistX, waistY, -shoulderX, shoulderY);
  shape.lineTo(0, topPeakY);
  shape.closePath();

  return shape;
}

export const DefenseShieldModel: React.FC<DefenseShieldModelProps> = ({
  name,
  rarity,
  modelType = 'phoenix',
  category = 'comeback',
  id,
  progress,
  unlocked,
  autoRotate = true,
  forceTrigger = 0,
}) => {
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const groupRef = useRef<THREE.Group>(null);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const scaleShield = 0.88;

  const glowIntensity = useMemo(() => {
    const [min, max] = config.glowRange;
    return unlocked ? min + (max - min) * clampedProgress : 0;
  }, [config.glowRange, clampedProgress, unlocked]);

  // Primary Golden Shield Chassis Material
  const primaryMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Primary, !unlocked, glowIntensity),
    [config, unlocked, glowIntensity]
  );

  // Beveled Accent Trim & Inner Rim Material
  const accentMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Accent, !unlocked, glowIntensity),
    [config, unlocked, glowIntensity]
  );

  // Gem material for core jewel accents & glowing highlights
  const gemMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: config.auraColor,
      roughness: 0.08,
      metalness: 0.95,
      emissive: unlocked ? new THREE.Color(config.auraColor) : new THREE.Color('#000000'),
      emissiveIntensity: unlocked ? Math.max(glowIntensity * 1.5, 0.7) : 0,
      side: THREE.DoubleSide,
    });
  }, [config, unlocked, glowIntensity]);

  // Extruded 3D Peaked Defense Shield Chassis Geometry (Double-Sided with Beveled Rim)
  const shieldMeshGroup = useMemo(() => {
    const g = new THREE.Group();

    // 1. Core Solid Defense Shield Chassis
    const shieldShape = createShieldShape(scaleShield);
    const extrudeSettings = {
      depth: 0.034,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.016,
      bevelThickness: 0.012,
    };

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
    shieldGeo.center();

    const mainShield = new THREE.Mesh(shieldGeo, primaryMat);
    g.add(mainShield);

    // 2. Front & Back Beveled Inner Rim Inlays (Deep Obsidian Navy Inner Plate)
    const innerShape = createShieldShape(scaleShield * 0.86);
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
      depth: 0.040,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.008,
      bevelThickness: 0.006,
    });
    innerGeo.center();

    const innerShield = new THREE.Mesh(innerGeo, accentMat);
    g.add(innerShield);

    // 3. Four Cardinal Gemstone Rivets & Apex Jewels
    const rivetOffsets = [
      { x: 0, y: 0.42 * scaleShield }, // Top crown jewel
      { x: 0, y: -0.45 * scaleShield }, // Bottom apex jewel
      { x: -0.28 * scaleShield, y: 0.28 * scaleShield }, // Left shoulder rivet
      { x: 0.28 * scaleShield, y: 0.28 * scaleShield }, // Right shoulder rivet
    ];

    rivetOffsets.forEach((pos) => {
      // Front rivet (+Z)
      const rFront = new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), gemMat);
      rFront.position.set(pos.x, pos.y, 0.027);
      g.add(rFront);

      // Back rivet (-Z)
      const rBack = new THREE.Mesh(new THREE.OctahedronGeometry(0.024, 0), gemMat);
      rBack.position.set(pos.x, pos.y, -0.027);
      g.add(rBack);
    });

    return g;
  }, [primaryMat, accentMat, gemMat]);

  const { scale, rotationBoost, flash, elevationZ, tiltWobble, burst } = useUnlockAnimation(unlocked, forceTrigger);
  const baseRotation = useRef(0);

  useFrame((_, delta) => {
    if (autoRotate) baseRotation.current += delta * 0.4;
    if (groupRef.current) {
      groupRef.current.rotation.y = baseRotation.current + rotationBoost.get();
      groupRef.current.rotation.x = Math.sin(baseRotation.current * 1.5) * 0.04 + tiltWobble.get();
      groupRef.current.position.z = elevationZ.get();
    }
  });

  const triggerKey = `${name}-${id}-${forceTrigger}`;

  return (
    <animated.group ref={groupRef} scale={scale}>
      {/* 3D Peaked Defense Shield Main Chassis */}
      <primitive object={shieldMeshGroup} />

      {/* --------------------------------------------------------------------------------- */}
      {/* PHOENIX WINGS (7 Sequentially Unfolding Feathers from Bottom to Top)               */}
      {/* --------------------------------------------------------------------------------- */}
      <PhoenixWings
        unlocked={unlocked}
        progress={clampedProgress}
        glowIntensity={glowIntensity}
        rarity={rarity}
        forceTrigger={forceTrigger}
        triggerKey={triggerKey}
      />

      {/* Center Horizontal Engraved Plaque & Phoenix Emblem (Identical Front and Back) */}
      <CenterEmblem
        type={modelType || 'phoenix'}
        rarity={rarity}
        name={name}
        category={category}
        id={id}
        unlocked={unlocked}
        progress={clampedProgress}
        glowIntensity={glowIntensity}
        zOffset={0.027}
        isShieldShape={true}
      />

      {/* Dynamic Ambient Aura Glow */}
      {unlocked && (
        <AuraShell
          radius={0.80}
          colorA={config.auraColor}
          colorB={config.auraColorSecondary}
          intensity={glowIntensity * 0.9}
          pulseSpeed={config.ringPulseSpeed}
        />
      )}

      {/* Supernova Shockwave Blast */}
      <NovaShockwave
        burst={burst}
        color={config.auraColor}
        secondaryColor={config.auraColorSecondary}
        radius={0.82}
      />

      {/* Dynamic Active Particle Emitter System */}
      {unlocked && config.particleCount > 0 && (
        <AchievementParticles
          colors={config.particleColors}
          count={config.particleCount}
          burst={burst}
          progress={clampedProgress}
          radius={0.80}
        />
      )}

      {/* Unlock flash pulse light */}
      <animated.pointLight
        color={config.auraColor}
        intensity={flash.to((f: number) => f * 8)}
        distance={4.0}
        position={[0, 0, 1.2]}
      />
    </animated.group>
  );
};
