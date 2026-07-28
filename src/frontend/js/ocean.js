import * as THREE from 'three';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/OutputPass.js';
import { getToken, authedFetch } from './auth.js';

// Page protection — same rule as game.js: no token, no voyage.
if (!getToken()) {
  window.location.replace('index.html');
}

const el = (id) => document.getElementById(id);

/* ========================================================================
 * INTRO OVERLAY — dismissed by ANY sign the player has engaged with the
 * scene (moved, dragged to look, or pressed anything), plus a hard timeout
 * so it never gets stuck on screen if the player's first move happens to
 * be one the dismiss checks didn't cover.
 * ===================================================================== */
const instructions = el('hud-instructions');
let instructionsDismissed = false;
const dismissInstructions = () => {
  if (instructionsDismissed) return;
  instructionsDismissed = true;
  instructions.classList.add('is-hidden');
};
setTimeout(dismissInstructions, 12000);

/* ========================================================================
 * SCENE, CAMERA, RENDERER
 * Tone mapping + bloom are what actually sell "night ocean" as cinematic
 * rather than flat: without them, bright emissive materials (moon, lantern,
 * collectibles) just look like matte colored shapes instead of light sources.
 * ===================================================================== */
const canvas = el('ocean-canvas');
const SKY_TOP = 0x050b14;
const SKY_MID = 0x0c1a2a;
const SKY_HORIZON = 0x16293c;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(SKY_MID, 0.0115);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
// Capped below the display's real pixel ratio — bloom + a per-frame CPU wave pass are
// already the expensive parts of this scene; rendering at full retina resolution on top
// of that is the easiest way to end up dropping frames for very little visible gain.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth / 3, window.innerHeight / 3),
  0.85, // strength
  0.55, // radius
  0.28 // luminance threshold — only genuinely bright things (moon/lantern/collectibles) bloom
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth / 3, window.innerHeight / 3);
});

/* ========================================================================
 * SKY — a gradient dome (matches auth.css's sky-top/mid/horizon stops) plus
 * a soft round starfield, so the horizon actually reads instead of the
 * ocean fading into a flat clear color.
 * ===================================================================== */
const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  fog: false,
  uniforms: {
    topColor: { value: new THREE.Color(SKY_TOP) },
    midColor: { value: new THREE.Color(SKY_MID) },
    horizonColor: { value: new THREE.Color(SKY_HORIZON) },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 midColor;
    uniform vec3 horizonColor;
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      vec3 col = h > 0.0 ? mix(horizonColor, mix(midColor, topColor, smoothstep(0.0, 0.7, h)), smoothstep(-0.02, 0.05, h))
                          : horizonColor;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMaterial));

/** Soft round sprite so stars/glow discs read as points of light, not hard squares. */
const makeRadialTexture = (inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') => {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
};

const starTexture = makeRadialTexture();
const STAR_COUNT = 900;
const starPositions = new Float32Array(STAR_COUNT * 3);
for (let i = 0; i < STAR_COUNT; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 0.92); // biased toward the upper hemisphere
  const r = 380;
  starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = r * Math.cos(phi);
  starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  size: 2.2,
  map: starTexture,
  transparent: true,
  depthWrite: false,
  fog: false,
  opacity: 0.8,
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

/* ========================================================================
 * LIGHTING — moonlight + the raft's own lantern
 * ===================================================================== */
scene.add(new THREE.AmbientLight(0x8fa5c0, 0.5));
scene.add(new THREE.HemisphereLight(0x33506b, 0x050b10, 0.4));

const moonLight = new THREE.DirectionalLight(0xdfe6ec, 1.1);
moonLight.position.set(-30, 40, -20);
scene.add(moonLight);

const moon = new THREE.Mesh(
  new THREE.SphereGeometry(6, 24, 24),
  // fog:false — the moon sits far past where FogExp2 would otherwise erase it entirely;
  // excluding it from fog keeps it visible as a fixed point of reference while sailing.
  // Deliberately over-bright (>1 in linear space) so ACES + bloom read it as a light
  // source rather than a flat white disc.
  new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef2f6).multiplyScalar(1.6), fog: false })
);
moon.position.set(-120, 70, -160);
scene.add(moon);

/* ========================================================================
 * OCEAN — a displaced plane, hand-animated with sine waves each frame, with
 * per-vertex foam coloring at wave crests and a low-roughness clearcoat
 * material so the moonlight actually sparkles across it.
 *
 * Normals are computed analytically from the wave function's own slope
 * instead of via geometry.computeVertexNormals(). The built-in method
 * re-derives every triangle's face normal and averages them per vertex —
 * correct, but it's an O(faces) pass every frame. Since we already know the
 * exact height function, its partial derivatives give the same lighting
 * result directly per-vertex, which is what was making the scene stutter.
 * ===================================================================== */
const OCEAN_SIZE = 400;
const OCEAN_SEGMENTS = 70;

const oceanGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
oceanGeometry.rotateX(-Math.PI / 2);

const WATER_DEEP = new THREE.Color(0x081420);
const WATER_SHALLOW = new THREE.Color(0x1c3c52);
const WATER_FOAM = new THREE.Color(0xbfd4e0);

const oceanMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  vertexColors: true,
  roughness: 0.2,
  metalness: 0.05,
  clearcoat: 0.7,
  clearcoatRoughness: 0.18,
  reflectivity: 0.5,
});

const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
scene.add(ocean);

const oceanPositions = oceanGeometry.attributes.position;
const oceanNormals = oceanGeometry.attributes.normal;
const oceanBasePositions = Float32Array.from(oceanPositions.array);
oceanGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(oceanPositions.count * 3), 3));
const oceanColors = oceanGeometry.attributes.color;
const tmpColor = new THREE.Color();

/** Wave height at any world (x, z), shared by the ocean mesh and anything floating on it. */
const waveHeight = (x, z, t) => {
  return (
    Math.sin(x * 0.08 + t * 1.1) * 0.5 +
    Math.cos(z * 0.11 - t * 0.8) * 0.4 +
    Math.sin((x + z) * 0.05 + t * 0.6) * 0.3
  );
};

const updateOcean = (t) => {
  for (let i = 0; i < oceanPositions.count; i++) {
    const x = oceanBasePositions[i * 3];
    const z = oceanBasePositions[i * 3 + 2];
    const h = waveHeight(x, z, t);
    oceanPositions.setY(i, h);

    // Analytic slope of waveHeight w.r.t. x and z (product/chain rule on each sine term).
    const dhdx = 0.04 * Math.cos(x * 0.08 + t * 1.1) + 0.015 * Math.cos((x + z) * 0.05 + t * 0.6);
    const dhdz = -0.044 * Math.sin(z * 0.11 - t * 0.8) + 0.015 * Math.cos((x + z) * 0.05 + t * 0.6);
    const len = Math.sqrt(dhdx * dhdx + 1 + dhdz * dhdz);
    oceanNormals.setXYZ(i, -dhdx / len, 1 / len, -dhdz / len);

    // Crests (h near its ~1.2 peak) catch a pale foam tint; troughs stay deep and dark.
    const depthMix = THREE.MathUtils.clamp((h + 1.2) / 2.4, 0, 1);
    tmpColor.copy(WATER_DEEP).lerp(WATER_SHALLOW, depthMix);
    const foamMix = THREE.MathUtils.smoothstep(h, 0.78, 1.15);
    if (foamMix > 0) tmpColor.lerp(WATER_FOAM, foamMix * 0.5);
    oceanColors.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
  }
  oceanPositions.needsUpdate = true;
  oceanNormals.needsUpdate = true;
  oceanColors.needsUpdate = true;
};

/* ========================================================================
 * THE RAFT — built from lashed logs, a barrel, a crate, a leaning mast, and
 * one warm lantern, the same parts list as the login page's raft SVG. Its
 * scale and rigging are driven by the survivor's ACTUAL raft_size and owned
 * upgrades (fetched in boot() below) — buying an upgrade in the dashboard
 * visibly changes the raft you sail, instead of the 3D view being static
 * regardless of progression.
 * ===================================================================== */
const LOG_COLORS = [0x2a1c10, 0x332415, 0x24170d, 0x2e1f12];
const SAIL_DARK = 0x101c26;
const SAIL_LIGHT = 0x16242f;
const LANTERN_COLOR = 0xf2b556;
const ROPE_COLOR = 0x0f1c26;
const ropeMaterial = new THREE.LineBasicMaterial({ color: ROPE_COLOR });

const raft = new THREE.Group();
scene.add(raft);

/** (Re)builds the raft's geometry to reflect raft_size and which upgrades are owned. */
const buildRaft = (group, raftSize, ownedUpgrades) => {
  while (group.children.length) {
    const child = group.children.pop();
    child.geometry?.dispose?.();
    child.material?.dispose?.();
  }

  const hasSail = ownedUpgrades.includes('Sail');
  const hasNetLauncher = ownedUpgrades.includes('Net Launcher');

  // Floor Extension (and raft_size generally) grows the deck itself — more logs,
  // more depth — rather than needing a special-cased prop of its own.
  const logCount = Math.min(7 + (raftSize - 1) * 2, 17);
  const deckDepth = Math.min(2.7 + (raftSize - 1) * 0.45, 5.7);

  for (let i = 0; i < logCount; i++) {
    const radius = 0.19 + Math.random() * 0.04;
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.92, 4.3 + Math.random() * 0.25, 8),
      new THREE.MeshStandardMaterial({ color: LOG_COLORS[i % LOG_COLORS.length], roughness: 0.95 })
    );
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (Math.random() - 0.5) * 0.04;
    log.position.set((Math.random() - 0.5) * 0.15, 0.18 + (Math.random() - 0.5) * 0.02, -deckDepth / 2 + (i * deckDepth) / (logCount - 1));
    group.add(log);
  }

  // Rope lashings binding the logs together, echoing the SVG's stitched cross-ties.
  for (const lx of [-1.4, -0.5, 0.5, 1.4]) {
    const points = [new THREE.Vector3(lx, 0.34, -deckDepth / 2 - 0.15), new THREE.Vector3(lx, 0.34, deckDepth / 2 + 0.15)];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ropeMaterial));
  }

  // Barrel + crate, lashed near the stern corners, clear of the mast/bow gear.
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.34, 0.62, 12),
    new THREE.MeshStandardMaterial({ color: 0x201409, roughness: 0.85 })
  );
  barrel.position.set(1.55, 0.5, deckDepth / 2 - 0.35);
  group.add(barrel);
  for (const bandY of [-0.16, 0.16]) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.025, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0x100b06, roughness: 0.8 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.set(1.55, 0.5 + bandY, deckDepth / 2 - 0.35);
    group.add(band);
  }

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.42, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x261a0f, roughness: 0.9 })
  );
  crate.position.set(1.35, 0.4, -(deckDepth / 2 - 0.35));
  crate.rotation.y = 0.35;
  group.add(crate);

  // Mast, leaning slightly with the drift, tapered like a real spar.
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.1, 3.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x201409, roughness: 0.9 })
  );
  mast.position.set(-0.35, 2.05, 0);
  mast.rotation.z = -0.045;
  group.add(mast);

  const gaff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6),
    new THREE.MeshStandardMaterial({ color: 0x201409, roughness: 0.9 })
  );
  gaff.position.set(0.45, 2.75, 0);
  gaff.rotation.z = Math.PI / 2 - 0.55;
  group.add(gaff);

  // Sail: a small, plain rag by default — visibly upgrades to a full patched sail plus
  // a second jib the moment the Sail upgrade is bought, so the payoff is unmissable.
  const sailScale = hasSail ? 1 : 0.55;
  const sailColor = hasSail ? SAIL_LIGHT : 0x223038;
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 1.05 * sailScale);
  sailShape.lineTo(1.75 * sailScale, 0.15 * sailScale);
  sailShape.lineTo(0.15 * sailScale, -1.0 * sailScale);
  sailShape.closePath();
  const sail = new THREE.Mesh(
    new THREE.ShapeGeometry(sailShape),
    new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.85 })
  );
  sail.position.set(0.35, 2.15, 0);
  sail.rotation.y = Math.PI / 2 - 0.32;
  group.add(sail);

  if (hasSail) {
    const patchShape = new THREE.Shape();
    patchShape.moveTo(0, 0.4);
    patchShape.lineTo(0.55, 0.05);
    patchShape.lineTo(0.05, -0.45);
    patchShape.closePath();
    const sailPatch = new THREE.Mesh(
      new THREE.ShapeGeometry(patchShape),
      new THREE.MeshStandardMaterial({ color: SAIL_DARK, side: THREE.DoubleSide, roughness: 0.85 })
    );
    sailPatch.position.set(0.9, 2.5, 0.42);
    sailPatch.rotation.y = Math.PI / 2 - 0.32;
    group.add(sailPatch);

    // A second, smaller jib sail near the bow — the "fuller rig" a real Sail upgrade buys.
    const jibShape = new THREE.Shape();
    jibShape.moveTo(0, 0.75);
    jibShape.lineTo(1.0, 0.05);
    jibShape.lineTo(0.05, -0.7);
    jibShape.closePath();
    const jib = new THREE.Mesh(
      new THREE.ShapeGeometry(jibShape),
      new THREE.MeshStandardMaterial({ color: SAIL_LIGHT, side: THREE.DoubleSide, roughness: 0.85 })
    );
    jib.position.set(1.5, 1.7, 0);
    jib.rotation.y = Math.PI / 2 - 0.15;
    group.add(jib);
  }

  // Rigging stays from the masthead down to the deck edges.
  for (const target of [new THREE.Vector3(-1.6, 0.2, -deckDepth / 2 + 0.4), new THREE.Vector3(-1.6, 0.2, deckDepth / 2 - 0.4)]) {
    const points = [new THREE.Vector3(-0.4, 3.7, 0), target];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ropeMaterial));
  }

  // The lantern — hung from a short boom off the mast, the one warm point in the scene.
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(0.75, 1.65, 0.35)]),
      ropeMaterial
    )
  );

  const lanternBulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({
      color: LANTERN_COLOR,
      emissive: new THREE.Color(LANTERN_COLOR).multiplyScalar(2.2),
      emissiveIntensity: 1,
      roughness: 0.4,
    })
  );
  lanternBulb.position.set(0.78, 1.55, 0.36);
  group.add(lanternBulb);

  const lanternLight = new THREE.PointLight(LANTERN_COLOR, 3.2, 14, 2);
  lanternLight.position.copy(lanternBulb.position);
  group.add(lanternLight);

  // Net Launcher — a distinct salvaged-metal frame mounted at the bow, unmissable in
  // both POVs since it's new geometry, not just a bigger number in the dashboard.
  if (hasNetLauncher) {
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.55, metalness: 0.4 });
    const bowX = 2.0;
    for (const tilt of [0.5, -0.5]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), frameMaterial);
      pole.position.set(bowX, 0.75, 0);
      pole.rotation.z = tilt;
      group.add(pole);
    }
    const net = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 6, 16), frameMaterial);
    net.position.set(bowX, 1.05, 0);
    net.rotation.y = Math.PI / 2;
    group.add(net);
  }
};

/* ========================================================================
 * RAFT PHYSICS — simple arcade steering, not a rigid-body simulation.
 * heading is radians around Y; "forward" is the -Z axis rotated by heading.
 * ===================================================================== */
const raftState = {
  position: new THREE.Vector3(0, 0, 0),
  heading: 0,
  speed: 0,
};

const RAFT_MAX_SPEED = 9;
const RAFT_ACCEL = 6;
const RAFT_DRAG = 3;
const RAFT_TURN_SPEED = 1.6;

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  dismissInstructions();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const forwardVector = (heading) => new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));

const updateRaft = (dt, elapsed) => {
  const turningLeft = keys.has('a') || keys.has('arrowleft');
  const turningRight = keys.has('d') || keys.has('arrowright');
  const throttleFwd = keys.has('w') || keys.has('arrowup');
  const throttleBack = keys.has('s') || keys.has('arrowdown');

  if (turningLeft) raftState.heading += RAFT_TURN_SPEED * dt;
  if (turningRight) raftState.heading -= RAFT_TURN_SPEED * dt;

  if (throttleFwd) {
    raftState.speed = Math.min(RAFT_MAX_SPEED, raftState.speed + RAFT_ACCEL * dt);
  } else if (throttleBack) {
    raftState.speed = Math.max(-RAFT_MAX_SPEED * 0.5, raftState.speed - RAFT_ACCEL * dt);
  } else if (raftState.speed > 0) {
    raftState.speed = Math.max(0, raftState.speed - RAFT_DRAG * dt);
  } else if (raftState.speed < 0) {
    raftState.speed = Math.min(0, raftState.speed + RAFT_DRAG * dt);
  }

  const forward = forwardVector(raftState.heading);
  raftState.position.addScaledVector(forward, raftState.speed * dt);
  raftState.position.y = waveHeight(raftState.position.x, raftState.position.z, elapsed);

  raft.position.copy(raftState.position);
  raft.rotation.y = raftState.heading;
  // A little roll/pitch so the raft reads as floating rather than gliding on rails.
  raft.rotation.z = Math.sin(elapsed * 1.3 + raftState.position.x * 0.1) * 0.04;
  raft.rotation.x = Math.cos(elapsed * 1.1 + raftState.position.z * 0.1) * 0.03;

  if (raftState.speed !== 0) dismissInstructions();
};

/* ========================================================================
 * CAMERA — toggles between third-person (chase) and first-person (standing
 * at the helm). A click-and-drag on the canvas nudges a look offset in both
 * modes, most noticeable in first person.
 * ===================================================================== */
let povMode = 'third';
let lookYaw = 0;
let lookPitch = 0;
const LOOK_YAW_LIMIT = Math.PI * 0.7;
const LOOK_PITCH_LIMIT = 0.6;

let dragging = false;
let lastPointer = { x: 0, y: 0 };

const onPointerDown = (x, y) => {
  dragging = true;
  lastPointer = { x, y };
  canvas.style.cursor = 'grabbing';
  dismissInstructions();
};
const onPointerUp = () => {
  dragging = false;
  canvas.style.cursor = 'grab';
};
const onPointerMove = (x, y) => {
  if (!dragging) return;
  const dx = x - lastPointer.x;
  const dy = y - lastPointer.y;
  lastPointer = { x, y };
  lookYaw = Math.max(-LOOK_YAW_LIMIT, Math.min(LOOK_YAW_LIMIT, lookYaw - dx * 0.005));
  lookPitch = Math.max(-LOOK_PITCH_LIMIT, Math.min(LOOK_PITCH_LIMIT, lookPitch - dy * 0.004));
};

canvas.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
window.addEventListener('mouseup', onPointerUp);
window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => onPointerDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
window.addEventListener('touchend', onPointerUp);
window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

const thirdPersonOffset = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

// snap=true places the camera directly at its target instead of easing toward it — used
// once on load so the first frame is already framed correctly, instead of the camera
// visibly flying in from the scene origin over the opening half-second.
const updateCamera = (snap = false) => {
  const heading = raftState.heading;

  if (povMode === 'third') {
    // Orbit the chase camera around the raft's heading by the drag-look yaw,
    // so dragging still feels interactive even though the raft stays centered.
    const orbitHeading = heading + lookYaw;
    const distance = 8.2;
    const height = 3.5 + lookPitch * 2;

    thirdPersonOffset.set(Math.sin(orbitHeading) * -distance, height, Math.cos(orbitHeading) * -distance);
    const desired = raftState.position.clone().add(thirdPersonOffset);

    if (snap) camera.position.copy(desired);
    else camera.position.lerp(desired, 0.08);
    cameraTarget.copy(raftState.position).add(new THREE.Vector3(0, 1.3, 0));
    camera.lookAt(cameraTarget);
  } else {
    // First person: stand at the helm, eye height above the deck, looking the way
    // the raft is heading plus whatever the player has dragged to look at.
    const eyeOffset = new THREE.Vector3(-0.3, 1.7, 0.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), heading);
    camera.position.copy(raftState.position).add(eyeOffset);

    const lookDir = new THREE.Vector3(Math.sin(heading + lookYaw), lookPitch, Math.cos(heading + lookYaw));
    cameraTarget.copy(camera.position).add(lookDir);
    camera.lookAt(cameraTarget);
  }
};

const povButton = el('pov-toggle');
const setPov = (mode) => {
  povMode = mode;
  povButton.textContent = mode === 'third' ? '👁 Third Person' : '🧭 First Person';
  // The reticle only means something when you're the one aiming the view (first person);
  // in third person it doesn't correspond to anything the player is pointing at.
  reticle.classList.toggle('is-visible', mode === 'first');
};
povButton.addEventListener('click', () => setPov(povMode === 'third' ? 'first' : 'third'));
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'v') setPov(povMode === 'third' ? 'first' : 'third');
});

/* ========================================================================
 * COLLECTIBLES — glowing debris scattered on the water. Steering the raft
 * within catch range of one triggers a real POST /api/me/collect-debris
 * call; the visual item is just the trigger, the server is the only
 * source of truth for what materials/items are actually gained.
 * ===================================================================== */
const CATCH_RADIUS = 3.2;
const MAX_ACTIVE_COLLECTIBLES = 5;
const collectibles = [];
let catchInFlight = false;

const collectibleGeometry = new THREE.IcosahedronGeometry(0.42, 0);
const glowDiscTexture = makeRadialTexture('rgba(242,181,86,0.55)', 'rgba(242,181,86,0)');

const randomSpawnPoint = () => {
  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 22;
  return new THREE.Vector3(
    raftState.position.x + Math.cos(angle) * radius,
    0,
    raftState.position.z + Math.sin(angle) * radius
  );
};

const spawnCollectible = () => {
  const material = new THREE.MeshStandardMaterial({
    color: LANTERN_COLOR,
    emissive: new THREE.Color(LANTERN_COLOR).multiplyScalar(1.5),
    emissiveIntensity: 1,
    roughness: 0.3,
  });
  const mesh = new THREE.Mesh(collectibleGeometry, material);
  const spawnPoint = randomSpawnPoint();
  mesh.position.copy(spawnPoint);

  // A soft glow disc sitting on the water beneath it, like the lantern shimmer on
  // the login page — sells "this thing is casting light," not just "this is bright."
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowDiscTexture, transparent: true, depthWrite: false, fog: false }));
  glow.scale.set(2.6, 2.6, 1);

  const light = new THREE.PointLight(LANTERN_COLOR, 1.4, 6, 2);

  scene.add(mesh, glow, light);
  collectibles.push({ mesh, glow, light, catching: false, bobSeed: Math.random() * Math.PI * 2 });
};

for (let i = 0; i < MAX_ACTIVE_COLLECTIBLES; i++) spawnCollectible();

const removeCollectible = (item) => {
  scene.remove(item.mesh, item.glow, item.light);
  item.mesh.geometry.dispose?.();
  item.mesh.material.dispose();
  item.glow.material.dispose();
  const index = collectibles.indexOf(item);
  if (index !== -1) collectibles.splice(index, 1);
};

const updateCollectibles = (elapsed) => {
  for (const item of collectibles) {
    if (item.catching) continue;
    const { x, z } = item.mesh.position;
    const waterY = waveHeight(x, z, elapsed);
    const bob = Math.sin(elapsed * 2 + item.bobSeed) * 0.15;
    item.mesh.position.y = waterY + 0.6 + bob;
    item.mesh.rotation.y += 0.01;
    item.mesh.rotation.x += 0.006;
    // Gentle "breathing" scale so the pickups feel alive, not static geometry.
    const pulse = 1 + Math.sin(elapsed * 2.4 + item.bobSeed) * 0.08;
    item.mesh.scale.setScalar(pulse);

    item.glow.position.set(x, waterY + 0.05, z);
    item.light.position.set(x, waterY + 0.5, z);
  }
};

/* ---- HUD wiring for catches ---------------------------------------- */
const hudMaterials = el('hud-materials');
const hudHunger = el('hud-hunger');
const hudRaftSize = el('hud-raft-size');
const hudLog = el('hud-log');
const reticle = el('reticle');

const logEntry = (text, variant = '') => {
  const entry = document.createElement('div');
  entry.className = `hud__log-entry ${variant ? `hud__log-entry--${variant}` : ''}`.trim();
  entry.textContent = text;
  hudLog.prepend(entry);
  setTimeout(() => {
    entry.classList.add('is-leaving');
    setTimeout(() => entry.remove(), 350);
  }, 4500);

  // Keep the trail from growing forever during a long voyage.
  while (hudLog.children.length > 5) hudLog.removeChild(hudLog.lastChild);
};

const describeCatch = (data) => {
  const items = (data.found || []).map((f) => `${f.item_name} ×${f.quantity}`).join(', ');
  const parts = [`+${data.collected} materials`];
  if (items) parts.push(items);
  if (data.bonus_reason) parts.push(data.bonus_reason);
  return parts.join(' · ');
};

const catchCollectible = async (item) => {
  item.catching = true;
  catchInFlight = true;

  const { ok, data } = await authedFetch('/api/me/collect-debris', { method: 'POST' });

  removeCollectible(item);

  if (!ok) {
    logEntry(data ? data.error?.message || 'Something went wrong.' : 'Could not reach the server.', 'error');
  } else {
    hudMaterials.textContent = data.new_materials;
    hudRaftSize.textContent = data.raft_size;
    logEntry(describeCatch(data));
    for (const quest of data.completed_quests || []) {
      logEntry(`Quest complete: "${quest.title}"! Claim it at Raft Camp.`, 'quest');
    }
  }

  catchInFlight = false;
  setTimeout(spawnCollectible, 900);
};

const checkCatches = () => {
  let inRange = false;
  if (!catchInFlight) {
    for (const item of collectibles) {
      if (item.catching) continue;
      const distance = raftState.position.distanceTo(item.mesh.position);
      if (distance < CATCH_RADIUS) {
        inRange = true;
        catchCollectible(item);
        break; // one catch per frame is plenty — the async call itself gates the rest
      }
      if (distance < CATCH_RADIUS * 1.6) inRange = true;
    }
  }
  reticle.classList.toggle('is-active', inRange);
};

/* ========================================================================
 * MAIN LOOP
 * ===================================================================== */
const clock = new THREE.Clock();

const animate = () => {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  const elapsed = clock.getElapsedTime();

  updateRaft(dt, elapsed);
  updateOcean(elapsed);
  updateCollectibles(elapsed);
  checkCatches();
  updateCamera();

  composer.render();
};

/* ========================================================================
 * BOOT — the raft's shape depends on the survivor's real progression
 * (raft_size, owned upgrades), so it's fetched and applied BEFORE the first
 * frame renders. This avoids the alternative of drawing a default raft and
 * having it visibly change shape a moment later once the fetch resolves.
 * ===================================================================== */
const boot = async () => {
  const { ok, data } = await authedFetch('/api/me/status');
  const raftSize = ok ? data.raft_size : 1;
  const ownedUpgrades = ok ? data.upgrades : [];

  buildRaft(raft, raftSize, ownedUpgrades);

  if (ok) {
    hudMaterials.textContent = data.materials;
    hudHunger.textContent = data.hunger;
    hudRaftSize.textContent = data.raft_size;
  }

  // Frame the shot correctly before the very first paint, then hand off to the
  // normal eased camera in the loop above.
  updateOcean(0);
  updateCamera(true);
  composer.render();

  animate();

  // Nothing else needs to finish loading, so the veil comes down right away.
  // (Deliberately not gated behind another requestAnimationFrame: rAF can be
  // throttled in backgrounded or inactive tabs, which would leave it stuck up.)
  el('loading-screen').classList.add('is-hidden');
};

boot();
