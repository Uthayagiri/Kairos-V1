import { useEffect, useRef, useState, useCallback } from 'react';
import { useSpring } from '@react-spring/three';

export interface UnlockAnimationState {
  scale: any;
  rotationBoost: any;
  flash: any;          // 0..1, drives emissive light pulse
  elevationZ: any;     // forward floating pop
  tiltWobble: any;     // dynamic tilt catching light
  isAnimating: boolean;
  burst: boolean;       // true during explosive sequence
  trigger: () => void;  // manual trigger for testing/replay
}

/**
 * Supercharged multi-phase spring unlock animation:
 * 1. Rapid multi-revolution spin (8π = 4 full high-speed spins)
 * 2. Dramatic fly-in pop (bringing the medal forward toward the camera)
 * 3. Radiant flash bloom spike
 * 4. Harmonic spring bounce settling gracefully to upright idle position
 */
export function useUnlockAnimation(unlocked: boolean, forceTrigger = 0): UnlockAnimationState {
  const prevUnlocked = useRef(unlocked);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [burst, setBurst] = useState(false);
  const [triggerCount, setTriggerCount] = useState(forceTrigger);

  const trigger = useCallback(() => {
    setJustUnlocked(false);
    setBurst(false);
    // Micro-delay to reset spring state cleanly
    setTimeout(() => {
      setJustUnlocked(true);
      setBurst(true);
    }, 16);
  }, []);

  // Automatic trigger on unlocked transition false -> true
  useEffect(() => {
    if (!prevUnlocked.current && unlocked) {
      trigger();
    }
    prevUnlocked.current = unlocked;
  }, [unlocked, trigger]);

  // External trigger prop changes
  useEffect(() => {
    if (forceTrigger > 0 && forceTrigger !== triggerCount) {
      setTriggerCount(forceTrigger);
      trigger();
    }
  }, [forceTrigger, triggerCount, trigger]);

  // Timers to reset animation states
  useEffect(() => {
    if (justUnlocked) {
      const t = setTimeout(() => setJustUnlocked(false), 1400);
      const tb = setTimeout(() => setBurst(false), 1800);
      return () => {
        clearTimeout(t);
        clearTimeout(tb);
      };
    }
  }, [justUnlocked]);

  const { scale, rotationBoost, flash, elevationZ, tiltWobble } = useSpring({
    scale: justUnlocked ? 1.35 : 1,
    rotationBoost: justUnlocked ? Math.PI * 8 : 0, // 4 full fast rotations
    flash: justUnlocked ? 1 : 0,
    elevationZ: justUnlocked ? 0.35 : 0,           // Surges forward toward the camera
    tiltWobble: justUnlocked ? 0.2 : 0,
    config: justUnlocked
      ? { tension: 180, friction: 12, mass: 1.15 } // Snappy explosive pop with springy rebound
      : { tension: 190, friction: 20, mass: 1 },   // Smooth settle
  });

  return {
    scale,
    rotationBoost,
    flash,
    elevationZ,
    tiltWobble,
    isAnimating: justUnlocked,
    burst,
    trigger,
  };
}
