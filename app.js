import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";

const categories = [
  {
    name: "Zip Hoodies",
    slug: "zip-hoodies",
    path: "/collections/zip-hoodies",
    kind: "hoodie",
    color: "#191817",
    accent: "#d8cbb8",
    description:
      "Heavyweight zipped layers with dropped shoulders, double zip hardware, and tonal DW embroidery.",
  },
  {
    name: "T-Shirts",
    slug: "t-shirts",
    path: "/collections/t-shirts",
    kind: "tee",
    color: "#d8cbb8",
    accent: "#151412",
    description:
      "Clean daily tees with washed cotton texture, boxy proportions, and a quiet chest mark.",
  },
  {
    name: "Shorts",
    slug: "shorts",
    path: "/collections/shorts",
    kind: "shorts",
    color: "#81705f",
    accent: "#eee3d1",
    description:
      "Relaxed summer shorts with heavy drawcords, garment-washed depth, and soft pocket shadows.",
  },
  {
    name: "Sweatpants",
    slug: "sweatpants",
    path: "/collections/sweatpants",
    kind: "sweatpants",
    color: "#8d8c86",
    accent: "#12110f",
    description:
      "Stacked fleece pants with ribbed cuffs, clean seams, and a long-day relaxed silhouette.",
  },
  {
    name: "Jeans",
    slug: "jeans",
    path: "/collections/jeans",
    kind: "jeans",
    color: "#3f4850",
    accent: "#d6c8b6",
    description:
      "Washed denim with a straight loose fit, subtle hardware, and DAYWEAR woven labels.",
  },
  {
    name: "Tracksuits",
    slug: "tracksuits",
    path: "/collections/tracksuits",
    kind: "tracksuit",
    color: "#767c6a",
    accent: "#f0e5d2",
    description:
      "Complete sets with matching fabric, smooth zip details, and a quiet studio finish.",
  },
  {
    name: "Longsleeves",
    slug: "longsleeves",
    path: "/collections/longsleeves",
    kind: "longsleeve",
    color: "#c7c2b7",
    accent: "#131210",
    description:
      "Soft washed long sleeves with extended cuffs, small embroidery, and everyday weight.",
  },
  {
    name: "Summer Sets",
    slug: "summer-sets",
    path: "/collections/summer-sets",
    kind: "summer",
    color: "#c7b69f",
    accent: "#161411",
    description:
      "Light coordinated sets built for warmer days, clean textures, and easy movement.",
  },
];

const allProducts = [
  "Weekend Zip Hoodie",
  "Long Day Tee",
  "Washed Studio Short",
  "Everyday Sweatpant",
  "Faded Loose Jean",
  "Room Tracksuit",
  "Ash Longsleeve",
  "Summer Uniform Set",
];

const state = {
  activeIndex: 0,
  routeMode: "home",
  pointer: new THREE.Vector2(),
  mouse: { x: 0, y: 0 },
  targetMouse: { x: 0, y: 0 },
  fabricZoom: false,
  fit: "Zip Hoodie + Sweatpants",
  soundOn: false,
  hoveredRoute: null,
  clock: new THREE.Clock(),
};

const qs = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

function routeHref(path) {
  return path === "/" ? "#/" : `#${path}`;
}

function routeFromLocation() {
  if (window.location.hash.startsWith("#/")) {
    return window.location.hash.slice(1) || "/";
  }

  const path = window.location.pathname;
  const collectionIndex = path.indexOf("/collections/");
  if (collectionIndex >= 0) return path.slice(collectionIndex);

  const knownRoutes = ["/fabric-dna", "/lookbook", "/about", "/contact", "/shipping", "/returns", "/privacy", "/cart"];
  const match = knownRoutes.find((route) => path.endsWith(route));
  return match || "/";
}

function routeFromLink(link) {
  const url = new URL(link.href);
  if (url.hash.startsWith("#/")) return url.hash.slice(1) || "/";
  const collectionIndex = url.pathname.indexOf("/collections/");
  if (collectionIndex >= 0) return url.pathname.slice(collectionIndex);
  return url.pathname || "/";
}

const loader = qs("#loader");
const canvas = qs("#daywear-canvas");
const cursor = qs("#custom-cursor");
const cursorLabel = qs("#custom-cursor-label");
const clothTransition = qs("#cloth-transition");
const homeView = qs("#home-view");
const collectionView = qs("#collection-view");
const categoryRail = qs("#category-rail");
const activeCategoryTitle = qs("#active-category-title");
const activeCategoryDesc = qs("#active-category-desc");
const activeCategoryLink = qs("#active-category-link");
const productLine = qs("#product-line");
const drawer = qs("#product-drawer");

let renderer;
let scene;
let camera;
let raycaster;
let rootGroup;
let logoGroup;
let categoryGroup;
let categoryLabelGroup;
let categoryObjects = [];
let particleSystem;
let fabricPlane;
let atmosphereGroup;
let collectionRoomGroup;
let outfitGroup;
let footerParticleSystem;
let ambientGain;
let audioContext;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToColor(hex) {
  return new THREE.Color(hex);
}

function makeFabricTexture(baseHex, stitchHex = "#f1e6d3") {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 512;
  canvasTexture.height = 512;
  const ctx = canvasTexture.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  const image = ctx.getImageData(0, 0, 512, 512);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    data[i] = clamp(data[i] + n, 0, 255);
    data[i + 1] = clamp(data[i + 1] + n, 0, 255);
    data[i + 2] = clamp(data[i + 2] + n, 0, 255);
  }
  ctx.putImageData(image, 0, 0);

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = stitchHex;
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 13) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(x) * 10, 512);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.08;
  for (let y = 0; y < 512; y += 17) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + Math.cos(y) * 6);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function fabricMaterial(color, accent = "#e7ddcd", roughness = 0.92) {
  return new THREE.MeshStandardMaterial({
    color: hexToColor(color),
    map: makeFabricTexture(color, accent),
    roughness,
    metalness: 0.04,
    envMapIntensity: 0.25,
  });
}

function labelTexture(text, options = {}) {
  const canvasTexture = document.createElement("canvas");
  canvasTexture.width = 768;
  canvasTexture.height = 256;
  const ctx = canvasTexture.getContext("2d");
  ctx.clearRect(0, 0, 768, 256);
  ctx.fillStyle = options.background || "rgba(10,10,9,0.72)";
  ctx.fillRect(0, 0, 768, 256);
  ctx.strokeStyle = options.border || "rgba(231,221,205,0.28)";
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 744, 232);
  ctx.fillStyle = options.color || "#e7ddcd";
  ctx.font = "800 72px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 384, 118);
  ctx.font = "600 24px Inter, Arial, sans-serif";
  ctx.fillStyle = "rgba(231,221,205,0.58)";
  ctx.fillText(options.sub || "BUILT FOR LONG DAYS", 384, 178);
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeTextSprite(text, sub = "") {
  const material = new THREE.SpriteMaterial({
    map: labelTexture(text.toUpperCase(), { sub }),
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.3, 1.1, 1);
  return sprite;
}

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth, 8, 8, 3), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(start, end, radius, material, radialSegments = 10) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, radialSegments);
  const mesh = new THREE.Mesh(geometry, material);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addStitches(group, points, material) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const distance = start.distanceTo(end);
    const steps = Math.max(3, Math.floor(distance / 0.16));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const p = new THREE.Vector3().lerpVectors(start, end, t);
      const stitch = box(0.055, 0.012, 0.012, material);
      stitch.position.copy(p);
      stitch.rotation.z = i % 2 ? 0.55 : -0.55;
      group.add(stitch);
    }
  }
}

function createDWLogo() {
  const group = new THREE.Group();
  const mat = fabricMaterial("#171614", "#d9cab6");
  const seamMat = new THREE.MeshStandardMaterial({
    color: "#e7ddcd",
    roughness: 0.78,
    metalness: 0.02,
  });

  const dParts = [
    { p: [-2.9, 0, 0], s: [0.38, 2.6, 0.34] },
    { p: [-2.18, 1.1, 0], s: [1.4, 0.36, 0.34] },
    { p: [-2.18, -1.1, 0], s: [1.4, 0.36, 0.34] },
    { p: [-1.48, 0, 0], s: [0.36, 1.72, 0.34] },
  ];
  dParts.forEach((part) => {
    const m = box(part.s[0], part.s[1], part.s[2], mat);
    m.position.set(...part.p);
    group.add(m);
  });

  const wBars = [
    { p: [-0.45, 0, 0], r: -0.22 },
    { p: [0.32, -0.08, 0], r: 0.22 },
    { p: [1.05, -0.08, 0], r: -0.22 },
    { p: [1.78, 0, 0], r: 0.22 },
  ];
  wBars.forEach((part) => {
    const m = box(0.35, 2.65, 0.34, mat);
    m.position.set(...part.p);
    m.rotation.z = part.r;
    group.add(m);
  });

  const outline = [
    new THREE.Vector3(-3.15, 1.38, 0.24),
    new THREE.Vector3(-1.24, 1.38, 0.24),
    new THREE.Vector3(-1.18, -1.38, 0.24),
    new THREE.Vector3(-3.15, -1.38, 0.24),
    new THREE.Vector3(-3.15, 1.38, 0.24),
  ];
  addStitches(group, outline, seamMat);

  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.42),
    new THREE.MeshStandardMaterial({
      map: labelTexture("DAYWEAR", { sub: "DW STUDIO LABEL" }),
      transparent: true,
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
  );
  tag.position.set(0.08, -1.78, 0.26);
  tag.scale.set(1.15, 1.15, 1);
  group.add(tag);

  group.rotation.set(-0.08, -0.22, 0.02);
  group.userData.homeRoute = "/";
  return group;
}

function markRoute(group, category) {
  group.userData.route = category.path;
  group.userData.category = category;
  group.traverse((child) => {
    if (child.isMesh || child.isSprite) {
      child.userData.route = category.path;
      child.userData.category = category;
    }
  });
}

function addGarmentLabel(group, text, y = 0.04, z = 0.42) {
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.22),
    new THREE.MeshStandardMaterial({
      map: labelTexture(text, { sub: "DAYWEAR" }),
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.86,
    })
  );
  label.position.set(0, y, z);
  label.scale.set(0.7, 0.7, 1);
  group.add(label);
  return label;
}

function addFoldLines(group, material, width = 1.6, height = 1.8, yOffset = 0) {
  for (let i = -2; i <= 2; i += 1) {
    const x = (i / 2) * (width * 0.22);
    const line = cylinderBetween(
      new THREE.Vector3(x, yOffset - height * 0.36, 0.44),
      new THREE.Vector3(x + Math.sin(i) * 0.08, yOffset + height * 0.36, 0.44),
      0.012,
      material,
      8
    );
    line.material.transparent = true;
    line.material.opacity = 0.62;
    group.add(line);
  }
}

function createGarment(category, options = {}) {
  const group = new THREE.Group();
  const mat = fabricMaterial(category.color, category.accent);
  const seam = new THREE.MeshStandardMaterial({
    color: category.accent,
    roughness: 0.8,
    metalness: 0.02,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#10100e",
    roughness: 0.8,
  });

  if (category.kind === "hoodie" || category.kind === "tracksuit") {
    const torso = box(1.55, 1.9, 0.46, mat);
    torso.position.y = -0.1;
    group.add(torso);

    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.13, 16, 42, Math.PI * 1.18), mat);
    hood.position.set(0, 0.92, 0.13);
    hood.rotation.x = Math.PI * 0.5;
    hood.rotation.z = Math.PI;
    group.add(hood);

    const zipper = cylinderBetween(
      new THREE.Vector3(0, -0.95, 0.47),
      new THREE.Vector3(0, 0.75, 0.47),
      0.018,
      seam,
      8
    );
    group.add(zipper);

    const leftSleeve = box(0.36, 1.75, 0.38, mat);
    leftSleeve.position.set(-1.03, -0.12, 0.02);
    leftSleeve.rotation.z = -0.18;
    group.add(leftSleeve);

    const rightSleeve = box(0.36, 1.75, 0.38, mat);
    rightSleeve.position.set(1.03, -0.12, 0.02);
    rightSleeve.rotation.z = 0.18;
    group.add(rightSleeve);

    const pocket = box(0.82, 0.36, 0.06, mat);
    pocket.position.set(0, -0.42, 0.52);
    group.add(pocket);

    const drawLeft = cylinderBetween(
      new THREE.Vector3(-0.16, 0.68, 0.48),
      new THREE.Vector3(-0.24, 0.22, 0.54),
      0.009,
      seam,
      8
    );
    const drawRight = cylinderBetween(
      new THREE.Vector3(0.16, 0.68, 0.48),
      new THREE.Vector3(0.24, 0.22, 0.54),
      0.009,
      seam,
      8
    );
    group.add(drawLeft, drawRight);
    addGarmentLabel(group, "DW", -0.08, 0.55);
    addFoldLines(group, seam, 1.55, 1.5, -0.12);
  }

  if (category.kind === "tee" || category.kind === "longsleeve") {
    const torso = box(1.5, 1.7, 0.36, mat);
    torso.position.y = -0.08;
    group.add(torso);

    const sleeveLength = category.kind === "longsleeve" ? 1.55 : 0.76;
    const leftSleeve = box(0.32, sleeveLength, 0.32, mat);
    leftSleeve.position.set(-0.96, 0.14 - sleeveLength * 0.18, 0);
    leftSleeve.rotation.z = -0.7;
    group.add(leftSleeve);

    const rightSleeve = box(0.32, sleeveLength, 0.32, mat);
    rightSleeve.position.set(0.96, 0.14 - sleeveLength * 0.18, 0);
    rightSleeve.rotation.z = 0.7;
    group.add(rightSleeve);

    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 10, 36), seam);
    neck.position.set(0, 0.78, 0.23);
    neck.scale.y = 0.45;
    group.add(neck);
    addGarmentLabel(group, "DW", 0.22, 0.42);
    addFoldLines(group, seam, 1.2, 1.2, -0.1);
  }

  if (category.kind === "shorts") {
    const waist = box(1.5, 0.32, 0.42, mat);
    waist.position.y = 0.42;
    group.add(waist);
    const leftLeg = box(0.66, 1.02, 0.42, mat);
    leftLeg.position.set(-0.38, -0.22, 0);
    leftLeg.rotation.z = 0.05;
    group.add(leftLeg);
    const rightLeg = box(0.66, 1.02, 0.42, mat);
    rightLeg.position.set(0.38, -0.22, 0);
    rightLeg.rotation.z = -0.05;
    group.add(rightLeg);
    const cord = cylinderBetween(new THREE.Vector3(-0.1, 0.44, 0.45), new THREE.Vector3(0.18, 0.05, 0.5), 0.01, seam);
    group.add(cord);
    addGarmentLabel(group, "DW", 0.18, 0.47);
  }

  if (category.kind === "sweatpants" || category.kind === "jeans") {
    const waist = box(1.32, 0.32, 0.42, mat);
    waist.position.y = 0.72;
    group.add(waist);
    const leftLeg = box(0.54, 2.15, 0.42, mat);
    leftLeg.position.set(-0.31, -0.45, 0);
    leftLeg.rotation.z = 0.04;
    group.add(leftLeg);
    const rightLeg = box(0.54, 2.15, 0.42, mat);
    rightLeg.position.set(0.31, -0.45, 0);
    rightLeg.rotation.z = -0.04;
    group.add(rightLeg);
    const seamLine = cylinderBetween(new THREE.Vector3(0, -1.46, 0.45), new THREE.Vector3(0, 0.58, 0.45), 0.01, seam);
    group.add(seamLine);
    if (category.kind === "jeans") {
      const metal = new THREE.MeshStandardMaterial({ color: "#9b9181", metalness: 0.5, roughness: 0.32 });
      const button = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), metal);
      button.position.set(0, 0.78, 0.48);
      group.add(button);
    }
    addGarmentLabel(group, "DW", 0.34, 0.48);
  }

  if (category.kind === "summer") {
    const teeCategory = { ...category, kind: "tee", color: category.color };
    const shortsCategory = { ...category, kind: "shorts", color: "#bba98f" };
    const top = createGarment(teeCategory, { nested: true });
    top.scale.setScalar(0.72);
    top.position.set(0, 0.55, 0);
    const bottom = createGarment(shortsCategory, { nested: true });
    bottom.scale.setScalar(0.76);
    bottom.position.set(0, -0.85, 0);
    group.add(top, bottom);
  }

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 48),
    new THREE.MeshBasicMaterial({
      color: "#000000",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.8;
  group.add(shadow);

  if (!options.nested) {
    markRoute(group, category);
  }
  group.scale.setScalar(options.scale || 1);
  return group;
}

function createParticles(count = 1400) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = ["#e7ddcd", "#756150", "#777d6b", "#96948e", "#191817"];

  for (let i = 0; i < count; i += 1) {
    const radius = 5 + Math.random() * 13;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = Math.sin(angle) * radius - 2;
    const color = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}

function createFabricPlane() {
  const geometry = new THREE.PlaneGeometry(7, 4.2, 80, 48);
  const material = fabricMaterial("#171614", "#d9cab6");
  material.side = THREE.DoubleSide;
  const plane = new THREE.Mesh(geometry, material);
  plane.position.set(0, 0, -1.8);
  plane.rotation.x = -0.18;
  plane.visible = false;
  plane.receiveShadow = true;
  return plane;
}

function createAtmosphereGroup() {
  const group = new THREE.Group();
  const roomMat = new THREE.MeshStandardMaterial({
    color: "#0f0e0c",
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), roomMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.05;
  floor.receiveShadow = true;
  group.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(18, 8), roomMat);
  back.position.set(0, 2, -7);
  back.receiveShadow = true;
  group.add(back);
  group.visible = false;
  return group;
}

function createCollectionRoom() {
  const group = new THREE.Group();
  group.visible = false;
  return group;
}

function initThree() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    scene.background = new THREE.Color("#080807");
    scene.fog = new THREE.FogExp2("#080807", 0.045);

    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.1, 7.8);
    raycaster = new THREE.Raycaster();

    const hemi = new THREE.HemisphereLight("#f0e5d2", "#11100e", 1.5);
    scene.add(hemi);

    const key = new THREE.DirectionalLight("#f0e5d2", 3.8);
    key.position.set(-4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    scene.add(key);

    const rim = new THREE.DirectionalLight("#9ba49a", 1.5);
    rim.position.set(5, 2, -4);
    scene.add(rim);

    const warm = new THREE.PointLight("#b69272", 1.8, 12);
    warm.position.set(3.5, -0.7, 3);
    scene.add(warm);

    rootGroup = new THREE.Group();
    scene.add(rootGroup);

    logoGroup = createDWLogo();
    logoGroup.position.set(0, 0.2, 0);
    logoGroup.scale.setScalar(0.95);
    rootGroup.add(logoGroup);

    categoryGroup = new THREE.Group();
    categoryLabelGroup = new THREE.Group();
    categories.forEach((category, index) => {
      const garment = createGarment(category);
      garment.position.set(0, 0, 0);
      garment.userData.baseIndex = index;
      categoryObjects.push(garment);
      categoryGroup.add(garment);

      const label = makeTextSprite(category.name, "SHOP THE ROOM");
      label.userData.route = category.path;
      label.userData.category = category;
      label.visible = false;
      categoryLabelGroup.add(label);
    });
    rootGroup.add(categoryGroup, categoryLabelGroup);

    particleSystem = createParticles(1600);
    rootGroup.add(particleSystem);

    footerParticleSystem = createParticles(900);
    footerParticleSystem.visible = false;
    rootGroup.add(footerParticleSystem);

    fabricPlane = createFabricPlane();
    rootGroup.add(fabricPlane);

    atmosphereGroup = createAtmosphereGroup();
    rootGroup.add(atmosphereGroup);

    collectionRoomGroup = createCollectionRoom();
    rootGroup.add(collectionRoomGroup);

    outfitGroup = new THREE.Group();
    outfitGroup.visible = false;
    rootGroup.add(outfitGroup);

    return true;
  } catch (error) {
    console.error(error);
    document.body.classList.add("webgl-failed");
    return false;
  }
}

function setGroupOpacity(group, opacity) {
  group.traverse((child) => {
    if (child.material) {
      child.material.transparent = opacity < 0.99 || child.material.transparent;
      child.material.opacity = opacity;
    }
  });
}

function layoutCarousel(time) {
  const radius = window.innerWidth < 760 ? 3.2 : 4.5;
  const active = state.activeIndex;
  categoryObjects.forEach((garment, index) => {
    const offset = index - active;
    const angle = offset * 0.72;
    const targetX = Math.sin(angle) * radius;
    const targetZ = Math.cos(angle) * -2.2 - Math.abs(offset) * 0.45;
    const targetY = Math.abs(offset) * -0.28;
    const targetScale = index === active ? 1.35 : 0.78;

    garment.visible = true;
    garment.position.x = lerp(garment.position.x, targetX, 0.08);
    garment.position.y = lerp(garment.position.y, targetY - 0.2, 0.08);
    garment.position.z = lerp(garment.position.z, targetZ, 0.08);
    garment.rotation.y += 0.006 + (index === active ? 0.004 : 0.001);
    garment.rotation.x = lerp(garment.rotation.x, Math.sin(time + index) * 0.035, 0.08);
    garment.scale.setScalar(lerp(garment.scale.x, targetScale, 0.08));

    const label = categoryLabelGroup.children[index];
    label.visible = index === active;
    label.position.set(garment.position.x, garment.position.y - 2.15, garment.position.z + 0.5);
    label.material.opacity = index === active ? 1 : 0;
  });
}

function sectionProgress(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  if (total <= 0) return rect.top < window.innerHeight && rect.bottom > 0 ? 1 : 0;
  return clamp((0 - rect.top) / total, 0, 1);
}

function currentSceneName() {
  const sections = qsa(".scene-section");
  let best = "hero";
  let bestDistance = Infinity;
  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height * 0.42 - window.innerHeight * 0.5);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = section.dataset.scene || best;
    }
  });
  return best;
}

function updateActiveCategoryFromScroll() {
  const section = qs("#categories");
  const progress = sectionProgress(section);
  const index = clamp(Math.floor(progress * categories.length), 0, categories.length - 1);
  if (index !== state.activeIndex) {
    state.activeIndex = index;
    syncCategoryUI();
    playClick(0.025);
  }
}

function syncCategoryUI() {
  const category = categories[state.activeIndex];
  activeCategoryTitle.textContent = category.name;
  activeCategoryDesc.textContent = category.description;
  activeCategoryLink.href = routeHref(category.path);
  qsa("#category-rail button").forEach((button, index) => {
    button.classList.toggle("is-active", index === state.activeIndex);
  });
}

function updateHomeScene(time) {
  updateActiveCategoryFromScroll();
  const sceneName = currentSceneName();
  const isCategory = sceneName === "categories";
  const isFabric = sceneName === "fabric";
  const isAtmosphere = ["behind", "lookbook", "packaging"].includes(sceneName);
  const isBuilder = sceneName === "builder";
  const isFooter = sceneName === "footer";
  const isCountdown = sceneName === "countdown";

  logoGroup.visible = !isCategory && !isFabric && !isBuilder;
  categoryGroup.visible = isCategory;
  categoryLabelGroup.visible = isCategory;
  fabricPlane.visible = isFabric;
  atmosphereGroup.visible = isAtmosphere || isCountdown;
  outfitGroup.visible = isBuilder;
  footerParticleSystem.visible = isFooter;
  collectionRoomGroup.visible = false;

  const scroll = window.scrollY / Math.max(1, document.body.scrollHeight - window.innerHeight);
  rootGroup.rotation.y = lerp(rootGroup.rotation.y, state.mouse.x * 0.08, 0.06);
  rootGroup.rotation.x = lerp(rootGroup.rotation.x, -state.mouse.y * 0.05, 0.06);

  if (logoGroup.visible) {
    logoGroup.rotation.y += 0.005;
    logoGroup.rotation.x = -0.08 + Math.sin(time * 0.6) * 0.035;
    const targetScale = sceneName === "hero" ? 1.02 : isFooter ? 0.58 : 0.72;
    logoGroup.scale.setScalar(lerp(logoGroup.scale.x, targetScale, 0.05));
    logoGroup.position.y = lerp(logoGroup.position.y, sceneName === "hero" ? 0.18 : 0.72, 0.04);
    logoGroup.position.z = lerp(logoGroup.position.z, sceneName === "hero" ? 0 : -1.6, 0.04);
  }

  if (isCategory) {
    layoutCarousel(time);
  }

  if (isFabric) {
    const positions = fabricPlane.geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const wave = Math.sin(x * 4 + time * 1.2) * 0.04 + Math.cos(y * 5 + time * 0.9) * 0.025;
      positions.setZ(i, wave);
    }
    positions.needsUpdate = true;
    fabricPlane.rotation.z = lerp(fabricPlane.rotation.z, state.fabricZoom ? 0.08 : -0.05, 0.04);
    fabricPlane.scale.setScalar(lerp(fabricPlane.scale.x, state.fabricZoom ? 1.48 : 1, 0.05));
  }

  if (isBuilder) {
    updateOutfit(time);
  }

  if (particleSystem) {
    particleSystem.rotation.y += 0.0008;
    particleSystem.rotation.x = scroll * 0.25;
  }

  if (footerParticleSystem.visible) {
    footerParticleSystem.rotation.y -= 0.0014;
    footerParticleSystem.position.y = Math.sin(time * 0.4) * 0.18;
  }

  const targetZ = isCategory ? 7 : isFabric ? 4.2 : isBuilder ? 7.8 : 7.6;
  const targetY = isCategory ? 0.15 : isFabric ? 0.05 : 0.16;
  camera.position.z = lerp(camera.position.z, targetZ + state.mouse.y * 0.18, 0.035);
  camera.position.x = lerp(camera.position.x, state.mouse.x * 0.42, 0.04);
  camera.position.y = lerp(camera.position.y, targetY + state.mouse.y * 0.2, 0.04);
  camera.lookAt(0, isCategory ? -0.15 : 0, 0);
}

function updateOutfit(time) {
  if (!outfitGroup.children.length) {
    rebuildOutfit();
  }
  outfitGroup.rotation.y = Math.sin(time * 0.38) * 0.18;
  outfitGroup.children.forEach((child, index) => {
    child.position.y += Math.sin(time + index) * 0.0008;
    child.rotation.y += 0.002;
  });
}

function rebuildOutfit() {
  if (!outfitGroup) return;
  while (outfitGroup.children.length) {
    outfitGroup.remove(outfitGroup.children[0]);
  }

  const map = {
    "Zip Hoodie + Sweatpants": ["hoodie", "sweatpants"],
    "Tee + Shorts": ["tee", "shorts"],
    "Longsleeve + Jeans": ["longsleeve", "jeans"],
    "Tracksuit Set": ["tracksuit", "sweatpants"],
  };
  const kinds = map[state.fit] || map["Zip Hoodie + Sweatpants"];
  kinds.forEach((kind, index) => {
    const source = categories.find((category) => category.kind === kind) || categories[0];
    const garment = createGarment(source, { scale: 0.86, nested: true });
    garment.position.set(index === 0 ? 0 : 0.1, index === 0 ? 0.78 : -1.25, 0);
    outfitGroup.add(garment);
  });
  outfitGroup.position.set(1.9, 0, -0.6);
}

function rebuildCollectionRoom(category) {
  while (collectionRoomGroup.children.length) {
    collectionRoomGroup.remove(collectionRoomGroup.children[0]);
  }
  const roomLogo = createDWLogo();
  roomLogo.scale.setScalar(0.38);
  roomLogo.position.set(-2.4, 1.65, -2.5);
  collectionRoomGroup.add(roomLogo);

  const main = createGarment(category, { scale: 1.28 });
  main.position.set(0, -0.1, -0.8);
  collectionRoomGroup.add(main);

  categories.slice(0, 4).forEach((item, index) => {
    const support = createGarment(item, { scale: 0.48, nested: true });
    support.position.set(-3.5 + index * 2.35, -1.35, -3.3);
    support.rotation.y = -0.3 + index * 0.2;
    collectionRoomGroup.add(support);
  });
}

function updateCollectionScene(time) {
  logoGroup.visible = false;
  categoryGroup.visible = false;
  categoryLabelGroup.visible = false;
  fabricPlane.visible = false;
  atmosphereGroup.visible = true;
  outfitGroup.visible = false;
  footerParticleSystem.visible = true;
  collectionRoomGroup.visible = true;

  collectionRoomGroup.rotation.y = Math.sin(time * 0.24) * 0.08 + state.mouse.x * 0.04;
  collectionRoomGroup.children.forEach((child, index) => {
    child.rotation.y += index === 1 ? 0.004 : 0.001;
  });
  camera.position.x = lerp(camera.position.x, state.mouse.x * 0.38, 0.05);
  camera.position.y = lerp(camera.position.y, 0.18 + state.mouse.y * 0.16, 0.05);
  camera.position.z = lerp(camera.position.z, 7.2, 0.05);
  camera.lookAt(0, -0.1, -0.8);
}

function animate() {
  const time = state.clock.getElapsedTime();
  state.mouse.x = lerp(state.mouse.x, state.targetMouse.x, 0.08);
  state.mouse.y = lerp(state.mouse.y, state.targetMouse.y, 0.08);

  if (state.routeMode === "home") {
    updateHomeScene(time);
  } else {
    updateCollectionScene(time);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function onResize() {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeFabricCanvas();
}

function onPointerMove(event) {
  const x = event.clientX / window.innerWidth;
  const y = event.clientY / window.innerHeight;
  state.pointer.x = x * 2 - 1;
  state.pointer.y = -(y * 2 - 1);
  state.targetMouse.x = state.pointer.x;
  state.targetMouse.y = state.pointer.y;

  if (cursor) {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  }
  if (cursorLabel) {
    cursorLabel.style.left = `${event.clientX}px`;
    cursorLabel.style.top = `${event.clientY}px`;
  }

  if (!raycaster || !camera || !categoryGroup.visible) return;
  raycaster.setFromCamera(state.pointer, camera);
  const hits = raycaster.intersectObjects(categoryGroup.children, true);
  const route = hits.find((hit) => hit.object.userData.route)?.object.userData.route || null;
  state.hoveredRoute = route;
  cursor?.classList.toggle("is-shop", Boolean(route));
}

function onCanvasClick() {
  if (!state.hoveredRoute) return;
  navigate(state.hoveredRoute);
}

function buildCategoryRail() {
  categoryRail.innerHTML = "";
  categories.forEach((category, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", category.name);
    button.className = index === 0 ? "is-active" : "";
    button.addEventListener("click", () => {
      state.activeIndex = index;
      syncCategoryUI();
      navigate(category.path);
    });
    categoryRail.append(button);
  });
}

function productsForCategory(category) {
  if (!category || category.slug === "all") {
    return allProducts.map((name, index) => ({
      name,
      price: index % 2 ? "EUR110" : "EUR120",
      copy: "Garment washed cotton, oversized shape, tonal DAYWEAR detailing.",
    }));
  }
  const base = category.name.replace(/s$/, "");
  return [
    {
      name: `Weekend ${base}`,
      price: "EUR120",
      copy: category.description,
    },
    {
      name: `Washed ${base}`,
      price: "EUR110",
      copy: "Soft washed texture, clean proportion, and subtle DW mark.",
    },
    {
      name: `Long Day ${base}`,
      price: "EUR118",
      copy: "A premium everyday piece with quiet labels and studio-ready weight.",
    },
  ];
}

function renderProductCards(category) {
  productLine.innerHTML = "";
  productsForCategory(category).forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <h3>${product.name}</h3>
      <p>${product.price} / ${product.copy}</p>
      <button type="button">View Product</button>
    `;
    card.querySelector("button").addEventListener("click", () => openDrawer(product, category));
    productLine.append(card);
  });
}

function openDrawer(product, category = categories[0]) {
  qs("#drawer-kicker").textContent = category?.name || "DAYWEAR";
  qs("#drawer-title").textContent = product.name;
  qs("#drawer-copy").textContent =
    product.copy || "Heavy cotton, washed finish, oversized fit, and custom DAYWEAR labels.";
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
}

function renderCollection(slug) {
  const category =
    slug === "all"
      ? {
          name: "All Garments",
          slug: "all",
          description:
            "The full DAYWEAR wardrobe: hoodies, tees, shorts, sweatpants, jeans, tracksuits, longsleeves, and summer sets.",
          color: "#171614",
          accent: "#e7ddcd",
          kind: "hoodie",
        }
      : categories.find((item) => item.slug === slug) || categories[0];

  state.routeMode = "collection";
  homeView.hidden = true;
  collectionView.hidden = false;
  qs("#collection-title").textContent = category.name;
  qs("#collection-description").textContent = category.description;
  renderProductCards(category);
  rebuildCollectionRoom(category);
}

function renderInfoPage(path) {
  const content = {
    "/lookbook": {
      title: "Lookbook",
      description:
        "Floating editorial frames, invisible mannequin fits, and slow studio movement around the DAYWEAR uniform.",
    },
    "/about": {
      title: "About DAYWEAR",
      description:
        "A premium streetwear brand focused on clean everyday pieces, washed textures, oversized fits, and clothing made for long days.",
    },
    "/contact": {
      title: "Contact",
      description: "DAYWEAR studio contact page for drop questions, sizing, and support.",
    },
    "/shipping": {
      title: "Shipping",
      description: "Premium packing, tracked shipping, clean boxes, dust bags, and launch drop fulfillment.",
    },
    "/returns": {
      title: "Returns",
      description: "A simple returns experience for unworn DAYWEAR pieces with original labels and packaging.",
    },
    "/cart": {
      title: "Bag",
      description: "Your DAYWEAR bag is ready for the first drop.",
    },
  }[path] || {
    title: "DAYWEAR",
    description: "Clean premium streetwear built for long days.",
  };

  state.routeMode = "collection";
  homeView.hidden = true;
  collectionView.hidden = false;
  qs("#collection-title").textContent = content.title;
  qs("#collection-description").textContent = content.description;
  productLine.innerHTML = "";
  const category = categories[0];
  renderProductCards(category);
  rebuildCollectionRoom(category);
}

function renderHome(scrollTarget = null) {
  state.routeMode = "home";
  homeView.hidden = false;
  collectionView.hidden = true;
  syncCategoryUI();
  const locationHash = window.location.hash && !window.location.hash.startsWith("#/")
    ? window.location.hash
    : null;
  const hashTarget = scrollTarget || locationHash;
  if (!hashTarget) return;
  const runScroll = () => {
    const el = qs(hashTarget);
    if (el) {
      const top = el.offsetTop;
      window.scrollTo({ top, behavior: "auto" });
      document.documentElement.scrollTop = top;
      document.body.scrollTop = top;
    }
  };
  requestAnimationFrame(runScroll);
  setTimeout(runScroll, 2200);
}

function renderRoute(path = routeFromLocation()) {
  closeDrawer();
  if (path === "/") {
    renderHome();
    return;
  }
  if (path === "/fabric-dna") {
    renderHome("#fabric-dna");
    return;
  }
  if (path.startsWith("/collections/")) {
    renderCollection(path.split("/").filter(Boolean).pop());
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  renderInfoPage(path);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function navigate(path) {
  if (path === routeFromLocation() && path !== "/fabric-dna") return;
  clothTransition.classList.add("is-active");
  playClick(0.05);
  setTimeout(() => {
    window.history.pushState({}, "", routeHref(path));
    renderRoute(path);
  }, 320);
  setTimeout(() => {
    clothTransition.classList.remove("is-active");
  }, 720);
}

function bindRoutes() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a.nav-route");
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(routeFromLink(link));
  });
  window.addEventListener("popstate", () => renderRoute());
  window.addEventListener("hashchange", () => renderRoute());
}

function bindUI() {
  qs("#drawer-close").addEventListener("click", closeDrawer);
  qs("#fabric-zoom").addEventListener("click", () => {
    state.fabricZoom = !state.fabricZoom;
    qs("#fabric-zoom").textContent = state.fabricZoom ? "Reset View" : "View Fabric";
    playClick(0.05);
  });

  qs("#add-to-bag").addEventListener("click", () => {
    const count = qs(".cart-link span");
    count.textContent = String(Number(count.textContent) + 1);
    drawer.animate(
      [
        { transform: "translateX(0) scale(1)" },
        { transform: "translateX(0) scale(0.985)" },
        { transform: "translateX(0) scale(1)" },
      ],
      { duration: 360, easing: "ease-out" }
    );
    playClick(0.08);
  });

  qsa(".size-selector button").forEach((button) => {
    button.addEventListener("click", () => {
      qsa(".size-selector button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      playClick(0.035);
    });
  });

  qsa(".filter-bar button").forEach((button) => {
    button.addEventListener("click", () => {
      qsa(".filter-bar button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      playClick(0.035);
    });
  });

  qsa("#fit-controls button").forEach((button) => {
    button.addEventListener("click", () => {
      qsa("#fit-controls button").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      state.fit = button.dataset.fit;
      qs("#fit-label").textContent = state.fit;
      rebuildOutfit();
      playClick(0.04);
    });
  });

  document.addEventListener("mouseover", (event) => {
    const interactive = event.target.closest("a, button, .product-card");
    const labelTarget = event.target.closest("[data-cursor]");
    const label = labelTarget?.dataset.cursor || (interactive ? "VIEW" : "");
    cursor?.classList.toggle("is-shop", Boolean(interactive));
    if (cursorLabel) {
      cursorLabel.textContent = label;
      cursorLabel.classList.toggle("is-visible", Boolean(label));
    }
    if (interactive) playClick(0.012);
  });

  document.addEventListener("mouseout", (event) => {
    if (!event.relatedTarget || !event.target.closest("a, button, .product-card, [data-cursor]")) return;
    const stillInside = event.relatedTarget.closest?.("a, button, .product-card, [data-cursor]");
    if (!stillInside && cursorLabel) {
      cursorLabel.classList.remove("is-visible");
    }
  });

  const newsletter = qs("#newsletter-form");
  newsletter?.addEventListener("submit", (event) => {
    event.preventDefault();
    const note = qs("#newsletter-note");
    const input = newsletter.querySelector("input");
    if (note) {
      note.textContent = input?.value
        ? "You are on the DAYWEAR Drop 01 list."
        : "Enter an email to join the Drop 01 list.";
    }
    playClick(0.05);
  });
}

function resizeFabricCanvas() {
  const fabricCanvas = qs("#fabric-canvas");
  if (!fabricCanvas) return;
  const rect = fabricCanvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  fabricCanvas.width = Math.max(1, Math.floor(rect.width * scale));
  fabricCanvas.height = Math.max(1, Math.floor(rect.height * scale));
}

function setupFabricCanvas() {
  const fabricCanvas = qs("#fabric-canvas");
  if (!fabricCanvas) return;
  const ctx = fabricCanvas.getContext("2d");
  if (!ctx) return;

  const draw = () => {
    resizeFabricCanvas();
    const width = fabricCanvas.width;
    const height = fabricCanvas.height;
    const time = performance.now() * 0.001;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#141311";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.82;
    const spacing = Math.max(12, Math.floor(width / 42));
    for (let y = 0; y < height; y += spacing) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(231,221,205,0.055)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 8) {
        const wave = Math.sin(x * 0.017 + y * 0.011 + time) * 2.2;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    for (let x = 0; x < width; x += spacing) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(117,97,80,0.09)";
      ctx.lineWidth = 1;
      for (let y = 0; y <= height; y += 8) {
        const wave = Math.cos(y * 0.018 + x * 0.011 + time * 0.8) * 1.8;
        if (y === 0) ctx.moveTo(x + wave, y);
        else ctx.lineTo(x + wave, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(width / 2, height / 2);
    const mark = Math.min(width, height) * 0.22;
    ctx.strokeStyle = "rgba(231,221,205,0.2)";
    ctx.lineWidth = Math.max(2, mark * 0.025);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-mark * 0.9, -mark * 0.55);
    ctx.lineTo(-mark * 0.9, mark * 0.55);
    ctx.moveTo(-mark * 0.9, -mark * 0.55);
    ctx.bezierCurveTo(-mark * 0.1, -mark * 0.6, -mark * 0.05, mark * 0.6, -mark * 0.9, mark * 0.55);
    ctx.moveTo(mark * 0.02, -mark * 0.55);
    ctx.lineTo(mark * 0.02, mark * 0.55);
    ctx.lineTo(mark * 0.42, -mark * 0.05);
    ctx.lineTo(mark * 0.84, mark * 0.55);
    ctx.lineTo(mark * 0.84, -mark * 0.55);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < 260; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const alpha = Math.random() * 0.045;
      ctx.fillStyle = `rgba(231,221,205,${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    requestAnimationFrame(draw);
  };
  draw();
}

function setupCountdown() {
  const target = new Date();
  target.setDate(target.getDate() + 38);
  target.setHours(20, 0, 0, 0);

  const update = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    const minutes = Math.floor(diff / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    qs("#days").textContent = String(days).padStart(2, "0");
    qs("#hours").textContent = String(hours).padStart(2, "0");
    qs("#minutes").textContent = String(mins).padStart(2, "0");
  };
  update();
  setInterval(update, 30000);
}

function setupAudio() {
  qs("#sound-toggle").addEventListener("click", async () => {
    if (!audioContext) {
      audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const low = audioContext.createOscillator();
      ambientGain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 62;
      low.type = "triangle";
      low.frequency.value = 93;
      ambientGain.gain.value = 0;
      oscillator.connect(ambientGain);
      low.connect(ambientGain);
      ambientGain.connect(audioContext.destination);
      oscillator.start();
      low.start();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    state.soundOn = !state.soundOn;
    document.body.classList.toggle("sound-on", state.soundOn);
    ambientGain.gain.linearRampToValueAtTime(state.soundOn ? 0.018 : 0, audioContext.currentTime + 0.35);
  });
}

function playClick(volume = 0.03) {
  if (!state.soundOn || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 420;
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.08);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.09);
}

function init() {
  buildCategoryRail();
  bindRoutes();
  bindUI();
  setupCountdown();
  setupAudio();
  setupFabricCanvas();
  syncCategoryUI();

  const ok = initThree();
  renderRoute();
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("scroll", () => {
    if (state.routeMode === "home") updateActiveCategoryFromScroll();
  }, { passive: true });

  if (ok) {
    animate();
  }

  if (window.location.hash && !window.location.hash.startsWith("#/")) {
    setTimeout(() => {
      const el = qs(window.location.hash);
      if (el) {
        const top = el.offsetTop;
        window.scrollTo({ top, behavior: "auto" });
        document.documentElement.scrollTop = top;
        document.body.scrollTop = top;
      }
    }, 2600);
  }

  setTimeout(() => loader.classList.add("is-hidden"), 1900);
}

init();
