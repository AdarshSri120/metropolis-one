import { shade } from "./colors";

export type BCat = "r" | "c" | "i" | "o" | "civic";
export type Roof = "hip" | "gable" | "flat" | "setback" | "saw" | "dome" | "shed" | "tank" | "canopy";
export type Arch = "house" | "sandstone" | "deco" | "highrise" | "shop" | "shed" | "civic" | "yard";

export interface BDef {
  id: string;
  name: string;
  cat: BCat;
  w: number;
  d: number;
  floors: number;
  roof: Roof;
  arch: Arch;
  wall: number;
  accent: number;
  roofCol: number;
  cost: number;
  upkeep: number;
  pop: number;
  jobs: number;
  useP: number;
  useW: number;
  upgrade: string;
}

export const STAGES = ["Excavation", "Foundations", "Scaffolding", "Structure", "Occupied", "Renovation", "Abandoned"] as const;

export const FACING = ["south", "east", "north", "west"] as const;

export const BUILDINGS: BDef[] = [
  { id: "bungalow", name: "Independent house", cat: "r", w: 1, d: 1, floors: 2, roof: "gable", arch: "house", wall: 0xc4a882, accent: 0xefe2cf, roofCol: 0x8d4d32, cost: 2400, upkeep: 18, pop: 6, jobs: 0, useP: 2, useW: 2, upgrade: "" },
  { id: "villa", name: "Garden villa", cat: "r", w: 1, d: 2, floors: 2, roof: "hip", arch: "house", wall: 0xe7d7c1, accent: 0xc6b48a, roofCol: 0x6b4a32, cost: 6400, upkeep: 36, pop: 12, jobs: 1, useP: 4, useW: 3, upgrade: "" },
  { id: "rowhouse", name: "Row house", cat: "r", w: 1, d: 2, floors: 3, roof: "flat", arch: "house", wall: 0xb08968, accent: 0x8d4d32, roofCol: 0x6b4a32, cost: 4800, upkeep: 28, pop: 16, jobs: 0, useP: 4, useW: 3, upgrade: "" },
  { id: "haveli", name: "Sandstone haveli", cat: "r", w: 2, d: 2, floors: 3, roof: "dome", arch: "sandstone", wall: 0xc45c26, accent: 0xe7c9a0, roofCol: 0x8d4d32, cost: 14000, upkeep: 70, pop: 36, jobs: 2, useP: 8, useW: 6, upgrade: "" },
  { id: "deco", name: "Art Deco walk-up", cat: "r", w: 1, d: 1, floors: 6, roof: "flat", arch: "deco", wall: 0xf2d3c4, accent: 0x49c4ae, roofCol: 0xd8c4a4, cost: 7200, upkeep: 42, pop: 42, jobs: 2, useP: 7, useW: 5, upgrade: "" },
  { id: "society", name: "Housing society", cat: "r", w: 2, d: 2, floors: 11, roof: "setback", arch: "highrise", wall: 0xd9d3c7, accent: 0xc46b4a, roofCol: 0xb7b1a6, cost: 28000, upkeep: 160, pop: 220, jobs: 8, useP: 22, useW: 16, upgrade: "" },
  { id: "affordable", name: "Affordable block", cat: "r", w: 2, d: 2, floors: 6, roof: "flat", arch: "highrise", wall: 0xc8b89a, accent: 0x8d6a3a, roofCol: 0xa89880, cost: 16000, upkeep: 90, pop: 160, jobs: 4, useP: 14, useW: 12, upgrade: "society" },
  { id: "premium", name: "Premium tower", cat: "r", w: 2, d: 3, floors: 16, roof: "setback", arch: "highrise", wall: 0x9fb4c4, accent: 0xe8fcff, roofCol: 0x74b4be, cost: 52000, upkeep: 280, pop: 380, jobs: 14, useP: 36, useW: 24, upgrade: "" },
  { id: "shop", name: "Corner shop", cat: "c", w: 1, d: 1, floors: 2, roof: "canopy", arch: "shop", wall: 0xf4e1c1, accent: 0xc4493a, roofCol: 0xc6b48a, cost: 3200, upkeep: 24, pop: 0, jobs: 8, useP: 3, useW: 2, upgrade: "" },
  { id: "market", name: "Neighbourhood market", cat: "c", w: 1, d: 2, floors: 2, roof: "flat", arch: "shop", wall: 0xe7b87a, accent: 0xc4493a, roofCol: 0x8d4d32, cost: 5400, upkeep: 34, pop: 0, jobs: 22, useP: 5, useW: 3, upgrade: "" },
  { id: "showroom", name: "Showroom", cat: "c", w: 2, d: 2, floors: 2, roof: "canopy", arch: "shop", wall: 0xd7e6f4, accent: 0x4e86c6, roofCol: 0x9aa8b4, cost: 9800, upkeep: 55, pop: 0, jobs: 30, useP: 8, useW: 4, upgrade: "" },
  { id: "mall", name: "City mall", cat: "c", w: 2, d: 3, floors: 4, roof: "flat", arch: "shop", wall: 0xe8e0d4, accent: 0xd24b4b, roofCol: 0xb7b1a6, cost: 36000, upkeep: 180, pop: 0, jobs: 90, useP: 20, useW: 10, upgrade: "" },
  { id: "hotel", name: "Hotel", cat: "c", w: 2, d: 2, floors: 12, roof: "setback", arch: "deco", wall: 0xf0d5c4, accent: 0xc6b48a, roofCol: 0xd8c4a4, cost: 32000, upkeep: 170, pop: 0, jobs: 70, useP: 18, useW: 14, upgrade: "" },
  { id: "slab", name: "Office slab", cat: "o", w: 1, d: 1, floors: 8, roof: "flat", arch: "highrise", wall: 0xc5d0d8, accent: 0x74b4be, roofCol: 0x9aa8b4, cost: 11000, upkeep: 80, pop: 0, jobs: 70, useP: 10, useW: 5, upgrade: "" },
  { id: "glass", name: "Glass tower", cat: "o", w: 2, d: 2, floors: 18, roof: "setback", arch: "highrise", wall: 0x8ec6d8, accent: 0xe8fcff, roofCol: 0x5a8e98, cost: 48000, upkeep: 260, pop: 0, jobs: 260, useP: 28, useW: 12, upgrade: "" },
  { id: "itpark", name: "IT park", cat: "o", w: 2, d: 3, floors: 6, roof: "flat", arch: "highrise", wall: 0xd5ddd4, accent: 0x49c4ae, roofCol: 0x9aa8b4, cost: 40000, upkeep: 210, pop: 0, jobs: 200, useP: 24, useW: 10, upgrade: "" },
  { id: "campus", name: "Business campus", cat: "o", w: 3, d: 3, floors: 4, roof: "flat", arch: "civic", wall: 0xe4efe6, accent: 0x6dcea0, roofCol: 0xb7c4b0, cost: 44000, upkeep: 200, pop: 0, jobs: 160, useP: 22, useW: 12, upgrade: "" },
  { id: "factory", name: "Factory shed", cat: "i", w: 2, d: 2, floors: 2, roof: "saw", arch: "shed", wall: 0xb7c0a8, accent: 0x6e675e, roofCol: 0x5c5852, cost: 12000, upkeep: 70, pop: 0, jobs: 48, useP: 16, useW: 8, upgrade: "" },
  { id: "plant", name: "Processing plant", cat: "i", w: 2, d: 3, floors: 3, roof: "tank", arch: "shed", wall: 0x8aa0a8, accent: 0x3d7ea8, roofCol: 0x5c5852, cost: 22000, upkeep: 120, pop: 0, jobs: 64, useP: 26, useW: 18, upgrade: "" },
  { id: "warehouse", name: "Warehouse", cat: "i", w: 1, d: 2, floors: 2, roof: "shed", arch: "shed", wall: 0xc4b49a, accent: 0x8a8174, roofCol: 0x6e675e, cost: 4600, upkeep: 26, pop: 0, jobs: 16, useP: 4, useW: 2, upgrade: "" },
  { id: "yard", name: "Container yard", cat: "i", w: 2, d: 2, floors: 1, roof: "flat", arch: "yard", wall: 0x6d7370, accent: 0xc4493a, roofCol: 0x3a4048, cost: 8000, upkeep: 40, pop: 0, jobs: 14, useP: 3, useW: 1, upgrade: "" },
  { id: "concourse", name: "Station concourse", cat: "civic", w: 2, d: 2, floors: 3, roof: "canopy", arch: "civic", wall: 0xe8e2d4, accent: 0x49c4ae, roofCol: 0x9aa8b4, cost: 18000, upkeep: 110, pop: 0, jobs: 28, useP: 10, useW: 6, upgrade: "" },
  { id: "depot", name: "Bus depot", cat: "civic", w: 2, d: 3, floors: 2, roof: "shed", arch: "civic", wall: 0xd08a3a, accent: 0xf0c14a, roofCol: 0x8d4d32, cost: 15000, upkeep: 90, pop: 0, jobs: 22, useP: 8, useW: 4, upgrade: "" },
  { id: "terminal", name: "Civic terminal", cat: "civic", w: 3, d: 3, floors: 4, roof: "dome", arch: "civic", wall: 0xf7f1e6, accent: 0xc6b48a, roofCol: 0xd8d2c8, cost: 42000, upkeep: 190, pop: 0, jobs: 48, useP: 16, useW: 8, upgrade: "" },
];

const BY_ID = new Map(BUILDINGS.map((b, i) => [b.id, i]));

export function buildingById(id: string) {
  const i = BY_ID.get(id);
  return i === undefined ? null : BUILDINGS[i];
}

export function buildingIndex(id: string) {
  const i = BY_ID.get(id);
  return i === undefined ? 0 : i + 1;
}

export function buildingAt(index: number) {
  if (index <= 0 || index > BUILDINGS.length) return null;
  return BUILDINGS[index - 1];
}

export function occupantFactor(stage: number) {
  if (stage === 4 || stage === 5) return 1;
  if (stage === 3) return 0.45;
  return 0;
}

export function buildingUpkeep(def: BDef, stage: number) {
  if (stage === 6) return Math.round(def.upkeep * 0.5);
  if (stage >= 3) return def.upkeep;
  return 0;
}

export function footprint(def: BDef, x: number, z: number, rot: number) {
  const turn = ((rot % 4) + 4) % 4;
  const w = turn % 2 === 0 ? def.w : def.d;
  const d = turn % 2 === 0 ? def.d : def.w;
  const cells: { x: number; z: number }[] = [];
  for (let lz = 0; lz < d; lz++) {
    for (let lx = 0; lx < w; lx++) cells.push({ x: x + lx, z: z + lz });
  }
  const door: { x: number; z: number }[] = [];
  if (turn === 0) for (let lx = 0; lx < w; lx++) door.push({ x: x + lx, z: z + d });
  else if (turn === 1) for (let lz = 0; lz < d; lz++) door.push({ x: x + w, z: z + lz });
  else if (turn === 2) for (let lx = 0; lx < w; lx++) door.push({ x: x + lx, z: z - 1 });
  else for (let lz = 0; lz < d; lz++) door.push({ x: x - 1, z: z + lz });
  return { w, d, turn, cells, door };
}

export interface BPart {
  k: "box" | "cyl" | "cone" | "win";
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry: number;
  c: number;
}

export function structureParts(def: BDef, seed: number, stage: number, powered: boolean): BPart[] {
  const out: BPart[] = [];
  const add = (k: BPart["k"], x: number, y: number, z: number, sx: number, sy: number, sz: number, c: number, ry = 0) => {
    if (sx <= 0.01 || sy <= 0.01 || sz <= 0.01) return;
    out.push({ k, x, y, z, sx, sy, sz, ry, c: !powered && k !== "win" ? shade(c, 0.5) : c });
  };
  const spanX = def.w * 3.6;
  const spanZ = def.d * 3.6;
  const pit = shade(0x6b5344, 0.9 + (seed % 5) * 0.02);
  if (stage <= 0) {
    add("box", 0, 0, 0, spanX * 0.78, 0.16, spanZ * 0.78, pit);
    add("box", 0, 0.02, 0, spanX * 0.46, 0.08, spanZ * 0.22, 0x3a2e26);
    return out;
  }
  if (stage === 1) {
    add("box", 0, 0, 0, spanX * 0.88, 0.38, spanZ * 0.88, 0x9a9186);
    add("box", 0, 0.38, spanZ * 0.2, spanX * 0.4, 0.12, 0.35, 0xc6b48a);
    return out;
  }
  const floors = stage === 2 ? Math.max(1, Math.round(def.floors * 0.34)) : def.floors;
  const shellH = Math.max(0.8, floors * 0.7);
  const h = stage === 2 ? Math.min(shellH, 2.4) : shellH;
  const wallTint = shade(def.wall, 0.94 + (seed % 9) * 0.012);
  add("box", 0, 0, 0, spanX * 0.9, h, spanZ * 0.9, wallTint);
  if (stage === 2) {
    const poles: [number, number][] = [
      [-0.42, -0.42],
      [0.42, -0.42],
      [-0.42, 0.42],
      [0.42, 0.42],
    ];
    for (const [px, pz] of poles) add("box", px * spanX, 0, pz * spanZ, 0.12, h + 1.4, 0.12, 0xc6b48a);
    add("box", 0, h * 0.55, 0, spanX * 0.92, 0.08, 0.1, 0xc6b48a);
    return out;
  }
  if (def.roof === "gable" || def.roof === "hip") add("box", 0, h, 0, spanX * (def.roof === "hip" ? 0.62 : 0.74), 0.55, spanZ * 0.62, def.roofCol);
  else if (def.roof === "dome") add("cone", 0, h, 0, Math.min(spanX, spanZ) * 0.32, 1.6, Math.min(spanX, spanZ) * 0.32, def.roofCol);
  else if (def.roof === "saw") {
    add("box", -spanX * 0.18, h, 0, spanX * 0.34, 0.7, spanZ * 0.82, def.roofCol);
    add("box", spanX * 0.18, h, 0, spanX * 0.34, 1.15, spanZ * 0.82, shade(def.roofCol, 0.82));
  } else if (def.roof === "setback") add("box", 0, h, 0, spanX * 0.52, Math.max(1.2, h * 0.22), spanZ * 0.52, shade(def.wall, 1.08));
  else if (def.roof === "shed") add("box", 0, h, 0, spanX * 0.98, 0.28, spanZ * 0.98, def.roofCol);
  else if (def.roof === "tank") {
    add("cyl", spanX * 0.22, h, 0.1, 0.8, 1.3, 0.8, def.accent);
    add("cyl", -spanX * 0.18, h, -0.15, 0.55, 1.8, 0.55, shade(def.accent, 0.85));
  } else if (def.roof === "canopy") add("box", 0, Math.min(1.3, h), spanZ * 0.42, spanX * 0.86, 0.12, 0.7, def.accent);
  else add("box", 0, h, 0, spanX * 0.94, 0.2, spanZ * 0.94, def.roofCol);

  add("box", 0, 0, spanZ * 0.46, Math.min(1.1, spanX * 0.28), 1.35, 0.08, 0x2a241c);
  if (stage !== 6 && powered) {
    const rows = Math.min(7, Math.max(1, floors - 1));
    for (let i = 0; i < rows; i++) add("win", 0, 0.85 + i * 0.68, spanZ * 0.47, spanX * 0.62, 0.26, 0.05, 0xffe1a8);
  }
  if (def.arch === "sandstone") add("box", 0, h * 0.62, spanZ * 0.48, spanX * 0.84, 0.14, 0.22, def.accent);
  if (def.arch === "deco") {
    add("box", 0, h * 0.48, 0, spanX * 0.98, 0.18, spanZ * 0.98, def.accent);
    add("cyl", 0, h, 0, 0.9, 0.7, 0.9, def.accent);
  }
  if (def.arch === "house") add("cyl", spanX * 0.24, h + 0.15, -spanZ * 0.12, 0.42, 0.5, 0.42, 0x9aa3ad);
  if (def.arch === "highrise") add("box", spanX * 0.32, h * 0.35, spanZ * 0.22, 0.42, h * 0.45, 0.55, shade(def.wall, 0.88));
  if (def.arch === "shed") add("cyl", spanX * 0.32, h, spanZ * 0.1, 0.38, Math.max(1.6, h * 0.8), 0.38, 0x2e333a);
  if (def.arch === "yard") {
    add("box", -0.7, 0.15, 0.25, 1.3, 0.7, 0.55, 0xc4493a);
    add("box", 0.75, 0.1, -0.35, 1.35, 0.55, 0.5, 0x2f4f86);
    add("box", 0.1, 0.2, 0.7, 1.1, 0.5, 0.45, 0xe7b87a);
  }
  if (def.arch === "shop") add("box", 0, 0.85, spanZ * 0.48, spanX * 0.72, 0.85, 0.06, powered ? 0xd7e8f4 : 0x1a2430);
  if (def.arch === "civic") add("box", 0, 0.55, spanZ * 0.36, spanX * 0.55, 0.16, 1.3, def.accent);
  if (stage === 5) {
    add("box", spanX * 0.48, 0, 0, 0.12, h + 1, 0.12, 0xc6b48a);
    add("box", -spanX * 0.48, 0, 0, 0.12, h + 1, 0.12, 0xc6b48a);
  }
  if (stage === 6) add("box", 0.15, 0.55, spanZ * 0.47, 0.7, 0.22, 0.08, 0x6b5344);
  return out;
}

export const CHUNK_SPLIT_X = 22;
export const CHUNK_SPLIT_Z = 17;
export const CHUNK_COUNT = 4;

export function chunkIndex(x: number, z: number) {
  const cx = x >= CHUNK_SPLIT_X ? 1 : 0;
  const cz = z >= CHUNK_SPLIT_Z ? 1 : 0;
  return cz * 2 + cx;
}
