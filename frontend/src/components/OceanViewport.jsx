import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorldClock } from '../context/WorldClockContext';
import { createOceanScene } from '../ocean/createOceanScene';
import styles from './OceanViewport.module.css';

const EMPTY_UPGRADES = [];

/**
 * Shared Three.js canvas for every game-facing screen. The title and camp use the same world
 * renderer as the voyage, but with steering disabled and a cinematic camera so the ocean never
 * collapses into a flat decorative backdrop when the player changes routes.
 */
export default function OceanViewport({
  mode = 'showcase',
  interactive = mode === 'voyage',
  collectiblesEnabled = true,
  fetchStatus = mode !== 'title',
  initialRaftSize = 1,
  initialUpgrades = EMPTY_UPGRADES,
  className = '',
  onStatus,
  onLog,
  onInteract,
  onPovChange,
  onReticle,
  onReady,
}) {
  const canvasRef = useRef(null);
  const { api } = useAuth();
  const worldTime = useWorldClock();
  const apiRef = useRef(api);
  const worldTimeRef = useRef(worldTime);
  const callbacksRef = useRef({ onStatus, onLog, onInteract, onPovChange, onReticle, onReady });

  apiRef.current = api;
  worldTimeRef.current = worldTime;
  callbacksRef.current = { onStatus, onLog, onInteract, onPovChange, onReticle, onReady };

  useEffect(() => {
    const scene = createOceanScene({
      canvas: canvasRef.current,
      api: (path, options) => apiRef.current(path, options),
      getWorldTime: () => worldTimeRef.current,
      mode,
      interactive,
      collectiblesEnabled,
      fetchStatus,
      initialRaftSize,
      initialUpgrades,
      onStatus: (next) => callbacksRef.current.onStatus?.(next),
      onLog: (text, tone) => callbacksRef.current.onLog?.(text, tone),
      onInteract: () => callbacksRef.current.onInteract?.(),
      onPovChange: (next) => callbacksRef.current.onPovChange?.(next),
      onReticle: (active) => callbacksRef.current.onReticle?.(active),
      onReady: () => callbacksRef.current.onReady?.(),
    });

    return () => scene.dispose();
  }, [mode, interactive, collectiblesEnabled, fetchStatus, initialRaftSize, initialUpgrades]);

  return <canvas ref={canvasRef} className={`${styles.canvas} ${className}`} aria-hidden={!interactive} />;
}
