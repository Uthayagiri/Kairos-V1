import React, { useEffect, useRef, useId, useMemo } from 'react';
import gsap from 'gsap';
import { AchievementRarity } from '../types/achievement.types';

export interface PhoenixWingsMedalAnimationProps {
  unlocked?: boolean;
  rarity?: AchievementRarity;
  glowColor?: string;
  triggerKey?: string | number;
  size?: number | string;
  className?: string;
  emblemIcon?: string;
  title?: string;
  level?: number | string;
  tier?: number | string;
  xpReward?: number;
  hpReward?: number;
  interactive?: boolean;
  onAnimationComplete?: () => void;
}

/**
 * Phoenix Wings Medal Animation Component (Broad, Gapless, Detailed Center Crest)
 * Features:
 * - Broad multi-tiered sweeping feathers (Outer Major, Middle Coverts, Inner Flank)
 * - Detailed Center Crest with Level, Rarity Tier, Engraved Title Banner, and Reward Tag
 * - Dynamic GSAP timeline unfold sequence
 */
export const PhoenixWingsMedalAnimation: React.FC<PhoenixWingsMedalAnimationProps> = ({
  unlocked = true,
  rarity = 'legendary',
  glowColor = '#ff7800',
  triggerKey,
  size = '100%',
  className = '',
  emblemIcon,
  title = 'PHOENIX VALOR',
  level = '10',
  tier = 'TIER I',
  xpReward,
  hpReward,
  interactive = true,
  onAnimationComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const uniqueId = useId().replace(/:/g, '_');

  const shieldGradId = `shieldGrad_${uniqueId}`;
  const outerGradId = `outerGrad_${uniqueId}`;
  const midGradId = `midGrad_${uniqueId}`;
  const innerGradId = `innerGrad_${uniqueId}`;
  const plaqueGradId = `plaqueGrad_${uniqueId}`;

  // Clean formatted strings for engraving
  const cleanTitle = useMemo(() => {
    const raw = (title || 'VALOR').trim().toUpperCase();
    return raw.length > 18 ? `${raw.slice(0, 16)}...` : raw;
  }, [title]);

  const levelNumeral = useMemo(() => {
    if (typeof level === 'number') return String(level);
    const raw = String(level || '10').replace(/^LVL\s*/i, '').trim();
    return raw || '10';
  }, [level]);

  const tierLabel = useMemo(() => {
    if (typeof tier === 'number') return `TIER ${tier}`;
    return String(tier || 'TIER I').toUpperCase();
  }, [tier]);

  const rarityLabel = useMemo(() => {
    return (rarity || 'LEGENDARY').toUpperCase();
  }, [rarity]);

  const starCount = useMemo(() => {
    if (typeof tier === 'number') return Math.min(Math.max(tier, 1), 5);
    const match = String(tier || '').match(/\d+/);
    if (match) return Math.min(Math.max(parseInt(match[0], 10), 1), 5);
    if (/IV|4/i.test(String(tier))) return 4;
    if (/III|3/i.test(String(tier))) return 3;
    if (/II|2/i.test(String(tier))) return 2;
    if (/V|5/i.test(String(tier))) return 5;
    return 3;
  }, [tier]);

  const rewardLabel = useMemo(() => {
    if (xpReward && xpReward > 0) return `+${xpReward} XP`;
    return '✦ MASTER ✦';
  }, [xpReward]);

  // Radiant color gradients tailored to rarity tier
  const gradientStops = useMemo(() => {
    switch (rarity) {
      case 'mythic':
        return {
          shield: [
            { offset: '0%', color: '#ffd000' },
            { offset: '50%', color: '#ff007f' },
            { offset: '100%', color: '#7a00ff' }
          ],
          outer: [
            { offset: '0%', color: '#00d4ff' },
            { offset: '30%', color: '#9900ff' },
            { offset: '65%', color: '#ff007f' },
            { offset: '100%', color: '#ffaa00' }
          ],
          mid: [
            { offset: '0%', color: '#00f0ff' },
            { offset: '45%', color: '#ff00aa' },
            { offset: '85%', color: '#ff8800' },
            { offset: '100%', color: '#ffd700' }
          ],
          inner: [
            { offset: '0%', color: '#67e8f9' },
            { offset: '45%', color: '#f43f5e' },
            { offset: '100%', color: '#fef08a' }
          ],
          emblemColor: '#ffd700',
          accentBorder: '#ff007f',
          dropGlow: 'rgba(255, 0, 128, 0.65)'
        };
      case 'epic':
        return {
          shield: [
            { offset: '0%', color: '#f0abfc' },
            { offset: '50%', color: '#a855f7' },
            { offset: '100%', color: '#4338ca' }
          ],
          outer: [
            { offset: '0%', color: '#38bdf8' },
            { offset: '30%', color: '#818cf8' },
            { offset: '65%', color: '#c084fc' },
            { offset: '100%', color: '#f472b6' }
          ],
          mid: [
            { offset: '0%', color: '#60a5fa' },
            { offset: '45%', color: '#a855f7' },
            { offset: '100%', color: '#fbcfe8' }
          ],
          inner: [
            { offset: '0%', color: '#93c5fd' },
            { offset: '45%', color: '#c084fc' },
            { offset: '100%', color: '#ffffff' }
          ],
          emblemColor: '#f5d0fe',
          accentBorder: '#c084fc',
          dropGlow: 'rgba(168, 85, 247, 0.65)'
        };
      case 'rare':
        return {
          shield: [
            { offset: '0%', color: '#38bdf8' },
            { offset: '50%', color: '#2563eb' },
            { offset: '100%', color: '#1e1b4b' }
          ],
          outer: [
            { offset: '0%', color: '#00d4ff' },
            { offset: '30%', color: '#3b82f6' },
            { offset: '65%', color: '#60a5fa' },
            { offset: '100%', color: '#93c5fd' }
          ],
          mid: [
            { offset: '0%', color: '#22d3ee' },
            { offset: '45%', color: '#3b82f6' },
            { offset: '100%', color: '#bfdbfe' }
          ],
          inner: [
            { offset: '0%', color: '#67e8f9' },
            { offset: '45%', color: '#60a5fa' },
            { offset: '100%', color: '#ffffff' }
          ],
          emblemColor: '#bae6fd',
          accentBorder: '#38bdf8',
          dropGlow: 'rgba(56, 189, 248, 0.65)'
        };
      case 'legendary':
      default:
        return {
          shield: [
            { offset: '0%', color: '#ffd000' },
            { offset: '50%', color: '#ff3b30' },
            { offset: '100%', color: '#7a00ff' }
          ],
          outer: [
            { offset: '0%', color: '#00d4ff' },
            { offset: '25%', color: '#7c3aed' },
            { offset: '60%', color: '#e11d48' },
            { offset: '100%', color: '#ff9900' }
          ],
          mid: [
            { offset: '0%', color: '#00f0ff' },
            { offset: '40%', color: '#ff00aa' },
            { offset: '80%', color: '#ff9900' },
            { offset: '100%', color: '#ffdd00' }
          ],
          inner: [
            { offset: '0%', color: '#38bdf8' },
            { offset: '45%', color: '#fb7185' },
            { offset: '100%', color: '#fef08a' }
          ],
          emblemColor: '#ffd700',
          accentBorder: '#f59e0b',
          dropGlow: 'rgba(255, 120, 0, 0.65)'
        };
    }
  }, [rarity]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const shield = el.querySelector('.phoenix-shield');
      const innerFeathers = el.querySelectorAll('.phoenix-inner-feather');
      const midFeathers = el.querySelectorAll('.phoenix-mid-feather');
      const outerFeathers = el.querySelectorAll('.phoenix-outer-feather');
      const crestDetails = el.querySelectorAll('.phoenix-crest-detail');

      if (!shield || innerFeathers.length === 0 || midFeathers.length === 0 || outerFeathers.length === 0) return;

      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      if (!unlocked) {
        gsap.set(shield, { scale: 0.85, opacity: 0.5 });
        gsap.set([innerFeathers, midFeathers, outerFeathers], {
          scale: 0,
          opacity: 0,
          rotation: 35
        });
        return;
      }

      // Initial hidden tucked state
      gsap.set(shield, { scale: 0, opacity: 0 });
      gsap.set(crestDetails, { scale: 0.8, opacity: 0 });
      gsap.set([innerFeathers, midFeathers, outerFeathers], {
        scale: 0,
        opacity: 0,
        rotation: 38
      });

      const tl = gsap.timeline({
        defaults: { ease: 'back.out(1.6)' },
        onComplete: () => {
          if (onAnimationComplete) onAnimationComplete();
        }
      });
      timelineRef.current = tl;

      // 1. Shield drops in and flares with elastic resonance
      tl.to(shield, {
        scale: 1,
        opacity: 1,
        duration: 0.75,
        ease: 'elastic.out(1, 0.75)'
      })
        // 2. Layer 1 Inner Flank plumage unfolds sequentially (bottom -> top)
        .to(
          innerFeathers,
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.45,
            stagger: 0.07
          },
          '+=0.04'
        )
        // 3. Layer 2 Middle Coverts unfold (bottom -> top)
        .to(
          midFeathers,
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.5,
            stagger: 0.06
          },
          '-=0.25'
        )
        // 4. Layer 3 Big Outer Wing Feathers unfold grandly behind (bottom -> top)
        .to(
          outerFeathers,
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.6,
            stagger: 0.05
          },
          '-=0.3'
        )
        // 5. Center Crest details shine & pop in
        .to(
          crestDetails,
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            stagger: 0.06,
            ease: 'back.out(2)'
          },
          '-=0.2'
        );
    }, el);

    return () => ctx.revert();
  }, [unlocked, triggerKey, onAnimationComplete]);

  const handleMouseEnter = () => {
    if (!interactive || !unlocked || !containerRef.current) return;
    const outerFeathers = containerRef.current.querySelectorAll('.phoenix-outer-feather');
    const midFeathers = containerRef.current.querySelectorAll('.phoenix-mid-feather');
    const shield = containerRef.current.querySelector('.phoenix-shield');

    gsap.to(outerFeathers, {
      scale: 1.05,
      duration: 0.35,
      stagger: 0.02,
      ease: 'power2.out'
    });
    gsap.to(midFeathers, {
      scale: 1.03,
      duration: 0.35,
      stagger: 0.015,
      ease: 'power2.out'
    });
    gsap.to(shield, {
      scale: 1.04,
      duration: 0.35,
      ease: 'back.out(1.8)'
    });
  };

  const handleMouseLeave = () => {
    if (!interactive || !unlocked || !containerRef.current) return;
    const outerFeathers = containerRef.current.querySelectorAll('.phoenix-outer-feather');
    const midFeathers = containerRef.current.querySelectorAll('.phoenix-mid-feather');
    const shield = containerRef.current.querySelector('.phoenix-shield');

    gsap.to([outerFeathers, midFeathers], {
      scale: 1,
      duration: 0.4,
      stagger: 0.01,
      ease: 'power2.inOut'
    });
    gsap.to(shield, {
      scale: 1,
      duration: 0.4,
      ease: 'power2.inOut'
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
        height: typeof size === 'number' ? `${size}px` : size
      }}
      title={title}
    >
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full overflow-visible"
        style={{
          filter: `drop-shadow(0 0 30px ${gradientStops.dropGlow})`
        }}
      >
        <defs>
          {/* Shield Gradient */}
          <linearGradient id={shieldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {gradientStops.shield.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* Outer Major Wing Gradient */}
          <linearGradient id={outerGradId} x1="0%" y1="100%" x2="0%" y2="0%">
            {gradientStops.outer.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* Middle Wing Gradient */}
          <linearGradient id={midGradId} x1="0%" y1="100%" x2="0%" y2="0%">
            {gradientStops.mid.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* Inner Wing Gradient */}
          <linearGradient id={innerGradId} x1="0%" y1="100%" x2="0%" y2="0%">
            {gradientStops.inner.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} />
            ))}
          </linearGradient>

          {/* Center Plaque Radial Gradient */}
          <radialGradient id={plaqueGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="70%" stopColor="#140628" />
            <stop offset="100%" stopColor="#0a0218" />
          </radialGradient>

          <filter id={`emblemGlow_${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* LAYER 3: BROAD OUTER MAJOR PINIONS (8 BROAD OVERLAPPING FEATHERS PER SIDE - ZERO GAP) */}
        <g id={`outer-wings_${uniqueId}`}>
          {/* Left Outer Broad Pinions */}
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M265,365 C195,430 120,445 40,420 C110,375 195,335 265,365 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M260,338 C180,395 100,405 25,365 C95,330 180,300 260,338 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M255,308 C165,355 85,355 15,305 C85,275 170,260 255,308 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M250,278 C155,305 75,295 10,235 C80,220 165,220 250,278 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M248,248 C150,255 70,225 15,160 C80,165 165,180 248,248 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M250,218 C155,200 80,150 35,85 C95,110 175,140 250,218 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M255,190 C165,145 100,85 65,25 C115,60 190,105 255,190 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M260,165 C175,95 125,35 100,-10 C140,20 205,75 260,165 Z"
            fill={`url(#${outerGradId})`}
          />

          {/* Right Outer Broad Pinions */}
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M335,365 C405,430 480,445 560,420 C490,375 405,335 335,365 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M340,338 C420,395 500,405 575,365 C505,330 420,300 340,338 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M345,308 C435,355 515,355 585,305 C515,275 430,260 345,308 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M350,278 C445,305 525,295 590,235 C520,220 435,220 350,278 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M352,248 C450,255 530,225 585,160 C520,165 435,180 352,248 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M350,218 C445,200 520,150 565,85 C505,110 425,140 350,218 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M345,190 C435,145 500,85 535,25 C485,60 410,105 345,190 Z"
            fill={`url(#${outerGradId})`}
          />
          <path
            className="phoenix-outer-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M340,165 C425,95 475,35 500,-10 C460,20 395,75 340,165 Z"
            fill={`url(#${outerGradId})`}
          />
        </g>

        {/* LAYER 2: BROAD MIDDLE COVERTS (6 BROAD OVERLAPPING FEATHERS PER SIDE) */}
        <g id={`mid-wings_${uniqueId}`}>
          {/* Left Middle Broad Feathers */}
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M270,350 C205,400 140,400 80,365 C135,330 210,315 270,350 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M265,320 C190,360 120,350 65,300 C125,275 200,275 265,320 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M260,290 C180,310 110,280 60,220 C120,210 195,230 260,290 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M258,260 C175,255 105,195 65,140 C120,150 190,190 258,260 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M260,230 C180,200 120,135 90,70 C135,100 200,150 260,230 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M265,200 C190,145 140,80 120,20 C155,55 210,115 265,200 Z"
            fill={`url(#${midGradId})`}
          />

          {/* Right Middle Broad Feathers */}
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M330,350 C395,400 460,400 520,365 C465,330 390,315 330,350 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M335,320 C410,360 480,350 535,300 C475,275 400,275 335,320 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M340,290 C420,310 490,280 540,220 C480,210 405,230 340,290 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M342,260 C425,255 495,195 535,140 C480,150 410,190 342,260 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M340,230 C420,200 480,135 510,70 C465,100 400,150 340,230 Z"
            fill={`url(#${midGradId})`}
          />
          <path
            className="phoenix-mid-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M335,200 C410,145 460,80 480,20 C445,55 390,115 335,200 Z"
            fill={`url(#${midGradId})`}
          />
        </g>

        {/* LAYER 1: BROAD INNER FLANK PLUMAGE (5 BROAD FEATHERS HUGGING SHIELD FLANK) */}
        <g id={`inner-wings_${uniqueId}`}>
          {/* Left Inner Broad Feathers */}
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M275,340 C225,375 165,375 115,345 C160,320 220,310 275,340 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M272,310 C215,335 150,315 105,270 C150,255 215,260 272,310 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M268,280 C205,285 140,240 100,185 C145,185 210,215 268,280 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M265,250 C200,240 140,175 115,115 C155,130 210,175 265,250 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '260px 300px' }}
            d="M268,220 C205,190 155,120 135,60 C170,90 220,140 268,220 Z"
            fill={`url(#${innerGradId})`}
          />

          {/* Right Inner Broad Feathers */}
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M325,340 C375,375 435,375 485,345 C440,320 380,310 325,340 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M328,310 C385,335 450,315 495,270 C450,255 385,260 328,310 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M332,280 C395,285 460,240 500,185 C455,185 390,215 332,280 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M335,250 C400,240 460,175 485,115 C445,130 390,175 335,250 Z"
            fill={`url(#${innerGradId})`}
          />
          <path
            className="phoenix-inner-feather"
            style={{ transformOrigin: '340px 300px' }}
            d="M332,220 C395,190 445,120 465,60 C430,90 380,140 332,220 Z"
            fill={`url(#${innerGradId})`}
          />
        </g>

        {/* SHIELD & DETAILED CENTER CREST (FRONT LAYER) */}
        <g
          id={`shield_${uniqueId}`}
          className="phoenix-shield"
          style={{ transformOrigin: '300px 300px' }}
        >
          {/* Outer Heraldic Shield Chassis */}
          <path
            d="M300,135 L415,175 C415,305 375,400 300,450 C225,400 185,305 185,175 Z"
            fill="#100524"
            stroke={`url(#${shieldGradId})`}
            strokeWidth="7"
          />

          {/* Inner Inset Shield Plate */}
          <path
            d="M300,148 L400,183 C400,298 365,385 300,432 C235,385 200,298 200,183 Z"
            fill={`url(#${plaqueGradId})`}
            stroke="rgba(255, 255, 255, 0.18)"
            strokeWidth="1.2"
          />

          {/* --- DETAILED CENTER ENGRAVINGS & MEDAL STATS --- */}

          {/* 1. Top Crest Header Arc: Rarity Title */}
          <g className="phoenix-crest-detail">
            <rect
              x="218"
              y="160"
              width="164"
              height="24"
              rx="12"
              fill="#140628"
              stroke={`url(#${shieldGradId})`}
              strokeWidth="1.2"
              opacity="0.95"
            />
            <text
              x="300"
              y="176"
              textAnchor="middle"
              fill={gradientStops.emblemColor}
              fontSize="9.5"
              fontWeight="900"
              letterSpacing="2.5"
              style={{
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))'
              }}
            >
              ✦ {rarityLabel} ✦
            </text>
          </g>

          {/* 2. Center Level Medallion Plaque with Metallic Rivets & Stars */}
          <g className="phoenix-crest-detail" style={{ transformOrigin: '300px 240px' }}>
            {/* Medallion Outer Ring */}
            <circle
              cx="300"
              cy="240"
              r="44"
              fill="#180738"
              stroke={`url(#${shieldGradId})`}
              strokeWidth="3"
            />
            {/* Decorative Dashed Ring */}
            <circle
              cx="300"
              cy="240"
              r="38"
              fill="none"
              stroke={gradientStops.emblemColor}
              strokeWidth="1"
              strokeDasharray="3,2.5"
              opacity="0.8"
            />

            {/* 8 Perimeter Metallic Rivets */}
            <circle cx="342" cy="240" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="330" cy="270" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="300" cy="282" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="270" cy="270" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="258" cy="240" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="270" cy="210" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="300" cy="198" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />
            <circle cx="330" cy="210" r="1.8" fill={gradientStops.emblemColor} opacity="0.9" />

            {/* LEVEL Label */}
            <text
              x="300"
              y="218"
              textAnchor="middle"
              fill={gradientStops.emblemColor}
              fontSize="8.5"
              fontWeight="900"
              letterSpacing="2.5"
            >
              LEVEL
            </text>

            {/* Large Bold Level Numeral */}
            <text
              x="300"
              y="254"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="30"
              fontWeight="900"
              fontFamily="monospace, sans-serif"
              style={{
                filter: 'drop-shadow(0 2px 8px rgba(255,215,0,0.85))'
              }}
            >
              {levelNumeral}
            </text>

            {/* Dynamic Rank Stars Under Level */}
            <g className="phoenix-level-stars">
              {Array.from({ length: starCount }).map((_, i) => {
                const spacing = 9.5;
                const startX = 300 - ((starCount - 1) * spacing) / 2;
                const sx = startX + i * spacing;
                const sy = 267;
                return (
                  <polygon
                    key={i}
                    points={`${sx},${sy - 3.5} ${sx + 1.8},${sy} ${sx + 4.5},${sy} ${sx + 2.2},${sy + 2.2} ${sx + 3.2},${sy + 5} ${sx},${sy + 3.3} ${sx - 3.2},${sy + 5} ${sx - 2.2},${sy + 2.2} ${sx - 4.5},${sy} ${sx - 1.8},${sy}`}
                    fill={gradientStops.emblemColor}
                  />
                );
              })}
            </g>
          </g>

          {/* 3. Engraved Title Banner Ribbon */}
          <g className="phoenix-crest-detail">
            {/* Left Ribbon Tail */}
            <polygon
              points="184,310 206,296 206,324"
              fill="#0d0220"
              stroke={`url(#${shieldGradId})`}
              strokeWidth="1"
            />
            {/* Right Ribbon Tail */}
            <polygon
              points="416,310 394,296 394,324"
              fill="#0d0220"
              stroke={`url(#${shieldGradId})`}
              strokeWidth="1"
            />
            {/* Main Banner Plate */}
            <polygon
              points="196,294 404,294 392,328 208,328"
              fill="#180738"
              stroke={`url(#${shieldGradId})`}
              strokeWidth="2"
            />
            {/* Title Text */}
            <text
              x="300"
              y="316"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="900"
              letterSpacing="1.2"
              style={{
                filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))'
              }}
            >
              {cleanTitle}
            </text>
          </g>

          {/* 4. Bottom Tier & Rewards Matrix Badges */}
          <g className="phoenix-crest-detail">
            {/* Left: Tier Pill */}
            <rect
              x="208"
              y="342"
              width="88"
              height="22"
              rx="11"
              fill="#180738"
              stroke={`url(#${shieldGradId})`}
              strokeWidth="1.2"
            />
            <text
              x="252"
              y="357"
              textAnchor="middle"
              fill={gradientStops.emblemColor}
              fontSize="9"
              fontWeight="900"
              letterSpacing="1.5"
            >
              {tierLabel}
            </text>

            {/* Right: XP / HP Reward Pill */}
            <rect
              x="304"
              y="342"
              width="88"
              height="22"
              rx="11"
              fill="#180738"
              stroke="#38bdf8"
              strokeWidth="1.2"
            />
            <text
              x="348"
              y="357"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="9"
              fontWeight="900"
              letterSpacing="1"
            >
              {rewardLabel}
            </text>
          </g>

          {/* 5. Bottom Apex Star & Heraldic Chevron Flourishes */}
          <g className="phoenix-crest-detail">
            <polygon
              points="300,386 305,397 317,397 307,404 311,416 300,409 289,416 293,404 283,397 295,397"
              fill={gradientStops.emblemColor}
              filter={`url(#emblemGlow_${uniqueId})`}
            />
            <path
              d="M265,392 L300,426 L335,392"
              fill="none"
              stroke={gradientStops.emblemColor}
              strokeWidth="1.2"
              opacity="0.7"
            />
            <path
              d="M280,396 L300,416 L320,396"
              fill="none"
              stroke={gradientStops.emblemColor}
              strokeWidth="0.8"
              opacity="0.5"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default PhoenixWingsMedalAnimation;
