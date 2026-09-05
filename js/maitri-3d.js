import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

(() => {
  const canvas = document.querySelector('#threeTwin');
  const wrapper = document.querySelector('#mapWrapper');
  if (!canvas || !wrapper) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e7f2f5');
  scene.fog = new THREE.Fog('#e7f2f5', 24, 42);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight('#e9fbff', '#718d99', 2.1));
  const sun = new THREE.DirectionalLight('#fff8e8', 3.5);
  sun.position.set(-8, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const palette = {
    station: new THREE.MeshStandardMaterial({ color: '#dce8ea', roughness: .65, metalness: .15 }),
    roof: new THREE.MeshStandardMaterial({ color: '#344f5e', roughness: .5, metalness: .3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#68d7dc', emissive: '#1c717a', emissiveIntensity: .35, roughness: .25, metalness: .2 }),
    support: new THREE.MeshStandardMaterial({ color: '#718993', roughness: .7 }),
    power: new THREE.MeshStandardMaterial({ color: '#e7a448', emissive: '#7b4814', emissiveIntensity: .2 }),
    comms: new THREE.MeshStandardMaterial({ color: '#78e3d8', emissive: '#247c7d', emissiveIntensity: .35, metalness: .4 }),
    heritage: new THREE.MeshStandardMaterial({ color: '#8164a9', roughness: .75 }),
    ice: new THREE.MeshStandardMaterial({ color: '#b9d4df', roughness: 1 }),
    runway: new THREE.MeshStandardMaterial({ color: '#eef4f5', roughness: .9 })
  };
  const model = new THREE.Group();
  scene.add(model);
  const assets = new Map();

  function mark(object, asset, layer, anchor) {
    object.userData.asset = asset;
    object.userData.layer = layer;
    object.traverse(child => { child.userData.asset = asset; child.userData.layer = layer; });
    assets.set(asset, { object, layer, anchor });
    return object;
  }
  function mesh(geometry, material, position, asset, layer) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    return asset ? mark(object, asset, layer, object.position.clone()) : object;
  }
  function addWindowRow(parent, z, count, asset) {
    for (let index = 0; index < count; index += 1) {
      const window = mesh(new THREE.BoxGeometry(.72, .42, .06), palette.glass, [-3.1 + index * 1.03, 1.45, z], asset, 'infrastructure');
      parent.add(window);
    }
  }

  const snow = mesh(new THREE.CylinderGeometry(14, 17, .8, 8), palette.ice, [0, -.5, 0]);
  snow.receiveShadow = true;
  model.add(snow);
  const ridge = mesh(new THREE.IcosahedronGeometry(8, 1), palette.ice, [7, -.1, -3]);
  ridge.scale.set(1.5, .18, .7);
  model.add(ridge);

  const station = new THREE.Group();
  station.add(mesh(new THREE.BoxGeometry(8.8, 2.2, 4.4), palette.station, [0, 1.35, 0], 'main-station', 'infrastructure'));
  station.add(mesh(new THREE.BoxGeometry(9.3, .28, 4.9), palette.roof, [0, 2.58, 0], 'main-station', 'infrastructure'));
  station.add(mesh(new THREE.BoxGeometry(2.3, .42, 1.8), palette.roof, [0, 2.92, 0], 'main-station', 'infrastructure'));
  addWindowRow(station, 2.22, 7, 'main-station');
  addWindowRow(station, -2.22, 7, 'main-station');
  for (const x of [-3.2, -1.1, 1.1, 3.2]) station.add(mesh(new THREE.CylinderGeometry(.14, .14, 3.3, 8), palette.support, [x, -.25, -1.5], 'main-station', 'infrastructure'));
  station.add(mesh(new THREE.BoxGeometry(2.5, .2, 1.2), palette.glass, [0, 1.25, 2.25], 'main-station', 'infrastructure'));
  mark(station, 'main-station', 'infrastructure', new THREE.Vector3(0, 1.3, 0));
  model.add(station);

  const weather = new THREE.Group();
  weather.add(mesh(new THREE.CylinderGeometry(.08, .08, 3.5, 10), palette.comms, [-5.3, 1.2, -2.9], 'weather', 'weather'));
  weather.add(mesh(new THREE.SphereGeometry(.28, 16, 10), palette.comms, [-5.3, 3.1, -2.9], 'weather', 'weather'));
  weather.add(mesh(new THREE.BoxGeometry(1.2, .7, .7), palette.station, [-5.3, .35, -2.9], 'weather', 'weather'));
  mark(weather, 'weather', 'weather', new THREE.Vector3(-5.3, 1.5, -2.9));
  model.add(weather);

  const communications = new THREE.Group();
  communications.add(mesh(new THREE.CylinderGeometry(.12, .18, 2.4, 10), palette.support, [5.4, .8, -2.5], 'communications', 'infrastructure'));
  const dish = mesh(new THREE.TorusGeometry(1.05, .12, 10, 32, Math.PI), palette.comms, [5.4, 2.2, -2.5], 'communications', 'infrastructure');
  dish.rotation.x = -Math.PI / 2.5;
  communications.add(dish);
  communications.add(mesh(new THREE.SphereGeometry(.16, 12, 8), palette.comms, [5.4, 2.25, -2.5], 'communications', 'infrastructure'));
  mark(communications, 'communications', 'infrastructure', new THREE.Vector3(5.4, 1.5, -2.5));
  model.add(communications);

  const power = new THREE.Group();
  power.add(mesh(new THREE.BoxGeometry(2.2, 1.35, 1.65), palette.power, [-6.2, .3, 2.8], 'power', 'infrastructure'));
  power.add(mesh(new THREE.CylinderGeometry(.28, .28, 1.8, 12), palette.roof, [-6.55, 1.9, 2.8], 'power', 'infrastructure'));
  power.add(mesh(new THREE.CylinderGeometry(.23, .23, 1.5, 12), palette.roof, [-5.85, 1.75, 2.8], 'power', 'infrastructure'));
  mark(power, 'power', 'infrastructure', new THREE.Vector3(-6.2, .8, 2.8));
  model.add(power);

  const runway = mesh(new THREE.BoxGeometry(13, .08, 2.1), palette.runway, [0, -.05, 6], 'runway', 'access');
  runway.rotation.y = -.08;
  model.add(runway);
  for (let index = -5; index <= 5; index += 2) model.add(mesh(new THREE.BoxGeometry(.8, .02, .1), palette.power, [index, .01, 6], null));

  const heritage = new THREE.Group();
  heritage.add(mesh(new THREE.BoxGeometry(1.8, 1.7, 1.5), palette.heritage, [6.5, .65, 2.2], 'heritage', 'heritage'));
  heritage.add(mesh(new THREE.ConeGeometry(1.4, .8, 4), palette.heritage, [6.5, 1.9, 2.2], 'heritage', 'heritage'));
  mark(heritage, 'heritage', 'heritage', new THREE.Vector3(6.5, 1, 2.2));
  model.add(heritage);

  const selection = new THREE.Mesh(new THREE.TorusGeometry(1.3, .045, 8, 48), new THREE.MeshBasicMaterial({ color: '#00aab2', transparent: true, opacity: .9 }));
  selection.rotation.x = -Math.PI / 2;
  selection.visible = false;
  model.add(selection);

  const orbit = { theta: .55, phi: 1.03, radius: 21, target: new THREE.Vector3(0, 1, 0) };
  function updateCamera() {
    camera.position.set(
      orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }
  updateCamera();

  function resize() {
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrapper);
  resize();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pressed = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(model.children, true).find(item => item.object.userData.asset);
    if (!hit) return;
    const asset = hit.object.userData.asset;
    const item = assets.get(asset);
    if (item) {
      selection.position.copy(item.anchor);
      selection.scale.setScalar(asset === 'main-station' ? 2.7 : 1.1);
      selection.visible = true;
      window.PolarisSelectAsset?.(asset, false);
    }
  }
  canvas.addEventListener('pointerdown', event => { pressed = true; moved = false; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture?.(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!pressed) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    moved = moved || Math.hypot(dx, dy) > 4;
    orbit.theta -= dx * .008;
    orbit.phi = THREE.MathUtils.clamp(orbit.phi + dy * .006, .58, 1.42);
    lastX = event.clientX;
    lastY = event.clientY;
    updateCamera();
  });
  canvas.addEventListener('pointerup', event => { if (pressed && !moved) pick(event); pressed = false; });
  canvas.addEventListener('pointercancel', () => { pressed = false; });
  canvas.addEventListener('wheel', event => { event.preventDefault(); orbit.radius = THREE.MathUtils.clamp(orbit.radius + event.deltaY * .012, 11, 30); updateCamera(); }, { passive: false });

  document.querySelectorAll('.layer-btn').forEach(button => button.addEventListener('click', () => {
    const layer = button.dataset.layer;
    for (const { object, layer: objectLayer } of assets.values()) if (objectLayer === layer) object.visible = button.classList.contains('active');
  }));

  function animate(time) {
    selection.rotation.z = time * .0005;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  document.body.classList.add('model-3d-ready');
  window.Polaris3DReset = () => { orbit.theta = .55; orbit.phi = 1.03; orbit.radius = 21; updateCamera(); };
  requestAnimationFrame(animate);
})();
