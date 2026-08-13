import * as THREE from '../../vendor/three/three.module.js';
import { EffectComposer } from '../../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { stepRaftMotion } from './raftMotion.js';
import { createUnexpectedEventEffects } from './unexpectedEventEffects.js';
import { findUnexpectedEventByType, getNextUnexpectedEventDelay, pickUnexpectedEvent } from './unexpectedEventFlow.js';
import { describeCatch } from './catchMessage.js';
import { CYCLE_DURATION_MS } from '../lib/worldClock.js';

export const OCEAN_RENDER_TUNING = Object.freeze({
  bloomStrengthNight: 0.55,
  bloomStrengthDay: 0.35,
  bloomRadius: 0.55,
  bloomThreshold: 0.65,
});

/**
 * Framework-agnostic Three.js night-ocean scene. It knows nothing about the UI framework — the page
 * component passes in a canvas, an authenticated `api` function, and a set of callbacks it uses
 * to push HUD updates back out (status, catch log, and event changes...). This keeps the imperative
 * 3D loop cleanly separated from the DOM HUD around it, and returns a handle with { triggerDemoEvent, dispose } so the
 * component can drive it and tear it down on unmount.
 *
 * Tone mapping + bloom are what make the night read as cinematic rather than flat: without them
 * the bright emissive materials (moon, lantern, collectibles) look like matte shapes instead of
 * light sources. The raft is rebuilt from the survivor's real raft_size and owned upgrades, so
 * what you sail reflects what you've actually bought at camp.
 */
export function createOceanScene({
  canvas,
  api = async () => ({ ok: false, data: null }),
  getWorldTime,
  mode = 'voyage',
  interactive = true,
  collectiblesEnabled = true,
  fetchStatus = true,
  initialRaftSize = 1,
  initialUpgrades = [],
  onStatus,
  onLog,
  onInteract,
  onUnexpectedEvent,
  onReady,
}) {
  const listeners = [];
  const on = (target, type, handler, opts) => {
    target.addEventListener(type, handler, opts);
    listeners.push({ target, type, handler, opts });
  };

  let interacted = false;
  const markInteract = () => {
    if (interacted) return;
    interacted = true;
    onInteract?.();
  };

  const SKY_TOP = 0x04090f;
  const SKY_MID = 0x0a1826;
  const SKY_HORIZON = 0x16293c;
  const DAY_SKY_TOP = 0x28718a;
  const DAY_SKY_MID = 0x5aa0a6;
  const DAY_SKY_HORIZON = 0xb3c29b;
  const LANTERN_COLOR = 0xf2b556;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(SKY_MID, 0.0115);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 3, window.innerHeight / 3),
    OCEAN_RENDER_TUNING.bloomStrengthNight,
    OCEAN_RENDER_TUNING.bloomRadius,
    OCEAN_RENDER_TUNING.bloomThreshold,
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth / 3, window.innerHeight / 3);
  };
  on(window, 'resize', handleResize);

  /* ---- sky dome + starfield ---- */
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
      uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 col = h > 0.0 ? mix(horizonColor, mix(midColor, topColor, smoothstep(0.0, 0.7, h)), smoothstep(-0.02, 0.05, h)) : horizonColor;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMaterial);
  scene.add(sky);

  const makeRadialTexture = (inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') => {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  };

  const starTexture = makeRadialTexture();
  const STAR_COUNT = 900;
  const starPositions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.92);
    const r = 380;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ size: 2.2, map: starTexture, transparent: true, depthWrite: false, fog: false, opacity: 0.8 })
  );
  scene.add(stars);

  /* ---- lighting + moon ---- */
  const ambientLight = new THREE.AmbientLight(0x8fa5c0, 0.5);
  scene.add(ambientLight);
  const hemisphereLight = new THREE.HemisphereLight(0x33506b, 0x050b10, 0.4);
  scene.add(hemisphereLight);
  const moonLight = new THREE.DirectionalLight(0xdfe6ec, 1.1);
  moonLight.position.set(-30, 40, -20);
  scene.add(moonLight);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(6, 24, 24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xeef2f6).multiplyScalar(1.6), fog: false, transparent: true })
  );
  moon.position.set(-120, 70, -160);
  if (mode !== 'voyage') moon.position.set(5, 10, -18);
  scene.add(moon);
  const moonHomePosition = moon.position.clone();
  const moonTravel = mode === 'voyage' ? 38 : 7;
  const moonHeight = mode === 'voyage' ? 30 : 8;

  const dayColor = new THREE.Color(DAY_SKY_TOP);
  const dayMidColor = new THREE.Color(DAY_SKY_MID);
  const dayHorizonColor = new THREE.Color(DAY_SKY_HORIZON);
  const nightColor = new THREE.Color(SKY_TOP);
  const nightMidColor = new THREE.Color(SKY_MID);
  const nightHorizonColor = new THREE.Color(SKY_HORIZON);
  const sunColor = new THREE.Color(0xffd28a);
  const nightMoonColor = new THREE.Color(0xeef2f6);
  const updateWorldLighting = () => {
    const world = getWorldTime?.() || { phase: 'night', progress: 0, daylight: 0, cyclePositionMs: 0 };
    const transition = Number.isFinite(world.daylight)
      ? THREE.MathUtils.clamp(world.daylight, 0, 1)
      : world.phase === 'day' ? THREE.MathUtils.smoothstep(world.progress, 0, 0.12) : 0;
    const cyclePositionMs = Number.isFinite(world.cyclePositionMs) ? world.cyclePositionMs : 0;
    const orbit = (cyclePositionMs / CYCLE_DURATION_MS) * Math.PI * 2;
    const bodyX = moonHomePosition.x + (Math.cos(orbit) * moonTravel);
    const bodyY = moonHomePosition.y + (Math.abs(Math.sin(orbit)) * moonHeight);
    moon.position.set(bodyX, bodyY, moonHomePosition.z);
    moonLight.position.set(bodyX - 25, bodyY + 30, moonHomePosition.z + 20);

    skyMaterial.uniforms.topColor.value.copy(nightColor).lerp(dayColor, transition);
    skyMaterial.uniforms.midColor.value.copy(nightMidColor).lerp(dayMidColor, transition);
    skyMaterial.uniforms.horizonColor.value.copy(nightHorizonColor).lerp(dayHorizonColor, transition);
    scene.fog.color.copy(nightMidColor).lerp(dayMidColor, transition);
    ambientLight.intensity = THREE.MathUtils.lerp(0.28, 0.9, transition);
    hemisphereLight.intensity = THREE.MathUtils.lerp(0.22, 0.7, transition);
    moonLight.intensity = THREE.MathUtils.lerp(1.1, 0.28, transition);
    moonLight.color.copy(nightMoonColor).lerp(sunColor, transition);
    moon.material.color.copy(nightMoonColor).lerp(sunColor, transition);
    moon.material.opacity = THREE.MathUtils.lerp(1, 0.76, transition);
    moon.scale.setScalar(THREE.MathUtils.lerp(1, 1.6, transition));
    stars.material.opacity = THREE.MathUtils.lerp(0.8, 0.08, transition);
    bloomPass.strength = THREE.MathUtils.lerp(OCEAN_RENDER_TUNING.bloomStrengthNight, OCEAN_RENDER_TUNING.bloomStrengthDay, transition);
    WATER_DEEP.copy(nightWaterDeep).lerp(dayWaterDeep, transition);
    WATER_SHALLOW.copy(nightWaterShallow).lerp(dayWaterShallow, transition);
    // Lanterns remain readable during the day, but the world stops looking like midnight.
  };

  /* ---- ocean (analytic normals — cheap enough to animate every frame) ---- */
  const OCEAN_SIZE = 400;
  const OCEAN_SEGMENTS = 70;
  const oceanGeometry = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEGMENTS, OCEAN_SEGMENTS);
  oceanGeometry.rotateX(-Math.PI / 2);
  const WATER_DEEP = new THREE.Color(0x081420);
  const WATER_SHALLOW = new THREE.Color(0x1c3c52);
  const WATER_FOAM = new THREE.Color(0xbfd4e0);
  const nightWaterDeep = new THREE.Color(0x081420);
  const nightWaterShallow = new THREE.Color(0x1c3c52);
  const dayWaterDeep = new THREE.Color(0x0e526d);
  const dayWaterShallow = new THREE.Color(0x39a9bc);
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
  const oceanBase = Float32Array.from(oceanPositions.array);
  oceanGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(oceanPositions.count * 3), 3));
  const oceanColors = oceanGeometry.attributes.color;
  const tmpColor = new THREE.Color();

  const waveHeight = (x, z, t) =>
    Math.sin(x * 0.08 + t * 1.1) * 0.5 + Math.cos(z * 0.11 - t * 0.8) * 0.4 + Math.sin((x + z) * 0.05 + t * 0.6) * 0.3;

  const updateOcean = (t) => {
    for (let i = 0; i < oceanPositions.count; i++) {
      const x = oceanBase[i * 3];
      const z = oceanBase[i * 3 + 2];
      const h = waveHeight(x, z, t);
      oceanPositions.setY(i, h);
      const dhdx = 0.04 * Math.cos(x * 0.08 + t * 1.1) + 0.015 * Math.cos((x + z) * 0.05 + t * 0.6);
      const dhdz = -0.044 * Math.sin(z * 0.11 - t * 0.8) + 0.015 * Math.cos((x + z) * 0.05 + t * 0.6);
      const len = Math.sqrt(dhdx * dhdx + 1 + dhdz * dhdz);
      oceanNormals.setXYZ(i, -dhdx / len, 1 / len, -dhdz / len);
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

  /* ---- the raft, rebuilt from raft_size + owned upgrades ---- */
  const LOG_COLORS = [0x2a1c10, 0x332415, 0x24170d, 0x2e1f12];
  const SAIL_DARK = 0x101c26;
  const SAIL_LIGHT = 0x16242f;
  const ROPE_COLOR = 0x0f1c26;
  const ropeMaterial = new THREE.LineBasicMaterial({ color: ROPE_COLOR });
  const raft = new THREE.Group();
  scene.add(raft);

  const createSurvivor = () => {
    const survivor = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xc78358, roughness: 0.85 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x2b1a13, roughness: 0.92 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xc8793c, roughness: 0.9 });
    const shorts = new THREE.MeshStandardMaterial({ color: 0x20394a, roughness: 0.9 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.95 });
    const pack = new THREE.MeshStandardMaterial({ color: 0x6d3f25, roughness: 0.9 });

    const addPart = (geometry, material, position, rotation = [0, 0, 0], scale = [1, 1, 1]) => {
      const part = new THREE.Mesh(geometry, material);
      part.position.set(...position);
      part.rotation.set(...rotation);
      part.scale.set(...scale);
      survivor.add(part);
      return part;
    };

    addPart(new THREE.BoxGeometry(0.42, 0.58, 0.3), shirt, [0, 0.93, 0]);
    addPart(new THREE.SphereGeometry(0.22, 14, 10), skin, [0, 1.42, 0]);
    addPart(new THREE.SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, [0, 1.5, -0.01]);
    addPart(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), skin, [-0.28, 0.94, 0], [0, 0, -0.2]);
    addPart(new THREE.CylinderGeometry(0.07, 0.08, 0.5, 8), skin, [0.28, 0.94, 0], [0, 0, 0.2]);
    addPart(new THREE.SphereGeometry(0.085, 8, 8), skin, [-0.33, 0.68, 0]);
    addPart(new THREE.SphereGeometry(0.085, 8, 8), skin, [0.33, 0.68, 0]);
    addPart(new THREE.BoxGeometry(0.17, 0.42, 0.19), shorts, [-0.11, 0.51, 0]);
    addPart(new THREE.BoxGeometry(0.17, 0.42, 0.19), shorts, [0.11, 0.51, 0]);
    addPart(new THREE.BoxGeometry(0.17, 0.28, 0.2), boot, [-0.11, 0.19, -0.025]);
    addPart(new THREE.BoxGeometry(0.17, 0.28, 0.2), boot, [0.11, 0.19, -0.025]);
    addPart(new THREE.BoxGeometry(0.34, 0.48, 0.14), pack, [0, 0.91, 0.2]);
    addPart(new THREE.TorusGeometry(0.08, 0.018, 6, 12), shirt, [0, 1.16, -0.16], [Math.PI / 2, 0, 0]);

    survivor.position.set(0.55, 0.42, 0.28);
    survivor.rotation.y = Math.PI;
    survivor.scale.setScalar(0.92);
    return survivor;
  };

  const buildRaft = (raftSize, ownedUpgrades) => {
    while (raft.children.length) {
      const child = raft.children.pop();
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
    const hasSail = ownedUpgrades.includes('Sail');
    const hasNetLauncher = ownedUpgrades.includes('Net Launcher');
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
      raft.add(log);
    }
    for (const lx of [-1.4, -0.5, 0.5, 1.4]) {
      raft.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(lx, 0.34, -deckDepth / 2 - 0.15),
            new THREE.Vector3(lx, 0.34, deckDepth / 2 + 0.15),
          ]),
          ropeMaterial
        )
      );
    }

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.62, 12),
      new THREE.MeshStandardMaterial({ color: 0x201409, roughness: 0.85 })
    );
    barrel.position.set(1.55, 0.5, deckDepth / 2 - 0.35);
    raft.add(barrel);
    for (const bandY of [-0.16, 0.16]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0x100b06, roughness: 0.8 }));
      band.rotation.x = Math.PI / 2;
      band.position.set(1.55, 0.5 + bandY, deckDepth / 2 - 0.35);
      raft.add(band);
    }
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.5), new THREE.MeshStandardMaterial({ color: 0x261a0f, roughness: 0.9 }));
    crate.position.set(1.35, 0.4, -(deckDepth / 2 - 0.35));
    crate.rotation.y = 0.35;
    raft.add(crate);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 3.6, 8), new THREE.MeshStandardMaterial({ color: 0x201409, roughness: 0.9 }));
    mast.position.set(-0.35, 2.05, 0);
    mast.rotation.z = -0.045;
    raft.add(mast);
    const gaff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6), new THREE.MeshStandardMaterial({ color: 0x201409, roughness: 0.9 }));
    gaff.position.set(0.45, 2.75, 0);
    gaff.rotation.z = Math.PI / 2 - 0.55;
    raft.add(gaff);

    const sailScale = hasSail ? 1 : 0.55;
    const sailColor = hasSail ? SAIL_LIGHT : 0x223038;
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 1.05 * sailScale);
    sailShape.lineTo(1.75 * sailScale, 0.15 * sailScale);
    sailShape.lineTo(0.15 * sailScale, -1.0 * sailScale);
    sailShape.closePath();
    const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshStandardMaterial({ color: sailColor, side: THREE.DoubleSide, roughness: 0.85 }));
    sail.position.set(0.35, 2.15, 0);
    sail.rotation.y = Math.PI / 2 - 0.32;
    raft.add(sail);

    if (hasSail) {
      const patchShape = new THREE.Shape();
      patchShape.moveTo(0, 0.4);
      patchShape.lineTo(0.55, 0.05);
      patchShape.lineTo(0.05, -0.45);
      patchShape.closePath();
      const patch = new THREE.Mesh(new THREE.ShapeGeometry(patchShape), new THREE.MeshStandardMaterial({ color: SAIL_DARK, side: THREE.DoubleSide, roughness: 0.85 }));
      patch.position.set(0.9, 2.5, 0.42);
      patch.rotation.y = Math.PI / 2 - 0.32;
      raft.add(patch);

      const jibShape = new THREE.Shape();
      jibShape.moveTo(0, 0.75);
      jibShape.lineTo(1.0, 0.05);
      jibShape.lineTo(0.05, -0.7);
      jibShape.closePath();
      const jib = new THREE.Mesh(new THREE.ShapeGeometry(jibShape), new THREE.MeshStandardMaterial({ color: SAIL_LIGHT, side: THREE.DoubleSide, roughness: 0.85 }));
      jib.position.set(1.5, 1.7, 0);
      jib.rotation.y = Math.PI / 2 - 0.15;
      raft.add(jib);
    }

    for (const target of [new THREE.Vector3(-1.6, 0.2, -deckDepth / 2 + 0.4), new THREE.Vector3(-1.6, 0.2, deckDepth / 2 - 0.4)]) {
      raft.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.4, 3.7, 0), target]), ropeMaterial));
    }
    raft.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 2.0, 0), new THREE.Vector3(0.75, 1.65, 0.35)]), ropeMaterial)
    );

    const lanternBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 12),
      new THREE.MeshStandardMaterial({ color: LANTERN_COLOR, emissive: new THREE.Color(LANTERN_COLOR).multiplyScalar(2.2), emissiveIntensity: 1, roughness: 0.4 })
    );
    lanternBulb.position.set(0.78, 1.55, 0.36);
    raft.add(lanternBulb);
    const lanternLight = new THREE.PointLight(LANTERN_COLOR, 3.2, 14, 2);
    lanternLight.position.copy(lanternBulb.position);
    raft.add(lanternLight);

    if (hasNetLauncher) {
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.55, metalness: 0.4 });
      for (const tilt of [0.5, -0.5]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), frameMaterial);
        pole.position.set(2.0, 0.75, 0);
        pole.rotation.z = tilt;
        raft.add(pole);
      }
      const net = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 6, 16), frameMaterial);
      net.position.set(2.0, 1.05, 0);
      net.rotation.y = Math.PI / 2;
      raft.add(net);
    }

    if (ownedUpgrades.includes('Spear Rack')) {
      const rackWood = new THREE.MeshStandardMaterial({ color: 0x6f4529, roughness: 0.9 });
      const spearMetal = new THREE.MeshStandardMaterial({ color: 0xb6c0bd, roughness: 0.3, metalness: 0.72 });
      for (const z of [-0.62, 0.62]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.05, 7), rackWood);
        post.position.set(-1.55, 0.78, z);
        raft.add(post);
      }
      for (const z of [-0.52, 0, 0.52]) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.65, 7), rackWood);
        shaft.position.set(-1.55, 1.1, z);
        shaft.rotation.z = -0.08;
        raft.add(shaft);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), spearMetal);
        tip.position.set(-1.62, 1.98, z);
        tip.rotation.z = -0.08;
        raft.add(tip);
      }
    }

    if (ownedUpgrades.includes('Shelter')) {
      const shelterWood = new THREE.MeshStandardMaterial({ color: 0x5f3821, roughness: 0.92 });
      const shelterCanvas = new THREE.MeshStandardMaterial({ color: 0xc18b4d, roughness: 0.82, side: THREE.DoubleSide });
      for (const [x, z] of [[-0.75, -0.85], [0.95, -0.85], [-0.75, 0.85], [0.95, 0.85]]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.8, 7), shelterWood);
        post.position.set(x, 1.18, z);
        raft.add(post);
      }
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.05), shelterCanvas);
      canopy.position.set(0.1, 2.08, 0);
      canopy.rotation.z = -0.05;
      raft.add(canopy);
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 1.75), shelterCanvas);
      front.position.set(1.15, 1.45, 0);
      front.rotation.z = 0.08;
      raft.add(front);
    }

    if (ownedUpgrades.includes('Roof')) {
      const roofWood = new THREE.MeshStandardMaterial({ color: 0x714322, roughness: 0.9 });
      const roofCanvas = new THREE.MeshStandardMaterial({ color: 0x3e7180, roughness: 0.86, side: THREE.DoubleSide });
      for (const z of [-1.15, 1.15]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.25, 7), roofWood);
        post.position.set(0.65, 1.32, z);
        raft.add(post);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.1, 2.65), roofCanvas);
      roof.position.set(0.65, 2.36, 0);
      roof.rotation.z = -0.09;
      raft.add(roof);
    }

    raft.add(createSurvivor());
  };

  /* ---- raft physics ---- */
  const raftState = { position: new THREE.Vector3(0, 0, 0), heading: 0, speed: 0, steering: 0 };
  const MAP_BOUNDARY = OCEAN_SIZE / 2 - 24;
  const BOUNDARY_ALERT_COOLDOWN = 1.8;
  const nextRaftPosition = new THREE.Vector3();
  let lastBoundaryAlertAt = -Infinity;

  const keys = new Set();
  if (interactive) {
    on(window, 'keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
      keys.add(key);
      markInteract();
    });
    on(window, 'keyup', (e) => keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => keys.clear());
  }

  const forwardVector = (heading) => new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));

  const updateRaft = (dt, elapsed) => {
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');
    const fwd = keys.has('w') || keys.has('arrowup');
    const back = keys.has('s') || keys.has('arrowdown');

    const motion = stepRaftMotion(
      raftState,
      {
        throttle: (fwd ? 1 : 0) + (back ? -1 : 0),
        turn: (left ? 1 : 0) + (right ? -1 : 0),
      },
      dt
    );
    raftState.speed = motion.speed;
    raftState.heading = motion.heading;
    raftState.steering = motion.steering;

    nextRaftPosition.copy(raftState.position).addScaledVector(forwardVector(raftState.heading), raftState.speed * dt);
    const outOfBounds = interactive && (
      Math.abs(nextRaftPosition.x) > MAP_BOUNDARY || Math.abs(nextRaftPosition.z) > MAP_BOUNDARY
    );
    if (outOfBounds) {
      raftState.speed = 0;
      if (elapsed - lastBoundaryAlertAt >= BOUNDARY_ALERT_COOLDOWN) {
        lastBoundaryAlertAt = elapsed;
        onLog?.('Out of bounds — turn back.', 'error');
      }
    } else {
      raftState.position.copy(nextRaftPosition);
    }
    raftState.position.y = waveHeight(raftState.position.x, raftState.position.z, elapsed);
    raft.position.copy(raftState.position);
    raft.rotation.y = raftState.heading;
    raft.rotation.z = Math.sin(elapsed * 1.3 + raftState.position.x * 0.1) * 0.04;
    raft.rotation.x = Math.cos(elapsed * 1.1 + raftState.position.z * 0.1) * 0.03;

    if (raftState.speed !== 0) markInteract();
  };

  /* ---- third-person camera ---- */
  let lookYaw = 0;
  let lookPitch = 0;
  const LOOK_YAW_LIMIT = Math.PI * 0.7;
  const LOOK_PITCH_LIMIT = 0.6;

  let dragging = false;
  let lastPointer = { x: 0, y: 0 };
  const pointerDown = (x, y) => {
    dragging = true;
    lastPointer = { x, y };
    canvas.style.cursor = 'grabbing';
    markInteract();
  };
  const pointerUp = () => {
    dragging = false;
    canvas.style.cursor = 'grab';
  };
  const pointerMove = (x, y) => {
    if (!dragging) return;
    lookYaw = Math.max(-LOOK_YAW_LIMIT, Math.min(LOOK_YAW_LIMIT, lookYaw - (x - lastPointer.x) * 0.005));
    lookPitch = Math.max(-LOOK_PITCH_LIMIT, Math.min(LOOK_PITCH_LIMIT, lookPitch - (y - lastPointer.y) * 0.004));
    lastPointer = { x, y };
  };
  if (interactive) {
    on(canvas, 'mousedown', (e) => pointerDown(e.clientX, e.clientY));
    on(window, 'mouseup', pointerUp);
    on(window, 'mousemove', (e) => pointerMove(e.clientX, e.clientY));
    on(canvas, 'touchstart', (e) => pointerDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    on(window, 'touchend', pointerUp);
    on(window, 'touchmove', (e) => pointerMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  }

  const thirdOffset = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const updateCamera = (snap = false, elapsed = 0) => {
    const heading = raftState.heading;
    if (mode !== 'voyage') {
      const showcaseOrbit = Math.sin(elapsed * 0.08) * 0.06;
      const distance = mode === 'camp' ? 11.5 : 12.5;
      const height = mode === 'camp' ? 4.8 : 5.1;
      const desired = raftState.position.clone().add(
        new THREE.Vector3(Math.sin(showcaseOrbit) * distance, height, -Math.cos(showcaseOrbit) * distance)
      );
      if (snap) camera.position.copy(desired);
      else camera.position.lerp(desired, 0.035);
      camTarget.copy(raftState.position).add(new THREE.Vector3(0, 0.9, 0));
      camera.lookAt(camTarget);
      return;
    }
    const orbit = heading + lookYaw;
    const distance = 8.2;
    const height = 3.5 + lookPitch * 2;
    thirdOffset.set(Math.sin(orbit) * -distance, height, Math.cos(orbit) * -distance);
    const desired = raftState.position.clone().add(thirdOffset);
    if (snap) camera.position.copy(desired);
    else camera.position.lerp(desired, 0.08);
    camTarget.copy(raftState.position).add(new THREE.Vector3(0, 1.3, 0));
    camera.lookAt(camTarget);
  };

  const eventEffects = createUnexpectedEventEffects({ scene, camera, raft, raftState, waveHeight });
  let unexpectedEvents = [];
  let nextUnexpectedEventAt = Infinity;
  let eventResolutionInFlight = false;

  const loadUnexpectedEvents = async () => {
    if (mode !== 'voyage' || !interactive) return false;
    const response = await api('/api/me/unexpected-events');
    if (!response.ok) {
      onLog?.(response.data?.error?.message || 'The event watch is offline.', 'error');
      return false;
    }
    unexpectedEvents = response.data || [];
    nextUnexpectedEventAt = clock.getElapsedTime() + getNextUnexpectedEventDelay(() => 0);
    return unexpectedEvents.length > 0;
  };

  const resolveUnexpectedEvent = async (event, elapsed) => {
    if (eventResolutionInFlight) return;
    eventResolutionInFlight = true;
    const response = await api('/api/me/unexpected-events/resolve', {
      method: 'POST',
      body: { event_id: event.event_id },
    });
    eventResolutionInFlight = false;
    nextUnexpectedEventAt = elapsed + getNextUnexpectedEventDelay();

    if (!response.ok) {
      onLog?.(response.data?.error?.message || 'The event passed before it could be resolved.', 'error');
      return;
    }

    const data = response.data || {};
    const resolvedEvent = { ...event, ...(data.event || {}) };
    eventEffects.start(resolvedEvent, data);
    onUnexpectedEvent?.({ ...data, event: resolvedEvent });
    if (data.user) {
      onStatus?.({
        materials: data.user.materials,
        raftSize: data.user.raft_size,
      });
    }
    onLog?.(data.message || `${resolvedEvent.event_name || 'Unexpected event'} resolved.`, data.prevented ? 'success' : 'error');
    for (const quest of data.completed_quests || []) onLog?.(`Quest complete: "${quest.title}"! Claim it at camp.`, 'quest');
  };

  const updateUnexpectedEvents = (elapsed) => {
    if (mode !== 'voyage' || !interactive || eventResolutionInFlight || elapsed < nextUnexpectedEventAt) return;
    const event = pickUnexpectedEvent(unexpectedEvents);
    nextUnexpectedEventAt = elapsed + getNextUnexpectedEventDelay();
    if (!event) return;
    resolveUnexpectedEvent(event, elapsed).catch(() => {
      eventResolutionInFlight = false;
      onLog?.('The event watch lost contact with the server.', 'error');
    });
  };

  const triggerDemoEvent = (eventType) => {
    if (mode !== 'voyage' || !interactive) return false;
    if (eventResolutionInFlight) {
      onLog?.('Another ocean event is already unfolding.', 'error');
      return false;
    }
    const event = findUnexpectedEventByType(unexpectedEvents, eventType);
    if (!event) {
      onLog?.('That demo event is not available from the server.', 'error');
      return false;
    }
    const elapsed = clock.getElapsedTime();
    resolveUnexpectedEvent(event, elapsed).catch(() => {
      eventResolutionInFlight = false;
      onLog?.('The demo event could not reach the server.', 'error');
    });
    return true;
  };

  /* ---- collectibles ---- */
  const CATCH_RADIUS = 3.2;
  const collectibles = [];
  let catchInFlight = false;

  const debrisMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    ...options,
  });

  const addDebrisMesh = (group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    group.add(mesh);
    return mesh;
  };

  const createDebrisAsset = (itemName) => {
    const name = itemName.toLowerCase();
    const group = new THREE.Group();
    let light = null;

    if (name.includes('wood') || name.includes('plank')) {
      const wood = debrisMaterial(0x81512c);
      const darkWood = debrisMaterial(0x4b2b18);
      const rope = debrisMaterial(0x34251a);
      addDebrisMesh(group, new THREE.BoxGeometry(2.15, 0.25, 0.48), wood, [0, 0.05, 0]);
      addDebrisMesh(group, new THREE.BoxGeometry(1.45, 0.18, 0.38), darkWood, [-0.15, 0.29, 0.04], [0, 0.05, -0.03]);
      for (const x of [-0.72, 0.72]) {
        addDebrisMesh(group, new THREE.TorusGeometry(0.28, 0.025, 6, 14), rope, [x, 0.05, 0], [0, Math.PI / 2, 0]);
      }
    } else if (name.includes('plastic')) {
      const plastic = debrisMaterial(0x7cc3cb, { transparent: true, opacity: 0.84, metalness: 0.05 });
      const cap = debrisMaterial(0x286873);
      addDebrisMesh(group, new THREE.CylinderGeometry(0.17, 0.2, 0.9, 10), plastic, [-0.42, 0.2, 0], [0, 0, Math.PI / 2]);
      addDebrisMesh(group, new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), cap, [0.08, 0.2, 0], [0, 0, Math.PI / 2]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.62, 0.08, 0.38), plastic, [0.48, 0.08, 0.08], [0.08, 0.16, 0.2]);
    } else if (name.includes('rope')) {
      const rope = debrisMaterial(0xa57443);
      for (const [x, y, scale] of [[-0.25, 0.05, 1], [0.22, 0.08, 0.78], [0.58, 0.05, 0.55]]) {
        addDebrisMesh(group, new THREE.TorusGeometry(0.42 * scale, 0.065, 8, 18), rope, [x, y, 0], [Math.PI / 2, 0, 0]);
      }
      addDebrisMesh(group, new THREE.CylinderGeometry(0.045, 0.045, 0.85, 8), rope, [-0.72, 0.1, 0], [0, 0, 0.25]);
    } else if (name.includes('glass')) {
      const glass = debrisMaterial(0x70c9bd, { metalness: 0.1, roughness: 0.28, transparent: true, opacity: 0.9 });
      addDebrisMesh(group, new THREE.IcosahedronGeometry(0.46, 0), glass, [0, 0.35, 0], [0.2, 0.4, 0.1], [0.8, 1.15, 0.62]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.42, 0.08, 0.26), debrisMaterial(0x397b79), [0.12, 0.08, 0.05], [0, 0.25, -0.15]);
    } else if (name.includes('paddle')) {
      const wood = debrisMaterial(0x956036);
      const blade = debrisMaterial(0xb77a42);
      addDebrisMesh(group, new THREE.CylinderGeometry(0.055, 0.055, 2.35, 8), wood, [0, 0.32, 0], [0, 0, Math.PI / 2]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.68, 0.12, 0.5), blade, [1.35, 0.32, 0], [0, 0, -0.05]);
      addDebrisMesh(group, new THREE.TorusGeometry(0.11, 0.025, 6, 12), wood, [-1.05, 0.32, 0], [0, Math.PI / 2, 0]);
    } else if (name.includes('hook')) {
      const metal = debrisMaterial(0x76838b, { metalness: 0.75, roughness: 0.3 });
      addDebrisMesh(group, new THREE.CylinderGeometry(0.06, 0.06, 1.55, 8), metal, [-0.38, 0.35, 0], [0, 0, Math.PI / 2]);
      addDebrisMesh(group, new THREE.TorusGeometry(0.34, 0.06, 8, 18, Math.PI * 1.45), metal, [0.55, 0.35, 0], [Math.PI / 2, 0, Math.PI * 0.15]);
      addDebrisMesh(group, new THREE.TorusGeometry(0.11, 0.025, 6, 12), metal, [-1.15, 0.35, 0], [0, Math.PI / 2, 0]);
    } else if (name.includes('map')) {
      const paper = debrisMaterial(0xd6b979, { roughness: 0.95 });
      const ink = debrisMaterial(0x5b3920);
      addDebrisMesh(group, new THREE.BoxGeometry(1.15, 0.045, 0.82), paper, [0, 0.28, 0], [0.12, 0.12, -0.16]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.72, 0.018, 0.03), ink, [0, 0.31, 0.03], [0.12, 0.12, -0.16]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.03, 0.018, 0.58), ink, [-0.18, 0.32, 0.02], [0.12, 0.12, -0.16]);
    } else if (name.includes('lantern')) {
      const metal = debrisMaterial(0x43515a, { metalness: 0.65, roughness: 0.32 });
      const glass = debrisMaterial(0xf2b556, { emissive: new THREE.Color(0xf2b556).multiplyScalar(1.3), emissiveIntensity: 0.8, roughness: 0.28 });
      addDebrisMesh(group, new THREE.CylinderGeometry(0.23, 0.23, 0.48, 10), glass, [0, 0.42, 0]);
      addDebrisMesh(group, new THREE.CylinderGeometry(0.31, 0.31, 0.08, 10), metal, [0, 0.16, 0]);
      addDebrisMesh(group, new THREE.CylinderGeometry(0.31, 0.31, 0.08, 10), metal, [0, 0.68, 0]);
      addDebrisMesh(group, new THREE.ConeGeometry(0.3, 0.16, 10), metal, [0, 0.8, 0]);
      addDebrisMesh(group, new THREE.TorusGeometry(0.25, 0.035, 6, 14, Math.PI * 1.5), metal, [0, 0.84, 0], [Math.PI / 2, 0, 0]);
      light = new THREE.PointLight(LANTERN_COLOR, 0.35, 2.8, 2);
    } else if (name.includes('compass')) {
      const brass = debrisMaterial(0xb88642, { metalness: 0.7, roughness: 0.3 });
      const face = debrisMaterial(0xe8d6a4, { roughness: 0.55 });
      const needle = debrisMaterial(0x7e3326, { metalness: 0.3, roughness: 0.4 });
      addDebrisMesh(group, new THREE.CylinderGeometry(0.45, 0.45, 0.13, 16), brass, [0, 0.32, 0]);
      addDebrisMesh(group, new THREE.CylinderGeometry(0.35, 0.35, 0.025, 16), face, [0, 0.4, 0]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.06, 0.035, 0.48), needle, [0, 0.43, 0], [0, 0.22, 0]);
      addDebrisMesh(group, new THREE.TorusGeometry(0.47, 0.045, 8, 18), brass, [0, 0.39, 0], [Math.PI / 2, 0, 0]);
    } else {
      const crate = debrisMaterial(0x714523);
      const brace = debrisMaterial(0x342015);
      addDebrisMesh(group, new THREE.BoxGeometry(0.92, 0.7, 0.82), crate, [0, 0.42, 0], [0, 0.18, 0]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.08, 0.73, 0.86), brace, [0, 0.42, 0], [0, 0.18, 0]);
      addDebrisMesh(group, new THREE.BoxGeometry(0.96, 0.08, 0.09), brace, [0, 0.42, 0], [0, 0.18, 0]);
    }

    group.rotation.y = Math.random() * Math.PI * 2;
    group.scale.setScalar(0.95 + Math.random() * 0.15);
    if (light) light.position.set(0, 0.5, 0);
    return { group, light };
  };

  const spawnCollectible = (debrisData) => {
    const itemName = debrisData.item_name || 'Floating Crate';
    const { group, light } = createDebrisAsset(itemName);
    group.position.set(Number(debrisData.x_position) || 0, 0, Number(debrisData.z_position) || 0);
    scene.add(group);
    if (light) {
      light.position.add(group.position);
      scene.add(light);
    }
    collectibles.push({
      mesh: group,
      group,
      light,
      debrisId: debrisData.debris_id,
      itemName,
      catching: false,
      bobSeed: Math.random() * Math.PI * 2,
    });
  };

  const removeCollectible = (item) => {
    scene.remove(item.group, item.light);
    item.group.traverse((obj) => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((material) => material.dispose());
      else obj.material?.dispose?.();
    });
    const idx = collectibles.indexOf(item);
    if (idx !== -1) collectibles.splice(idx, 1);
  };

  const syncCollectibles = (serverDebris) => {
    for (const item of [...collectibles]) removeCollectible(item);
    for (const debrisData of serverDebris || []) spawnCollectible(debrisData);
  };

  const loadCollectibles = async () => {
    const response = await api('/api/me/debris');
    if (!response.ok) {
      onLog?.(response.data?.error?.message || 'Could not load the ocean salvage.', 'error');
      return false;
    }
    syncCollectibles(response.data);
    return true;
  };

  const updateCollectibles = (elapsed) => {
    for (const item of collectibles) {
      if (item.catching) continue;
      const { x, z } = item.mesh.position;
      const waterY = waveHeight(x, z, elapsed);
      item.mesh.position.y = waterY + 0.6 + Math.sin(elapsed * 2 + item.bobSeed) * 0.15;
      item.mesh.rotation.y += 0.006;
      item.mesh.rotation.x += 0.002;
      item.mesh.scale.setScalar((0.95 + Math.sin(elapsed * 2.4 + item.bobSeed) * 0.04) * (item.itemName.includes('Plank') ? 1.1 : 1));
      if (item.light) item.light.position.set(x, waterY + 0.9, z);
    }
  };

  const catchCollectible = async (item) => {
    item.catching = true;
    catchInFlight = true;
    const { ok, data } = await api(`/api/me/debris/${encodeURIComponent(item.debrisId)}/collect`, { method: 'POST' });
    if (!ok) {
      onLog?.(data ? data.error?.message || 'Something went wrong.' : 'Could not reach the server.', 'error');
      item.catching = false;
    } else {
      removeCollectible(item);
      onStatus?.({ materials: data.new_materials, raftSize: data.raft_size });
      onLog?.(describeCatch(data), 'catch');
      for (const quest of data.completed_quests || []) onLog?.(`Quest complete: "${quest.title}"! Claim it at camp.`, 'quest');
      await loadCollectibles();
    }
    catchInFlight = false;
  };

  const checkCatches = () => {
    if (!interactive || !collectiblesEnabled) return;
    if (catchInFlight) return;
    for (const item of collectibles) {
      if (item.catching) continue;
      const distance = raftState.position.distanceTo(item.mesh.position);
      if (distance < CATCH_RADIUS) {
        catchCollectible(item);
        break;
      }
    }
  };

  /* ---- main loop ---- */
  const clock = new THREE.Clock();
  let rafId = null;
  const animate = () => {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();
    updateRaft(dt, elapsed);
    updateOcean(elapsed);
    updateCollectibles(elapsed);
    updateWorldLighting();
    checkCatches();
    updateCamera(false, elapsed);
    updateUnexpectedEvents(elapsed);
    eventEffects.update(dt, elapsed);
    composer.render();
  };

  /* ---- boot: raft shape depends on real progression, so fetch before first frame ---- */
  const boot = async () => {
    const status = fetchStatus ? await api('/api/me/status') : { ok: false, data: null };
    const raftSize = status.ok ? status.data.raft_size : initialRaftSize;
    const ownedUpgrades = status.ok ? status.data.upgrades : initialUpgrades;
    buildRaft(raftSize, ownedUpgrades);
    if (status.ok) onStatus?.({ materials: status.data.materials, raftSize: status.data.raft_size });
    if (collectiblesEnabled) await loadCollectibles();
    updateOcean(0);
    updateWorldLighting();
    updateCamera(true, 0);
    signalReady();
    window.setTimeout(() => {
      try {
        composer.render();
        animate();
      } catch (error) {
        console.error('[OCEAN] first render failed', { message: error.message || String(error) });
        onLog?.('Could not render the voyage.', 'error');
      }
    }, 0);
    loadUnexpectedEvents().catch((error) => {
      console.error('[OCEAN] unexpected-event catalogue failed', { message: error.message || String(error) });
      onLog?.('The event watch is offline.', 'error');
    });
  };
  let readyNotified = false;
  const signalReady = () => {
    if (readyNotified) return;
    readyNotified = true;
    onReady?.();
  };
  boot().catch((error) => {
    console.error('[OCEAN] boot failed', { message: error.message || String(error) });
    onLog?.('Could not finish loading the voyage.', 'error');
    signalReady();
  });

  /* ---- teardown ---- */
  const dispose = () => {
    if (rafId) cancelAnimationFrame(rafId);
    for (const { target, type, handler, opts } of listeners) target.removeEventListener(type, handler, opts);
    eventEffects.dispose();
    for (const item of [...collectibles]) removeCollectible(item);
    scene.traverse((obj) => {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material?.dispose?.();
    });
    starTexture.dispose();
    composer.dispose();
    renderer.dispose();
  };

  return { triggerDemoEvent, dispose };
}
