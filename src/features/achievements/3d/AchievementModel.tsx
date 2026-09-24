import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { animated } from '@react-spring/three';
import * as THREE from 'three';
import { ModelType } from '../types/achievement.types';
import { RARITY_CONFIG, Rarity, SlotMaterialConfig } from './rarityConfig';
import { AuraShell } from './AuraShell';
import { AchievementParticles } from './AchievementParticles';
import { NovaShockwave } from './NovaShockwave';
import { useUnlockAnimation } from './useUnlockAnimation';
import { CurvedTextRing } from './CurvedTextRing';
import { CenterEmblem } from './CenterEmblem';
import { DefenseShieldModel } from './DefenseShieldModel';

export interface AchievementModelProps {
  url?: string;
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
    clearcoat: slot.clearcoat ?? 0.4,
    clearcoatRoughness: slot.clearcoatRoughness ?? 0.1,
    transmission: 0,
    thickness: 0,
    ior: 1.5,
    emissive: slot.emissive ? new THREE.Color(slot.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: slot.emissive ? Math.max(glowIntensity, 0.25) : 0,
    side: THREE.DoubleSide,
  });

  if (locked) {
    const hsl = { h: 0, s: 0, l: 0 };
    mat.color.getHSL(hsl);
    mat.color.setHSL(hsl.h, hsl.s * 0.15, Math.max(hsl.l * 0.45, 0.12));
    mat.metalness = Math.min(mat.metalness, 0.4);
    mat.roughness = Math.min(mat.roughness + 0.35, 1);
    mat.emissiveIntensity = 0;
    mat.clearcoat = 0;
  }

  return mat;
}

export const AchievementModel: React.FC<AchievementModelProps> = ({
  name,
  rarity,
  modelType = 'star',
  category,
  id,
  progress,
  unlocked,
  autoRotate = true,
  forceTrigger = 0,
}) => {
  // If Comeback or Level Milestone, render the 3D Defense Shield with expanding wings animation
  if (category === 'comeback' || category === 'level-milestones') {
    return (
      <DefenseShieldModel
        name={name}
        rarity={rarity}
        modelType={modelType}
        category={category}
        id={id}
        progress={progress}
        unlocked={unlocked}
        autoRotate={autoRotate}
        forceTrigger={forceTrigger}
      />
    );
  }

  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const groupRef = useRef<THREE.Group>(null);
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const radius = 0.625; // Target coin radius
  const thickness = 0.038; // Coin thickness
  const halfT = thickness / 2; // 0.019

  const glowIntensity = useMemo(() => {
    const [min, max] = config.glowRange;
    return unlocked ? min + (max - min) * clampedProgress : 0;
  }, [config.glowRange, clampedProgress, unlocked]);

  // Primary minted coin metal
  const primaryMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Primary, !unlocked, glowIntensity),
    [config, unlocked, glowIntensity]
  );

  // Accent inlay & rim metal
  const accentMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Accent, !unlocked, glowIntensity),
    [config, unlocked, glowIntensity]
  );

  // Core jewel accent material
  const gemMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: config.auraColor,
      roughness: 0.12,
      metalness: 0.85,
      emissive: unlocked ? new THREE.Color(config.auraColor) : new THREE.Color('#000000'),
      emissiveIntensity: unlocked ? Math.max(glowIntensity * 1.1, 0.5) : 0,
      side: THREE.DoubleSide,
    });
  }, [config, unlocked, glowIntensity]);

  // Precision 100% symmetric double-sided coin casing
  const coinChassis = useMemo(() => {
    const g = new THREE.Group();

    // 1. Core Solid Coin Disc Cylinder
    const coreCyl = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, thickness, 64),
      primaryMat
    );
    coreCyl.rotateX(Math.PI / 2);
    g.add(coreCyl);

    // Helper to generate identical luxury minted face details
    const createFaceGroup = (isBack: boolean) => {
      const face = new THREE.Group();
      face.position.z = isBack ? -halfT : halfT;
      if (isBack) {
        face.rotation.y = Math.PI; // Mirrored outward for reverse face
      }

      // Outer Raised Beveled Coin Rim
      const outerRim = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.98, 0.022, 16, 64),
        primaryMat
      );
      face.add(outerRim);

      // Concentric Decorative Fluted Coin Inlay
      const inlayRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.78, 0.012, 12, 64),
        accentMat
      );
      inlayRing.position.z = 0.002;
      face.add(inlayRing);

      // Inner Center Emblem Bezel Ring
      const centerBezel = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 0.52, 0.016, 14, 48),
        primaryMat
      );
      centerBezel.position.z = 0.003;
      face.add(centerBezel);

      // Inner Center Recessed Backdrop Plate
      const innerRecess = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.50, 32),
        accentMat
      );
      innerRecess.position.z = 0.001;
      face.add(innerRecess);

      // 4 Star/Diamond Rivets on Cardinal Flutes
      const starAngles = [
        -Math.PI * 0.25,
        Math.PI * 0.25,
        Math.PI * 0.75,
        -Math.PI * 0.75,
      ];
      starAngles.forEach((angle) => {
        const rivet = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.024, 0),
          gemMat
        );
        rivet.position.set(
          Math.cos(angle) * radius * 0.88,
          Math.sin(angle) * radius * 0.88,
          0.006
        );
        face.add(rivet);
      });

      return face;
    };

    // Front Face Details (+Z)
    g.add(createFaceGroup(false));

    // Back Face Details (-Z) - EXACT IDENTICAL
    g.add(createFaceGroup(true));

    return g;
  }, [radius, thickness, halfT, primaryMat, accentMat, gemMat]);

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

  return (
    <animated.group ref={groupRef} scale={scale}>
      {/* Precision 100% Double-Sided Coin Chassis */}
      <primitive object={coinChassis} />

      {/* Category/Level-specific 3D Sculpted Emblem & Engraved Plaque (Identical Front and Back) */}
      <group scale={[radius / 0.85, radius / 0.85, radius / 0.85]}>
        <CenterEmblem
          type={modelType || 'star'}
          rarity={rarity}
          name={name}
          category={category}
          id={id}
          unlocked={unlocked}
          progress={clampedProgress}
          glowIntensity={glowIntensity}
          zOffset={0.024}
        />
      </group>

      {/* Raised Engraved Name along the Outer Top Edge Arc (Identical Front and Back) */}
      <CurvedTextRing
        name={name}
        rarity={rarity}
        modelType={modelType}
        category={category}
        radius={radius}
        unlocked={unlocked}
        progress={clampedProgress}
        zOffset={0.024}
      />

      {/* Subtle contour-hugging aura backdrop */}
      {unlocked && (
        <AuraShell
          radius={radius}
          colorA={config.auraColor}
          colorB={config.auraColorSecondary}
          intensity={glowIntensity * 0.8}
          pulseSpeed={config.ringPulseSpeed}
        />
      )}

      {/* Supernova Shockwave Blast */}
      <NovaShockwave
        burst={burst}
        color={config.auraColor}
        secondaryColor={config.auraColorSecondary}
        radius={radius}
      />

      {/* Dynamic Active Particle Emitter System */}
      {unlocked && config.particleCount > 0 && (
        <AchievementParticles
          colors={config.particleColors}
          count={config.particleCount}
          burst={burst}
          progress={clampedProgress}
          radius={radius}
        />
      )}

      {/* Unlock flash pulse */}
      <animated.pointLight
        color={config.auraColor}
        intensity={flash.to((f: number) => f * 8)}
        distance={radius * 6}
        position={[0, 0, 1.2]}
      />
    </animated.group>
  );
};
