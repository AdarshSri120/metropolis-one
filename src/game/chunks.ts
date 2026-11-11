import * as THREE from "three";
import { H, TILE, W } from "./city";
import { CHUNK_COUNT, CHUNK_SPLIT_X, CHUNK_SPLIT_Z } from "./buildings";

export const CHUNK_CAP = 9000;

export interface ChunkPart {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  c: number;
}

export interface ChunkBucket {
  box: ChunkPart[];
  cyl: ChunkPart[];
  cone: ChunkPart[];
  win: ChunkPart[];
  lamp: ChunkPart[];
}

function wx(x: number) {
  return (x - W / 2 + 0.5) * TILE;
}
function wz(z: number) {
  return (z - H / 2 + 0.5) * TILE;
}

function chunkSphere(i: number) {
  const cx = i % 2;
  const cz = (i / 2) | 0;
  const x0 = cx === 0 ? 0 : CHUNK_SPLIT_X;
  const x1 = cx === 0 ? CHUNK_SPLIT_X - 1 : W - 1;
  const z0 = cz === 0 ? 0 : CHUNK_SPLIT_Z;
  const z1 = cz === 0 ? CHUNK_SPLIT_Z - 1 : H - 1;
  const center = new THREE.Vector3((wx(x0) + wx(x1)) / 2, 10, (wz(z0) + wz(z1)) / 2);
  const radius = Math.hypot(wx(x1) - wx(x0), wz(z1) - wz(z0)) * 0.5 + 22;
  return new THREE.Sphere(center, radius);
}

function makeMesh(geo: THREE.BufferGeometry, mat: THREE.Material, sphere: THREE.Sphere, shadow: boolean) {
  const mesh = new THREE.InstancedMesh(geo, mat, CHUNK_CAP);
  mesh.count = 0;
  mesh.frustumCulled = true;
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CHUNK_CAP * 3), 3);
  geo.boundingSphere = sphere;
  return mesh;
}

export class ChunkField {
  readonly groups: { box: THREE.InstancedMesh; cyl: THREE.InstancedMesh; cone: THREE.InstancedMesh; win: THREE.InstancedMesh; lamp: THREE.InstancedMesh }[] = [];

  constructor(scene: THREE.Scene, solid: THREE.Material, winMat: THREE.Material, lampMat: THREE.Material, shadow: boolean) {
    for (let i = 0; i < CHUNK_COUNT; i++) {
      const sphere = chunkSphere(i);
      const box = makeMesh(new THREE.BoxGeometry(1, 1, 1), solid, sphere, shadow);
      const cyl = makeMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 8), solid, sphere.clone(), shadow);
      const cone = makeMesh(new THREE.ConeGeometry(0.5, 1, 6), solid, sphere.clone(), false);
      const win = makeMesh(new THREE.BoxGeometry(1, 1, 1), winMat, sphere.clone(), false);
      const lamp = makeMesh(new THREE.SphereGeometry(0.5, 8, 6), lampMat, sphere.clone(), false);
      this.groups.push({ box, cyl, cone, win, lamp });
      scene.add(box, cyl, cone, win, lamp);
    }
  }

  write(i: number, bucket: ChunkBucket, dummy: THREE.Object3D, color: THREE.Color) {
    const g = this.groups[i];
    if (!g) return;
    stamp(g.box, bucket.box, dummy, color);
    stamp(g.cyl, bucket.cyl, dummy, color);
    stamp(g.cone, bucket.cone, dummy, color);
    stamp(g.win, bucket.win, dummy, color);
    stamp(g.lamp, bucket.lamp, dummy, color);
  }
}

function stamp(mesh: THREE.InstancedMesh, parts: ChunkPart[], dummy: THREE.Object3D, color: THREE.Color) {
  const n = Math.min(parts.length, CHUNK_CAP);
  mesh.count = n;
  for (let i = 0; i < n; i++) {
    const p = parts[i];
    dummy.position.set(p.x, p.y + p.sy * 0.5, p.z);
    dummy.scale.set(p.sx, p.sy, p.sz);
    dummy.rotation.set(0, p.ry, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(p.c);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

export function emptyBucket(): ChunkBucket {
  return { box: [], cyl: [], cone: [], win: [], lamp: [] };
}
