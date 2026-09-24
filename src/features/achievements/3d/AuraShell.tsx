import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AuraShellProps {
  radius: number;
  colorA: string;
  colorB?: string;
  intensity: number;   // 0..~1.3, driven by progress
  pulseSpeed: number;  // 0 = static
}

// A delicate radial corona and rim glow hugging the medal contour.
// Subtle, non-intrusive glow disc that softly illuminates behind and around the medal perimeter.
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float intensity;
  uniform float mixAmount;
  uniform float time;
  varying vec2 vUv;

  void main() {
    // Center UV at (0,0), range from -1 to 1
    vec2 p = vUv * 2.0 - 1.0;
    float dist = length(p);

    if (dist > 1.0) {
      discard;
    }

    // Soft perimeter corona hugging the medal edge (around dist = 0.7 to 0.95)
    float rimCorona = exp(-pow(abs(dist - 0.72) * 5.2, 2.0)) * 0.45;
    
    // Gentle inner back-glow
    float innerGlow = exp(-dist * 2.8) * 0.22;
    
    // Smooth fade to outer edge
    float outerFade = smoothstep(1.0, 0.65, dist);
    
    // Subtle organic shimmer pulse
    float shimmer = 1.0 + 0.08 * sin(time * 2.5 + dist * 8.0);

    float alpha = (rimCorona + innerGlow) * outerFade * intensity * shimmer;
    
    // Color gradient across the radial field
    vec3 baseColor = mix(colorA, colorB, mixAmount);
    vec3 col = mix(baseColor, colorB, smoothstep(0.3, 0.85, dist));

    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

export function AuraShell({ radius, colorA, colorB, intensity, pulseSpeed }: AuraShellProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      colorA: { value: new THREE.Color(colorA) },
      colorB: { value: new THREE.Color(colorB ?? colorA) },
      intensity: { value: intensity * 0.45 },
      mixAmount: { value: 0 },
      time: { value: 0 },
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (matRef.current) {
      const pulse = pulseSpeed > 0 ? 0.9 + Math.sin(t * pulseSpeed * 1.5) * 0.1 : 1;
      matRef.current.uniforms.intensity.value = intensity * 0.45 * pulse;
      matRef.current.uniforms.time.value = t;
      matRef.current.uniforms.colorA.value.set(colorA);
      matRef.current.uniforms.colorB.value.set(colorB ?? colorA);
      matRef.current.uniforms.mixAmount.value = colorB ? Math.sin(t * (pulseSpeed || 0.4)) * 0.5 + 0.5 : 0;
    }
  });

  // Size disc to comfortably frame the medal perimeter
  const discScale = Math.max(radius * 1.35, 1.3);

  return (
    <mesh ref={meshRef} position={[0, 0, -0.08]} scale={discScale}>
      <planeGeometry args={[2, 2, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vert}
        fragmentShader={frag}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
