import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NovaShockwaveProps {
  burst: boolean;
  color: string;
  secondaryColor?: string;
  radius: number;
}

/**
 * NovaShockwave creates an explosive, expanding celestial shockwave
 * corona ring that bursts behind the medal the moment an achievement is unlocked.
 */
export const NovaShockwave: React.FC<NovaShockwaveProps> = ({
  burst,
  color,
  secondaryColor,
  radius,
}) => {
  const shockwaveRef = useRef<THREE.Group>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const blastDiscRef = useRef<THREE.Mesh>(null);

  const animProgress = useRef(0);
  const isAnimating = useRef(false);

  // Trigger burst sequence
  React.useEffect(() => {
    if (burst) {
      animProgress.current = 0;
      isAnimating.current = true;
    }
  }, [burst]);

  const discMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uSecondary: { value: new THREE.Color(secondaryColor || color) },
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uSecondary;
        uniform float uProgress;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center) * 2.0;

          // Shockwave wave front
          float ringThickness = 0.15;
          float ringPos = uProgress;
          float ringMask = smoothstep(ringPos - ringThickness, ringPos, dist) *
                           (1.0 - smoothstep(ringPos, ringPos + ringThickness * 0.5, dist));

          // Inner core flash
          float core = exp(-dist * 3.5) * (1.0 - uProgress);

          float totalAlpha = (ringMask * 1.5 + core * 0.8) * uOpacity;
          if (totalAlpha < 0.005) discard;

          vec3 finalColor = mix(uColor, uSecondary, dist);
          finalColor += vec3(core * 0.8); // Add center brightness

          gl_FragColor = vec4(finalColor, totalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [color, secondaryColor]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    animProgress.current += delta * 1.1; // ~0.9s duration
    const p = Math.min(animProgress.current, 1.0);

    // Easing curve (fast explosion, decelerating expansion)
    const easeOut = 1.0 - Math.pow(1.0 - p, 3);
    const opacity = Math.pow(1.0 - p, 1.5);

    if (discMaterial) {
      discMaterial.uniforms.uProgress.value = p;
      discMaterial.uniforms.uOpacity.value = opacity;
    }

    if (ring1Ref.current) {
      const s = radius * (0.8 + easeOut * 3.6);
      ring1Ref.current.scale.set(s, s, s);
      const mat = ring1Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * 0.85;
    }

    if (ring2Ref.current) {
      const s2 = radius * (0.4 + easeOut * 4.2);
      ring2Ref.current.scale.set(s2, s2, s2);
      const mat2 = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat2.opacity = opacity * 0.65;
    }

    if (p >= 1.0) {
      isAnimating.current = false;
      if (discMaterial) discMaterial.uniforms.uOpacity.value = 0;
      if (ring1Ref.current) (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0;
      if (ring2Ref.current) (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  });

  return (
    <group ref={shockwaveRef} position={[0, 0, -0.05]}>
      {/* Shader-driven energy corona */}
      <mesh ref={blastDiscRef} scale={[radius * 4.5, radius * 4.5, 1]} material={discMaterial}>
        <planeGeometry args={[2, 2]} />
      </mesh>

      {/* Outer sharp shockwave ring 1 */}
      <mesh ref={ring1Ref}>
        <ringGeometry args={[0.92, 1.0, 64]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Trailing secondary shockwave ring 2 */}
      <mesh ref={ring2Ref}>
        <ringGeometry args={[0.85, 0.94, 64]} />
        <meshBasicMaterial
          color={secondaryColor || color}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
