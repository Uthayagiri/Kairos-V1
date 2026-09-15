import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface AchievementParticlesProps {
  particleCount?: number;
  color?: string;
  speed?: number;
  radius?: number;
  className?: string;
}

/**
 * Procedural Three.js particle emitter for ambient sparkle and celestial aura.
 */
export const AchievementParticles: React.FC<AchievementParticlesProps> = ({
  particleCount = 36,
  color = '#a855f7',
  speed = 1.0,
  radius = 1.8,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 200;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 4;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particle Geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const initialOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = (0.5 + Math.random() * 0.5) * radius;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      velocities[i * 3] = (Math.random() - 0.5) * 0.02 * speed;
      velocities[i * 3 + 1] = (0.01 + Math.random() * 0.03) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02 * speed;

      initialOffsets[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle Texture (smooth radial circle)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.15)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.12,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime() * speed;

      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        // Upward flow + slight orbital rotation
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3] += Math.sin(time + initialOffsets[i]) * 0.005;
        pos[i * 3 + 2] += Math.cos(time + initialOffsets[i]) * 0.005;

        // Reset if drifted too high
        if (pos[i * 3 + 1] > radius * 1.4) {
          pos[i * 3 + 1] = -radius * 0.8;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      particles.rotation.y = time * 0.2;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [particleCount, color, speed, radius]);

  return <div ref={containerRef} className={`absolute inset-0 pointer-events-none ${className}`} />;
};

export default AchievementParticles;
