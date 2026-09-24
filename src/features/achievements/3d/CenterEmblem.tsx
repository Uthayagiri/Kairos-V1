import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ModelType } from '../types/achievement.types';
import { Rarity, RARITY_CONFIG, SlotMaterialConfig } from './rarityConfig';
import { getAchievementEngraving, getRarityLevelColors } from '../utils/engravingUtils';

interface CenterEmblemProps {
  type: ModelType;
  rarity: Rarity;
  name?: string;
  category?: string;
  id?: string;
  unlocked: boolean;
  progress: number;
  glowIntensity: number;
  zOffset?: number;
  isShieldShape?: boolean;
}

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

function createPBRMaterial(slot: SlotMaterialConfig, locked: boolean, glowIntensity: number) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: slot.color,
    metalness: slot.metalness,
    roughness: slot.roughness,
    clearcoat: slot.clearcoat ?? 0.4,
    clearcoatRoughness: slot.clearcoatRoughness ?? 0.1,
    transmission: slot.transmission ?? 0,
    thickness: slot.thickness ?? 0,
    ior: slot.ior ?? 1.5,
    iridescence: slot.iridescence ?? 0,
    iridescenceIOR: slot.iridescenceIOR ?? 1.5,
    emissive: slot.emissive ? new THREE.Color(slot.emissive) : new THREE.Color('#000000'),
    emissiveIntensity: slot.emissive ? Math.max(glowIntensity, 0.4) : 0,
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
 * CenterEmblem renders the category/level-specific 3D sculpted motif or engraved number/milestone plaque.
 * All center engraved texts and numbers are strictly HORIZONTAL and upright on both front and back faces.
 */
export const CenterEmblem: React.FC<CenterEmblemProps> = ({
  type,
  rarity,
  name = '',
  category,
  id,
  unlocked,
  glowIntensity,
  zOffset = 0.024,
  isShieldShape: propIsShieldShape,
}) => {
  const isShield = propIsShieldShape ?? (category === 'comeback' || category === 'level-milestones' || type === 'shield');
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const levelColors = getRarityLevelColors(rarity);
  const engraving = useMemo(() => getAchievementEngraving(name, type, category, id), [name, type, category, id]);

  const accentMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Accent, !unlocked, glowIntensity),
    [config, unlocked, glowIntensity]
  );

  const primaryMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Primary, !unlocked, glowIntensity),
    [config, unlocked, glowIntensity]
  );

  // Gem material for core jewel accents & glowing highlights
  const gemMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: config.auraColor,
      roughness: 0.1,
      metalness: 0.85,
      emissive: unlocked ? new THREE.Color(config.auraColor) : new THREE.Color('#000000'),
      emissiveIntensity: unlocked ? Math.max(glowIntensity * 1.3, 0.6) : 0,
      side: THREE.DoubleSide,
    });
    return m;
  }, [config, unlocked, glowIntensity]);

  // Center opaque divider plate material
  const dividerMat = useMemo(
    () => createPBRMaterial(config.materials.Rarity_Primary, !unlocked, 0),
    [config, unlocked]
  );

  // High-resolution Canvas Textures for engraved numbers & milestone text (Front and Back)
  const { engravedTexture, engravedBumpTexture } = useMemo(() => {
    if (engraving.type !== 'text' && engraving.type !== 'flame_number') {
      return { engravedTexture: null, engravedBumpTexture: null };
    }

    const size = 512;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bumpCtx = bumpCanvas.getContext('2d');

    if (!ctx || !bumpCtx) return { engravedTexture: null, engravedBumpTexture: null };

    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, size, size);

    if (isShield) {
      // -------------------------------------------------------------
      // HERALDIC PEAKED DEFENSE SHIELD CANVAS TEXTURE (1024x1024 Ultra-HD)
      // -------------------------------------------------------------
      const hdSize = 1024;
      canvas.width = hdSize;
      canvas.height = hdSize;
      bumpCanvas.width = hdSize;
      bumpCanvas.height = hdSize;

      const hdcx = hdSize / 2;
      const hdcy = hdSize / 2;

      ctx.clearRect(0, 0, hdSize, hdSize);
      bumpCtx.fillStyle = '#808080';
      bumpCtx.fillRect(0, 0, hdSize, hdSize);

      // 1. Outer Peaked Shield Background Plate
      ctx.beginPath();
      ctx.moveTo(hdcx, 50);
      ctx.lineTo(hdcx + 350, 180);
      ctx.bezierCurveTo(hdcx + 370, 470, hdcx + 250, 770, hdcx, 970);
      ctx.bezierCurveTo(hdcx - 250, 770, hdcx - 370, 470, hdcx - 350, 180);
      ctx.lineTo(hdcx, 50);
      ctx.closePath();

      const gradBg = ctx.createLinearGradient(hdcx, 50, hdcx, 970);
      if (unlocked) {
        gradBg.addColorStop(0, levelColors.plateColor);
        gradBg.addColorStop(1, '#080312');
      } else {
        gradBg.addColorStop(0, '#1e293b');
        gradBg.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = gradBg;
      ctx.fill();

      // Metallic Beveled Border on Defense Shield
      ctx.strokeStyle = unlocked ? levelColors.borderColor : '#475569';
      ctx.lineWidth = 20;
      ctx.stroke();

      // Secondary Inner Glow Line on Defense Shield
      if (unlocked) {
        ctx.strokeStyle = levelColors.primaryGlow;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(hdcx, 80);
        ctx.lineTo(hdcx + 320, 200);
        ctx.bezierCurveTo(hdcx + 340, 460, hdcx + 230, 740, hdcx, 930);
        ctx.bezierCurveTo(hdcx - 230, 740, hdcx - 340, 460, hdcx - 320, 200);
        ctx.lineTo(hdcx, 80);
        ctx.closePath();
        ctx.stroke();
      }

      // 2. Top Curved Title along upper shield crest
      const achievementTitle = (name || '').toUpperCase().trim();
      const chars = achievementTitle.split('');
      const totalAngle = Math.min(chars.length * 0.10, Math.PI * 0.62);
      const startAngle = -Math.PI / 2 - totalAngle / 2;
      const angleStep = totalAngle / Math.max(chars.length - 1, 1);
      const arcRadius = 290;
      const arcCenterY = 350;

      ctx.font = '900 44px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = unlocked ? '#fef08a' : '#94a3b8';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      chars.forEach((char, i) => {
        const angle = startAngle + i * angleStep;
        ctx.save();
        ctx.translate(hdcx + Math.cos(angle) * arcRadius, arcCenterY + Math.sin(angle) * arcRadius);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      });

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 3. Central Circular Beveled Number Plaque (Simple, Clean, Luxury Coin-Style)
      const plaqueY = hdcy + 25;
      const plaqueRadius = 180;

      // Inner Plaque Background
      const plaqueGrad = ctx.createRadialGradient(hdcx, plaqueY, 20, hdcx, plaqueY, plaqueRadius);
      plaqueGrad.addColorStop(0, unlocked ? levelColors.plateColor : '#1e293b');
      plaqueGrad.addColorStop(1, unlocked ? '#05020a' : '#0f172a');
      ctx.fillStyle = plaqueGrad;
      ctx.beginPath();
      ctx.arc(hdcx, plaqueY, plaqueRadius, 0, Math.PI * 2);
      ctx.fill();

      // Plaque Metallic Border
      ctx.strokeStyle = unlocked ? levelColors.borderColor : '#475569';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Plaque Inner Glow Ring
      if (unlocked) {
        ctx.strokeStyle = levelColors.primaryGlow;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(hdcx, plaqueY, plaqueRadius - 12, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Central Main Numeral (e.g. Lv 5, Lv 10, Lv 25, Lv 50, Lv 75, Lv 90, Lv 100, 100%, 7 DAYS, ARISE)
      const mainText = engraving.text || '';
      const subText = engraving.subText || '';

      let mainFontSize = 136;
      if (mainText.length > 5) mainFontSize = 104;
      if (mainText.length > 8) mainFontSize = 84;

      ctx.font = `900 ${mainFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      bumpCtx.font = `900 ${mainFontSize}px system-ui, sans-serif`;
      bumpCtx.textAlign = 'center';
      bumpCtx.textBaseline = 'middle';

      const numY = subText ? plaqueY - 18 : plaqueY;

      if (unlocked) {
        // Deep sunken drop-shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#05020a';
        ctx.fillText(mainText, hdcx, numY + 5);

        // High-contrast metallic gradient fill
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        const textGrad = ctx.createLinearGradient(0, numY - mainFontSize * 0.5, 0, numY + mainFontSize * 0.5);
        textGrad.addColorStop(0, levelColors.textGradient[0]);
        textGrad.addColorStop(0.4, levelColors.textGradient[1]);
        textGrad.addColorStop(1, levelColors.textGradient[2]);
        ctx.fillStyle = textGrad;
        ctx.fillText(mainText, hdcx, numY);

        // White bevel top highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 3;
        ctx.strokeText(mainText, hdcx, numY - 2);

        // SubText (e.g. "★")
        if (subText) {
          ctx.font = '800 48px system-ui, sans-serif';
          ctx.fillStyle = levelColors.textGradient[1];
          ctx.fillText(subText, hdcx, plaqueY + mainFontSize * 0.38);
        }
      } else {
        ctx.fillStyle = '#475569';
        ctx.fillText(mainText, hdcx, numY);
        if (subText) {
          ctx.font = '800 44px system-ui, sans-serif';
          ctx.fillStyle = '#334155';
          ctx.fillText(subText, hdcx, plaqueY + mainFontSize * 0.38);
        }
      }

      // 5. Bottom Rarity Tag
      ctx.font = '900 38px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = unlocked ? '#cbd5e1' : '#64748b';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText(rarity.toUpperCase(), hdcx, 860);
      ctx.shadowBlur = 0;
    } else {
      // -------------------------------------------------------------
      // MINTED CIRCULAR COIN CANVAS TEXTURE
      // -------------------------------------------------------------
      const gradBg = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.45);
      if (unlocked) {
        gradBg.addColorStop(0, levelColors.plateColor);
        gradBg.addColorStop(1, '#090514');
      } else {
        gradBg.addColorStop(0, '#1e293b');
        gradBg.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = gradBg;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.44, 0, Math.PI * 2);
      ctx.fill();

      // Metallic Beveled Border Ring
      ctx.strokeStyle = unlocked ? levelColors.borderColor : '#475569';
      ctx.lineWidth = 14;
      ctx.stroke();

      // Secondary Inner Glow Line
      if (unlocked) {
        ctx.strokeStyle = levelColors.primaryGlow;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.40, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Main Engraved Text (Strictly Horizontal)
      const mainText = engraving.text || '';
      const subText = engraving.subText || '';

      let mainFontSize = 130;
      if (mainText.length > 5) mainFontSize = 96;
      if (mainText.length > 8) mainFontSize = 76;
      if (mainText === '∞') mainFontSize = 190;

      const mainFontStr = `900 ${mainFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.font = mainFontStr;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      bumpCtx.font = mainFontStr;
      bumpCtx.textAlign = 'center';
      bumpCtx.textBaseline = 'middle';

      const textOffsetY = subText ? cy - 25 : cy;

      if (unlocked) {
        // 1. Deep sunken drop-shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#05020a';
        ctx.fillText(mainText, cx, textOffsetY + 4);

        // 2. High-contrast metallic gradient fill based on level
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        const textGrad = ctx.createLinearGradient(0, textOffsetY - mainFontSize * 0.5, 0, textOffsetY + mainFontSize * 0.5);
        textGrad.addColorStop(0, levelColors.textGradient[0]);
        textGrad.addColorStop(0.4, levelColors.textGradient[1]);
        textGrad.addColorStop(1, levelColors.textGradient[2]);

        ctx.fillStyle = textGrad;
        ctx.fillText(mainText, cx, textOffsetY);

        // 3. Crisp outer stroke & top highlight bevel
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.strokeText(mainText, cx, textOffsetY - 1.5);

        // 4. Bump map embossing
        bumpCtx.fillStyle = '#ffffff';
        bumpCtx.fillText(mainText, cx, textOffsetY);
        bumpCtx.strokeStyle = '#202020';
        bumpCtx.lineWidth = 10;
        bumpCtx.strokeText(mainText, cx, textOffsetY);

        // 5. SubText (e.g. "DAYS", "YEARS", "★", etc.)
        if (subText) {
          const subFontSize = 42;
          const subFontStr = `800 ${subFontSize}px system-ui, sans-serif`;
          ctx.font = subFontStr;
          bumpCtx.font = subFontStr;

          const subOffsetY = cy + mainFontSize * 0.42;

          ctx.fillStyle = levelColors.textGradient[1];
          ctx.fillText(subText, cx, subOffsetY);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.strokeText(subText, cx, subOffsetY - 1);

          bumpCtx.fillStyle = '#ffffff';
          bumpCtx.fillText(subText, cx, subOffsetY);
        }
      } else {
        // Locked State: Dark Carved Titanium
        ctx.fillStyle = '#334155';
        ctx.fillText(mainText, cx, textOffsetY);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeText(mainText, cx, textOffsetY);

        if (subText) {
          ctx.font = `800 38px system-ui, sans-serif`;
          ctx.fillStyle = '#475569';
          ctx.fillText(subText, cx, cy + 50);
        }

        bumpCtx.fillStyle = '#a0a0a0';
        bumpCtx.fillText(mainText, cx, textOffsetY);
      }
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

    return {
      engravedTexture: dTex,
      engravedBumpTexture: bTex,
    };
  }, [engraving, levelColors, unlocked, isShield, name, rarity]);

  const createMotifGroup = useMemo(() => {
    return () => {
      const g = new THREE.Group();

      // If achievement has an engraved text/milestone plaque (e.g. Lv 100, Lv 5, 5 YEARS, 1000, 365, 30, 50, etc.)
      if (engraving.type === 'text' && engravedTexture) {
        if (isShield) {
          // -------------------------------------------------------------
          // PEAKED HERALDIC DEFENSE SHIELD PLAQUE (Plane with Exact UVs)
          // -------------------------------------------------------------
          const plaqueGeo = new THREE.PlaneGeometry(0.58, 0.76);
          const plaqueMat = new THREE.MeshBasicMaterial({
            map: engravedTexture,
            transparent: true,
            side: THREE.FrontSide,
            depthWrite: false,
          });

          const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
          plaqueMesh.position.set(0, 0, 0.016);
          g.add(plaqueMesh);

          return g;
        } else {
          // -------------------------------------------------------------
          // MINTED CIRCULAR COIN PLAQUE
          // -------------------------------------------------------------
          const plaqueGeo = new THREE.CircleGeometry(0.34, 48);
          const plaqueMat = new THREE.MeshPhysicalMaterial({
            map: engravedTexture,
            bumpMap: engravedBumpTexture,
            bumpScale: 0.03,
            metalness: 0.85,
            roughness: 0.25,
            clearcoat: 0.6,
            clearcoatRoughness: 0.1,
            side: THREE.FrontSide,
          });

          const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
          plaqueMesh.position.z = 0.008;
          g.add(plaqueMesh);

          // Outer Metallic Bevel Rim Ring
          const outerBezel = new THREE.Mesh(
            new THREE.TorusGeometry(0.34, 0.015, 16, 48),
            accentMat
          );
          outerBezel.position.z = 0.009;
          g.add(outerBezel);

          return g;
        }
      }

      // Otherwise sculpted 3D geometries
      switch (type) {
        case 'flame': {
          // Sculpted 3D Flame Tongue
          const flameShape = new THREE.Shape();
          flameShape.moveTo(0, -0.36);
          flameShape.bezierCurveTo(0.32, -0.32, 0.38, 0.0, 0.2, 0.2);
          flameShape.bezierCurveTo(0.1, 0.3, 0.2, 0.42, 0.0, 0.58);
          flameShape.bezierCurveTo(-0.08, 0.4, -0.02, 0.3, -0.14, 0.2);
          flameShape.bezierCurveTo(-0.32, 0.05, -0.32, -0.32, 0, -0.36);

          const flameGeo = new THREE.ExtrudeGeometry(flameShape, {
            depth: 0.016,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.01,
            bevelThickness: 0.008,
          });
          flameGeo.center();

          const outerFlame = new THREE.Mesh(flameGeo, accentMat);
          outerFlame.scale.set(0.68, 0.68, 1);
          g.add(outerFlame);

          // Core flame ember
          const innerShape = new THREE.Shape();
          innerShape.moveTo(0, -0.2);
          innerShape.bezierCurveTo(0.16, -0.18, 0.2, 0.04, 0.0, 0.32);
          innerShape.bezierCurveTo(-0.2, 0.04, -0.16, -0.18, 0, -0.2);

          const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
            depth: 0.012,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.006,
            bevelThickness: 0.006,
          });
          innerGeo.center();
          const innerFlame = new THREE.Mesh(innerGeo, gemMat);
          innerFlame.scale.set(0.52, 0.52, 1);
          innerFlame.position.z = 0.01;
          g.add(innerFlame);

          // If flame with engraved number (e.g. 313)
          if (engraving.type === 'flame_number' && engravedTexture) {
            const numPlaque = new THREE.Mesh(
              new THREE.CircleGeometry(0.16, 24),
              new THREE.MeshBasicMaterial({ map: engravedTexture, transparent: true, side: THREE.FrontSide })
            );
            numPlaque.position.set(0, -0.04, 0.018);
            g.add(numPlaque);
          }
          break;
        }

        case 'shield': {
          // Crested Heraldic Shield
          const shieldShape = new THREE.Shape();
          shieldShape.moveTo(0, 0.38);
          shieldShape.bezierCurveTo(0.28, 0.38, 0.34, 0.2, 0.32, -0.04);
          shieldShape.bezierCurveTo(0.26, -0.24, 0.1, -0.38, 0, -0.46);
          shieldShape.bezierCurveTo(-0.1, -0.38, -0.26, -0.24, -0.32, -0.04);
          shieldShape.bezierCurveTo(-0.34, 0.2, -0.28, 0.38, 0, 0.38);

          const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
            depth: 0.016,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.01,
            bevelThickness: 0.008,
          });
          shieldGeo.center();

          const shieldMesh = new THREE.Mesh(shieldGeo, primaryMat);
          shieldMesh.scale.set(0.72, 0.72, 1);
          g.add(shieldMesh);

          const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), gemMat);
          boss.rotateX(Math.PI / 2);
          boss.position.z = 0.012;
          g.add(boss);
          break;
        }

        case 'crown': {
          // Royal Crown
          const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.04, 24), primaryMat);
          crownBase.rotateX(Math.PI / 2);
          crownBase.position.set(0, -0.14, 0.008);
          g.add(crownBase);

          for (let i = 0; i < 5; i++) {
            const angle = (i / 4 - 0.5) * 1.0;
            const height = i === 2 ? 0.26 : i % 2 === 1 ? 0.2 : 0.16;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, height, 4), accentMat);
            spike.position.set(Math.sin(angle) * 0.2, -0.1 + height / 2, 0.01);
            g.add(spike);

            const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), gemMat);
            jewel.position.set(Math.sin(angle) * 0.2, -0.1 + height + 0.012, 0.015);
            g.add(jewel);
          }
          break;
        }

        case 'trophy': {
          // Golden Championship Cup
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.09, 0.24, 20), accentMat);
          cup.rotateX(Math.PI / 2);
          cup.position.set(0, 0.05, 0.01);
          cup.scale.set(1, 0.25, 1);
          g.add(cup);

          const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 16), primaryMat);
          base.rotateX(Math.PI / 2);
          base.position.set(0, -0.14, 0.008);
          base.scale.set(1, 0.25, 1);
          g.add(base);

          const starTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), gemMat);
          starTop.position.set(0, 0.2, 0.015);
          g.add(starTop);
          break;
        }

        case 'swords': {
          // Crossed Blades
          const makeBlade = (rotZ: number) => {
            const bg = new THREE.Group();
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.52, 0.012), primaryMat);
            blade.position.set(0, 0.05, 0.008);
            bg.add(blade);

            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.014), accentMat);
            guard.position.set(0, -0.12, 0.01);
            bg.add(guard);

            bg.rotation.z = rotZ;
            return bg;
          };

          g.add(makeBlade(Math.PI / 4));
          g.add(makeBlade(-Math.PI / 4));

          const centerBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.012, 16), gemMat);
          centerBoss.rotateX(Math.PI / 2);
          centerBoss.position.z = 0.016;
          g.add(centerBoss);
          break;
        }

        case 'bolt': {
          // Lightning Bolt
          const boltShape = new THREE.Shape();
          boltShape.moveTo(0.07, 0.38);
          boltShape.lineTo(-0.15, 0.04);
          boltShape.lineTo(0.02, 0.04);
          boltShape.lineTo(-0.07, -0.38);
          boltShape.lineTo(0.15, -0.04);
          boltShape.lineTo(-0.02, -0.04);
          boltShape.lineTo(0.07, 0.38);

          const boltGeo = new THREE.ExtrudeGeometry(boltShape, {
            depth: 0.016,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.01,
            bevelThickness: 0.008,
          });
          boltGeo.center();

          const boltMesh = new THREE.Mesh(boltGeo, accentMat);
          boltMesh.scale.set(0.76, 0.76, 1);
          g.add(boltMesh);

          const boltCore = new THREE.Mesh(boltGeo, gemMat);
          boltCore.scale.set(0.62, 0.62, 1);
          boltCore.position.z = 0.01;
          g.add(boltCore);
          break;
        }

        case 'crystal': {
          // Faceted Crystal Gemstone
          const crystalGeo = new THREE.OctahedronGeometry(0.28, 0);
          const crystalMesh = new THREE.Mesh(crystalGeo, gemMat);
          crystalMesh.scale.set(0.65, 0.95, 0.2);
          crystalMesh.position.z = 0.01;
          g.add(crystalMesh);

          const cageRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.016, 8, 24), accentMat);
          cageRing.position.z = 0.012;
          g.add(cageRing);
          break;
        }

        case 'clock': {
          // Chronometer Clock Face
          const dialRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 12, 32), primaryMat);
          dialRing.position.z = 0.01;
          g.add(dialRing);

          const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.14, 0.01), accentMat);
          hourHand.position.set(0.035, 0.04, 0.014);
          hourHand.rotation.z = -Math.PI / 4;
          g.add(hourHand);

          const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.01), accentMat);
          minuteHand.position.set(-0.025, 0.06, 0.016);
          minuteHand.rotation.z = Math.PI / 6;
          g.add(minuteHand);

          const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 12), gemMat);
          pin.rotateX(Math.PI / 2);
          pin.position.z = 0.018;
          g.add(pin);
          break;
        }

        case 'robot':
        case 'chat': {
          // Cybernetic AI Node
          const headGeo = new THREE.BoxGeometry(0.28, 0.24, 0.018);
          const head = new THREE.Mesh(headGeo, primaryMat);
          head.position.z = 0.009;
          g.add(head);

          const visorGeo = new THREE.BoxGeometry(0.22, 0.07, 0.01);
          const visor = new THREE.Mesh(visorGeo, gemMat);
          visor.position.set(0, 0.025, 0.018);
          g.add(visor);

          const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), accentMat);
          antenna.position.set(0, 0.16, 0.009);
          g.add(antenna);
          break;
        }

        case 'leaf':
        case 'tree': {
          // Laurel Leaf Cluster
          for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
              const leafGeo = new THREE.SphereGeometry(0.06, 8, 8);
              leafGeo.scale(0.5, 1.2, 0.15);
              const leaf = new THREE.Mesh(leafGeo, accentMat);
              const angle = (i / 3) * Math.PI * 0.45 - 0.2;
              const radiusLeaf = 0.2;
              leaf.position.set(side * Math.cos(angle) * radiusLeaf, Math.sin(angle) * radiusLeaf - 0.03, 0.012);
              leaf.rotation.z = side * (angle + Math.PI / 4);
              g.add(leaf);
            }
          }

          const coreBerry = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), gemMat);
          coreBerry.position.set(0, -0.1, 0.015);
          g.add(coreBerry);
          break;
        }

        case 'phoenix': {
          // -------------------------------------------------------------
          // NOBLE GOLDEN PHOENIX EMBLEM (Matching Reference Artwork)
          // -------------------------------------------------------------
          // 1. Raised Golden Symmetrical Phoenix Wings
          const wingShape = new THREE.Shape();
          wingShape.moveTo(0, -0.08);
          wingShape.bezierCurveTo(0.12, 0.04, 0.24, 0.18, 0.28, 0.32);
          wingShape.bezierCurveTo(0.20, 0.24, 0.12, 0.14, 0.06, 0.08);
          wingShape.lineTo(0.04, 0.18);
          wingShape.bezierCurveTo(0.02, 0.12, 0.01, 0.06, 0, 0.02);
          wingShape.bezierCurveTo(-0.01, 0.06, -0.02, 0.12, -0.04, 0.18);
          wingShape.lineTo(-0.06, 0.08);
          wingShape.bezierCurveTo(-0.12, 0.14, -0.20, 0.24, -0.28, 0.32);
          wingShape.bezierCurveTo(-0.24, 0.18, -0.12, 0.04, 0, -0.08);
          wingShape.closePath();

          const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
            depth: 0.018,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.006,
            bevelThickness: 0.005,
          });
          wingGeo.center();

          const wings = new THREE.Mesh(wingGeo, accentMat);
          wings.position.set(0, 0.06, 0.01);
          g.add(wings);

          // 2. Noble Phoenix Head with Beak & Crown Crest (Facing Right)
          const headShape = new THREE.Shape();
          headShape.moveTo(0, 0.16);
          headShape.lineTo(0.05, 0.22); // Beak tip
          headShape.lineTo(0.02, 0.24);
          headShape.bezierCurveTo(0.04, 0.28, 0.03, 0.32, -0.04, 0.30); // Crown crest
          headShape.bezierCurveTo(-0.03, 0.24, -0.01, 0.18, 0, 0.16);
          headShape.closePath();

          const headGeo = new THREE.ExtrudeGeometry(headShape, {
            depth: 0.016,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.005,
            bevelThickness: 0.004,
          });
          headGeo.center();

          const headMesh = new THREE.Mesh(headGeo, primaryMat);
          headMesh.position.set(0.01, 0.20, 0.016);
          g.add(headMesh);

          // 3. Glowing Radiant Heart Core Gem
          const heartGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), gemMat);
          heartGem.position.set(0, 0.08, 0.02);
          g.add(heartGem);

          // 4. Cascading Magenta / Violet Fiery Tail Feathers
          const tailOffsets = [
            { x: 0, y: -0.18, scaleX: 0.8, scaleY: 1.2 },
            { x: -0.06, y: -0.14, scaleX: 0.6, scaleY: 0.9, rot: -0.2 },
            { x: 0.06, y: -0.14, scaleX: 0.6, scaleY: 0.9, rot: 0.2 },
            { x: -0.11, y: -0.09, scaleX: 0.5, scaleY: 0.7, rot: -0.4 },
            { x: 0.11, y: -0.09, scaleX: 0.5, scaleY: 0.7, rot: 0.4 },
          ];

          const tailShape = new THREE.Shape();
          tailShape.moveTo(0, 0.06);
          tailShape.bezierCurveTo(0.03, 0, 0.03, -0.1, 0, -0.16);
          tailShape.bezierCurveTo(-0.03, -0.1, -0.03, 0, 0, 0.06);
          tailShape.closePath();

          const tailGeo = new THREE.ExtrudeGeometry(tailShape, {
            depth: 0.012,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.004,
            bevelThickness: 0.003,
          });
          tailGeo.center();

          tailOffsets.forEach((pos) => {
            const plume = new THREE.Mesh(tailGeo, gemMat);
            plume.scale.set(pos.scaleX, pos.scaleY, 1);
            plume.position.set(pos.x, pos.y, 0.012);
            if (pos.rot) plume.rotation.z = pos.rot;
            g.add(plume);
          });
          break;
        }

        case 'infinity':
        case 'portal': {
          // Concentric Gyro Rings
          const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 12, 28), primaryMat);
          ring1.position.z = 0.01;
          g.add(ring1);

          const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.016, 12, 28), accentMat);
          ring2.position.z = 0.014;
          g.add(ring2);

          const gemCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), gemMat);
          gemCore.position.z = 0.018;
          g.add(gemCore);
          break;
        }

        case 'star':
        default: {
          // Faceted 8-Point Star
          const starShape = new THREE.Shape();
          const points = 8;
          for (let i = 0; i < points * 2; i++) {
            const l = i % 2 === 0 ? 0.3 : 0.13;
            const a = (i / (points * 2)) * Math.PI * 2;
            const x = Math.cos(a) * l;
            const y = Math.sin(a) * l;
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
          }
          starShape.closePath();

          const starGeo = new THREE.ExtrudeGeometry(starShape, {
            depth: 0.014,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.008,
            bevelThickness: 0.006,
          });
          starGeo.center();

          const starMesh = new THREE.Mesh(starGeo, accentMat);
          starMesh.scale.set(0.8, 0.8, 1);
          g.add(starMesh);

          const starGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), gemMat);
          starGem.position.z = 0.016;
          g.add(starGem);
          break;
        }
      }

      return g;
    };
  }, [type, engraving, engravedTexture, engravedBumpTexture, accentMat, primaryMat, gemMat]);

  const frontGroup = useMemo(() => createMotifGroup(), [createMotifGroup]);
  const backGroup = useMemo(() => createMotifGroup(), [createMotifGroup]);

  return (
    <group>
      {/* Central Solid Opaque Divider Plate — only for round coins */}
      {!isShield && (
        <mesh material={dividerMat} position={[0, 0, 0]}>
          <circleGeometry args={[0.38, 32]} />
        </mesh>
      )}

      {/* Front Face Motif (+Z face, strictly facing front) */}
      <primitive object={frontGroup} position={[0, 0, zOffset]} />

      {/* Back Face Mirrored Motif (-Z face, identical design strictly facing reverse) */}
      <primitive object={backGroup} rotation={[0, Math.PI, 0]} position={[0, 0, -zOffset]} />
    </group>
  );
};
