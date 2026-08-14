// Creates the canvas container and mounts the Three.js ocean scene for a page.
import { createClassNames } from '../helpers/cssClassNames.js';
import { createOceanScene } from './voyageWorld.js';

const oceanStyles = createClassNames('ocean-viewport');

export const mountOceanViewport = (container, { auth, worldClock, mode = 'title', interactive = false, collectiblesEnabled = false, fetchStatus = false, ...callbacks } = {}) => {
  const canvas = document.createElement('canvas');
  canvas.className = oceanStyles.canvas;
  canvas.setAttribute('aria-hidden', interactive ? 'false' : 'true');
  container.append(canvas);
  return createOceanScene({
    canvas,
    api: (path, options) => auth?.api(path, options),
    getWorldTime: () => worldClock.getState(),
    mode,
    interactive,
    collectiblesEnabled,
    fetchStatus,
    ...callbacks,
  });
};
