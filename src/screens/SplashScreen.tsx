import React, { useEffect, useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Kairos Engine...');
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);

  // Smooth loading progression that auto-advances to 100% and triggers onComplete
  useEffect(() => {
    let current = 0;
    const duration = 2400; // 2.4 seconds total splash duration
    const intervalTime = 25;
    const incrementStep = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      current += incrementStep + (Math.random() * 0.4 - 0.2);
      if (current >= 100) {
        current = 100;
        setProgress(100);
        setStatusText('System Ready');
        clearInterval(timer);

        if (!completedRef.current) {
          completedRef.current = true;
          // Short delay for the 100% "System Ready" state to be perceived smoothly
          setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
              onComplete();
            }, 300);
          }, 250);
        }
      } else {
        const rounded = Math.floor(current);
        setProgress(rounded);

        if (rounded < 25) {
          setStatusText('Initializing Kairos Core...');
        } else if (rounded < 55) {
          setStatusText('Calibrating Circadian Cadence...');
        } else if (rounded < 85) {
          setStatusText('Harmonizing Flow State...');
        } else {
          setStatusText('Finalizing Neural Harmony...');
        }
      }
    }, intervalTime);

    return () => {
      clearInterval(timer);
    };
  }, [onComplete]);

  // Canvas particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let animationFrameId: number;

    const PARTICLE_COUNT = 48;
    const REPEL_RADIUS = 110;
    const REPEL_FORCE = 2.6;
    const EASING_SPEED = 0.045;

    const pointer = {
      x: -9999,
      y: -9999,
      active: false
    };

    const colorPalette = [
      { r: 79, g: 70, b: 229, a: 0.65 },   // Indigo
      { r: 135, g: 146, b: 254, a: 0.60 }, // Soft Violet
      { r: 191, g: 15, b: 60, a: 0.55 },   // Deep Coral
      { r: 255, g: 178, b: 183, a: 0.70 }, // Pale Rose
      { r: 53, g: 37, b: 205, a: 0.50 }    // Deep Primary
    ];

    function resize() {
      if (!canvas || !ctx) return;
      dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);
    }

    class Particle {
      x = 0;
      y = 0;
      baseVx = 0;
      baseVy = 0;
      vx = 0;
      vy = 0;
      radius = 0;
      color = colorPalette[0];
      alpha = 0.5;
      currentAlpha = 0.5;
      pulseSpeed = 0.02;
      pulseAngle = 0;

      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * (width || window.innerWidth);
        this.y = initial ? Math.random() * (height || window.innerHeight) : (Math.random() < 0.5 ? -10 : height + 10);
        this.baseVx = (Math.random() - 0.5) * 0.45;
        this.baseVy = (Math.random() - 0.5) * 0.45 - 0.12;
        this.vx = this.baseVx;
        this.vy = this.baseVy;
        this.radius = Math.random() * 2.8 + 1.2;
        this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        this.alpha = Math.random() * 0.45 + 0.35;
        this.pulseSpeed = Math.random() * 0.03 + 0.01;
        this.pulseAngle = Math.random() * Math.PI * 2;
      }

      update() {
        if (pointer.active) {
          const dx = this.x - pointer.x;
          const dy = this.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < REPEL_RADIUS && dist > 0) {
            const normalized = 1 - dist / REPEL_RADIUS;
            const force = Math.sin(normalized * (Math.PI / 2)) * REPEL_FORCE;
            const angle = Math.atan2(dy, dx);
            this.vx += Math.cos(angle) * force * 0.12;
            this.vy += Math.sin(angle) * force * 0.12;
          }
        }

        this.vx += (this.baseVx - this.vx) * EASING_SPEED;
        this.vy += (this.baseVy - this.vy) * EASING_SPEED;

        this.x += this.vx;
        this.y += this.vy;

        this.pulseAngle += this.pulseSpeed;
        this.currentAlpha = this.alpha + Math.sin(this.pulseAngle) * 0.18;
        if (this.currentAlpha < 0.15) this.currentAlpha = 0.15;

        if (this.x < -20) this.x = width + 20;
        if (this.x > width + 20) this.x = -20;
        if (this.y < -20) this.y = height + 20;
        if (this.y > height + 20) this.y = -20;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.currentAlpha})`;
        ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.6)`;
        ctx.shadowBlur = this.radius * 3.5;
        ctx.fill();
        ctx.restore();
      }
    }

    const particles: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.update();
        p.draw();
      }
      animationFrameId = requestAnimationFrame(animate);
    }

    function getCanvasPos(clientX: number, clientY: number) {
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getCanvasPos(e.clientX, e.clientY);
      pointer.x = pos.x;
      pointer.y = pos.y;
      pointer.active = true;
    };

    const handleMouseLeave = () => {
      pointer.active = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
        pointer.x = pos.x;
        pointer.y = pos.y;
        pointer.active = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const pos = getCanvasPos(e.touches[0].clientX, e.touches[0].clientY);
        pointer.x = pos.x;
        pointer.y = pos.y;
        pointer.active = true;
      }
    };

    const handleTouchEnd = () => {
      pointer.active = false;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  // Optional tap handler: if user clicks before auto-transition, skip immediately to next screen
  const handleInteraction = async (e: React.MouseEvent<HTMLDivElement>) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Non-native fallback
    }

    const portal = portalRef.current;
    if (portal) {
      const rect = portal.getBoundingClientRect();
      const ripple = document.createElement('div');
      ripple.className = 'nexus-ripple';
      const size = Math.max(rect.width, rect.height) * 0.45;
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      portal.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);
    }

    if (!completedRef.current) {
      completedRef.current = true;
      setProgress(100);
      setStatusText('System Ready');
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
      }, 250);
    }
  };

  return (
    <div
      ref={portalRef}
      onClick={handleInteraction}
      className={`bg-background text-on-surface font-body-md h-full w-full flex flex-col pt-safe pb-safe selection:bg-primary-fixed selection:text-on-primary-fixed antialiased select-none relative overflow-hidden transition-all duration-300 ${
        isExiting ? 'animate-fade-out opacity-0 scale-105' : 'animate-fade-in opacity-100'
      }`}
      role="region"
      aria-label="Kairos Splash Loading Screen"
    >
      {/* Interactive Full-Screen Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto z-0" />

      {/* Dynamic Luminous Aura Meshes */}
      <div
        className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-secondary-fixed filter blur-3xl opacity-40 pointer-events-none animate-pulse"
        style={{ animationDuration: '7s' }}
      />
      <div
        className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-tertiary-fixed filter blur-3xl opacity-35 pointer-events-none animate-pulse"
        style={{ animationDuration: '9s', animationDelay: '1.5s' }}
      />
      <div
        className="absolute -bottom-16 left-1/4 w-72 h-72 rounded-full bg-primary-fixed filter blur-3xl opacity-40 pointer-events-none animate-pulse"
        style={{ animationDuration: '8s', animationDelay: '3s' }}
      />

      {/* Main Content Flow */}
      <div className="flex-1 flex flex-col w-full relative justify-between items-center px-4 py-4 z-10 pointer-events-none">
        {/* Top Spacer */}
        <div className="w-full h-6" />

        {/* Central Visual Anchor */}
        <div className="flex flex-col items-center justify-center text-center my-auto max-w-sm w-full">
          {/* Crystalline Logo Emblem */}
          <div className="relative flex items-center justify-center mb-space-2xl animate-orb-float">
            <div
              className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-[#6366f1]/30 via-[#ec4899]/25 to-[#38bdf8]/25 blur-2xl animate-aura-pulse pointer-events-none -z-10 opacity-60"
              style={{ boxShadow: 'rgba(168, 85, 247, 0.25) 0px 0px 45px 12px' }}
            />
            <div
              className="absolute w-48 h-48 rounded-full bg-gradient-to-bl from-[#ec4899]/35 via-[#8b5cf6]/30 to-[#06b6d4]/30 blur-xl pointer-events-none opacity-60 animate-pulse"
              style={{ animationDuration: '3.2s', boxShadow: 'rgba(99, 102, 241, 0.28) 0px 0px 35px 8px' }}
            />
            <div
              className="absolute w-48 h-48 rounded-full bg-white/30 blur-xl pointer-events-none animate-ping opacity-25"
              style={{ animationDuration: '4s' }}
            />

            {/* Glowing Orb Body */}
            <div
              className="relative z-10 w-[140px] h-[140px] rounded-full backdrop-blur-xl flex items-center justify-center overflow-hidden animate-orb-breath border border-white/80"
              style={{
                boxShadow:
                  'rgba(99, 102, 241, 0.32) 0px 0px 20px 4px, rgba(236, 72, 153, 0.22) 0px 0px 35px 10px, rgba(56, 189, 248, 0.18) 0px 0px 45px 12px, rgba(255, 255, 255, 0.65) 0px 0px 15px inset'
              }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] opacity-95" />
              <div
                className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-[#38bdf8] filter blur-lg opacity-60 animate-pulse"
                style={{ animationDuration: '3.5s' }}
              />
              <div
                className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-[#f43f5e] filter blur-lg opacity-60 animate-pulse"
                style={{ animationDuration: '3.8s', animationDelay: '0.8s' }}
              />
              <div className="absolute top-2 left-6 w-20 h-20 rounded-full bg-white filter blur-md opacity-60 pointer-events-none" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-[#1e1b4b]/30 via-transparent to-white/50 pointer-events-none" />
              <span className="relative z-20 font-display-lg text-display-lg font-extrabold text-white select-none tracking-tight animate-glyph drop-shadow-[0_0_16px_rgba(255,255,255,0.95)]">
                K
              </span>
            </div>
          </div>

          {/* Wordmark and Typographic Identity */}
          <div className="space-y-space-xs px-space-xs pointer-events-auto">
            <div className="flex items-center justify-center gap-space-2xs">
              <h1 className="font-display-lg-mobile text-display-lg-mobile text-on-surface tracking-tight font-extrabold">
                KAIROS
              </h1>
              <span
                className="inline-block w-2.5 h-2.5 rounded-full bg-primary-container -mt-4 animate-pulse"
                style={{ animationDuration: '2.2s' }}
              />
            </div>
            <p className="font-headline-sm text-headline-sm text-primary font-semibold">
              Your AI Life Companion
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mx-auto leading-relaxed">
              Aligning mind, energy, and cognitive cadence into your daily flow state.
            </p>
          </div>
        </div>

        {/* Dynamic Loading Progress Bar */}
        <div className="pb-4 sm:pb-8 flex flex-col items-center gap-space-sm w-full max-w-xs pointer-events-auto">
          <div className="flex flex-col items-center gap-space-xs w-full">
            <div className="w-56 h-2 bg-surface-container-high/80 rounded-full overflow-hidden p-0.5 relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-primary via-secondary to-tertiary rounded-full transition-all duration-100 ease-out shadow-sm shadow-primary/20"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between w-56 px-1 text-[11px] text-outline font-medium transition-all duration-200">
              <span>{statusText}</span>
              <span className="font-bold tabular-nums text-primary">{progress}%</span>
            </div>
          </div>

          <span className="font-label-sm text-label-sm text-outline tracking-wider font-semibold uppercase mt-0.5 opacity-80">
            Version 2.4.0 • Kairos OS
          </span>
        </div>
      </div>
    </div>
  );
};
