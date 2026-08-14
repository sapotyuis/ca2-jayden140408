// Creates the canvas container and mounts the Three.js ocean scene for a page.
import { createClassNames } from '../helpers/cssClassNames.js';
import { createOceanScene } from './voyageWorld.js';

const oceanStyles = createClassNames('ocean-viewport');

export const mountOceanViewport = (container, { auth, worldClock, mode = 'title', interactive = false, collectiblesEnabled = false, fetchStatus = false, className = '', ...callbacks } = {}) => {
  const canvas = document.createElement('canvas');
  canvas.className = `${oceanStyles.canvas} ${className}`;
  canvas.setAttribute('aria-hidden', interactive ? 'false' : 'true');
  container.append(canvas);
  const scene = createOceanScene({
    canvas,
    api: (path, options) => auth?.api(path, options),
    getWorldTime: () => worldClock.getState(),
    mode,
    interactive,
    collectiblesEnabled,
    fetchStatus,
    ...callbacks,
  });
  const dispose = () => scene.dispose();
  dispose.scene = scene;
  dispose.canvas = canvas;
  return dispose;
};
