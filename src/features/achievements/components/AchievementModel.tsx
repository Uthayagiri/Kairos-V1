import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ModelType, AchievementRarity } from '../types/achievement.types';
import { useAchievementModels } from '../hooks/useAchievementModels';

export interface AchievementModelProps {
  type: ModelType;
  rarity: AchievementRarity;
  glowColor: string;
  currentProgress?: number;
  targetProgress?: number;
  isUnlocked: boolean;
  scale?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  allowZoom?: boolean;
  className?: string;
}

/**
 * 3D Achievement Model with GLTF asset loader, PBR studio shaders, and touch drag/zoom controls.
 */
export const AchievementModel: React.FC<AchievementModelProps> = ({
  type,
  rarity,
  glowColor,
  currentProgress = 0,
  targetProgress = 100,
  isUnlocked,
  scale = 1.0,
  autoRotate = true,
  interactive = true,
  allowZoom = true,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { modelObject } = useAchievementModels({
    type,
    rarity,
    glowColor,
    currentProgress,
    targetProgress,
    isUnlocked,
    scale
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 160;
    const height = container.clientHeight || 160;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.6);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Key, Fill & Rim Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, isUnlocked ? 0.95 : 0.45);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.SpotLight(0xffffff, isUnlocked ? 2.8 : 1.2);
    mainKeyLight.position.set(5, 8, 5);
    mainKeyLight.angle = 0.6;
    mainKeyLight.penumbra = 0.8;
    scene.add(mainKeyLight);

    const rimLight = new THREE.PointLight(new THREE.Color(glowColor), isUnlocked ? 3.5 : 0.6, 12);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 0.9);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);

    scene.add(modelObject);

    // Interaction state: Drag rotation and Zoom
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotation = { x: 0, y: 0 };
    let initialPinchDistance = 0;
    let targetCameraZ = 3.6;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;
      isDragging = true;
      if ('touches' in e && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.hypot(dx, dy);
        return;
      }
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!interactive) return;

      // Two-Finger Pinch-to-Zoom
      if ('touches' in e && e.touches.length === 2 && allowZoom) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = (initialPinchDistance - dist) * 0.008;
        targetCameraZ = Math.max(2.2, Math.min(5.5, targetCameraZ + factor));
        initialPinchDistance = dist;
        return;
      }

      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - previousMousePosition.x;
      const deltaY = clientY - previousMousePosition.y;

      targetRotation.y += deltaX * 0.012;
      targetRotation.x += deltaY * 0.012;

      // Clamping vertical pitch
      targetRotation.x = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, targetRotation.x));

      previousMousePosition = { x: clientX, y: clientY };
    };

    const handlePointerUp = () => {
      isDragging = false;
      initialPinchDistance = 0;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!interactive || !allowZoom) return;
      e.preventDefault();
      targetCameraZ = Math.max(2.2, Math.min(5.5, targetCameraZ + e.deltaY * 0.003));
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handlePointerDown);
    dom.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchend', handlePointerUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Smooth damped rotation
      if (autoRotate && !isDragging) {
        targetRotation.y += 0.012;
      }

      modelObject.rotation.y += (targetRotation.y - modelObject.rotation.y) * 0.1;
      modelObject.rotation.x += (targetRotation.x - modelObject.rotation.x) * 0.1;

      // Damped camera zoom
      camera.position.z += (targetCameraZ - camera.position.z) * 0.1;

      // Smooth idle floating levitation bobbing
      modelObject.position.y = Math.sin(elapsed * 2.0) * 0.08;

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
      dom.removeEventListener('mousedown', handlePointerDown);
      dom.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      dom.removeEventListener('wheel', handleWheel);
      cancelAnimationFrame(animId);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      scene.remove(modelObject);
      renderer.dispose();
    };
  }, [modelObject, glowColor, isUnlocked, autoRotate, interactive, allowZoom]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing ${className}`}
    />
  );
};

export default AchievementModel;
