// Creates and animates the Three.js visual effects for sharks, tsunamis, rain, clouds, and splashes.
import * as THREE from '../../vendor/three/three.module.js';
import { getEventEffectProfile } from './oceanEventScheduler.js';

const UP = new THREE.Vector3(0, 1, 0);

const disposeObject = (object) => {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  });
};

const addMesh = (group, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  group.add(mesh);
  return mesh;
};

const addLowPolyFin = (group, material, position, rotation) => addMesh(
  group,
  new THREE.ConeGeometry(0.42, 0.9, 3),
  material,
  position,
  rotation,
  [0.8, 1, 0.55],
);

const makeShark = () => {
  const shark = new THREE.Group();
  shark.name = 'unexpected-event-shark';

  const skin = new THREE.MeshStandardMaterial({ color: 0x617b86, roughness: 0.68, metalness: 0.04 });
  const belly = new THREE.MeshStandardMaterial({ color: 0xc3d0c8, roughness: 0.84 });
  const fin = new THREE.MeshStandardMaterial({ color: 0x405b67, roughness: 0.72 });
  const mouth = new THREE.MeshStandardMaterial({ color: 0x301c1e, roughness: 0.9 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x050708, roughness: 0.25, emissive: 0x071114, emissiveIntensity: 0.4 });
  const tooth = new THREE.MeshStandardMaterial({ color: 0xf3e5c0, roughness: 0.55 });

  addMesh(shark, new THREE.SphereGeometry(1.35, 16, 10), skin, [0, 0.28, 0], [0, 0, 0], [1.25, 0.42, 0.5]);
  addMesh(shark, new THREE.SphereGeometry(0.65, 14, 8), skin, [1.05, 0.25, 0], [0, 0, 0], [1.3, 0.58, 0.62]);
  addMesh(shark, new THREE.SphereGeometry(0.42, 12, 8), belly, [0.66, 0.09, 0], [0, 0, 0], [1.25, 0.23, 0.52]);
  addLowPolyFin(shark, fin, [-0.05, 0.72, 0], [0, 0, 0]);
  addLowPolyFin(shark, fin, [0.1, 0.2, 0.53], [Math.PI / 2, 0.25, 0]);
  addLowPolyFin(shark, fin, [0.1, 0.2, -0.53], [-Math.PI / 2, -0.25, 0]);
  addLowPolyFin(shark, fin, [-1.24, 0.33, 0.33], [0, 0.35, 0.9]);
  addLowPolyFin(shark, fin, [-1.24, 0.33, -0.33], [0, -0.35, -0.9]);

  addMesh(shark, new THREE.SphereGeometry(0.28, 8, 6), mouth, [1.48, 0.12, 0], [0, 0, 0], [1, 0.55, 0.5]);
  for (const z of [-0.22, -0.07, 0.08, 0.23]) {
    addMesh(shark, new THREE.ConeGeometry(0.035, 0.18, 4), tooth, [1.48, 0.23, z], [0, 0, Math.PI]);
  }
  addMesh(shark, new THREE.SphereGeometry(0.07, 8, 6), eye, [1.22, 0.43, 0.39]);
  addMesh(shark, new THREE.SphereGeometry(0.07, 8, 6), eye, [1.22, 0.43, -0.39]);

  return shark;
};

const makeSplash = (color = 0xd7f4f2, count = 28, spread = 1.3) => {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * spread;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.random() * 0.18;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    velocities[i * 3] = (Math.random() - 0.5) * 0.7;
    velocities[i * 3 + 1] = 1.2 + Math.random() * 1.7;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color, size: 0.13, transparent: true, opacity: 0.82, depthWrite: false }),
  );
  points.userData.velocities = velocities;
  points.userData.origin = Float32Array.from(positions);
  return points;
};

const makeTsunamiWall = () => {
  const wall = new THREE.Group();
  wall.name = 'unexpected-event-tsunami';

  const width = 28;
  const columns = 32;
  const rows = 12;
  const waveTop = (x) => {
    const edge = THREE.MathUtils.clamp(1 - Math.abs(x) / (width / 2), 0, 1);
    const shoulder = 4.1 + Math.pow(edge, 0.58) * 1.25;
    const crest = Math.exp(-((x - 3.8) ** 2) / 16) * 1.4;
    return shoulder + crest;
  };

  const wavePositions = new Float32Array((columns + 1) * (rows + 1) * 3);
  const waveIndices = [];
  for (let row = 0; row <= rows; row += 1) {
    const level = row / rows;
    for (let column = 0; column <= columns; column += 1) {
      const index = row * (columns + 1) + column;
      const x = -width / 2 + (column / columns) * width;
      const y = level * waveTop(x);
      const z = Math.sin(x * 0.34 + level * 1.4) * 0.18 + level * 0.48;
      wavePositions[index * 3] = x;
      wavePositions[index * 3 + 1] = y;
      wavePositions[index * 3 + 2] = z;
    }
  }
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const topLeft = row * (columns + 1) + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columns + 1;
      const bottomRight = bottomLeft + 1;
      waveIndices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }
  const waveGeometry = new THREE.BufferGeometry();
  waveGeometry.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
  waveGeometry.setIndex(waveIndices);
  waveGeometry.computeVertexNormals();

  const waveMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x176b86,
    emissive: 0x062b3a,
    emissiveIntensity: 0.42,
    roughness: 0.22,
    metalness: 0.03,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const innerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0e4962,
    emissive: 0x041f2d,
    emissiveIntensity: 0.35,
    roughness: 0.28,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const foamMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5f4e7,
    roughness: 0.42,
    emissive: 0x31555a,
    emissiveIntensity: 0.2,
  });
  const foamHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xf3fff2,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
  });

  const body = addMesh(wall, waveGeometry, waveMaterial, [0, 0, 0]);
  const innerBody = addMesh(wall, waveGeometry.clone(), innerMaterial, [0, 0.12, 0.42], [0, 0, 0], [0.98, 0.94, 1]);
  innerBody.renderOrder = 1;

  const crestPoints = [];
  for (let index = 0; index <= 18; index += 1) {
    const x = -13 + (index / 18) * 26;
    crestPoints.push(new THREE.Vector3(x, waveTop(x) + 0.08, 0.62 + Math.sin(index * 0.8) * 0.08));
  }
  const crestCurve = new THREE.CatmullRomCurve3(crestPoints);
  const crest = addMesh(wall, new THREE.TubeGeometry(crestCurve, 42, 0.16, 7, false), foamMaterial);
  crest.renderOrder = 2;

  const curlPoints = [
    new THREE.Vector3(2.5, waveTop(2.5) + 0.12, 0.76),
    new THREE.Vector3(4.7, 7.12, 0.82),
    new THREE.Vector3(6.6, 7.0, 0.92),
    new THREE.Vector3(7.1, 6.25, 1.03),
    new THREE.Vector3(6.15, 5.65, 1.08),
    new THREE.Vector3(4.7, 5.9, 1.12),
  ];
  const curl = addMesh(wall, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curlPoints), 28, 0.2, 7, false), foamHighlightMaterial);
  curl.renderOrder = 3;

  const foamMeshes = [];
  for (let index = 0; index < 17; index += 1) {
    const x = -12.5 + index * 1.65;
    const foam = addMesh(
      wall,
      new THREE.IcosahedronGeometry(0.38 + Math.random() * 0.18, 1),
      foamMaterial,
      [x, waveTop(x) + 0.12 + Math.random() * 0.18, 0.72 + Math.sin(index * 0.9) * 0.16],
      [0, 0, 0],
      [1.35, 0.4 + Math.random() * 0.25, 0.72],
    );
    foam.userData.phase = index * 0.45;
    foam.userData.baseY = foam.position.y;
    foamMeshes.push(foam);
  }

  const spray = makeSplash(0xe5f4f2, 120, 8.5);
  spray.position.set(1.5, 6.1, 0.72);
  wall.add(spray);
  body.renderOrder = 0;
  wall.userData.foamMeshes = foamMeshes;
  wall.userData.crest = crest;
  wall.userData.curl = curl;
  wall.userData.spray = spray;
  return wall;
};

const makeCloud = () => {
  const cloud = new THREE.Group();
  cloud.name = 'unexpected-event-downpour-cloud';
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0x172833, roughness: 0.95, transparent: true, opacity: 0.92 });
  const puffs = [
    [-3.2, 0, 0.3, 2.2],
    [-1.6, 0.65, 0, 2.8],
    [0.2, 0.25, 0.1, 3.1],
    [2.2, 0.65, -0.1, 2.4],
    [3.7, 0, 0.25, 1.8],
  ];
  for (const [x, y, z, scale] of puffs) {
    addMesh(cloud, new THREE.SphereGeometry(1, 12, 8), cloudMaterial, [x, y, z], [0, 0, 0], [scale, 0.75 + Math.random() * 0.3, 1.1]);
  }
  return cloud;
};

const makeRain = (count = 180) => {
  const positions = new Float32Array(count * 6);
  const seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * 18;
    const z = (Math.random() - 0.5) * 18;
    const y = 1 + Math.random() * 11;
    const length = 0.45 + Math.random() * 0.5;
    positions.set([x, y, z, x - 0.08, y - length, z - 0.04], i * 6);
    seeds.set([x, z, length], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xa4c8d5, transparent: true, opacity: 0.46, depthWrite: false }),
  );
  rain.userData.seeds = seeds;
  return rain;
};

const makePuddleRipples = () => {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xb5e1e2, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 12; i += 1) {
    const ripple = addMesh(group, new THREE.RingGeometry(0.08, 0.12, 16), material.clone(), [
      (Math.random() - 0.5) * 12,
      0,
      (Math.random() - 0.5) * 12,
    ], [0, 0, 0]);
    ripple.userData.phase = Math.random() * 2;
    ripple.userData.scale = 0.5 + Math.random() * 1.2;
  }
  return group;
};

/**
 * Procedural event actors for the voyage scene. The backend decides the consequence; this
 * factory only stages the matching 3D threat and cleans itself up when its cinematic window ends.
 */
export function createUnexpectedEventEffects({ scene, camera, raft, raftState, waveHeight }) {
  let active = null;

  const stop = () => {
    if (!active) return;
    scene.remove(active.root);
    disposeObject(active.root);
    if (active.previousFogDensity !== null && scene.fog?.isFogExp2) scene.fog.density = active.previousFogDensity;
    active = null;
  };

  const start = (event, resolution = {}) => {
    const profile = getEventEffectProfile(event?.event_type);
    if (!profile) return false;
    stop();

    const root = new THREE.Group();
    root.name = `unexpected-event-${profile.effect}`;
    scene.add(root);
    active = {
      root,
      effect: profile.effect,
      duration: profile.durationMs / 1000,
      elapsed: 0,
      prevented: Boolean(resolution.prevented || resolution.outcome?.prevented),
      previousFogDensity: null,
      actor: null,
    };

    if (profile.effect === 'shark') {
      const shark = makeShark();
      root.add(shark);
      const splash = makeSplash(0xe0f3eb, 42, 1.05);
      root.add(splash);
      const ring = addMesh(root, new THREE.TorusGeometry(1.15, 0.045, 8, 28), new THREE.MeshBasicMaterial({ color: 0xd9eff0, transparent: true, opacity: 0.62, side: THREE.DoubleSide }), [0, 0.03, 0], [0, 0, 0], [1, 0.22, 1]);
      active.actor = { shark, splash, ring };
    } else if (profile.effect === 'tsunami') {
      const wave = makeTsunamiWall();
      root.add(wave);
      active.actor = { wave };
    } else {
      const cloud = makeCloud();
      const rain = makeRain();
      const ripples = makePuddleRipples();
      const lightning = new THREE.PointLight(0xb8e5ff, 0, 24, 2);
      cloud.position.y = 10.5;
      root.add(cloud, rain, ripples, lightning);
      active.previousFogDensity = scene.fog?.isFogExp2 ? scene.fog.density : null;
      active.actor = { cloud, rain, ripples, lightning };
    }
    return true;
  };

  const updateSplash = (points, dt, elapsed) => {
    const position = points.geometry.attributes.position;
    const velocities = points.userData.velocities;
    const origin = points.userData.origin;
    for (let i = 0; i < position.count; i += 1) {
      const index = i * 3;
      position.array[index] += velocities[index] * dt;
      position.array[index + 1] += velocities[index + 1] * dt;
      position.array[index + 2] += velocities[index + 2] * dt;
      velocities[index + 1] -= 3.8 * dt;
      if (position.array[index + 1] < 0.05) {
        position.array[index] = origin[index];
        position.array[index + 1] = origin[index + 1];
        position.array[index + 2] = origin[index + 2];
        velocities[index + 1] = 1.2 + ((i * 13) % 17) / 10;
      }
    }
    position.needsUpdate = true;
    points.material.opacity = 0.5 + Math.sin(elapsed * 9) * 0.18;
  };

  const updateShark = (dt, elapsed) => {
    const { shark, splash, ring } = active.actor;
    const progress = THREE.MathUtils.clamp(active.elapsed / active.duration, 0, 1);
    const angle = elapsed * 1.25;
    const lunge = active.prevented ? 0 : Math.max(0, Math.sin(progress * Math.PI)) * 1.5;
    const radius = 5.5 - lunge;
    const x = raftState.position.x + Math.cos(angle) * radius;
    const z = raftState.position.z + Math.sin(angle) * radius;
    const y = waveHeight(x, z, elapsed) + 0.25;
    shark.position.set(x, y, z);
    const direction = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    shark.rotation.y = Math.atan2(direction.z, direction.x);
    shark.rotation.z = Math.sin(elapsed * 4.5) * 0.06;
    splash.position.set(x, y + 0.02, z);
    ring.position.set(x, y + 0.02, z);
    const pulse = 1 + Math.sin(elapsed * 7) * 0.12;
    ring.scale.set(pulse, 0.22, pulse);
    updateSplash(splash, dt, elapsed);
  };

  const updateTsunami = (dt, elapsed) => {
    const { wave } = active.actor;
    const progress = THREE.MathUtils.clamp(active.elapsed / active.duration, 0, 1);
    const forward = new THREE.Vector3(Math.sin(raftState.heading), 0, Math.cos(raftState.heading));
    const distance = 18 - progress * 23;
    wave.position.copy(raftState.position).addScaledVector(forward, distance);
    wave.position.y = waveHeight(wave.position.x, wave.position.z, elapsed) - 0.4;
    wave.rotation.y = raftState.heading;
    wave.scale.setScalar(0.94 + Math.sin(active.elapsed * 2.4) * 0.035);
    const spray = wave.userData.spray;
    updateSplash(spray, dt, elapsed);
    const foamMeshes = wave.userData.foamMeshes || [];
    foamMeshes.forEach((foam) => {
      foam.rotation.y += dt * 1.5;
      foam.rotation.z = Math.sin(elapsed * 3.5 + foam.userData.phase) * 0.08;
      foam.position.y = foam.userData.baseY + Math.sin(elapsed * 5 + foam.userData.phase) * 0.12;
      foam.scale.y = 0.9 + Math.sin(elapsed * 5 + foam.userData.phase) * 0.12;
    });
    if (wave.userData.crest) wave.userData.crest.material.opacity = 0.82 + Math.sin(elapsed * 4.5) * 0.1;
    if (wave.userData.curl) wave.userData.curl.material.opacity = 0.72 + Math.sin(elapsed * 5.5) * 0.14;
  };

  const updateRain = (dt, elapsed) => {
    const { cloud, rain, ripples, lightning } = active.actor;
    cloud.position.set(raftState.position.x, raftState.position.y + 10.5, raftState.position.z);
    cloud.rotation.y = Math.sin(elapsed * 0.08) * 0.12;
    const positions = rain.geometry.attributes.position;
    const seeds = rain.userData.seeds;
    for (let i = 0; i < seeds.length / 3; i += 1) {
      const index = i * 6;
      const y = positions.array[index + 1] - dt * 13;
      const nextY = y < 0.3 ? 11 + ((i * 17) % 41) / 10 : y;
      positions.array[index + 1] = nextY;
      positions.array[index + 4] = nextY - seeds[i * 3 + 2];
    }
    rain.position.set(raftState.position.x, raftState.position.y, raftState.position.z);
    positions.needsUpdate = true;
    rain.material.opacity = 0.36 + Math.sin(elapsed * 2.1) * 0.08;
    ripples.position.set(raftState.position.x, waveHeight(raftState.position.x, raftState.position.z, elapsed) + 0.04, raftState.position.z);
    ripples.children.forEach((ripple) => {
      const phase = (active.elapsed + ripple.userData.phase) % 1.8;
      const scale = 0.55 + phase * ripple.userData.scale;
      ripple.scale.setScalar(scale);
      ripple.material.opacity = Math.max(0, 0.42 - phase * 0.2);
    });
    const flash = Math.sin(active.elapsed * 5.2) > 0.94 ? 2.4 : 0;
    lightning.intensity = flash;
    lightning.position.set(raftState.position.x + 1, raftState.position.y + 6, raftState.position.z - 1);
    if (scene.fog?.isFogExp2) scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, 0.017, 0.08);
  };

  const update = (dt, elapsed) => {
    if (!active) return;
    active.elapsed += dt;
    if (active.effect === 'shark') updateShark(dt, elapsed);
    if (active.effect === 'tsunami') updateTsunami(dt, elapsed);
    if (active.effect === 'downpour') updateRain(dt, elapsed);

    const intensity = Math.max(0, 1 - active.elapsed / active.duration);
    if (active.effect === 'tsunami') {
      raft.rotation.z += Math.sin(active.elapsed * 10) * 0.055 * intensity;
      raft.rotation.x += Math.cos(active.elapsed * 8.5) * 0.04 * intensity;
    } else if (active.effect === 'shark' && !active.prevented) {
      raft.rotation.z += Math.sin(active.elapsed * 13) * 0.018 * intensity;
    }
    if (active.effect !== 'downpour' || active.previousFogDensity === null) {
      camera.position.x += Math.sin(active.elapsed * 19) * 0.012 * intensity;
      camera.position.y += Math.cos(active.elapsed * 17) * 0.008 * intensity;
    }
    if (active.elapsed >= active.duration) stop();
  };

  return { start, update, stop, dispose: stop };
}
