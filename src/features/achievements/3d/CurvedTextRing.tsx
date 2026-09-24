import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ModelType } from '../types/achievement.types';
import { Rarity, RARITY_CONFIG } from './rarityConfig';
import { getRarityLevelColors } from '../utils/engravingUtils';

interface CurvedTextRingProps {
  name: string;
  rarity: Rarity;
  modelType?: ModelType;
  category?: string;
  radius: number;
  unlocked: boolean;
  progress: number;
  zOffset?: number;
}

function getAchievementSymbol(modelType?: ModelType, category?: string): string {
  switch (modelType) {
    case 'flame':
      return '🔥';
    case 'shield':
      return '🛡️';
    case 'crown':
      return '👑';
    case 'trophy':
      return '🏆';
    case 'swords':
      return '⚔️';
    case 'bolt':
      return '⚡';
    case 'crystal':
      return '💎';
    case 'infinity':
      return '✦';
    case 'clock':
      return '⏱️';
    case 'robot':
    case 'chat':
      return '🤖';
    case 'leaf':
    case 'tree':
      return '🌿';
    default:
      if (category === 'streak') return '🔥';
      if (category === 'challenge') return '⚔️';
      if (category === 'task-mastery') return '🏆';
      if (category === 'level-milestones') return '👑';
      if (category === 'ai-companion') return '🤖';
      if (category === 'zero-overdue') return '⏱️';
      if (category === 'perfect-performance') return '⚡';
      return '✦';
  }
}

/**
 * CurvedTextRing renders an engraved/embossed title running along the
 * outer top rim channel of the 3D medal.
 */
export const CurvedTextRing: React.FC<CurvedTextRingProps> = ({
  name,
  rarity,
  modelType,
  category,
  radius,
  unlocked,
  progress,
  zOffset = 0.022,
}) => {
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const symbol = getAchievementSymbol(modelType, category);

  // Generate high-resolution diffuse map and bump map for engraved depth
  const { diffuseTexture, bumpTexture, arcAngle } = useMemo(() => {
    const width = 2048;
    const height = 256;

    // 1. Diffuse Color Map Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 2. Bump Map Canvas for physical engraved bevel lighting
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext('2d');

    if (!ctx || !bumpCtx) {
      return { diffuseTexture: null, bumpTexture: null, arcAngle: Math.PI * 0.6 };
    }

    ctx.clearRect(0, 0, width, height);
    bumpCtx.fillStyle = '#808080'; // neutral bump height
    bumpCtx.fillRect(0, 0, width, height);

    const displayName = name.trim().toUpperCase();
    const charCount = displayName.length;

    // Calculate dynamic arc span and font size based on text length
    let fontSize = 74;
    let arc = Math.PI * 0.62; // ~112 degrees

    if (charCount <= 12) {
      fontSize = 86;
      arc = Math.PI * 0.52;
    } else if (charCount <= 22) {
      fontSize = 72;
      arc = Math.PI * 0.64;
    } else if (charCount <= 32) {
      fontSize = 58;
      arc = Math.PI * 0.74;
    } else {
      fontSize = 46;
      arc = Math.PI * 0.84;
    }

    const fontStr = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.font = fontStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    bumpCtx.font = fontStr;
    bumpCtx.textAlign = 'center';
    bumpCtx.textBaseline = 'middle';

    const cx = width / 2;
    const cy = height / 2;

    if (unlocked) {
      // --- Diffuse Map (Engraved Metallic in Medal Surface) ---
      // Inner groove shadow (sunken depth)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(displayName, cx, cy + 1.5);

      // Stroke groove outline
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.lineWidth = 4;
      ctx.strokeText(displayName, cx, cy);

      // Engraved metallic fill matched to medal level
      const levelColors = getRarityLevelColors(rarity);
      const grad = ctx.createLinearGradient(0, cy - fontSize * 0.5, 0, cy + fontSize * 0.5);
      grad.addColorStop(0, levelColors.textGradient[0]);
      grad.addColorStop(0.45, levelColors.textGradient[1]);
      grad.addColorStop(1, levelColors.textGradient[2]);

      ctx.fillStyle = grad;
      ctx.fillText(displayName, cx, cy);

      // Fine top bevel highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeText(displayName, cx, cy - 0.8);

      // --- Bump Map (Carved relief) ---
      // Recessed outer rim
      bumpCtx.strokeStyle = '#202020';
      bumpCtx.lineWidth = 6;
      bumpCtx.strokeText(displayName, cx, cy);

      // Raised engraved letter face
      bumpCtx.fillStyle = '#ffffff';
      bumpCtx.fillText(displayName, cx, cy);
    } else {
      // Locked State: Dark matte carved engraving
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1.5;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(displayName, cx, cy + 1);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#475569';
      ctx.fillText(displayName, cx, cy);

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.strokeText(displayName, cx, cy);

      bumpCtx.fillStyle = '#b0b0b0';
      bumpCtx.fillText(displayName, cx, cy);
    }

    const dTex = new THREE.CanvasTexture(canvas);
    dTex.generateMipmaps = true;
    dTex.minFilter = THREE.LinearMipmapLinearFilter;
    dTex.magFilter = THREE.LinearFilter;
    dTex.needsUpdate = true;

    const bTex = new THREE.CanvasTexture(bumpCanvas);
    bTex.generateMipmaps = true;
    bTex.minFilter = THREE.LinearMipmapLinearFilter;
    bTex.magFilter = THREE.LinearFilter;
    bTex.needsUpdate = true;

    return { diffuseTexture: dTex, bumpTexture: bTex, arcAngle: arc };
  }, [name, config, unlocked]);

  // Construct curved ribbon geometries for both Front and Back faces
  const { frontGeometry, backGeometry } = useMemo(() => {
    const segments = 64;
    const rOuter = radius * 0.95;
    const rInner = radius * 0.72;
    const halfArc = arcAngle / 2;

    // 1. Front Face Geometry (Z = +zOffset, normal = [0, 0, 1], reads left-to-right)
    const frontPositions = new Float32Array((segments + 1) * 2 * 3);
    const frontUvs = new Float32Array((segments + 1) * 2 * 2);
    const frontNormals = new Float32Array((segments + 1) * 2 * 3);
    const frontIndices: number[] = [];

    const frontStartAngle = Math.PI / 2 + halfArc; // Top left in front view

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = frontStartAngle - t * arcAngle; // Clockwise from left to right along top arc
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const vi = i * 2;

      // Inner vertex (bottom of text, u = t, v = 0)
      frontPositions[vi * 3] = cosA * rInner;
      frontPositions[vi * 3 + 1] = sinA * rInner;
      frontPositions[vi * 3 + 2] = zOffset;

      frontNormals[vi * 3] = 0;
      frontNormals[vi * 3 + 1] = 0;
      frontNormals[vi * 3 + 2] = 1;

      frontUvs[vi * 2] = t;
      frontUvs[vi * 2 + 1] = 0;

      // Outer vertex (top of text, u = t, v = 1)
      frontPositions[(vi + 1) * 3] = cosA * rOuter;
      frontPositions[(vi + 1) * 3 + 1] = sinA * rOuter;
      frontPositions[(vi + 1) * 3 + 2] = zOffset;

      frontNormals[(vi + 1) * 3] = 0;
      frontNormals[(vi + 1) * 3 + 1] = 0;
      frontNormals[(vi + 1) * 3 + 2] = 1;

      frontUvs[(vi + 1) * 2] = t;
      frontUvs[(vi + 1) * 2 + 1] = 1;

      if (i < segments) {
        const a = vi;
        const b = vi + 1;
        const c = vi + 2;
        const d = vi + 3;

        frontIndices.push(a, b, c);
        frontIndices.push(b, d, c);
      }
    }

    const frontGeo = new THREE.BufferGeometry();
    frontGeo.setAttribute('position', new THREE.BufferAttribute(frontPositions, 3));
    frontGeo.setAttribute('uv', new THREE.BufferAttribute(frontUvs, 2));
    frontGeo.setAttribute('normal', new THREE.BufferAttribute(frontNormals, 3));
    frontGeo.setIndex(frontIndices);

    // 2. Back Face Geometry (Z = -zOffset, normal = [0, 0, -1], reads left-to-right when viewed from back)
    // In back view (looking from -Z towards +Z), +X is screen-left and -X is screen-right.
    // So text starts at angle (PI/2 - halfArc) on +X and goes to (PI/2 + halfArc) on -X.
    const backPositions = new Float32Array((segments + 1) * 2 * 3);
    const backUvs = new Float32Array((segments + 1) * 2 * 2);
    const backNormals = new Float32Array((segments + 1) * 2 * 3);
    const backIndices: number[] = [];

    const backStartAngle = Math.PI / 2 - halfArc;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = backStartAngle + t * arcAngle; // Counter-clockwise in local coords = left-to-right in back view
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const vi = i * 2;

      // Inner vertex (bottom of text, u = t, v = 0)
      backPositions[vi * 3] = cosA * rInner;
      backPositions[vi * 3 + 1] = sinA * rInner;
      backPositions[vi * 3 + 2] = -zOffset;

      backNormals[vi * 3] = 0;
      backNormals[vi * 3 + 1] = 0;
      backNormals[vi * 3 + 2] = -1;

      backUvs[vi * 2] = t;
      backUvs[vi * 2 + 1] = 0;

      // Outer vertex (top of text, u = t, v = 1)
      backPositions[(vi + 1) * 3] = cosA * rOuter;
      backPositions[(vi + 1) * 3 + 1] = sinA * rOuter;
      backPositions[(vi + 1) * 3 + 2] = -zOffset;

      backNormals[(vi + 1) * 3] = 0;
      backNormals[(vi + 1) * 3 + 1] = 0;
      backNormals[(vi + 1) * 3 + 2] = -1;

      backUvs[(vi + 1) * 2] = t;
      backUvs[(vi + 1) * 2 + 1] = 1;

      if (i < segments) {
        const a = vi;
        const b = vi + 1;
        const c = vi + 2;
        const d = vi + 3;

        // Winding order facing outward from -Z
        backIndices.push(a, c, b);
        backIndices.push(b, c, d);
      }
    }

    const backGeo = new THREE.BufferGeometry();
    backGeo.setAttribute('position', new THREE.BufferAttribute(backPositions, 3));
    backGeo.setAttribute('uv', new THREE.BufferAttribute(backUvs, 2));
    backGeo.setAttribute('normal', new THREE.BufferAttribute(backNormals, 3));
    backGeo.setIndex(backIndices);

    return { frontGeometry: frontGeo, backGeometry: backGeo };
  }, [radius, arcAngle]);

  if (!diffuseTexture || !bumpTexture) return null;

  return (
    <group>
      {/* Front Face Engraved Name (Flush with medal surface, polygonOffset prevents z-fighting) */}
      <mesh geometry={frontGeometry}>
        <meshStandardMaterial
          map={diffuseTexture}
          bumpMap={bumpTexture}
          bumpScale={0.03}
          transparent
          alphaTest={0.01}
          depthTest={true}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          metalness={unlocked ? 0.92 : 0.3}
          roughness={unlocked ? 0.18 : 0.65}
          emissive={unlocked ? new THREE.Color(config.auraColor) : new THREE.Color('#000000')}
          emissiveIntensity={unlocked ? 0.15 + clampedProgress * 0.2 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Back Face Engraved Name (Identical readable engraving on reverse side) */}
      <mesh geometry={backGeometry}>
        <meshStandardMaterial
          map={diffuseTexture}
          bumpMap={bumpTexture}
          bumpScale={0.03}
          transparent
          alphaTest={0.01}
          depthTest={true}
          depthWrite={false}
          polygonOffset={true}
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
          metalness={unlocked ? 0.92 : 0.3}
          roughness={unlocked ? 0.18 : 0.65}
          emissive={unlocked ? new THREE.Color(config.auraColor) : new THREE.Color('#000000')}
          emissiveIntensity={unlocked ? 0.15 + clampedProgress * 0.2 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
