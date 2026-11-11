import * as THREE from "three";
import { City, H, TILE, W, WATER_X, hash, type MapLayer, type ToolId, type Track } from "./city";
import { buildingAt, buildingById, chunkIndex, footprint, structureParts } from "./buildings";
import { CHUNK_CAP, ChunkField, emptyBucket } from "./chunks";
import { HEX, shade } from "./colors";
import type { CityView, Gfx } from "./view";

const CAP = CHUNK_CAP;

interface Part {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  c: number;
}

function wx(x: number) {
  return (x - W / 2 + 0.5) * TILE;
}
function wz(z: number) {
  return (z - H / 2 + 0.5) * TILE;
}

export class CityScene implements CityView {
  keys = new Set<string>();
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private ray = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();
  private sky = new THREE.Color();
  private skyDay = new THREE.Color(0x8ec8ea);
  private skyNight = new THREE.Color(0x070b14);
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private field: ChunkField;
  private winMat: THREE.MeshStandardMaterial;
  private lampMat: THREE.MeshStandardMaterial;
  private water: THREE.Mesh;
  private ghost: THREE.Mesh;
  private ring: THREE.LineSegments;
  private cars: THREE.Mesh[] = [];
  private metro: THREE.Group;
  private rail: THREE.Group;
  private rrts: THREE.Group;
  private plane: THREE.Group;
  private boat: THREE.Group;
  private pickPlane: THREE.Mesh;
  private clouds: THREE.Mesh[] = [];
  private hour = 13.2;
  private time = 0;
  private gfx: Gfx;
  private hasAirport = false;
  private hasBoat = false;
  private street = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private city: City,
    gfx: Gfx,
  ) {
    this.gfx = gfx;
    const lite = gfx === "lite";
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !lite,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.15 : 1.6));
    this.renderer.shadowMap.enabled = !lite;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.4, 900);
    this.scene.fog = new THREE.Fog(this.skyDay, 110, 460);

    this.hemi = new THREE.HemisphereLight(0xc5e6f5, 0x1d3a28, 0.85);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.35);
    this.sun.position.set(60, 80, 30);
    this.sun.castShadow = !lite;
    this.sun.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
    const s = 130;
    this.sun.shadow.camera.left = -s;
    this.sun.shadow.camera.right = s;
    this.sun.shadow.camera.top = s;
    this.sun.shadow.camera.bottom = -s;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 280;
    this.sun.shadow.bias = -0.00035;
    this.scene.add(this.sun);
    const fill = new THREE.DirectionalLight(0x8eb4c8, 0.28);
    fill.position.set(-50, 24, -28);
    this.scene.add(fill);

    const skirt = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshStandardMaterial({ color: 0x07140f, roughness: 1 }),
    );
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.y = -0.6;
    this.scene.add(skirt);

    const landW = WATER_X * TILE;
    const land = new THREE.Mesh(
      new THREE.PlaneGeometry(landW, H * TILE),
      new THREE.MeshStandardMaterial({ map: grassTex(), color: 0xffffff, roughness: 1 }),
    );
    land.rotation.x = -Math.PI / 2;
    land.position.set((WATER_X / 2 - W / 2) * TILE, 0, 0);
    land.receiveShadow = !lite;
    this.scene.add(land);

    const waterW = (W - WATER_X) * TILE;
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(waterW + 80, H * TILE + 80),
      new THREE.MeshStandardMaterial({
        color: HEX.water,
        roughness: 0.22,
        metalness: 0.35,
        emissive: 0x062833,
        emissiveIntensity: 0.35,
      }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(((WATER_X + W) / 2 - W / 2) * TILE + 20, -0.18, 0);
    this.scene.add(this.water);

    const solid = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.04 });
    const geoB = new THREE.BoxGeometry(1, 1, 1);
    this.winMat = new THREE.MeshStandardMaterial({
      color: 0x1a120c,
      emissive: HEX.window,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0,
      roughness: 0.35,
    });
    this.lampMat = new THREE.MeshStandardMaterial({
      color: 0x2a2418,
      emissive: HEX.lamp,
      emissiveIntensity: 0,
      roughness: 0.4,
    });
    this.field = new ChunkField(this.scene, solid, this.winMat, this.lampMat, !lite);

    this.ghost = new THREE.Mesh(
      geoB,
      new THREE.MeshStandardMaterial({
        color: 0x6eecc8,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        roughness: 0.5,
      }),
    );
    this.ghost.visible = false;
    this.ghost.scale.set(TILE * 0.92, 0.35, TILE * 0.92);
    this.scene.add(this.ghost);

    this.ring = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(TILE * 0.96, 0.7, TILE * 0.96)),
      new THREE.LineBasicMaterial({ color: 0x6eecc8 }),
    );
    this.ring.visible = false;
    this.scene.add(this.ring);

    const carMat = () =>
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.2 });
    const nCars = lite ? 18 : 42;
    for (let i = 0; i < nCars; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 1.55), carMat());
      m.castShadow = !lite;
      m.visible = false;
      (m.material as THREE.MeshStandardMaterial).color.setHex(HEX.car[i % HEX.car.length]);
      this.cars.push(m);
      this.scene.add(m);
    }
    const trainMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.35 });
    this.metro = train(4.2, 0.7, 1.15, trainMat(HEX.metro));
    this.rail = train(5.2, 0.7, 1.25, trainMat(0xd8d2c8));
    this.rrts = train(4.6, 0.62, 1.05, trainMat(HEX.rrts));
    this.scene.add(this.metro, this.rail, this.rrts);

    this.plane = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.4, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 3.4), white);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.7), white);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.4), white);
    tail.position.z = -1.3;
    this.plane.add(body, wing, tail);
    this.plane.visible = false;
    this.scene.add(this.plane);

    this.boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 3.2), new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.35 }));
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 1.2), new THREE.MeshStandardMaterial({ color: HEX.metro, roughness: 0.4 }));
    cabin.position.set(0, 0.4, -0.3);
    this.boat.add(hull, cabin);
    this.boat.visible = false;
    this.scene.add(this.boat);

    this.pickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.pickPlane.position.y = 0.02;

    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(
        new THREE.PlaneGeometry(28 + i * 6, 10),
        new THREE.MeshBasicMaterial({ map: cloudTex(), transparent: true, depthWrite: false, opacity: 0.55 }),
      );
      c.position.set(-40 + i * 28, 38 + (i % 3) * 6, -30 + (i % 2) * 40);
      this.clouds.push(c);
      this.scene.add(c);
    }

    this.resize();
    this.sync();
    this.applyCamera();
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  sync() {
    const started = performance.now();
    const dirty = new Set(this.city.pullVisualDirty());
    const buckets = [emptyBucket(), emptyBucket(), emptyBucket(), emptyBucket()];
    this.hasAirport = false;
    this.hasBoat = false;
    const city = this.city;

    let liftY = 0;
    let box = buckets[0].box;
    let cyl = buckets[0].cyl;
    let cone = buckets[0].cone;
    let win = buckets[0].win;
    let lamp = buckets[0].lamp;
    const add = (list: Part[], x: number, z: number, sx: number, sy: number, sz: number, y: number, c: number, ry = 0) => {
      if (list.length >= CAP || sy <= 0) return;
      list.push({ x, y: y + liftY, z, sx, sy, sz, ry, c });
    };

    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const ci = chunkIndex(x, z);
        if (!dirty.has(ci)) continue;
        const bucket = buckets[ci];
        box = bucket.box;
        cyl = bucket.cyl;
        cone = bucket.cone;
        win = bucket.win;
        lamp = bucket.lamp;
        const t = city.tile(x, z);
        liftY = (t.elev || 0) * 0.42;
        const X = wx(x);
        const Z = wz(z);
        if (x === WATER_X - 1 && t.ground === 0) {
          add(box, X + TILE * 0.38, Z, 0.7, 0.1, TILE * 0.98, 0.01, HEX.sand);
        }
        if (t.road) {
          const bridge = t.ground === 1;
          const y = bridge ? 1.05 : 0.02;
          const kind = t.roadKind;
          const span = kind === 2 ? 3.92 : kind === 1 ? 3.7 : 3.28;
          const hot = t.traffic;
          const col = hot > 0.62 ? lerpHex(HEX.road, HEX.roadHot, Math.min(1, (hot - 0.5) * 2)) : kind === 2 ? 0x2c343c : HEX.road;
          const left = roadAt(city, x - 1, z);
          const right = roadAt(city, x + 1, z);
          const north = roadAt(city, x, z - 1);
          const south = roadAt(city, x, z + 1);
          const horiz = left || right;
          const vert = north || south;
          if (bridge) {
            add(cyl, X - 1.05, Z - 1.05, 0.22, 1.05, 0.22, 0, 0x243038);
            add(cyl, X + 1.05, Z + 1.05, 0.22, 1.05, 0.22, 0, 0x243038);
            add(box, X, Z, span * 0.72, 0.18, span * 0.72, y, shade(col, 0.9));
            add(box, X, Z, horiz || !vert ? span : span * 0.62, 0.28, vert || !horiz ? span : span * 0.62, y + 0.12, col);
          } else {
            add(box, X, Z, span, 0.1, span, y, col);
            const walk = 0xc9c3b6;
            const edge = span * 0.46;
            if (!north) add(box, X, Z - edge, span, 0.06, 0.34, y + 0.02, walk);
            if (!south) add(box, X, Z + edge, span, 0.06, 0.34, y + 0.02, walk);
            if (!left) add(box, X - edge, Z, 0.34, 0.06, span * 0.86, y + 0.02, walk);
            if (!right) add(box, X + edge, Z, 0.34, 0.06, span * 0.86, y + 0.02, walk);
          }
          const deck = y + (bridge ? 0.42 : 0.12);
          if (t.junction === 2) add(cyl, X, Z, 0.7, 0.08, 0.7, deck + 0.02, 0xe7eef2);
          else if (t.junction === 1) add(box, X, Z, 0.28, 0.9, 0.28, deck, 0x2a3138);
          else if (t.junction === 5) add(box, X, Z, 1.4, 0.08, 0.35, deck, HEX.sand);
          else if (t.oneWay === 1) add(box, X + 0.45, Z, 0.7, 0.03, 0.16, deck, 0xf2e2a0);
          else if (t.oneWay === 2) add(box, X - 0.45, Z, 0.7, 0.03, 0.16, deck, 0xf2e2a0);
          else if (t.oneWay === 3) add(box, X, Z + 0.45, 0.16, 0.03, 0.7, deck, 0xf2e2a0);
          else if (t.oneWay === 4) add(box, X, Z - 0.45, 0.16, 0.03, 0.7, deck, 0xf2e2a0);
          else if (horiz && !vert) add(box, X, Z, 1.15, 0.02, 0.1, deck, HEX.mark);
          else if (vert && !horiz) add(box, X, Z, 0.1, 0.02, 1.15, deck, HEX.mark);
          if (!bridge && (x * 3 + z * 5) % 7 === 0) {
            const lx = vert && !horiz ? (x % 2 === 0 ? 1.55 : -1.55) : 1.55;
            const lz = horiz && !vert ? (z % 2 === 0 ? 1.35 : -1.35) : 0;
            add(box, X + lx, Z + lz, 0.08, 1.45, 0.08, y, 0x2a3138);
            add(lamp, X + lx, Z + lz, 0.28, 0.28, 0.28, y + 1.45, HEX.lamp);
          }
        }
        if (city.layer !== "city") {
          add(box, X, Z, 3.92, 0.04, 3.92, 0.22, layerTint(t, city.layer));
        }
        if (t.track === "rail") trackBed(add, box, X, Z, "rail", city, x, z, 0.12, HEX.rail);
        if (t.track === "metro") {
          add(cyl, X, Z, 0.28, 2.05, 0.28, 0.12, 0x2c343c);
          trackBed(add, box, X, Z, "metro", city, x, z, 2.18, HEX.metro);
        }
        if (t.track === "rrts") {
          add(cyl, X, Z, 0.22, 3.15, 0.22, 0.12, 0x3a2a28);
          trackBed(add, box, X, Z, "rrts", city, x, z, 3.28, HEX.rrts);
        }
        if (t.track === "runway") {
          add(box, X, Z, 3.85, 0.08, 3.85, 0.04, HEX.runway);
          add(box, X, Z, 0.28, 0.03, 1.8, 0.12, HEX.runwayMark);
        }
        if (t.bid && t.bax === x && t.baz === z) {
          paintStructure(add, box, cyl, cone, win, x, z, t.brot, t.bid, t.bseed, t.bstage, t.powered);
        } else if (!t.bid && t.zone !== "none" && t.plop === "none") {
          if (t.level <= 0) {
            const lot = t.zone === "r" ? HEX.lotR : t.zone === "c" ? HEX.lotC : t.zone === "i" ? HEX.lotI : HEX.lotO;
            add(box, X, Z, 3.35, 0.06, 3.35, 0.03, t.served ? lot : shade(lot, 0.65));
          } else {
            growBuilding(add, box, cyl, win, X, Z, x, z, t.zone, t.level, t.powered);
          }
        }
        if (!t.bid && t.plop !== "none") plop(add, box, cyl, cone, X, Z, x, z, t.plop, t.powered);
        if (t.plop === "airport") this.hasAirport = true;
        if (t.plop === "port" || t.plop === "marina" || t.plop === "ferry") this.hasBoat = true;
      }
    }

    for (let i = 0; i < buckets.length; i++) {
      if (!dirty.has(i)) continue;
      this.field.write(i, buckets[i], this.dummy, this.color);
    }
    this.city.lastDrawMs = performance.now() - started;
  }

  frame(dt: number) {
    const d = Math.min(dt, 0.05);
    this.time += d;
    this.moveCam(d);
    if (this.street) this.rideCam();
    this.skyTime(d);
    this.agents(d);
    const waterMat = this.water.material as THREE.MeshStandardMaterial;
    waterMat.emissiveIntensity = 0.25 + Math.sin(this.time * 0.8) * 0.05;
    for (const c of this.clouds) c.position.x += d * 1.4;
    if (this.clouds[0] && this.clouds[0].position.x > 120) {
      for (const c of this.clouds) c.position.x -= 200;
    }
    const sel = this.city.selected;
    this.ring.visible = !!sel;
    if (sel) {
      this.ring.position.set(wx(sel.x), 0.4, wz(sel.z));
    }
    this.renderer.render(this.scene, this.camera);
  }

  pick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera(this.ndc, this.camera);
    const origin = this.ray.ray.origin;
    const dir = this.ray.ray.direction;
    for (let t = 2; t < 560; t += 0.8) {
      const px = origin.x + dir.x * t;
      const py = origin.y + dir.y * t;
      const pz = origin.z + dir.z * t;
      const x = Math.floor(px / TILE + W / 2);
      const z = Math.floor(pz / TILE + H / 2);
      if (x < 0 || z < 0 || x >= W || z >= H) continue;
      const h = (this.city.tile(x, z).elev || 0) * 0.42;
      if (py <= h + 0.45) return { x, z };
    }
    const hit = this.ray.intersectObject(this.pickPlane)[0];
    if (!hit) return null;
    const x = Math.floor(hit.point.x / TILE + W / 2);
    const z = Math.floor(hit.point.z / TILE + H / 2);
    if (x < 0 || z < 0 || x >= W || z >= H) return null;
    return { x, z };
  }

  setGhost(x: number, z: number, tool: ToolId | null) {
    const id = this.city.catalogId;
    if (id && x >= 0 && z >= 0) {
      const spec = buildingById(id);
      if (!spec) {
        this.ghost.visible = false;
        return;
      }
      const fp = footprint(spec, x, z, this.city.catalogRot);
      const bad = this.city.buildingError(x, z, id, this.city.catalogRot);
      this.ghost.visible = true;
      this.ghost.scale.set(fp.w * TILE * 0.92, 0.45, fp.d * TILE * 0.92);
      this.ghost.position.set(wx(x) + ((fp.w - 1) * TILE) / 2, 0.28 + (this.city.tile(x, z).elev || 0) * 0.42, wz(z) + ((fp.d - 1) * TILE) / 2);
      (this.ghost.material as THREE.MeshStandardMaterial).color.setHex(bad ? 0xef8b78 : 0x6eecc8);
      return;
    }
    this.ghost.scale.set(TILE * 0.92, 0.35, TILE * 0.92);
    if (x < 0 || z < 0 || !tool || tool === "inspect") {
      this.ghost.visible = false;
      return;
    }
    this.ghost.visible = true;
    this.ghost.position.set(wx(x), 0.28, wz(z));
    const bad = this.city.hintAt(x, z, tool);
    (this.ghost.material as THREE.MeshStandardMaterial).color.setHex(bad ? 0xef8b78 : 0x6eecc8);
  }

  focus(x: number, z: number) {
    this.city.camera.x = wx(x);
    this.city.camera.z = wz(z);
    this.city.camera.distance = Math.min(this.city.camera.distance, 56);
    this.applyCamera();
  }

  panBy(dx: number, dy: number) {
    this.street = false;
    const scale = this.city.camera.distance / Math.max(240, this.canvas.clientHeight);
    const yaw = this.city.camera.yaw;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    this.city.camera.x += (-rx * dx + fx * dy) * scale;
    this.city.camera.z += (-rz * dx + fz * dy) * scale;
    this.clampTarget();
    this.applyCamera();
  }

  zoomBy(factor: number) {
    this.street = false;
    this.city.camera.distance = THREE.MathUtils.clamp(this.city.camera.distance * factor, 18, 280);
    this.applyCamera();
  }

  rotateBy(yaw: number) {
    this.street = false;
    this.city.camera.yaw += yaw;
    this.applyCamera();
  }

  pitchBy(v: number) {
    this.city.camera.pitch = THREE.MathUtils.clamp(this.city.camera.pitch + v, 0.38, 1.25);
    this.applyCamera();
  }

  toggleNight() {
    this.hour = this.hour > 17 || this.hour < 6 ? 13 : 21.2;
    this.skyTime(0);
  }

  setStreet(on: boolean) {
    this.street = on;
  }

  streetOn() {
    return this.street;
  }

  dispose() {
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }

  private moveCam(dt: number) {
    if (this.street) return;
    const k = this.keys;
    let strafe = 0;
    let ahead = 0;
    let yaw = 0;
    let pitch = 0;
    if (k.has("KeyA") || k.has("ArrowLeft")) strafe -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) strafe += 1;
    if (k.has("KeyW") || k.has("ArrowUp")) ahead += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) ahead -= 1;
    if (k.has("KeyQ")) yaw += 1;
    if (k.has("KeyE")) yaw -= 1;
    if (k.has("KeyR")) pitch += 1;
    if (k.has("KeyF")) pitch -= 1;
    if (!strafe && !ahead && !yaw && !pitch) return;
    const speed = 32 * (this.city.camera.distance / 90);
    const yawC = this.city.camera.yaw;
    const rx = Math.cos(yawC);
    const rz = -Math.sin(yawC);
    const fx = -Math.sin(yawC);
    const fz = -Math.cos(yawC);
    this.city.camera.x += (rx * strafe + fx * ahead) * speed * dt;
    this.city.camera.z += (rz * strafe + fz * ahead) * speed * dt;
    this.city.camera.yaw += yaw * dt * 1.15;
    this.city.camera.pitch = THREE.MathUtils.clamp(this.city.camera.pitch + pitch * dt * 0.55, 0.38, 1.25);
    this.clampTarget();
    this.applyCamera();
  }

  private clampTarget() {
    const limX = (W / 2 + 6) * TILE;
    const limZ = (H / 2 + 6) * TILE;
    this.city.camera.x = THREE.MathUtils.clamp(this.city.camera.x, -limX, limX);
    this.city.camera.z = THREE.MathUtils.clamp(this.city.camera.z, -limZ, limZ);
  }

  private applyCamera() {
    const c = this.city.camera;
    const cp = Math.cos(c.pitch);
    const sp = Math.sin(c.pitch);
    this.camera.position.set(
      c.x + Math.sin(c.yaw) * cp * c.distance,
      sp * c.distance,
      c.z + Math.cos(c.yaw) * cp * c.distance,
    );
    this.camera.lookAt(c.x, 0, c.z);
  }

  private rideCam() {
    const path = this.city.carPaths[0];
    if (!path || path.length < 2) {
      this.street = false;
      return;
    }
    const span = path.length - 1;
    const f = ((this.time * 0.11) % 1) * span;
    const i0 = Math.floor(f);
    const i1 = Math.min(span, i0 + 1);
    const t = f - i0;
    const x = wx(path[i0].x) + (wx(path[i1].x) - wx(path[i0].x)) * t;
    const z = wz(path[i0].z) + (wz(path[i1].z) - wz(path[i0].z)) * t;
    const dx = wx(path[i1].x) - wx(path[i0].x) || 0.01;
    const dz = wz(path[i1].z) - wz(path[i0].z) || 0.01;
    const len = Math.hypot(dx, dz) || 1;
    const fx = dx / len;
    const fz = dz / len;
    const cam = this.city.camera;
    cam.x = x + fx * 8;
    cam.z = z + fz * 8;
    cam.distance = 22;
    cam.pitch = 0.46;
    cam.yaw = Math.atan2(-fx, -fz);
    this.applyCamera();
  }

  private skyTime(dt: number) {
    if (!this.city.paused) this.hour = (this.hour + dt * 0.05 * this.city.speed) % 24;
    const alt = Math.sin(((this.hour - 6) / 12) * Math.PI);
    const day = THREE.MathUtils.clamp(alt, 0, 1);
    const night = 1 - day;
    this.sky.copy(this.skyNight).lerp(this.skyDay, day);
    this.scene.background = this.sky;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(this.sky);
    this.hemi.intensity = 0.22 + day * 0.7;
    this.sun.intensity = 0.08 + day * 1.45;
    this.sun.position.set(Math.cos(((this.hour - 6) / 12) * Math.PI) * 90, Math.max(6, alt * 80), 34);
    this.winMat.opacity = night > 0.25 ? 1 : 0;
    this.winMat.emissiveIntensity = night * 2.1;
    this.lampMat.emissiveIntensity = night * 2.4;
    for (const car of this.cars) {
      const mat = car.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0xffe1a8);
      mat.emissiveIntensity = night * 0.35;
    }
  }

  private agents(dt: number) {
    const paths = this.city.carPaths;
    const n = this.cars.length;
    for (let i = 0; i < n; i++) {
      const car = this.cars[i];
      if (!paths.length) {
        car.visible = false;
        continue;
      }
      const path = paths[i % paths.length];
      if (path.length < 2) {
        car.visible = false;
        continue;
      }
      car.visible = true;
      const rick = i % 3 === 0;
      car.scale.set(rick ? 0.62 : 1, rick ? 0.72 : 1, rick ? 0.7 : 1);
      (car.material as THREE.MeshStandardMaterial).color.setHex(
        rick ? (i % 2 ? 0xf0c14a : 0x3caa62) : HEX.car[i % HEX.car.length],
      );
      const u = ping(this.time * (0.045 + (i % 5) * 0.008) + i / n);
      placeOn(car, path, u, rick ? 0.28 : 0.38);
    }
    ride(this.metro, this.city.trackPaths.metro, this.time * 0.06, 2.55);
    ride(this.rail, this.city.trackPaths.rail, this.time * 0.04, 0.55);
    ride(this.rrts, this.city.trackPaths.rrts, this.time * 0.07, 3.62);
    const run = this.city.runway;
    if (this.hasAirport && run.length > 3) {
      this.plane.visible = true;
      const u = (Math.sin(this.time * 0.35) + 1) / 2;
      const a = run[0];
      const b = run[run.length - 1];
      this.plane.position.set(
        wx(a.x) + (wx(b.x) - wx(a.x)) * u,
        4 + Math.sin(u * Math.PI) * 7,
        wz(a.z) + (wz(b.z) - wz(a.z)) * u,
      );
      this.plane.lookAt(wx(b.x), this.plane.position.y, wz(b.z));
    } else this.plane.visible = false;
    if (this.hasBoat) {
      this.boat.visible = true;
      const u = (this.time * 0.04) % 1;
      const z = -H * 0.35 + u * H * 0.7 * TILE * 0.5;
      this.boat.position.set(wx(WATER_X) + TILE * 0.85, 0.15, z);
      this.boat.rotation.y = u > 0.5 ? Math.PI : 0;
    } else this.boat.visible = false;
    void dt;
  }
}

function paintStructure(
  add: Add,
  box: Part[],
  cyl: Part[],
  cone: Part[],
  win: Part[],
  x: number,
  z: number,
  rot: number,
  bid: number,
  seed: number,
  stage: number,
  powered: boolean,
) {
  const def = buildingAt(bid);
  if (!def) return;
  const fp = footprint(def, x, z, rot);
  const cx = wx(x) + ((fp.w - 1) * TILE) / 2;
  const cz = wz(z) + ((fp.d - 1) * TILE) / 2;
  const ry = rot * (Math.PI / 2);
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  for (const p of structureParts(def, seed, stage, powered && stage !== 6)) {
    const X = cx + p.x * cos + p.z * sin;
    const Z = cz - p.x * sin + p.z * cos;
    const list = p.k === "win" ? win : p.k === "cyl" ? cyl : p.k === "cone" ? cone : box;
    add(list, X, Z, p.sx, p.sy, p.sz, p.y, p.c, p.ry + ry);
  }
}

function roadAt(city: City, x: number, z: number) {
  if (x < 0 || z < 0 || x >= W || z >= H) return false;
  return city.tile(x, z).road;
}

function layerTint(t: { zone: string; road: boolean; traffic: number; powered: boolean; watered: boolean; pollution: number; ground: number; elev?: number; level?: number; basin?: number }, layer: MapLayer) {
  if (t.ground === 1 && !t.road) return 0x17657c;
  if (layer === "zone") {
    if (t.zone === "r") return 0x6dcea0;
    if (t.zone === "c") return 0x7eb6e6;
    if (t.zone === "i") return 0xe4c27a;
    if (t.zone === "o") return 0x8fd0c8;
    if (t.road) return 0x3c4550;
    return 0x163c2a;
  }
  if (layer === "traffic") return t.road ? lerpHex(0x3c4550, 0xc4493a, t.traffic) : 0x163c2a;
  if (layer === "power") return t.powered ? 0xe4c27a : 0x241c18;
  if (layer === "water") return t.watered ? 0x3d9ad4 : 0x1a2830;
  if (layer === "density") return t.zone === "r" ? lerpHex(0x163c2a, 0x6dcea0, Math.min(1, (t.level || 0) / 5)) : 0x163c2a;
  if (layer === "value") return lerpHex(0x241c18, 0xe4c27a, Math.min(1, (t.level || 0) / 5));
  if (layer === "flood") return t.ground === 1 || t.basin || (t.elev || 0) === 0 ? 0x3d9ad4 : 0x1c4a32;
  if (layer === "noise") return t.road ? lerpHex(0x163c2a, 0xc4493a, t.traffic) : t.zone === "i" ? 0xc45a3a : 0x163c2a;
  if (layer === "hill") return lerpHex(0x14532c, 0xe7eef2, Math.min(1, (t.elev || 0) / 4));
  return lerpHex(0x1c4a32, 0xc45a3a, t.pollution);
}

function lerpHex(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

type Add = (list: Part[], x: number, z: number, sx: number, sy: number, sz: number, y: number, c: number, ry?: number) => void;

function along(city: City, x: number, z: number, kind: Track) {
  const has = (nx: number, nz: number) => {
    if (nx < 0 || nz < 0 || nx >= W || nz >= H) return false;
    return city.tile(nx, nz).track === kind;
  };
  const h = has(x - 1, z) || has(x + 1, z);
  const v = has(x, z - 1) || has(x, z + 1);
  return { h, v };
}

function trackBed(add: Add, box: Part[], X: number, Z: number, kind: Track, city: City, x: number, z: number, y: number, col: number) {
  const { h, v } = along(city, x, z, kind);
  const beam = (sx: number, sz: number) => add(box, X, Z, sx, 0.22, sz, y, col);
  if (h || !v) beam(TILE * 0.98, 1.25);
  if (v) beam(1.25, TILE * 0.98);
}

function growBuilding(
  add: Add,
  box: Part[],
  cyl: Part[],
  win: Part[],
  X: number,
  Z: number,
  x: number,
  z: number,
  zone: "r" | "c" | "i" | "o",
  level: number,
  powered: boolean,
) {
  const style = Math.floor(hash(x, z, 11) * 4);
  const baseH = [0, 1.7, 3.1, 5.1, 7.6, 11.2][level] ?? 1.5;
  const mul = zone === "o" ? 1.38 : zone === "i" ? 0.58 : zone === "c" ? 0.92 : 1;
  const h = baseH * mul * (0.84 + hash(x, z, 4) * 0.24);
  const pal = zone === "r" ? HEX.res : zone === "c" ? HEX.com : zone === "i" ? HEX.ind : HEX.off;
  let col: number = pal[Math.floor(hash(x, z, 6) * pal.length) % pal.length];
  if (!powered) col = shade(col, 0.48);
  const foot = TILE * (zone === "i" ? 0.84 : 0.52 + hash(x, z, 7) * 0.2);
  const deep = foot * (zone === "r" ? 0.78 : 0.7 + hash(x, z, 8) * 0.28);
  const pod = Math.min(zone === "c" ? 1.35 : 0.85, h * 0.22);
  add(box, X, Z, foot + 0.18, Math.max(0.35, pod), deep + 0.12, 0.06, shade(col, 0.78));
  const towerW = foot * (style === 2 ? 0.58 : style === 0 ? 0.92 : 0.78);
  const towerD = deep * (style === 2 ? 0.58 : 0.9);
  const shaft = Math.max(0.45, h - pod);
  const ox = style === 0 ? -0.18 : style === 3 ? 0.22 : 0;
  add(box, X + ox, Z, towerW, shaft, towerD, 0.06 + pod, col);
  add(box, X + ox, Z, towerW * 1.04, 0.16, towerD * 1.04, 0.06 + pod + shaft, shade(col, 0.66));
  if ((style === 1 || zone === "o") && level >= 3) {
    add(box, X + ox, Z, towerW * 0.62, shaft * 0.34, towerD * 0.62, 0.06 + pod + shaft, shade(col, 1.12));
  }
  if (zone === "r" && style !== 2) {
    add(box, X + ox + towerW * 0.22, Z, 0.22, 0.55, 0.22, 0.06 + pod + shaft, HEX.trunk);
  }
  if (zone === "i") {
    add(box, X + foot * 0.22, Z + 0.15, foot * 0.7, h * 0.55, deep * 0.72, 0.06, shade(col, 0.9));
    add(cyl, X + foot * 0.28, Z + 0.2, 0.32, h * 0.85, 0.32, 0.06 + h * 0.35, HEX.chimney);
    add(cyl, X - foot * 0.12, Z - 0.15, 0.22, h * 0.45, 0.22, 0.06 + h * 0.4, shade(HEX.chimney, 1.15));
  }
  const glass = 0x1a2430;
  const winY = 0.06 + pod + shaft * 0.18;
  const winH = Math.max(0.4, shaft * 0.62);
  add(box, X + ox, Z + towerD * 0.5 + 0.02, towerW * 0.72, winH, 0.06, winY, glass);
  if (level >= 2) add(box, X + ox + towerW * 0.5 + 0.02, Z, 0.06, winH * 0.8, towerD * 0.62, winY, glass);
  if (powered && level >= 1) {
    add(win, X + ox, Z + towerD * 0.5 + 0.05, towerW * 0.62, winH * 0.86, 0.04, winY + winH * 0.06, HEX.window);
  }
}

function tree(add: Add, cone: Part[], X: number, Z: number, s: number, y = 0) {
  add(cone, X, Z, s, s * 1.7, s, y, hash(X, Z, 2) > 0.5 ? HEX.tree : HEX.treeDark);
}

function plop(
  add: Add,
  box: Part[],
  cyl: Part[],
  cone: Part[],
  X: number,
  Z: number,
  x: number,
  z: number,
  kind: string,
  powered: boolean,
) {
  const dim = powered ? 1 : 0.55;
  if (kind === "park") {
    add(box, X, Z, 3.4, 0.08, 3.4, 0.02, HEX.park);
    tree(add, cone, X - 0.8, Z - 0.4, 0.9, 0.08);
    tree(add, cone, X + 0.9, Z + 0.5, 1.05, 0.08);
    tree(add, cone, X + 0.1, Z - 0.9, 0.7, 0.08);
    return;
  }
  if (kind === "trees") {
    tree(add, cone, X - 0.7, Z, 1.1);
    tree(add, cone, X + 0.8, Z + 0.4, 0.85);
    tree(add, cone, X + 0.1, Z - 0.8, 0.95);
    return;
  }
  if (kind === "power") {
    add(box, X, Z, 3.1, 1.5, 2.2, 0.12, shade(HEX.power, dim));
    add(cyl, X - 0.7, Z + 0.2, 0.45, 3.4, 0.45, 1.5, HEX.chimney);
    add(cyl, X + 0.7, Z + 0.2, 0.38, 2.6, 0.38, 1.5, HEX.chimney);
    return;
  }
  if (kind === "solar") {
    add(box, X, Z, 3.3, 0.08, 3.3, 0.02, HEX.solar);
    for (let i = -1; i <= 1; i++) add(box, X + i * 0.9, Z, 0.7, 0.08, 2.4, 0.2, shade(HEX.solarCell, dim), 0.4);
    return;
  }
  if (kind === "water") {
    add(box, X, Z - 0.4, 2.2, 1.2, 1.6, 0.12, shade(HEX.waterworks, dim));
    add(cyl, X + 0.2, Z + 0.8, 1.1, 1.3, 1.1, 0.12, 0x7eb8d4);
    return;
  }
  if (kind === "hospital") {
    add(box, X, Z, 2.8, 2.4, 2.2, 0.12, HEX.hospital);
    add(box, X, Z, 0.28, 0.9, 0.08, 2.5, HEX.cross);
    add(box, X, Z, 0.9, 0.22, 0.08, 2.85, HEX.cross);
    return;
  }
  if (kind === "school") {
    add(box, X, Z, 3.2, 1.6, 2.2, 0.12, HEX.school);
    add(box, X, Z, 3.4, 0.2, 2.4, 1.72, shade(HEX.school, 0.75));
    return;
  }
  if (kind === "police") {
    add(box, X, Z, 2.4, 2.2, 2.2, 0.12, HEX.police);
    add(box, X, Z, 1.1, 1.4, 1.1, 2.3, shade(HEX.police, 1.2));
    return;
  }
  if (kind === "fire") {
    add(box, X, Z, 2.6, 1.8, 2.2, 0.12, HEX.fire);
    add(box, X + 0.8, Z, 0.7, 2.2, 0.7, 1.8, shade(HEX.fire, 0.75));
    return;
  }
  if (kind === "bus") {
    add(box, X + 1.1, Z, 1.5, 1.05, 0.7, 0.16, HEX.bus);
    add(box, X + 1.1, Z, 1.6, 0.08, 0.85, 1.2, 0x2a3138);
    return;
  }
  if (kind === "station" || kind === "metrostation" || kind === "rrtsstation") {
    const col = kind === "metrostation" ? HEX.metro : kind === "rrtsstation" ? HEX.rrts : 0xd8d2c8;
    add(box, X, Z, 3.2, 0.18, 2.2, 0.2, 0x4a535c);
    add(box, X, Z - 0.9, 2.2, 1.8, 1.1, 0.3, shade(col, dim));
    return;
  }
  if (kind === "factory") {
    add(box, X, Z, 3.3, 1.7, 2.4, 0.12, shade(HEX.factory, dim));
    add(cyl, X + 1, Z + 0.6, 0.4, 2.8, 0.4, 1.7, HEX.chimney);
    return;
  }
  if (kind === "farm") {
    add(box, X, Z, 3.4, 0.08, 3.4, 0.02, HEX.farm);
    add(box, X + 0.7, Z + 0.6, 1.4, 0.9, 1.1, 0.08, HEX.barn);
    return;
  }
  if (kind === "warehouse") {
    add(box, X, Z, 3.3, 1.35, 2.3, 0.12, HEX.warehouse);
    return;
  }
  if (kind === "cargo") {
    add(box, X, Z, 3.2, 0.12, 3.2, 0.04, 0x3a4048);
    add(box, X - 0.6, Z, 1.1, 0.7, 2.2, 0.16, HEX.cargo);
    add(box, X + 0.8, Z + 0.2, 1.1, 0.55, 1.6, 0.16, 0x2f4f86);
    return;
  }
  if (kind === "airport") {
    add(box, X, Z, 3.4, 1.1, 2.2, 0.12, HEX.airport);
    add(box, X + 1.2, Z - 0.4, 0.45, 2.6, 0.45, 1.2, 0x9aa8b4);
    return;
  }
  if (kind === "stadium") {
    add(cyl, X, Z, 3.1, 0.7, 3.1, 0.12, HEX.stadium);
    add(cyl, X, Z, 1.6, 0.25, 1.6, 0.7, 0x1d4a38);
    return;
  }
  if (kind === "landmark") {
    add(box, X, Z, 1.6, 0.4, 1.6, 0.12, HEX.landmark);
    add(cone, X, Z, 1.15, 7.5, 1.15, 0.5, HEX.landmark);
    return;
  }
  if (kind === "port" || kind === "marina" || kind === "ferry") {
    const col = kind === "port" ? HEX.port : HEX.marina;
    add(box, X, Z, 3.2, 0.28, 1.3, 0.05, col);
    add(box, X, Z + 0.9, 1.4, 0.9, 1.1, 0.2, shade(col, 1.15));
    if (kind === "port") add(box, X - 1.2, Z - 0.2, 0.12, 2.4, 0.12, 0.3, 0xd8d2c8);
  }
}

function train(len: number, h: number, w: number, mat: THREE.Material) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), mat);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.45, 0.5), mat);
  cab.position.set(0, h * 0.55, len * 0.35);
  g.add(body, cab);
  g.visible = false;
  return g;
}

function ping(u: number) {
  const w = ((u % 2) + 2) % 2;
  return w > 1 ? 2 - w : w;
}

function placeOn(obj: THREE.Object3D, path: { x: number; z: number }[], u: number, y: number) {
  const n = path.length - 1;
  const d = u * n;
  const i = Math.min(n - 1, Math.floor(d));
  const f = d - i;
  const a = path[i];
  const b = path[i + 1];
  const x = wx(a.x) + (wx(b.x) - wx(a.x)) * f;
  const z = wz(a.z) + (wz(b.z) - wz(a.z)) * f;
  obj.position.set(x, y, z);
  const nx = wx(b.x);
  const nz = wz(b.z);
  if (Math.abs(nx - x) + Math.abs(nz - z) > 0.05) obj.lookAt(nx, y, nz);
}

function ride(group: THREE.Group, path: { x: number; z: number }[], speed: number, y: number) {
  if (path.length < 2) {
    group.visible = false;
    return;
  }
  group.visible = true;
  placeOn(group, path, ping(speed), y);
}

function grassTex() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#1c4a32";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = i % 2 ? "#245c3c" : "#163c2a";
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  g.strokeStyle = "rgba(255,255,255,0.045)";
  for (let i = 0; i <= 256; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 256);
    g.stroke();
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(256, i);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(WATER_X / 2, H / 2);
  tex.anisotropy = 4;
  return tex;
}

function cloudTex() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d");
  if (!g) return null;
  g.clearRect(0, 0, 128, 64);
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath();
  g.ellipse(40, 36, 28, 14, 0, 0, Math.PI * 2);
  g.ellipse(68, 32, 34, 16, 0, 0, Math.PI * 2);
  g.ellipse(96, 38, 22, 12, 0, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
