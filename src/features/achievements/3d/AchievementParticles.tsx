import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AchievementParticlesProps {
  colors: [string, string, string]; // [Core Spark, Orbital Stream, Halo Flash]
  count: number;
  burst: boolean;
  progress: number;
  radius: number;
}

/**
 * Dynamic Particle System:
 * - Emits strictly from the medal surface and rim.
 * - Normal State: Clean average number of active, non-stagnant orbiting sparks.
 * - Unlock/Replay Burst: Surge of high-speed rotating sparks that explode outward
 *   and smoothly settle back to the normal average emission.
 */
export function AchievementParticles({
  colors,
  count,
  burst,
  progress,
  radius,
}: AchievementParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Ambient Active Sparks (Emit directly from medal body & rim)
  // Balanced average particle count (~28 - 34 particles)
  const ambientCount = Math.min(Math.max(Math.floor(count * 0.5), 24), 36);
  const ambientRef = useRef<THREE.Points>(null);

  const [ambientGeo, ambientData] = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(ambientCount * 3);
    const data: {
      angle: number;
      orbitSpeed: number;
      radDist: number;
      radialSpeed: number;
      zPos: number;
      zSpeed: number;
      life: number;
      maxLife: number;
    }[] = [];

    for (let i = 0; i < ambientCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radDist = (0.2 + Math.random() * 0.8) * radius;
      const orbitSpeed = (0.8 + Math.random() * 1.2) * (i % 2 === 0 ? 1 : -1);
      const radialSpeed = 0.15 + Math.random() * 0.35;
      const zPos = (Math.random() - 0.5) * 0.12;
      const zSpeed = (Math.random() - 0.5) * 0.2;
      const maxLife = 1.6 + Math.random() * 1.4;
      const life = Math.random() * maxLife;

      data.push({ angle, orbitSpeed, radDist, radialSpeed, zPos, zSpeed, life, maxLife });

      positions[i * 3] = Math.cos(angle) * radDist;
      positions[i * 3 + 1] = Math.sin(angle) * radDist;
      positions[i * 3 + 2] = zPos;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [geo, data];
  }, [ambientCount, radius]);

  // 2. Unlock Supernova Burst Sparks (High-velocity explosive surge on unlock)
  const burstCount = 80;
  const burstRef = useRef<THREE.Points>(null);
  const [burstGeo, burstData] = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(burstCount * 3);
    const data: {
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
      spinAngle: number;
      spinSpeed: number;
    }[] = [];

    for (let i = 0; i < burstCount; i++) {
      data.push({
        vx: 0,
        vy: 0,
        vz: 0,
        life: 1.0,
        maxLife: 1.2 + Math.random() * 0.6,
        spinAngle: Math.random() * Math.PI * 2,
        spinSpeed: (3.0 + Math.random() * 4.0) * (i % 2 === 0 ? 1 : -1),
      });

      // Start hidden at origin
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return [geo, data];
  }, [burstCount]);

  const burstActive = useRef(false);
  const burstTime = useRef(0);

  // Trigger explosive burst on unlock / replay
  useEffect(() => {
    if (burst) {
      burstActive.current = true;
      burstTime.current = 0;

      const posAttr = burstGeo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < burstCount; i++) {
        const item = burstData[i];
        item.life = 0;

        // Spawn strictly along the medal perimeter
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnR = (0.3 + Math.random() * 0.7) * radius;
        posArr[i * 3] = Math.cos(spawnAngle) * spawnR;
        posArr[i * 3 + 1] = Math.sin(spawnAngle) * spawnR;
        posArr[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

        // Tangential + Outward Radial velocity for dynamic spiraling explosion
        const speed = 2.4 + Math.random() * 4.6;
        const outAngle = spawnAngle + (Math.random() - 0.5) * 0.5;
        const tangDir = (i % 2 === 0 ? 1 : -1) * 1.5;

        item.vx = Math.cos(outAngle) * speed - Math.sin(spawnAngle) * tangDir;
        item.vy = Math.sin(outAngle) * speed + Math.cos(spawnAngle) * tangDir;
        item.vz = (Math.random() - 0.5) * speed * 0.6;
      }
      posAttr.needsUpdate = true;
    }
  }, [burst, burstGeo, burstData, burstCount, radius]);

  // Continuous animation loop ensuring every single particle is actively moving
  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.05);

    // 1. Animate Normal Ambient Particles (Continuously emitting from medal)
    if (ambientRef.current) {
      const posAttr = ambientGeo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;

      for (let i = 0; i < ambientCount; i++) {
        const item = ambientData[i];
        item.life += clampedDelta;

        // Particle reached end of life: respawn directly on medal surface
        if (item.life >= item.maxLife) {
          item.life = 0;
          item.angle = Math.random() * Math.PI * 2;
          item.radDist = (0.2 + Math.random() * 0.3) * radius; // Start inside core
          item.zPos = (Math.random() - 0.5) * 0.08;
        }

        // Active orbit & gentle outward drift from medal
        item.angle += item.orbitSpeed * clampedDelta;
        item.radDist += item.radialSpeed * clampedDelta * (radius * 0.3);
        item.zPos += item.zSpeed * clampedDelta;

        // Keep contained around medal zone
        const r = Math.min(item.radDist, radius * 1.15);
        posArr[i * 3] = Math.cos(item.angle) * r;
        posArr[i * 3 + 1] = Math.sin(item.angle) * r;
        posArr[i * 3 + 2] = item.zPos;
      }

      posAttr.needsUpdate = true;
    }

    // 2. Animate Unlock Supernova Burst Particles (Fast rotate & radial explosion)
    if (burstRef.current && burstActive.current) {
      burstTime.current += clampedDelta;
      const posAttr = burstGeo.attributes.position as THREE.BufferAttribute;
      const posArr = posAttr.array as Float32Array;
      const mat = burstRef.current.material as THREE.PointsMaterial;

      let livingCount = 0;
      for (let i = 0; i < burstCount; i++) {
        const item = burstData[i];
        if (item.life < item.maxLife) {
          livingCount++;
          item.life += clampedDelta;

          // Drag deceleration as particles burst outward
          const drag = Math.pow(0.86, clampedDelta * 60);
          item.vx *= drag;
          item.vy *= drag;
          item.vz *= drag;

          posArr[i * 3] += item.vx * clampedDelta;
          posArr[i * 3 + 1] += item.vy * clampedDelta;
          posArr[i * 3 + 2] += item.vz * clampedDelta;
        }
      }

      // Smooth fadeout as the medal opens into view
      const fadeRatio = Math.max(1.0 - burstTime.current / 1.4, 0);
      mat.opacity = fadeRatio * 0.95;

      if (livingCount > 0) {
        posAttr.needsUpdate = true;
      } else if (fadeRatio <= 0.01) {
        burstActive.current = false;
        mat.opacity = 0;
      }
    }
  });

  const baseOpacity = 0.65 + Math.min(Math.max(progress, 0), 1) * 0.35;

  return (
    <group ref={groupRef}>
      {/* Normal Ambient Medal Sparks (Active, emitting from medal, average count) */}
      <points ref={ambientRef} geometry={ambientGeo}>
        <pointsMaterial
          size={0.075}
          color={colors[0]}
          transparent
          opacity={baseOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Unlock Celebratory Burst Particles (Explodes outward & fades smoothly) */}
      <points ref={burstRef} geometry={burstGeo}>
        <pointsMaterial
          size={0.11}
          color={colors[1]}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
