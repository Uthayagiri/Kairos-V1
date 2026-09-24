import React, { Suspense, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Lightformer, ContactShadows, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ModelType } from '../types/achievement.types';
import { AchievementModel } from './AchievementModel';
import { RARITY_CONFIG, Rarity } from './rarityConfig';

export interface AchievementViewerProps {
  name: string;
  url?: string;
  rarity: Rarity;
  modelType?: ModelType;
  category?: string;
  id?: string;
  progress: number;
  unlocked: boolean;
  height?: number | string;
  className?: string;
  fallback?: ReactNode;
  forceTrigger?: number;
}

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ViewerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('3D Achievement Viewer encountered an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-slate-100 rounded-3xl">
          <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">
            view_in_ar
          </span>
          <p className="text-xs font-bold text-slate-700">3D Collectible Fallback</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loader() {
  return (
    <Html center>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-wider animate-pulse shadow-lg">
        <span className="material-symbols-outlined text-sm text-primary animate-spin">
          progress_activity
        </span>
        <span>Loading Collectible...</span>
      </div>
    </Html>
  );
}

/**
 * Drop-in 3D Achievement Viewer.
 * 
 * Features:
 * - Studio lighting (Key, fill, rarity rim, upward bounce)
 * - Procedural reflections with Lightformers
 * - OrbitControls with touch drag rotation and pinch/scroll zoom
 * - Postprocessing restrained Bloom & Vignette
 * - Raised curved title engraved along the top outer arc
 * - Automatic error boundary and loading fallbacks
 */
export const AchievementViewer: React.FC<AchievementViewerProps> = ({
  name,
  url = '/models/valor-medal.glb',
  rarity,
  modelType,
  category,
  id,
  progress,
  unlocked,
  height = '100%',
  className = '',
  fallback,
  forceTrigger = 0,
}) => {
  const [interacting, setInteracting] = useState(false);
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const bloomStrength = unlocked
    ? config.bloomIntensity * (0.25 + clampedProgress * 0.75)
    : 0;

  return (
    <ViewerErrorBoundary fallback={fallback}>
      <div
        className={`w-full relative overflow-hidden select-none ${className}`}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          touchAction: 'none',
        }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 3.5], fov: 38 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#06060c']} />

          {/* Studio Lighting Setup */}
          <ambientLight intensity={0.4} />

          {/* Soft Key Light from top-right with soft shadow bias */}
          <directionalLight
            castShadow
            position={[3.2, 3.8, 3.5]}
            intensity={1.3}
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0001}
          />

          {/* Soft Fill Light from bottom-left for smooth contrast */}
          <directionalLight
            position={[-3, -1, 2.5]}
            intensity={0.45}
            color="#dbeafe"
          />

          {/* Subtle Rim / Back Light to define the medal silhouette */}
          <spotLight
            position={[0, 2.8, -3.2]}
            intensity={1.4}
            angle={Math.PI / 3}
            penumbra={0.8}
            color={config.auraColorSecondary || config.auraColor}
          />

          {/* Balanced Rear Key Light illuminating back face clearly when rotated */}
          <directionalLight
            position={[-2.8, 3.2, -3.5]}
            intensity={1.1}
            color="#ffffff"
          />

          {/* Gentle upward bounce defining bottom rim */}
          <directionalLight
            position={[0, -3, 1.5]}
            intensity={0.25}
            color="#cbd5e1"
          />

          <Suspense fallback={<Loader />}>
            {/* Procedural studio environment for reliable, zero-latency PBR reflections */}
            <Environment resolution={256}>
              <group rotation={[-Math.PI / 4, -0.3, 0]}>
                <Lightformer form="rect" intensity={2.5} position={[0, 5, 2]} scale={[8, 8, 1]} rotation-x={Math.PI / 3} />
                <Lightformer form="rect" intensity={1.5} position={[-5, 2, 1]} scale={[4, 8, 1]} rotation-y={Math.PI / 3} />
                <Lightformer form="rect" intensity={2.0} position={[5, 1, 1]} scale={[4, 8, 1]} rotation-y={-Math.PI / 3} />
                <Lightformer form="circle" intensity={0.8} position={[0, -4, 2]} scale={[6, 6, 1]} rotation-x={-Math.PI / 4} />
              </group>
            </Environment>

            <AchievementModel
              url={url}
              name={name}
              rarity={rarity}
              modelType={modelType}
              category={category}
              id={id}
              progress={clampedProgress}
              unlocked={unlocked}
              autoRotate={!interacting}
              forceTrigger={forceTrigger}
            />
            <ContactShadows position={[0, -0.85, 0]} opacity={0.45} scale={4.5} blur={2.0} far={2} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom
            enableRotate
            enableDamping
            dampingFactor={0.05}
            minDistance={2.2}
            maxDistance={6.0}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={(Math.PI * 3) / 4}
            rotateSpeed={0.8}
            zoomSpeed={0.7}
            onStart={() => setInteracting(true)}
            onEnd={() => setInteracting(false)}
            makeDefault
          />

          {bloomStrength > 0 && (
            <EffectComposer multisampling={4}>
              {/* Restrained Bloom: high threshold ensures only emissive accents and sparks glow */}
              <Bloom
                intensity={bloomStrength * 0.55}
                luminanceThreshold={0.75}
                luminanceSmoothing={0.25}
                mipmapBlur
              />
              <Vignette eskil={false} offset={0.25} darkness={0.55} />
            </EffectComposer>
          )}
        </Canvas>
      </div>
    </ViewerErrorBoundary>
  );
};
