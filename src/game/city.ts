import { emptyCensus, engineMods, takeCensus, type Census } from "./census";
import {
  BUILDINGS,
  FACING,
  STAGES,
  buildingAt,
  buildingById,
  buildingIndex,
  buildingUpkeep,
  chunkIndex,
  footprint,
  occupantFactor,
} from "./buildings";
export const W = 44;
export const H = 34;
export const TILE = 4;
export const WATER_X = 37;
export type RoadKind = 0 | 1 | 2;
export type OneWay = 0 | 1 | 2 | 3 | 4;
export type Brush =
  | "street"
  | "avenue"
  | "express"
  | "oneway"
  | "district"
  | "signal"
  | "roundabout"
  | "stop"
  | "yield"
  | "ramp"
  | "raise"
  | "lower"
  | "flat"
  | "canal"
  | "broad"
  | "double"
  | "electric";
export type MapLayer = "city" | "zone" | "traffic" | "power" | "water" | "smog" | "density" | "value" | "flood" | "noise" | "hill";
export type Season = "clear" | "heat" | "monsoon" | "cool";

export const DISTRICTS = ["", "Old City", "Civil Lines", "Works", "Riverfront"] as const;

export function seasonOf(month: number): Season {
  const m = ((month % 12) + 12) % 12;
  if (m >= 2 && m <= 4) return "heat";
  if (m >= 5 && m <= 8) return "monsoon";
  if (m === 10 || m === 11 || m === 0) return "cool";
  return "clear";
}

export function solarMul(month: number) {
  const s = seasonOf(month);
  if (s === "monsoon") return 0.45;
  if (s === "heat") return 1.12;
  return 1;
}

export function roadLabel(kind: RoadKind) {
  return kind === 2 ? "Expressway" : kind === 1 ? "Avenue" : "Street";
}

export const CITY_NAMES = [
  "Yamunapur",
  "Rajnagar",
  "Indiranagar",
  "Nehrupur",
  "Civil Lines",
  "Model Town",
  "Ashok Vihar",
  "Sector 62",
  "Ghatiabad",
  "Laxminagar",
  "Rohini West",
  "Mayur Vihar",
  "Kalkaji",
  "Saket Hills",
  "Karol Bagh",
  "Vasant Kunj",
  "Dwarka Sector",
  "Chandni Gate",
];

export function indianCityName(avoid = "") {
  const pool = CITY_NAMES.filter((n) => n !== avoid);
  return pool[Math.floor(Math.random() * pool.length)] ?? "Yamunapur";
}

export type Track = "none" | "rail" | "metro" | "rrts" | "runway";
export type Zone = "none" | "r" | "c" | "i" | "o";
export type Plop =
  | "none"
  | "power"
  | "solar"
  | "water"
  | "hospital"
  | "school"
  | "police"
  | "fire"
  | "park"
  | "trees"
  | "bus"
  | "station"
  | "metrostation"
  | "rrtsstation"
  | "port"
  | "marina"
  | "ferry"
  | "factory"
  | "cargo"
  | "warehouse"
  | "airport"
  | "farm"
  | "stadium"
  | "landmark";

export type ToolId =
  | "inspect"
  | "bulldoze"
  | "road"
  | "land"
  | "rail"
  | "metro"
  | "rrts"
  | "runway"
  | "r"
  | "c"
  | "i"
  | "o"
  | Plop;

export type CatId = "plan" | "zone" | "transit" | "civic" | "special";

export interface ToolDef {
  id: ToolId;
  cat: CatId;
  name: string;
  hint: string;
  cost: number;
  water?: boolean;
}

export const CATS: { id: CatId; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "zone", label: "Zones" },
  { id: "transit", label: "Transit" },
  { id: "civic", label: "Civic" },
  { id: "special", label: "Special" },
];

export const TOOL_LIST: ToolDef[] = [
  { id: "inspect", cat: "plan", name: "Inspect", hint: "Read a tile, then upgrade or focus it", cost: 0 },
  { id: "road", cat: "plan", name: "Road", hint: "Paint land for avenues. Paint the river and it becomes a bridge", cost: 80 },
  { id: "land", cat: "plan", name: "Land", hint: "Raise, lower, flatten, or cut a canal", cost: 40 },
  { id: "bulldoze", cat: "plan", name: "Bulldoze", hint: "Peel one layer: building, zone, track, then road", cost: 0 },
  { id: "runway", cat: "plan", name: "Runway", hint: "Straight strip for the city airport", cost: 700 },
  { id: "r", cat: "zone", name: "Residential", hint: "Homes grow when demand, power and water exist", cost: 40 },
  { id: "c", cat: "zone", name: "Commercial", hint: "Shops and offices of the high street", cost: 50 },
  { id: "i", cat: "zone", name: "Industrial", hint: "Factories. Keep them off the nicest streets", cost: 55 },
  { id: "o", cat: "zone", name: "Office", hint: "Towers. They want schools and a big workforce", cost: 70 },
  { id: "rail", cat: "transit", name: "Rail", hint: "Regional tracks. Crosses roads at grade", cost: 320 },
  { id: "station", cat: "transit", name: "Rail station", hint: "Drop it on a rail tile", cost: 2200 },
  { id: "metro", cat: "transit", name: "Metro", hint: "Elevated city metro. Best traffic relief", cost: 520 },
  { id: "metrostation", cat: "transit", name: "Metro station", hint: "Drop it on a metro tile", cost: 3000 },
  { id: "rrts", cat: "transit", name: "RRTS", hint: "Fast regional line for long commutes", cost: 780 },
  { id: "rrtsstation", cat: "transit", name: "RRTS station", hint: "Drop it on an RRTS tile", cost: 4200 },
  { id: "bus", cat: "transit", name: "Bus stop", hint: "Place on a road. Pairs of stops make a route", cost: 450 },
  { id: "power", cat: "civic", name: "Power plant", hint: "Must touch a road. Feeds that whole network", cost: 6400 },
  { id: "solar", cat: "civic", name: "Solar farm", hint: "Clean power, smaller output", cost: 1800 },
  { id: "water", cat: "civic", name: "Waterworks", hint: "Must touch a road to pressurise the grid", cost: 4600 },
  { id: "hospital", cat: "civic", name: "Hospital", hint: "Health coverage for nearby homes", cost: 3400 },
  { id: "school", cat: "civic", name: "School", hint: "Education. Offices like a schooled city", cost: 2400 },
  { id: "police", cat: "civic", name: "Police", hint: "Safety coverage", cost: 2100 },
  { id: "fire", cat: "civic", name: "Fire station", hint: "Safety coverage", cost: 2300 },
  { id: "park", cat: "civic", name: "Park", hint: "Happiness. Put them inside neighbourhoods", cost: 280 },
  { id: "trees", cat: "civic", name: "Grove", hint: "Trees cut pollution", cost: 90 },
  { id: "factory", cat: "special", name: "Factory", hint: "Heavy plant. Jobs, goods, and smoke", cost: 3800 },
  { id: "farm", cat: "special", name: "Farm", hint: "Food and a little freight", cost: 320 },
  { id: "warehouse", cat: "special", name: "Warehouse", hint: "Logistics jobs", cost: 1600 },
  { id: "cargo", cat: "special", name: "Cargo yard", hint: "Helps freight leave the district", cost: 4000 },
  { id: "port", cat: "special", name: "Seaport", hint: "Water only. Exports surplus goods", cost: 5400, water: true },
  { id: "marina", cat: "special", name: "Marina", hint: "Water only. Ferries and city pride", cost: 2600, water: true },
  { id: "ferry", cat: "special", name: "Ferry dock", hint: "Water only", cost: 2200, water: true },
  { id: "airport", cat: "special", name: "Airport", hint: "Place beside a runway", cost: 12000 },
  { id: "stadium", cat: "special", name: "Stadium", hint: "Events, visitors, upkeep", cost: 7000 },
  { id: "landmark", cat: "special", name: "Civic spire", hint: "A signature tower. Pure civic pride", cost: 4800 },
];

export const TOOLS: Record<string, ToolDef> = Object.fromEntries(TOOL_LIST.map((t) => [t.id, t]));

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const POP = [0, 22, 48, 96, 170, 280];
const JOBS: Record<"r" | "c" | "i" | "o", number[]> = {
  r: [0, 1, 2, 4, 6, 10],
  c: [0, 12, 28, 58, 110, 180],
  i: [0, 16, 36, 64, 100, 150],
  o: [0, 24, 60, 130, 240, 400],
};
const POWER_USE: Record<"r" | "c" | "i" | "o", number[]> = {
  r: [0, 1, 2, 3, 5, 7],
  c: [0, 2, 3, 5, 8, 11],
  i: [0, 3, 6, 9, 13, 18],
  o: [0, 2, 5, 8, 12, 18],
};
const WATER_USE: Record<"r" | "c" | "i" | "o", number[]> = {
  r: [0, 1, 2, 3, 5, 7],
  c: [0, 1, 2, 4, 6, 8],
  i: [0, 3, 5, 8, 12, 16],
  o: [0, 2, 3, 5, 8, 12],
};
const GOODS_OUT = [0, 16, 36, 64, 100, 150];
const GOODS_IN: Record<"c" | "o", number[]> = {
  c: [0, 14, 30, 52, 90, 140],
  o: [0, 4, 8, 12, 18, 24],
};

const PLOP: Record<
  Exclude<Plop, "none">,
  {
    jobs: number;
    upkeep: number;
    power: number;
    water: number;
    useP: number;
    useW: number;
    goods: number;
    need: number;
    pollute: number;
    park?: boolean;
    school?: boolean;
    health?: boolean;
    safety?: boolean;
    port?: boolean;
    marina?: boolean;
    farm?: boolean;
  }
> = {
  power: { jobs: 18, upkeep: 460, power: 3400, water: 0, useP: 0, useW: 4, goods: 0, need: 0, pollute: 0.62 },
  solar: { jobs: 3, upkeep: 50, power: 700, water: 0, useP: 0, useW: 0, goods: 0, need: 0, pollute: 0 },
  water: { jobs: 12, upkeep: 280, power: 0, water: 3800, useP: 6, useW: 0, goods: 0, need: 0, pollute: 0.08 },
  hospital: { jobs: 46, upkeep: 210, power: 0, water: 0, useP: 8, useW: 6, goods: 0, need: 0, pollute: 0, health: true },
  school: { jobs: 22, upkeep: 130, power: 0, water: 0, useP: 4, useW: 3, goods: 0, need: 0, pollute: 0, school: true },
  police: { jobs: 16, upkeep: 120, power: 0, water: 0, useP: 3, useW: 2, goods: 0, need: 0, pollute: 0, safety: true },
  fire: { jobs: 14, upkeep: 125, power: 0, water: 0, useP: 3, useW: 3, goods: 0, need: 0, pollute: 0, safety: true },
  park: { jobs: 2, upkeep: 18, power: 0, water: 0, useP: 0, useW: 1, goods: 0, need: 0, pollute: -0.35, park: true },
  trees: { jobs: 0, upkeep: 4, power: 0, water: 0, useP: 0, useW: 0, goods: 0, need: 0, pollute: -0.28, park: true },
  bus: { jobs: 4, upkeep: 36, power: 0, water: 0, useP: 0, useW: 0, goods: 0, need: 0, pollute: 0.02 },
  station: { jobs: 20, upkeep: 110, power: 0, water: 0, useP: 3, useW: 2, goods: 0, need: 0, pollute: 0.04 },
  metrostation: { jobs: 26, upkeep: 140, power: 0, water: 0, useP: 6, useW: 2, goods: 0, need: 0, pollute: 0.03 },
  rrtsstation: { jobs: 24, upkeep: 160, power: 0, water: 0, useP: 6, useW: 2, goods: 0, need: 0, pollute: 0.03 },
  port: { jobs: 40, upkeep: 90, power: 0, water: 0, useP: 8, useW: 4, goods: 0, need: 0, pollute: 0.22, port: true },
  marina: { jobs: 12, upkeep: 40, power: 0, water: 0, useP: 2, useW: 1, goods: 0, need: 0, pollute: 0.04, marina: true },
  ferry: { jobs: 10, upkeep: 36, power: 0, water: 0, useP: 2, useW: 1, goods: 0, need: 0, pollute: 0.03, marina: true },
  factory: { jobs: 110, upkeep: 70, power: 0, water: 0, useP: 22, useW: 16, goods: 160, need: 0, pollute: 0.75 },
  cargo: { jobs: 36, upkeep: 55, power: 0, water: 0, useP: 6, useW: 3, goods: 20, need: 10, pollute: 0.28 },
  warehouse: { jobs: 22, upkeep: 30, power: 0, water: 0, useP: 3, useW: 2, goods: 0, need: 8, pollute: 0.08 },
  airport: { jobs: 160, upkeep: 260, power: 0, water: 0, useP: 16, useW: 8, goods: 0, need: 12, pollute: 0.45 },
  farm: { jobs: 16, upkeep: 12, power: 0, water: 0, useP: 1, useW: 4, goods: 48, need: 0, pollute: 0.05, farm: true },
  stadium: { jobs: 40, upkeep: 150, power: 0, water: 0, useP: 8, useW: 5, goods: 0, need: 6, pollute: 0.06 },
  landmark: { jobs: 8, upkeep: 40, power: 0, water: 0, useP: 3, useW: 1, goods: 0, need: 0, pollute: 0 },
};

export interface Tile {
  ground: 0 | 1;
  road: boolean;
  roadKind: RoadKind;
  oneWay: OneWay;
  district: number;
  track: Track;
  zone: Zone;
  plop: Plop;
  level: number;
  grow: number;
  powered: boolean;
  watered: boolean;
  served: boolean;
  comp: number;
  pollution: number;
  traffic: number;
  elev: number;
  junction: number;
  gauge: number;
  basin: number;
  bid: number;
  brot: 0 | 1 | 2 | 3;
  bseed: number;
  bstage: number;
  bax: number;
  baz: number;
}

interface Persist {
  ground: 0 | 1;
  road: boolean;
  roadKind: RoadKind;
  oneWay: OneWay;
  district: number;
  track: Track;
  zone: Zone;
  plop: Plop;
  level: number;
  grow: number;
  elev: number;
  junction: number;
  gauge: number;
  basin: number;
  bid: number;
  brot: 0 | 1 | 2 | 3;
  bseed: number;
  bstage: number;
  bax: number;
  baz: number;
}

interface Stroke {
  cashDelta: number;
  before: Map<number, Persist>;
}

export interface Hist {
  month: number;
  gdp: number;
  income: number;
  pop: number;
}

export interface Snapshot {
  pop: number;
  popCap: number;
  jobs: number;
  jobSlots: number;
  employed: number;
  unemployment: number;
  cash: number;
  income: number;
  month: number;
  monthLabel: string;
  happy: number;
  traffic: number;
  demand: { r: number; c: number; i: number; o: number };
  sandbox: boolean;
  speed: number;
  paused: boolean;
  power: number;
  water: number;
  health: number;
  school: number;
  safety: number;
  parks: number;
  pollution: number;
  modes: { car: number; bus: number; metro: number; rail: number; rrts: number; walk: number; failed: number };
  gdp: number;
  sectors: { manufacturing: number; services: number; agriculture: number; logistics: number; construction: number };
  imports: number;
  exports: number;
  delivered: number;
  produced: number;
  milestone: string;
  history: Hist[];
  taxes: { r: number; c: number; i: number; o: number; tariff: number };
  budget: {
    residential: number;
    commercial: number;
    industrial: number;
    office: number;
    trade: number;
    exportSales: number;
    roads: number;
    transit: number;
    services: number;
  };
  notes: string[];
  quests: Quest[];
  counts: { roads: number; res: number; com: number; ind: number; off: number };
  canUndo: boolean;
  canRedo: boolean;
  season: Season;
  rickshaws: number;
}

export interface Laws {
  night: boolean;
  trucks: boolean;
  busLane: boolean;
  adapt: boolean;
  fare: number;
  toll: number;
  headway: number;
}

export const SECTORS = ["Riverside", "North Bank", "Works Belt", "South Fields"] as const;

export const PLACES: { name: string; lat: number; lon: number }[] = [
  { name: "Delhi", lat: 28.61, lon: 77.21 },
  { name: "Mumbai", lat: 19.08, lon: 72.88 },
  { name: "Jaipur", lat: 26.91, lon: 75.79 },
  { name: "Lucknow", lat: 26.85, lon: 80.95 },
  { name: "Chandigarh", lat: 30.73, lon: 76.78 },
  { name: "Ahmedabad", lat: 23.02, lon: 72.57 },
  { name: "Kochi", lat: 9.93, lon: 76.27 },
  { name: "Varanasi", lat: 25.32, lon: 82.97 },
];

export interface Quest {
  id: string;
  title: string;
  detail: string;
  done: boolean;
}

export interface InspectInfo {
  x: number;
  z: number;
  title: string;
  subtitle: string;
  rows: { k: string; v: string }[];
  canUpgrade: boolean;
  canBulldoze: boolean;
  canTurn: boolean;
}

export interface Pt {
  x: number;
  z: number;
}

export function hash(x: number, z: number, k = 0) {
  const n = Math.sin(x * 127.1 + z * 311.7 + k * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export function rupee(n: number) {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
}

export function compact(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

export function monthLabel(month: number) {
  return new Date(2026, month, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
}

export function milestoneName(pop: number) {
  if (pop < 400) return "Hamlet";
  if (pop < 1500) return "Village";
  if (pop < 4000) return "Town";
  if (pop < 9000) return "City";
  if (pop < 20000) return "Metropolis";
  return "Megacity";
}

function makeTile(x: number): Tile {
  return {
    ground: x >= WATER_X ? 1 : 0,
    road: false,
    roadKind: 0,
    oneWay: 0,
    district: 0,
    track: "none",
    zone: "none",
    plop: "none",
    level: 0,
    grow: 0,
    powered: false,
    watered: false,
    served: false,
    comp: -1,
    pollution: 0,
    traffic: 0,
    elev: 0,
    junction: 0,
    gauge: 0,
    basin: 0,
    bid: 0,
    brot: 0,
    bseed: 0,
    bstage: 0,
    bax: -1,
    baz: -1,
  };
}

function persist(t: Tile): Persist {
  return {
    ground: t.ground,
    road: t.road,
    roadKind: t.roadKind,
    oneWay: t.oneWay,
    district: t.district,
    track: t.track,
    zone: t.zone,
    plop: t.plop,
    level: t.level,
    grow: t.grow,
    elev: t.elev,
    junction: t.junction,
    gauge: t.gauge,
    basin: t.basin,
    bid: t.bid,
    brot: t.brot,
    bseed: t.bseed,
    bstage: t.bstage,
    bax: t.bax,
    baz: t.baz,
  };
}

function restore(t: Tile, p: Persist) {
  t.ground = p.ground;
  t.road = p.road;
  t.roadKind = p.roadKind;
  t.oneWay = p.oneWay;
  t.district = p.district;
  t.track = p.track;
  t.zone = p.zone;
  t.plop = p.plop;
  t.level = p.level;
  t.grow = p.grow;
  t.elev = p.elev || 0;
  t.junction = p.junction || 0;
  t.gauge = p.gauge || 0;
  t.basin = p.basin || 0;
  t.bid = p.bid || 0;
  t.brot = p.brot === 1 || p.brot === 2 || p.brot === 3 ? p.brot : 0;
  t.bseed = p.bseed || 0;
  t.bstage = p.bstage || 0;
  t.bax = Number.isFinite(p.bax) ? p.bax : -1;
  t.baz = Number.isFinite(p.baz) ? p.baz : -1;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

const STATION: Partial<Record<Plop, Track>> = {
  station: "rail",
  metrostation: "metro",
  rrtsstation: "rrts",
};

function emptySnap(): Snapshot {
  return {
    pop: 0,
    popCap: 0,
    jobs: 0,
    jobSlots: 0,
    employed: 0,
    unemployment: 0,
    cash: 850000,
    income: 0,
    month: 0,
    monthLabel: monthLabel(0),
    happy: 50,
    traffic: 100,
    demand: { r: 0, c: 0, i: 0, o: 0 },
    sandbox: false,
    speed: 1,
    paused: false,
    power: 100,
    water: 100,
    health: 0,
    school: 0,
    safety: 0,
    parks: 0,
    pollution: 0,
    modes: { car: 0, bus: 0, metro: 0, rail: 0, rrts: 0, walk: 0, failed: 0 },
    gdp: 0,
    sectors: { manufacturing: 0, services: 0, agriculture: 0, logistics: 0, construction: 0 },
    imports: 0,
    exports: 0,
    delivered: 0,
    produced: 0,
    milestone: "Hamlet",
    history: [],
    taxes: { r: 9, c: 10, i: 8, o: 10, tariff: 4 },
    budget: { residential: 0, commercial: 0, industrial: 0, office: 0, trade: 0, exportSales: 0, roads: 0, transit: 0, services: 0 },
    notes: ["Lay a road, zone beside it, then touch that road with power and water."],
    quests: [],
    counts: { roads: 0, res: 0, com: 0, ind: 0, off: 0 },
    canUndo: false,
    canRedo: false,
    season: "clear",
    rickshaws: 0,
  };
}

const TRACK_TOOLS: ToolId[] = ["rail", "metro", "rrts", "runway"];
const ZONE_TOOLS: ToolId[] = ["r", "c", "i", "o"];

export class City {
  tiles: Tile[];
  cash = 850000;
  month = 10;
  revision = 0;
  sandbox = false;
  speed = 1;
  paused = false;
  taxes = { r: 9, c: 10, i: 8, o: 10, tariff: 4 };
  history: Hist[] = [];
  lastMilestone = "Hamlet";
  construction = 0;
  carPaths: Pt[][] = [];
  trackPaths: { rail: Pt[]; metro: Pt[]; rrts: Pt[] } = { rail: [], metro: [], rrts: [] };
  runway: Pt[] = [];
  hasPort = false;
  hasMarina = false;
  snap: Snapshot = emptySnap();
  selected: Pt | null = null;
  dirtyVisual = true;
  camera = { yaw: 0.62, pitch: 0.78, distance: 118, x: 0, z: 0 };
  brush: Brush = "street";
  districtBrush = 1;
  catalogId = "";
  catalogRot: 0 | 1 | 2 | 3 = 0;
  lastDrawMs = 0;
  layer: MapLayer = "city";
  laws: Laws = { night: false, trucks: false, busLane: false, adapt: false, fare: 8, toll: 0, headway: 6 };
  sector = 0;
  unlocked = [true, false, false, false];
  banks: (unknown[][] | null)[] = [null, null, null, null];
  placeName = "Riverside";
  lat = 28.61;
  lon = 77.23;
  census: Census = emptyCensus();
  private undoStack: Stroke[] = [];
  private redoStack: Stroke[] = [];
  private stroke: Stroke | null = null;
  private pathStamp = "";
  private visualAll = true;
  private visualChunks = new Set<number>();

  constructor() {
    this.tiles = Array.from({ length: W * H }, (_, i) => makeTile(i % W));
    this.camera.x = (18 - W / 2 + 0.5) * TILE;
    this.camera.z = (16 - H / 2 + 0.5) * TILE;
  }

  idx(x: number, z: number) {
    return z * W + x;
  }

  tile(x: number, z: number) {
    return this.tiles[z * W + x];
  }

  beginStroke() {
    this.stroke = { cashDelta: 0, before: new Map() };
  }

  endStroke() {
    const changed = !!this.stroke && this.stroke.before.size > 0;
    if (changed && this.stroke) {
      this.undoStack.push(this.stroke);
      if (this.undoStack.length > 80) this.undoStack.shift();
      this.redoStack = [];
    }
    this.stroke = null;
    if (!changed) return;
    this.recompute(false);
    this.dirtyVisual = true;
  }

  private remember(i: number) {
    if (!this.stroke) this.beginStroke();
    if (this.stroke && !this.stroke.before.has(i)) this.stroke.before.set(i, persist(this.tiles[i]));
  }

  markVisual(x: number, z: number) {
    this.dirtyVisual = true;
    if (x < 0 || z < 0 || x >= W || z >= H) return;
    this.visualChunks.add(chunkIndex(x, z));
  }

  pullVisualDirty() {
    const out = this.visualAll || this.visualChunks.size === 0 ? [0, 1, 2, 3] : [...this.visualChunks];
    this.visualAll = false;
    this.visualChunks.clear();
    return out;
  }

  private spend(amount: number) {
    if (this.sandbox || amount <= 0) return true;
    if (this.cash < amount) return false;
    this.cash -= amount;
    if (this.stroke) this.stroke.cashDelta -= amount;
    return true;
  }

  private refund(amount: number) {
    if (this.sandbox || amount <= 0) return;
    this.cash += amount;
    if (this.stroke) this.stroke.cashDelta += amount;
  }

  undo() {
    const s = this.undoStack.pop();
    if (!s) return false;
    const next = new Map<number, Persist>();
    for (const [i, prev] of s.before) {
      next.set(i, persist(this.tiles[i]));
      restore(this.tiles[i], prev);
    }
    this.cash -= s.cashDelta;
    this.redoStack.push({ cashDelta: s.cashDelta, before: next });
    this.recompute(false);
    this.dirtyVisual = true;
    return true;
  }

  redo() {
    const s = this.redoStack.pop();
    if (!s) return false;
    const before = new Map<number, Persist>();
    for (const [i, nxt] of s.before) {
      before.set(i, persist(this.tiles[i]));
      restore(this.tiles[i], nxt);
    }
    this.cash += s.cashDelta;
    this.undoStack.push({ cashDelta: s.cashDelta, before });
    this.recompute(false);
    this.dirtyVisual = true;
    return true;
  }

  hintAt(x: number, z: number, tool: ToolId): string | null {
    if (tool === "inspect") return null;
    if (x < 0 || z < 0 || x >= W || z >= H) return "Outside the map";
    return this.reason(this.tile(x, z), tool);
  }

  place(x: number, z: number, tool: ToolId): string | null {
    if (x < 0 || z < 0 || x >= W || z >= H) return "Outside the map";
    const t = this.tile(x, z);
    if (tool === "inspect") {
      this.selected = { x, z };
      return null;
    }
    const err = this.reason(t, tool);
    if (err) return err;
    if ((ZONE_TOOLS.includes(tool) || this.isLandPlop(tool)) && this.steep(x, z)) return "Too steep. Flatten the land first";
    if (this.same(t, tool)) {
      this.selected = { x, z };
      return null;
    }
    const spec = TOOLS[tool];
    let cost = spec.cost;
    if (tool === "road") {
      if (this.brush === "oneway") cost = t.oneWay ? 0 : 40;
      else if (this.brush === "district") cost = 0;
      else if (this.brush === "signal" || this.brush === "roundabout" || this.brush === "stop" || this.brush === "yield" || this.brush === "ramp") cost = 60;
      else if (t.ground === 1) cost = this.brush === "express" ? 900 : this.brush === "avenue" ? 640 : 420;
      else cost = this.brush === "express" ? 320 : this.brush === "avenue" ? 160 : 80;
      if (this.steep(x, z) && this.brush !== "oneway" && this.brush !== "district") cost += 80;
    }
    if (tool === "land") {
      if (this.brush === "raise") cost = 40 + t.elev * 30;
      else if (this.brush === "lower") cost = t.elev > 0 ? 25 : 0;
      else if (this.brush === "canal") cost = 90;
      else cost = 20;
    }
    if (tool !== "bulldoze" && !this.spend(cost)) return "Not enough treasury";
    this.remember(this.idx(x, z));
    if (tool === "bulldoze") {
      const refund = Math.round(this.layerValue(t) * 0.3);
      this.peel(t);
      this.refund(refund);
    } else {
      this.apply(t, tool, x, z);
    }
    this.selected = { x, z };
    this.markVisual(x, z);
    this.dirtyVisual = true;
    return null;
  }

  private reason(t: Tile, tool: ToolId): string | null {
    const spec = TOOLS[tool];
    if (tool === "bulldoze") {
      if (!t.road && t.track === "none" && t.zone === "none" && t.plop === "none" && !t.district && !t.elev && !t.basin && !t.junction && !t.bid) return "Nothing here";
      return null;
    }
    if (t.bid && tool !== "inspect") return "Bulldoze the building first";
    if (tool === "land") {
      if (t.ground === 1 && !t.basin && this.brush === "canal") return "The river is already here";
      if ((t.plop !== "none" || t.zone !== "none") && (this.brush === "canal" || this.brush === "raise")) return "Bulldoze the building first";
      return null;
    }
    if (tool === "road" && (this.brush === "signal" || this.brush === "roundabout" || this.brush === "stop" || this.brush === "yield" || this.brush === "ramp")) {
      return t.road ? null : "Paint the road first";
    }
    if (tool === "road" && this.brush === "oneway") return t.road ? null : "One-way paint needs a road";
    if (tool === "road" && this.brush === "district") return t.ground === 1 ? "Districts sit on land" : null;
    if (tool === "rail" || tool === "metro" || tool === "rrts") return null;
    if (tool === "runway" && t.ground === 1) return "Runways stay on land";
    if (spec.water) {
      if (t.ground !== 1) return "Place this on the water";
      if (t.road) return "A bridge is already here. Bulldoze it first";
      return null;
    }
    if (t.ground === 1 && tool !== "road") return "On the water: paint a road for a bridge, or place a port";
    if (t.ground === 1 && t.plop !== "none") return "Bulldoze the dock before the bridge";
    if (tool === "bus") return t.road ? null : "Bus stops sit on roads";
    if (tool === "station" || tool === "metrostation" || tool === "rrtsstation") {
      const need = STATION[tool];
      if (t.track !== need) return `Place this on ${need === "rail" ? "rail" : need === "metro" ? "metro" : "RRTS"} tracks`;
      return null;
    }
    if (TRACK_TOOLS.includes(tool) || tool === "road") return null;
    if (ZONE_TOOLS.includes(tool) || this.isLandPlop(tool)) {
      if (t.road) return "That's a road. Zone the tiles beside it";
      if (t.track !== "none") return "Tracks are in the way. Bulldoze them first";
      return null;
    }
    return null;
  }

  private isLandPlop(tool: ToolId) {
    return (
      tool !== "none" &&
      tool !== "bus" &&
      tool !== "station" &&
      tool !== "metrostation" &&
      tool !== "rrtsstation" &&
      !TOOLS[tool]?.water &&
      !TRACK_TOOLS.includes(tool) &&
      !ZONE_TOOLS.includes(tool) &&
      tool !== "road" &&
      tool !== "land" &&
      tool !== "inspect" &&
      tool !== "bulldoze"
    );
  }

  private same(t: Tile, tool: ToolId) {
    if (tool === "land") return false;
    if (tool === "road") {
      if (this.brush === "oneway" || this.brush === "signal" || this.brush === "roundabout" || this.brush === "stop" || this.brush === "yield" || this.brush === "ramp") return false;
      if (this.brush === "district") return t.district === this.districtBrush;
      const kind: RoadKind = this.brush === "express" ? 2 : this.brush === "avenue" ? 1 : 0;
      return t.road && t.roadKind === kind && t.zone === "none" && (t.plop === "none" || t.plop === "bus" || !!STATION[t.plop]);
    }
    if (tool === "rail") return t.track === "rail" && t.gauge === this.gaugeWanted() && t.zone === "none" && t.plop === "none";
    if (tool === "metro" || tool === "rrts" || tool === "runway") {
      return t.track === tool && t.zone === "none" && t.plop === "none";
    }
    if (tool === "r" || tool === "c" || tool === "i" || tool === "o") return t.zone === tool;
    if (tool === "bulldoze") return false;
    return t.plop === tool;
  }

  private gaugeWanted() {
    if (this.brush === "double") return 2;
    if (this.brush === "electric") return 3;
    return 1;
  }

  private steep(x: number, z: number) {
    const e = this.tile(x, z).elev;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      if (Math.abs(this.tile(nx, nz).elev - e) >= 3) return true;
    }
    return false;
  }

  private apply(t: Tile, tool: ToolId, x: number, z: number) {
    if (tool === "land") {
      if (this.brush === "raise") t.elev = Math.min(4, (t.elev || 0) + 1);
      else if (this.brush === "lower") t.elev = Math.max(0, (t.elev || 0) - 1);
      else if (this.brush === "canal") {
        if (t.ground === 0) {
          t.ground = 1;
          t.basin = 1;
          t.zone = "none";
          t.level = 0;
          t.plop = "none";
          t.road = false;
          t.track = "none";
        }
      } else {
        let sum = 0;
        let n = 0;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
          sum += this.tile(nx, nz).elev;
          n++;
        }
        t.elev = n ? Math.round(sum / n) : 0;
      }
      return;
    }
    if (tool === "road") {
      if (this.brush === "oneway") {
        const next: OneWay[] = [1, 2, 3, 4, 1];
        t.oneWay = next[t.oneWay] ?? 1;
        return;
      }
      if (this.brush === "district") {
        t.district = t.district === this.districtBrush ? 0 : this.districtBrush;
        return;
      }
      const mark = this.brush === "signal" ? 1 : this.brush === "roundabout" ? 2 : this.brush === "stop" ? 3 : this.brush === "yield" ? 4 : this.brush === "ramp" ? 5 : 0;
      if (mark) {
        t.junction = t.junction === mark ? 0 : mark;
        if (mark === 5) t.roadKind = 2;
        return;
      }
      t.road = true;
      t.roadKind = this.brush === "express" ? 2 : this.brush === "avenue" ? 1 : 0;
      t.zone = "none";
      t.level = 0;
      t.grow = 0;
      if (t.plop !== "bus" && !STATION[t.plop]) t.plop = "none";
      return;
    }
    if (tool === "rail" || tool === "metro" || tool === "rrts") {
      t.track = tool;
      t.zone = "none";
      t.level = 0;
      t.grow = 0;
      if (tool === "rail") t.gauge = this.gaugeWanted();
      if (STATION[t.plop] && STATION[t.plop] !== tool) t.plop = "none";
      if (!STATION[t.plop] && t.plop !== "bus") t.plop = "none";
      return;
    }
    if (tool === "runway") {
      t.track = "runway";
      t.road = false;
      t.zone = "none";
      t.level = 0;
      t.plop = "none";
      return;
    }
    if (tool === "r" || tool === "c" || tool === "i" || tool === "o") {
      if (t.zone !== tool) {
        t.level = 0;
        t.grow = 70;
      }
      t.zone = tool;
      t.plop = "none";
      return;
    }
    t.plop = tool as Plop;
    if (tool !== "bus" && tool !== "station" && tool !== "metrostation" && tool !== "rrtsstation") {
      t.zone = "none";
      t.level = 0;
    }
  }

  private peel(t: Tile) {
    if (t.bid) {
      this.clearStructure(t.bax, t.baz, t.bid);
      return;
    }
    if (t.plop !== "none") {
      t.plop = "none";
      return;
    }
    if (t.zone !== "none") {
      t.zone = "none";
      t.level = 0;
      t.grow = 0;
      return;
    }
    if (t.track !== "none") {
      t.track = "none";
      return;
    }
    if (t.road) {
      t.road = false;
      t.roadKind = 0;
      t.oneWay = 0;
      t.junction = 0;
      return;
    }
    if (t.basin) {
      t.basin = 0;
      t.ground = 0;
      return;
    }
    if (t.elev > 0) {
      t.elev -= 1;
      return;
    }
    t.district = 0;
  }

  private layerValue(t: Tile) {
    if (t.bid) return buildingAt(t.bid)?.cost ?? 0;
    if (t.plop !== "none") return TOOLS[t.plop]?.cost ?? 0;
    if (t.zone !== "none") return (TOOLS[t.zone]?.cost ?? 40) + t.level * 400;
    if (t.track !== "none") return TOOLS[t.track]?.cost ?? 0;
    if (t.road) return t.ground === 1 ? (t.roadKind === 2 ? 900 : t.roadKind === 1 ? 640 : 420) : t.roadKind === 2 ? 320 : t.roadKind === 1 ? 160 : TOOLS.road.cost;
    return 0;
  }

  private anchorTile(t: Tile) {
    if (!t.bid || t.bax < 0 || t.baz < 0 || t.bax >= W || t.baz >= H) return t;
    const a = this.tile(t.bax, t.baz);
    return a.bid === t.bid ? a : t;
  }

  private clearStructure(ax: number, az: number, bid: number) {
    for (let i = 0; i < this.tiles.length; i++) {
      const o = this.tiles[i];
      if (o.bid !== bid || o.bax !== ax || o.baz !== az) continue;
      this.remember(i);
      o.bid = 0;
      o.brot = 0;
      o.bseed = 0;
      o.bstage = 0;
      o.bax = -1;
      o.baz = -1;
      this.markVisual(i % W, (i / W) | 0);
    }
  }

  private writeStructure(cells: { x: number; z: number }[], index: number, rot: 0 | 1 | 2 | 3, seed: number, stage: number, ax: number, az: number) {
    for (const c of cells) {
      const i = this.idx(c.x, c.z);
      this.remember(i);
      const t = this.tiles[i];
      t.bid = index;
      t.brot = rot;
      t.bseed = seed;
      t.bstage = stage;
      t.bax = ax;
      t.baz = az;
      t.zone = "none";
      t.level = 0;
      t.grow = 0;
      t.plop = "none";
      this.markVisual(c.x, c.z);
    }
  }

  buildingError(x: number, z: number, id: string, rot: number, keep?: { x: number; z: number }) {
    const def = buildingById(id);
    if (!def) return "Unknown building";
    const fp = footprint(def, x, z, rot);
    for (const c of fp.cells) {
      if (c.x < 0 || c.z < 0 || c.x >= W || c.z >= H) return "That footprint does not fit";
      const t = this.tile(c.x, c.z);
      const owned = !!keep && t.bid > 0 && t.bax === keep.x && t.baz === keep.z;
      if (t.ground === 1 || t.basin) return "Buildings stay on land";
      if (!owned && t.bid) return "These tiles overlap another building";
      if (!owned && (t.road || t.track !== "none" || t.plop !== "none" || t.zone !== "none")) return "Clear the tiles before placing a building";
      if (this.steep(c.x, c.z)) return "Too steep. Flatten the land first";
    }
    const open = fp.door.filter((c) => c.x >= 0 && c.z >= 0 && c.x < W && c.z < H);
    if (!open.length) return "The entrance would leave the map";
    if (!open.some((c) => this.tile(c.x, c.z).road)) return "The entrance has to face a road";
    return null;
  }

  placeBuilding(x: number, z: number, id: string, rot: number) {
    const def = buildingById(id);
    if (!def) return "Unknown building";
    const err = this.buildingError(x, z, id, rot);
    if (err) return err;
    const turn = (((rot % 4) + 4) % 4) as 0 | 1 | 2 | 3;
    if (!this.spend(def.cost)) return "Not enough treasury";
    const fp = footprint(def, x, z, turn);
    const seed = Math.abs((x * 131 + z * 17 + turn * 13 + (this.revision % 97)) % 997);
    this.writeStructure(fp.cells, buildingIndex(id), turn, seed, 0, x, z);
    this.construction += def.cost;
    this.selected = { x, z };
    return null;
  }

  turnBuilding(x: number, z: number) {
    if (x < 0 || z < 0 || x >= W || z >= H) return "Outside the map";
    const t = this.tile(x, z);
    if (!t.bid) return "Nothing to rotate";
    const ax = t.bax;
    const az = t.baz;
    const a = this.tile(ax, az);
    const def = buildingAt(a.bid);
    if (!def) return "Unknown building";
    const next = ((a.brot + 1) % 4) as 0 | 1 | 2 | 3;
    const err = this.buildingError(ax, az, def.id, next, { x: ax, z: az });
    if (err) return err;
    const bid = a.bid;
    const seed = a.bseed;
    const stage = a.bstage;
    const fp = footprint(def, ax, az, next);
    this.beginStroke();
    this.clearStructure(ax, az, bid);
    this.writeStructure(fp.cells, bid, next, seed, stage, ax, az);
    this.endStroke();
    this.selected = { x: ax, z: az };
    return null;
  }

  upgrade(x: number, z: number): string | null {
    const here = x >= 0 && z >= 0 && x < W && z < H ? this.tile(x, z) : null;
    if (here?.bid) {
      const a = this.anchorTile(here);
      const def = buildingAt(a.bid);
      if (!def) return "Unknown building";
      if (!def.upgrade) return "This building does not have a taller form";
      if (a.bstage < 4) return "Finish construction first";
      if (a.bstage === 6) return "An abandoned building cannot be upgraded";
      const next = buildingById(def.upgrade);
      if (!next || next.w !== def.w || next.d !== def.d) return "The next form does not fit this footprint";
      if (!a.powered || !a.watered) return "It needs power and water";
      const cost = Math.round(next.cost * 0.45);
      this.beginStroke();
      if (!this.spend(cost)) {
        this.stroke = null;
        return "Not enough treasury";
      }
      const index = buildingIndex(next.id);
      const oldBid = a.bid;
      const ax = a.bax;
      const az = a.baz;
      for (let i = 0; i < this.tiles.length; i++) {
        const o = this.tiles[i];
        if (o.bid !== oldBid || o.bax !== ax || o.baz !== az) continue;
        this.remember(i);
        o.bid = index;
        o.bstage = 5;
        this.markVisual(i % W, (i / W) | 0);
      }
      this.construction += cost;
      this.endStroke();
      return null;
    }
    const t = here;
    if (!t || t.zone === "none") return "Zone this tile before upgrading it";
    if (t.level >= 5) return "Already at the top floor";
    if (!t.served || !t.powered || !t.watered) return "It needs a road plus power and water";
    const cost = 1200 * (t.level + 1);
    this.beginStroke();
    if (!this.spend(cost)) {
      this.stroke = null;
      return "Not enough treasury";
    }
    this.remember(this.idx(x, z));
    t.level += 1;
    t.grow = 15;
    this.construction += cost;
    this.endStroke();
    return null;
  }

  inspectInfo(x: number, z: number): InspectInfo {
    const t = this.tile(x, z);
    const built = t.bid ? this.anchorTile(t) : null;
    const def = built ? buildingAt(built.bid) : null;
    if (def && built) {
      const people = Math.round(def.pop * occupantFactor(built.bstage) * (built.powered && built.watered ? 1 : built.served ? 0.35 : 0));
      const jobs = Math.round(def.jobs * occupantFactor(built.bstage) * (built.powered && built.watered ? 1 : built.served ? 0.35 : 0));
      return {
        x: built.bax,
        z: built.baz,
        title: def.name,
        subtitle: STAGES[built.bstage] ?? "Construction",
        canUpgrade: !!def.upgrade && built.bstage === 4 && built.powered && built.watered,
        canBulldoze: true,
        canTurn: true,
        rows: [
          { k: "Footprint", v: `${def.w}×${def.d}` },
          { k: "Facing", v: FACING[built.brot] ?? "south" },
          { k: "Stage", v: STAGES[built.bstage] ?? "—" },
          { k: "Occupants", v: def.pop ? compact(people) : "—" },
          { k: "Jobs", v: def.jobs ? compact(jobs) : "—" },
          { k: "Upkeep", v: `${rupee(buildingUpkeep(def, built.bstage))}/mo` },
          { k: "Power", v: built.powered ? "Connected" : "Dark" },
          { k: "Water", v: built.watered ? "Connected" : "Dry" },
          { k: "Build cost", v: rupee(def.cost) },
          { k: "Visual seed", v: String(built.bseed) },
        ],
      };
    }
    const title =
      t.plop !== "none"
        ? TOOLS[t.plop].name
        : t.zone !== "none"
          ? `${TOOLS[t.zone].name}${t.level ? ` · level ${t.level}` : " · empty lot"}`
          : t.track !== "none"
            ? TOOLS[t.track].name
            : t.road
              ? `${roadLabel(t.roadKind)}${t.ground ? " bridge" : ""}${t.oneWay ? ` · ${WAY[t.oneWay]} only` : ""}`
              : t.district
                ? DISTRICTS[t.district]
                : t.ground
                  ? "Water"
                  : "Open land";
    const rows: { k: string; v: string }[] = [
      { k: "Grid", v: `${x + 1}, ${z + 1}` },
      { k: "Road access", v: t.served ? "Yes" : t.road ? "This is a road" : "No" },
      { k: "Power", v: t.zone === "none" && t.plop === "none" ? "—" : t.powered ? "Connected" : "Dark" },
      { k: "Water", v: t.zone === "none" && t.plop === "none" ? "—" : t.watered ? "Connected" : "Dry" },
      { k: "Pollution", v: `${Math.round(t.pollution * 100)}%` },
      { k: "Traffic", v: t.road ? `${Math.round(t.traffic * 100)}%` : "—" },
    ];
    if (t.district) rows.push({ k: "District", v: DISTRICTS[t.district] ?? "—" });
    if (t.zone === "r" && t.level) rows.push({ k: "Homes", v: compact(Math.round(POP[t.level] * this.via(t))) });
    if (t.zone !== "none" && t.zone !== "r" && t.level) rows.push({ k: "Jobs", v: compact(JOBS[t.zone][t.level]) });
    if (t.plop !== "none" && PLOP[t.plop].jobs) rows.push({ k: "Jobs", v: compact(PLOP[t.plop].jobs) });
    return {
      x,
      z,
      title,
      subtitle: t.ground ? "Waterfront" : t.zone !== "none" && t.level === 0 ? "Zoned. It builds when the city wants it." : "Tile",
      rows,
      canUpgrade: t.zone !== "none" && t.level < 5,
      canTurn: false,
      canBulldoze: t.road || t.track !== "none" || t.zone !== "none" || t.plop !== "none",
    };
  }

  private via(t: Tile) {
    if (t.ground === 1 && !PLOP[t.plop as Exclude<Plop, "none">]?.port && !PLOP[t.plop as Exclude<Plop, "none">]?.marina) return 0;
    let v = 1;
    const needsRoad = t.zone !== "none" || (t.plop !== "none" && t.plop !== "park" && t.plop !== "trees" && t.plop !== "port" && t.plop !== "marina" && t.plop !== "ferry");
    if (needsRoad && !t.served && !t.road) v *= 0.08;
    if ((t.zone !== "none" && t.level > 0) || (t.plop !== "none" && PLOP[t.plop].useP > 0)) {
      if (!t.powered) v *= 0.12;
      if (!t.watered) v *= 0.16;
    }
    if (t.zone === "r") v *= 1 - t.pollution * 0.5;
    return clamp(v, 0, 1);
  }

  setTax(partial: Partial<City["taxes"]>) {
    this.taxes = { ...this.taxes, ...partial };
    this.taxes.r = clamp(this.taxes.r, 1, 25);
    this.taxes.c = clamp(this.taxes.c, 1, 25);
    this.taxes.i = clamp(this.taxes.i, 1, 25);
    this.taxes.o = clamp(this.taxes.o, 1, 25);
    this.taxes.tariff = clamp(this.taxes.tariff, 0, 20);
    this.recompute(false);
  }

  monthTick() {
    this.month += 1;
    this.recompute(true);
    if (!this.sandbox) {
      this.cash += this.snap.income;
      if (this.cash < -250000) this.cash = -250000;
    }
    this.snap.cash = Math.round(finite(this.cash, 0));
    this.revision++;
    this.history.push({
      month: this.month,
      gdp: this.snap.gdp,
      income: this.snap.income,
      pop: this.snap.pop,
    });
    if (this.history.length > 36) this.history.shift();
    this.construction = 0;
    const name = milestoneName(this.snap.pop);
    if (name !== this.lastMilestone) {
      this.lastMilestone = name;
      this.snap.milestone = name;
      this.dirtyVisual = true;
      return name;
    }
    this.dirtyVisual = true;
    return null;
  }

  recompute(grow: boolean): void {
    if (grow) this.advanceStructures();
    const season = seasonOf(this.month);
    const n = W * H;
    const powerNeed = new Float32Array(n);
    const waterNeed = new Float32Array(n);
    const pollution = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const t = this.tiles[i];
      t.powered = false;
      t.watered = false;
      t.served = false;
      t.comp = -1;
      if (t.zone !== "none" && t.level > 0) {
        let use = POWER_USE[t.zone][t.level];
        if (season === "heat" && (t.zone === "r" || t.zone === "c")) use *= 1.18;
        powerNeed[i] += use;
        waterNeed[i] += WATER_USE[t.zone][t.level];
        if (t.zone === "i") pollution[i] += 0.18 + t.level * 0.08;
      }
      if (t.plop !== "none") {
        const p = PLOP[t.plop];
        powerNeed[i] += p.useP;
        waterNeed[i] += p.useW;
        if (p.pollute > 0) pollution[i] += p.pollute;
      }
      if (t.bid && t.bax === i % W && t.baz === ((i / W) | 0)) {
        const def = buildingAt(t.bid);
        if (def && t.bstage >= 1 && t.bstage !== 6) {
          const mul = t.bstage >= 4 ? 1 : 0.25;
          powerNeed[i] += def.useP * mul;
          waterNeed[i] += def.useW * mul;
          if (def.cat === "i") pollution[i] += 0.12;
        }
      }
    }

    const spread = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      if (pollution[i] <= 0) continue;
      const x = i % W;
      const z = (i / W) | 0;
      for (let dz = -5; dz <= 5; dz++) {
        for (let dx = -5; dx <= 5; dx++) {
          const d = Math.abs(dx) + Math.abs(dz);
          if (d > 5) continue;
          const nx = x + dx;
          const nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
          spread[nz * W + nx] += pollution[i] * (1 - d / 6);
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const t = this.tiles[i];
      let p = spread[i];
      if (t.plop === "park" || t.plop === "trees") p = Math.max(0, p - 0.28);
      t.pollution = clamp(p, 0, 1);
    }

    const compOf = new Int32Array(n).fill(-1);
    const comps: number[][] = [];
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const start = z * W + x;
        if (!this.tiles[start].road || compOf[start] >= 0) continue;
        const id = comps.length;
        const list: number[] = [];
        const q = [start];
        compOf[start] = id;
        for (let qi = 0; qi < q.length; qi++) {
          const cur = q[qi];
          list.push(cur);
          const cx = cur % W;
          const cz = (cur / W) | 0;
          for (const [dx, dz] of DIRS) {
            const nx = cx + dx;
            const nz = cz + dz;
            if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
            const ni = nz * W + nx;
            if (compOf[ni] >= 0 || !this.tiles[ni].road) continue;
            compOf[ni] = id;
            q.push(ni);
          }
        }
        comps.push(list);
      }
    }

    const servedRoad = (x: number, z: number) => {
      const t = this.tile(x, z);
      if (t.road) return this.idx(x, z);
      for (const [dx, dz] of DIRS) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        if (this.tile(nx, nz).road) return nz * W + nx;
      }
      return -1;
    };

    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = this.tile(x, z);
        const r = servedRoad(x, z);
        t.served = r >= 0 && !t.road ? true : t.road;
        t.comp = r >= 0 ? compOf[r] : -1;
      }
    }
    this.linkBuildingRoads(compOf);

    const capP = comps.map(() => 0);
    const capW = comps.map(() => 0);
    const plantsP: Pt[][] = comps.map(() => []);
    const plantsW: Pt[][] = comps.map(() => []);
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = this.tile(x, z);
        if (t.plop !== "power" && t.plop !== "solar" && t.plop !== "water") continue;
        const r = servedRoad(x, z);
        if (r < 0) continue;
        const c = compOf[r];
        if (c < 0) continue;
        if (t.plop === "water") {
          capW[c] += PLOP.water.water;
          plantsW[c].push({ x, z });
        } else {
          capP[c] += PLOP[t.plop].power * (t.plop === "solar" ? solarMul(this.month) : 1);
          plantsP[c].push({ x, z });
        }
      }
    }

    const assign = (cap: number[], plants: Pt[][], need: Float32Array, flag: "powered" | "watered") => {
      for (let c = 0; c < comps.length; c++) {
        const users: { i: number; need: number; dist: number }[] = [];
        for (let i = 0; i < n; i++) {
          if (need[i] <= 0 || this.tiles[i].comp !== c) continue;
          let dist = 99;
          const x = i % W;
          const z = (i / W) | 0;
          for (const p of plants[c]) dist = Math.min(dist, Math.abs(p.x - x) + Math.abs(p.z - z));
          users.push({ i, need: need[i], dist });
        }
        users.sort((a, b) => a.dist - b.dist);
        let left = cap[c];
        for (const u of users) {
          if (left >= u.need) {
            this.tiles[u.i][flag] = true;
            left -= u.need;
          }
        }
      }
    };
    assign(capP, plantsP, powerNeed, "powered");
    assign(capW, plantsW, waterNeed, "watered");

    // Parks, groves and empty lots don't need utilities. Generators themselves are "on".
    for (const t of this.tiles) {
      if (t.plop === "power" || t.plop === "solar") t.powered = t.comp >= 0;
      if (t.plop === "water") t.watered = t.comp >= 0;
      if (t.plop === "park" || t.plop === "trees" || t.zone === "none") {
        if (t.plop === "park" || t.plop === "trees") {
          t.powered = true;
          t.watered = true;
        }
      }
      if (t.zone !== "none" && t.level === 0) {
        if (t.comp >= 0 && capP[t.comp] > 0) t.powered = true;
        if (t.comp >= 0 && capW[t.comp] > 0) t.watered = true;
      }
    }

    const sources = (pred: (t: Tile) => boolean) => {
      const list: number[] = [];
      for (let i = 0; i < n; i++) if (pred(this.tiles[i])) list.push(i);
      return list;
    };
    const distFrom = (list: number[]) => {
      const dist = new Uint8Array(n).fill(255);
      const q = [...list];
      for (const s of list) dist[s] = 0;
      for (let qi = 0; qi < q.length; qi++) {
        const id = q[qi];
        const d = dist[id];
        if (d >= 14) continue;
        const x = id % W;
        const z = (id / W) | 0;
        for (const [dx, dz] of DIRS) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
          const ni = nz * W + nx;
          if (dist[ni] <= d + 1) continue;
          dist[ni] = d + 1;
          q.push(ni);
        }
      }
      return dist;
    };
    const parkD = distFrom(sources((t) => t.plop === "park" || t.plop === "trees"));
    const schoolD = distFrom(sources((t) => t.plop === "school" && (t.served || t.comp >= 0)));
    const healthD = distFrom(sources((t) => t.plop === "hospital" && (t.served || t.comp >= 0)));
    const safetyD = distFrom(sources((t) => (t.plop === "police" || t.plop === "fire") && (t.served || t.comp >= 0)));

    const cover = (dist: Uint8Array, radius: number) => {
      let tot = 0;
      let hit = 0;
      for (let i = 0; i < n; i++) {
        const t = this.tiles[i];
        if (t.zone !== "r" || t.level <= 0) continue;
        tot++;
        if (dist[i] <= radius) hit++;
      }
      return tot ? Math.round((100 * hit) / tot) : 0;
    };
    const school = cover(schoolD, 8);
    const health = cover(healthD, 9);
    const safety = cover(safetyD, 8);
    const parks = cover(parkD, 6);

    let bridges = 0;
    let buses = 0;
    let metroStations = 0;
    let pop = 0;
    let popCap = 0;
    let jobSlots = 0;
    let resB = 0;
    let comB = 0;
    let indB = 0;
    let offB = 0;
    let roads = 0;
    let resJobs = 0;
    let comJobs = 0;
    let indJobs = 0;
    let offJobs = 0;
    let plopJobs = 0;
    let powerAsked = 0;
    let powerGot = 0;
    let waterAsked = 0;
    let waterGot = 0;
    let pollutionSum = 0;
    let pollutionN = 0;
    let goodsMake = 0;
    let goodsFarm = 0;
    let factoryGoods = 0;

    const goodsSupplyC = new Map<number, number>();
    const goodsDemandC = new Map<number, number>();
    const portComp = new Set<number>();

    for (let i = 0; i < n; i++) {
      const t = this.tiles[i];
      if (t.road) roads++;
      if (t.road && t.ground === 1) bridges++;
      if (t.plop === "bus") buses++;
      if (t.plop === "metrostation") metroStations++;
      const v = this.via(t);
      if (t.zone === "r" && t.level > 0) {
        resB++;
        popCap += POP[t.level];
        pop += POP[t.level] * v;
        resJobs += JOBS.r[t.level] * v;
        pollutionSum += t.pollution;
        pollutionN++;
      }
      if (t.zone === "c" && t.level > 0) {
        comB++;
        comJobs += JOBS.c[t.level] * v;
      }
      if (t.zone === "i" && t.level > 0) {
        indB++;
        indJobs += JOBS.i[t.level] * v;
        const g = GOODS_OUT[t.level] * v;
        goodsMake += g;
        if (t.comp >= 0) goodsSupplyC.set(t.comp, (goodsSupplyC.get(t.comp) ?? 0) + g);
      }
      if (t.zone === "o" && t.level > 0) {
        offB++;
        offJobs += JOBS.o[t.level] * v;
      }
      if ((t.zone === "c" || t.zone === "o") && t.level > 0 && t.comp >= 0) {
        const need = (t.zone === "c" ? GOODS_IN.c : GOODS_IN.o)[t.level] * v;
        goodsDemandC.set(t.comp, (goodsDemandC.get(t.comp) ?? 0) + need);
      }
      if (t.plop !== "none") {
        const p = PLOP[t.plop];
        plopJobs += p.jobs * (t.plop === "park" || t.plop === "trees" ? 1 : v);
        if (p.goods && t.comp >= 0) {
          const g = p.goods * v;
          if (p.farm) goodsFarm += g;
          else factoryGoods += g;
          goodsSupplyC.set(t.comp, (goodsSupplyC.get(t.comp) ?? 0) + g);
        }
        if (p.need && t.comp >= 0) goodsDemandC.set(t.comp, (goodsDemandC.get(t.comp) ?? 0) + p.need);
        if (p.port && t.comp >= 0) portComp.add(t.comp);
      }
      if (t.bid && t.bax === i % W && t.baz === ((i / W) | 0)) {
        const def = buildingAt(t.bid);
        if (def) {
          const scale = occupantFactor(t.bstage) * (t.powered && t.watered ? 1 : t.served ? 0.35 : 0);
          if (def.cat === "r") {
            popCap += def.pop;
            pop += def.pop * scale;
          }
          const jobs = def.jobs * scale;
          if (def.cat === "c") comJobs += jobs;
          else if (def.cat === "i") indJobs += jobs;
          else if (def.cat === "o") offJobs += jobs;
          else if (def.cat === "r") resJobs += jobs;
          else plopJobs += jobs;
        }
      }
      if (powerNeed[i] > 0) {
        powerAsked += powerNeed[i];
        if (t.powered) powerGot += powerNeed[i];
      }
      if (waterNeed[i] > 0) {
        waterAsked += waterNeed[i];
        if (t.watered) waterGot += waterNeed[i];
      }
    }

    let delivered = 0;
    let exports = 0;
    let imports = 0;
    const keys = new Set<number>([...goodsSupplyC.keys(), ...goodsDemandC.keys()]);
    for (const c of keys) {
      const supply = goodsSupplyC.get(c) ?? 0;
      const demand = goodsDemandC.get(c) ?? 0;
      const flow = Math.min(supply, demand);
      delivered += flow;
      const surplus = Math.max(0, supply - demand);
      const short = Math.max(0, demand - supply);
      if (portComp.has(c)) exports += surplus;
      imports += short;
    }

    pop = Math.round(pop);
    const workforce = pop * 0.46;
    jobSlots = Math.round(resJobs + comJobs + indJobs + offJobs + plopJobs);
    const employed = Math.round(Math.min(workforce, jobSlots));
    const unemployment = workforce > 5 ? Math.round((100 * Math.max(0, workforce - jobSlots)) / workforce) : 0;
    const avgPol = pollutionN ? pollutionSum / pollutionN : 0;
    const gridPower = capP.some((n) => n > 0);
    const gridWater = capW.some((n) => n > 0);
    const powerPct = powerAsked ? Math.round((100 * powerGot) / powerAsked) : gridPower ? 100 : 0;
    const waterPct = waterAsked ? Math.round((100 * waterGot) / waterAsked) : gridWater ? 100 : 0;
    this.commute(powerPct);

    let trafficSum = 0;
    let trafficN = 0;
    for (const t of this.tiles) {
      if (!t.road) continue;
      trafficSum += t.traffic;
      trafficN++;
    }
    const congestion = trafficN ? trafficSum / trafficN : 0;
    let flow = Math.round(clamp(100 - congestion * 100, 8, 100));

    let happy = 42;
    happy += school * 0.12 + health * 0.14 + safety * 0.1 + parks * 0.12;
    happy += powerPct * 0.08 + waterPct * 0.08;
    happy -= avgPol * 28;
    happy -= congestion * 16;
    happy -= Math.max(0, this.taxes.r - 11) * 1.1;
    happy += this.tiles.some((t) => t.plop === "landmark") ? 3 : 0;
    happy += this.tiles.some((t) => t.plop === "stadium") ? 2 : 0;
    if (season === "heat") happy -= 2;
    if (season === "monsoon") happy -= 3;
    happy = Math.round(clamp(happy, 6, 98));

    const housingGap = (jobSlots - workforce) / 40;
    let r = housingGap * 1.6 + (happy - 62) * 0.35 - (this.taxes.r - 9) * 2.5 + (parks - 40) * 0.05;
    if (pop < 500) r += 16;
    r -= avgPol * 12;
    const c = ((pop / 95) - comB) * 2.4 - (this.taxes.c - 10) * 2.1 + (employed > 150 ? 6 : -4);
    const ind = (comB * 0.85 + 1 - indB) * 2.2 + (unemployment > 8 ? 8 : 0) - (this.taxes.i - 8) * 2;
    const o = (pop > 2800 ? 12 : -6) + (school > 50 ? 10 : -4) - offB * 0.9 - (this.taxes.o - 10) * 2;
    const demand = {
      r: Math.round(clamp(r, -50, 50)),
      c: Math.round(clamp(c, -50, 50)),
      i: Math.round(clamp(ind, -50, 50)),
      o: Math.round(clamp(o, -50, 50)),
    };

    if (grow) {
      let changes = 0;
      for (let z = 0; z < H && changes < 26; z++) {
        for (let x = 0; x < W && changes < 26; x++) {
          const t = this.tile(x, z);
          if (t.zone === "none") continue;
          const dmd = demand[t.zone];
          let desire = dmd;
          if (t.zone === "r") {
            if (parkD[this.idx(x, z)] <= 6) desire += 8;
            desire -= t.pollution * 36;
            desire -= t.traffic * 8;
          }
          const utilOk = t.powered && t.watered;
          if (!t.served) {
            if (t.level > 0) t.grow -= 28;
          } else if (!utilOk) {
            if (t.level > 0) t.grow -= 16;
          } else if (desire < -18) {
            t.grow -= 8;
          } else if (desire > 2) {
            t.grow += 20 + desire * 0.65;
          }
          if (t.grow >= 100 && t.level < 5 && t.served && utilOk && desire > 0) {
            t.level++;
            t.grow = 12;
            this.construction += 3500 * t.level;
            changes++;
          } else if (t.grow <= 0 && t.level > 0) {
            t.level--;
            t.grow = 60;
            changes++;
          } else t.grow = clamp(t.grow, 0, 120);
        }
      }
      if (changes) return this.recompute(false);
    }

    const resTax = pop * 2.35 * (this.taxes.r / 9);
    const comTax = comJobs * 3.6 * (this.taxes.c / 10);
    const indTax = indJobs * 3.1 * (this.taxes.i / 8);
    const offTax = offJobs * 4.4 * (this.taxes.o / 10);
    const importDuty = imports * (this.taxes.tariff / 100) * 6;
    const exportSales = Math.round(exports * 1.8);
    const tradeIn = importDuty;
    let railN = 0;
    let metroN = 0;
    let rrtsN = 0;
    let runN = 0;
    let serviceUp = 0;
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (t.track === "rail") railN++;
      if (t.track === "metro") metroN++;
      if (t.track === "rrts") rrtsN++;
      if (t.track === "runway") runN++;
      if (t.plop !== "none") serviceUp += PLOP[t.plop].upkeep;
      if (t.bid && t.bax === i % W && t.baz === ((i / W) | 0)) {
        const def = buildingAt(t.bid);
        if (def) serviceUp += buildingUpkeep(def, t.bstage);
      }
    }
    const roadUp = roads * 4.5;
    const transitUp = railN * 9 + metroN * 14 + rrtsN * 18 + runN * 16;
    let income = Math.round(resTax + comTax + indTax + offTax + tradeIn - roadUp - transitUp - serviceUp);

    const manufacturing = Math.round((goodsMake + factoryGoods) * 85);
    const services = Math.round((comJobs + offJobs) * 125 + (this.tiles.some((t) => t.plop === "stadium") ? 8000 : 0));
    const agriculture = Math.round(goodsFarm * 70);
    const passengers = this.snap.modes.bus + this.snap.modes.metro + this.snap.modes.rail + this.snap.modes.rrts;
    const logistics = Math.round((delivered + exports) * 36 + passengers * 18);
    const gdp = manufacturing + services + agriculture + logistics + Math.round(this.construction);

    const notes: string[] = [];
    let crossings = 0;
    let steepN = 0;
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        if (this.steep(x, z)) steepN++;
        const t = this.tile(x, z);
        if (!t.road) continue;
        let n = 0;
        if (x > 0 && this.tile(x - 1, z).road) n++;
        if (x + 1 < W && this.tile(x + 1, z).road) n++;
        if (z > 0 && this.tile(x, z - 1).road) n++;
        if (z + 1 < H && this.tile(x, z + 1).road) n++;
        if (n >= 3) crossings++;
      }
    }
    this.census = takeCensus(this.tiles, {
      pop,
      jobs: jobSlots,
      happy,
      traffic: flow,
      power: powerPct,
      water: waterPct,
      pollution: avgPol,
      income,
      gdp,
      imports: Math.round(imports),
      exports: Math.round(exports),
      cash: this.cash,
      month: this.month,
      season,
      sectors: this.unlocked.filter(Boolean).length,
      edgeLinks: this.edgeLinks(),
      fare: this.laws.fare,
      toll: this.laws.toll,
      headway: this.laws.headway,
      night: this.laws.night,
      trucks: this.laws.trucks,
      busLane: this.laws.busLane,
      adapt: this.laws.adapt,
      rickshaws: Math.round(pop / 140),
      walk: this.snap.modes.walk,
      car: this.snap.modes.car,
      busShare: this.snap.modes.bus,
      metroShare: this.snap.modes.metro,
      place: this.placeName,
      lat: this.lat,
      lon: this.lon,
      steep: steepN,
    });
    this.census.crossings = crossings;
    const mods = engineMods(this.census);
    happy = Math.round(clamp(happy + mods.happy, 6, 98));
    income = Math.round(income + mods.income);
    flow = Math.round(clamp(flow + mods.flow, 8, 100));
    this.census.happy = happy;
    this.census.income = income;
    this.census.traffic = flow;
    notes.push(...mods.notes);
    if (this.cash < 0 && !this.sandbox) notes.push("Treasury is in debt. Nudge taxes up, or bulldoze a costly service.");
    if (powerPct < 92) notes.push("Lights are failing. Add a power plant or solar farm touching a road.");
    if (waterPct < 92) notes.push("Taps are dry. Add waterworks on the same road network.");
    if (flow < 58) notes.push("Traffic is heavy. A metro, buses or a second avenue will loosen it.");
    if (happy < 50) notes.push("People are unhappy. Parks, schools and a clinic change the mood.");
    if (demand.r > 18) notes.push("Housing demand is high. Zone residential beside roads.");
    else if (demand.c > 18) notes.push("Shops are wanted. Zone commercial on a connected road.");
    else if (demand.i > 18) notes.push("Industry wants land. Keep it downwind of homes and add a seaport.");
    else if (demand.o > 14) notes.push("Offices are ready. Zone them near schools.");
    if (!this.tiles.some((t) => t.plop === "power" || t.plop === "solar")) notes.push("The city has no power plant yet.");
    if (!this.tiles.some((t) => t.plop === "water")) notes.push("No waterworks yet. Homes will not fill.");
    if (season === "heat") notes.unshift("Heatwave. Homes and shops are pulling more power.");
    if (season === "monsoon") notes.unshift("Monsoon. Solar drops. Keep the roads draining.");
    if (season === "cool") notes.unshift("Cool months. Ridership holds and the air is easier.");
    if (bridges < 2) notes.push("The river is open. Paint the road tool onto the water for a bridge.");
    if (!notes.length) notes.push("The city is holding. Follow the brief and stay ahead of demand.");

    const quests = makeQuests({
      roads,
      bridges,
      power: powerPct,
      water: waterPct,
      res: resB,
      happy,
      pop,
      metroStations,
      buses,
    });

    this.snap = {
      pop: finite(pop, 0, 0, 1e9),
      popCap: Math.round(popCap),
      jobs: employed,
      jobSlots,
      employed,
      unemployment: finite(unemployment, 0, 0, 100),
      cash: Math.round(finite(this.cash, 0)),
      income: finite(income, 0),
      month: this.month,
      monthLabel: monthLabel(this.month),
      happy: finite(happy, 50, 0, 100),
      traffic: finite(flow, 100, 0, 100),
      demand,
      sandbox: this.sandbox,
      speed: this.speed,
      paused: this.paused,
      power: finite(powerPct, 0, 0, 100),
      water: finite(waterPct, 0, 0, 100),
      health,
      school,
      safety,
      parks,
      pollution: Math.round(avgPol * 100),
      modes: this.snap.modes,
      gdp: finite(gdp, 0, 0, 1e12),
      sectors: { manufacturing, services, agriculture, logistics, construction: Math.round(this.construction) },
      imports: Math.round(imports),
      exports: Math.round(exports),
      delivered: Math.round(delivered),
      produced: Math.round(goodsMake + factoryGoods + goodsFarm),
      milestone: milestoneName(pop),
      history: this.history,
      taxes: { ...this.taxes },
      budget: {
        residential: Math.round(resTax),
        commercial: Math.round(comTax),
        industrial: Math.round(indTax),
        office: Math.round(offTax),
        trade: Math.round(tradeIn),
        exportSales,
        roads: Math.round(roadUp),
        transit: Math.round(transitUp),
        services: Math.round(serviceUp),
      },
      notes,
      quests,
      counts: { roads, res: resB, com: comB, ind: indB, off: offB },
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      season,
      rickshaws: Math.round(pop / 140),
    };
    this.lastMilestone = this.snap.milestone;
    this.rebuildPaths();
    this.hasPort = this.tiles.some((t) => t.plop === "port");
    this.hasMarina = this.tiles.some((t) => t.plop === "marina" || t.plop === "ferry");
    this.visualAll = true;
    this.dirtyVisual = true;
    this.revision++;
  }

  private linkBuildingRoads(compOf: Int32Array) {
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      const x = i % W;
      const z = (i / W) | 0;
      if (!t.bid || t.bax !== x || t.baz !== z) continue;
      const def = buildingAt(t.bid);
      if (!def) continue;
      const fp = footprint(def, x, z, t.brot);
      let comp = -1;
      for (const door of fp.door) {
        if (door.x < 0 || door.z < 0 || door.x >= W || door.z >= H) continue;
        if (!this.tile(door.x, door.z).road) continue;
        const linked = compOf[door.z * W + door.x];
        if (linked >= 0) {
          comp = linked;
          break;
        }
      }
      if (comp < 0) continue;
      for (const cell of fp.cells) {
        const tile = this.tile(cell.x, cell.z);
        tile.served = true;
        tile.comp = comp;
      }
    }
  }

  private advanceStructures() {
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if (!t.bid || t.bax !== i % W || t.baz !== ((i / W) | 0)) continue;
      if (t.bstage < 4) t.bstage++;
      else if (t.bstage === 5) t.bstage = 4;
      else if (t.bstage === 4 && t.comp >= 0 && !t.powered && !t.watered) t.bstage = 6;
    }
    for (const t of this.tiles) {
      if (!t.bid || t.bax < 0) continue;
      const a = this.tile(t.bax, t.baz);
      if (a.bid === t.bid) {
        t.bstage = a.bstage;
        t.brot = a.brot;
        t.bseed = a.bseed;
      }
    }
  }

  private commute(powerPct: number) {
    const houses: Pt[] = [];
    const jobs: Pt[] = [];
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = this.tile(x, z);
        if (t.zone === "r" && t.level > 0) houses.push({ x, z });
        const slots =
          t.zone !== "none" && t.zone !== "r" && t.level > 0
            ? JOBS[t.zone][t.level]
            : t.plop !== "none"
              ? PLOP[t.plop].jobs
              : 0;
        if (slots > 8) jobs.push({ x, z });
      }
    }
    const trackComp = (kind: Track) => {
      const comp = new Int32Array(W * H).fill(-1);
      let id = 0;
      for (let z = 0; z < H; z++) {
        for (let x = 0; x < W; x++) {
          const s = z * W + x;
          if (this.tiles[s].track !== kind || comp[s] >= 0) continue;
          const q = [s];
          comp[s] = id;
          for (let qi = 0; qi < q.length; qi++) {
            const cur = q[qi];
            const cx = cur % W;
            const cz = (cur / W) | 0;
            for (const [dx, dz] of DIRS) {
              const nx = cx + dx;
              const nz = cz + dz;
              if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
              const ni = nz * W + nx;
              if (comp[ni] >= 0 || this.tiles[ni].track !== kind) continue;
              comp[ni] = id;
              q.push(ni);
            }
          }
          id++;
        }
      }
      return comp;
    };
    const metroC = trackComp("metro");
    const railC = trackComp("rail");
    const rrtsC = trackComp("rrts");
    const stops = (plop: Plop, comp: Int32Array) => {
      const list: { x: number; z: number; c: number }[] = [];
      for (let z = 0; z < H; z++) {
        for (let x = 0; x < W; x++) {
          const t = this.tile(x, z);
          if (t.plop !== plop) continue;
          list.push({ x, z, c: comp[z * W + x] });
        }
      }
      return list;
    };
    const metroS = stops("metrostation", metroC);
    const railS = stops("station", railC);
    const rrtsS = stops("rrtsstation", rrtsC);
    const busS: { x: number; z: number; c: number }[] = [];
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = this.tile(x, z);
        if (t.plop === "bus") busS.push({ x, z, c: t.comp });
      }
    }
    const near = (p: Pt, list: { x: number; z: number; c: number }[], rad: number) => {
      let best: { c: number; d: number } | null = null;
      for (const s of list) {
        const d = Math.abs(s.x - p.x) + Math.abs(s.z - p.z);
        if (d <= rad && s.c >= 0 && (!best || d < best.d)) best = { c: s.c, d };
      }
      return best;
    };
    const modes = { car: 0, bus: 0, metro: 0, rail: 0, rrts: 0, walk: 0, failed: 0 };
    const step = Math.max(1, Math.floor(houses.length / 80));
    let sampled = 0;
    for (let hi = 0; hi < houses.length; hi += step) {
      const h = houses[hi];
      sampled++;
      let best: Pt | null = null;
      let bestD = 99;
      for (const j of jobs) {
        const d = Math.abs(j.x - h.x) + Math.abs(j.z - h.z);
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      if (!best) {
        modes.failed++;
        continue;
      }
      const ht = this.tile(h.x, h.z);
      const jt = this.tile(best.x, best.z);
      if (bestD <= 6) modes.walk++;
      else {
        const hm = near(h, metroS, 5);
        const jm = near(best, metroS, 5);
        const hr = near(h, railS, 5);
        const jr = near(best, railS, 5);
        const hx = near(h, rrtsS, 6);
        const jx = near(best, rrtsS, 6);
        const hb = near(h, busS, 6);
        const jb = near(best, busS, 6);
        if (hm && jm && hm.c === jm.c && hm.d + jm.d > 0) modes.metro++;
        else if (hx && jx && hx.c === jx.c) modes.rrts++;
        else if (hr && jr && hr.c === jr.c) modes.rail++;
        else if (hb && jb && hb.c === jb.c && hb.c >= 0) modes.bus++;
        else if (ht.comp >= 0 && ht.comp === jt.comp) modes.car++;
        else modes.failed++;
      }
    }
    const scale = sampled ? houses.length / sampled : 0;
    const scaleMode = (k: keyof typeof modes) => Math.round(modes[k] * scale * (powerPct / 100));
    this.snap.modes = {
      car: scaleMode("car"),
      bus: scaleMode("bus"),
      metro: scaleMode("metro"),
      rail: scaleMode("rail"),
      rrts: scaleMode("rrts"),
      walk: scaleMode("walk"),
      failed: scaleMode("failed"),
    };
    // Traffic paint from car share, spread on the busiest roads lightly.
    const carLoad = this.snap.modes.car;
    for (const t of this.tiles) if (t.road) t.traffic = 0;
    if (carLoad > 0 && roadsCount(this.tiles) > 0) {
      const per = carLoad / Math.max(1, roadsCount(this.tiles));
      for (const t of this.tiles) {
        if (!t.road) continue;
        const cap = t.roadKind === 2 ? 2.8 : t.roadKind === 1 ? 1.6 : 1;
        t.traffic = clamp(per / (7 * cap), 0.04, 1);
      }
    }
  }

  private rebuildPaths() {
    const stamp = this.tiles.map((t) => (t.road ? `r${t.oneWay}` : ".") + t.track[0] + (t.plop === "bus" ? "b" : "")).join("");
    if (stamp === this.pathStamp && this.carPaths.length) return;
    this.pathStamp = stamp;
    const roads: Pt[] = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (this.tile(x, z).road) roads.push({ x, z });
    this.carPaths = [];
    const used = new Set<number>();
    for (let k = 0; k < roads.length && this.carPaths.length < 14; k += Math.max(1, Math.floor(roads.length / 14))) {
      const start = roads[k];
      const key = start.z * W + start.x;
      if (used.has(key)) continue;
      const path = walk(this, start, (x, z) => this.tile(x, z).road, 16, k, (x, z, nx, nz) => roadLegal(this, x, z, nx, nz));
      if (path.length > 3) {
        this.carPaths.push(path);
        for (const p of path) used.add(p.z * W + p.x);
      }
    }
    const trace = (kind: Track) => {
      const cells: Pt[] = [];
      for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (this.tile(x, z).track === kind) cells.push({ x, z });
      if (cells.length < 3) return [] as Pt[];
      let best: Pt[] = [];
      for (const s of cells) {
        if (neighbors(this, s.x, s.z, (x, z) => this.tile(x, z).track === kind).length !== 1 && best.length) continue;
        const path = walk(this, s, (x, z) => this.tile(x, z).track === kind, cells.length, 1);
        if (path.length > best.length) best = path;
      }
      return best.length ? best : walk(this, cells[0], (x, z) => this.tile(x, z).track === kind, cells.length, 2);
    };
    this.trackPaths = { rail: trace("rail"), metro: trace("metro"), rrts: trace("rrts") };
    const runs: Pt[] = [];
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (this.tile(x, z).track === "runway") runs.push({ x, z });
    runs.sort((a, b) => a.z - b.z || a.x - b.x);
    this.runway = runs;
  }

  blank() {
    this.tiles = Array.from({ length: W * H }, (_, i) => makeTile(i % W));
    this.cash = 850000;
    this.month = 10;
    this.sandbox = false;
    this.taxes = { r: 9, c: 10, i: 8, o: 10, tariff: 4 };
    this.laws = { night: false, trucks: false, busLane: false, adapt: false, fare: 8, toll: 0, headway: 6 };
    this.sector = 0;
    this.unlocked = [true, false, false, false];
    this.banks = [null, null, null, null];
    this.placeName = "Riverside";
    this.lat = 28.61;
    this.lon = 77.23;
    this.history = [];
    this.construction = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.pathStamp = "";
    this.lastMilestone = "Hamlet";
    this.recompute(false);
    this.dirtyVisual = true;
  }

  private edgeLinks() {
    if (this.unlocked.filter(Boolean).length < 2) return 0;
    let n = 0;
    for (let x = 0; x < W; x++) {
      if (this.tile(x, 0).road) n++;
      if (this.tile(x, H - 1).road) n++;
    }
    for (let z = 0; z < H; z++) {
      if (this.tile(0, z).road) n++;
      if (this.tile(W - 1, z).road) n++;
    }
    return n;
  }

  cycleSector(): string | null {
    const next = (this.sector + 1) % SECTORS.length;
    if (!this.unlocked[next]) {
      if (!this.sandbox && !this.spend(180000)) return "The next sector costs ₹1.80 L";
      this.unlocked[next] = true;
    }
    this.banks[this.sector] = this.dump();
    this.sector = next;
    this.undoStack = [];
    this.redoStack = [];
    if (this.banks[next]) this.loadDump(this.banks[next] as unknown[][]);
    else this.tiles = Array.from({ length: W * H }, (_, i) => makeTile(i % W));
    this.recompute(false);
    this.dirtyVisual = true;
    return null;
  }

  seedPlace(name: string) {
    const place = PLACES.find((p) => p.name === name) ?? PLACES[0];
    this.placeName = place.name;
    this.lat = place.lat;
    this.lon = place.lon;
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < 4; x++) {
        const t = this.tile(x, z);
        if (!t.road && t.zone === "none" && t.plop === "none") t.elev = hash(x, z, place.lat) > 0.45 ? 2 : 1;
      }
    }
    this.dirtyVisual = true;
    this.recompute(false);
  }

  geoJSON() {
    const features = [];
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = this.tile(x, z);
        if (!t.road && t.zone === "none" && t.track === "none" && !t.basin && !t.elev) continue;
        features.push({
          type: "Feature",
          properties: { road: t.road ? 1 : 0, zone: t.zone, track: t.track, elev: t.elev, basin: t.basin },
          geometry: { type: "Point", coordinates: [this.lon + (x - W / 2) * 0.002, this.lat - (z - H / 2) * 0.002] },
        });
      }
    }
    return { type: "FeatureCollection", name: this.placeName, features };
  }

  importGeo(text: string): string | null {
    const coords: [number, number][] = [];
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const data = JSON.parse(trimmed) as { features?: { geometry?: { type?: string; coordinates?: unknown } }[]; coordinates?: unknown };
        const feats = Array.isArray(data) ? data : data.features ?? [];
        for (const f of feats) {
          const g = (f as { geometry?: { type?: string; coordinates?: unknown } }).geometry ?? (f as { type?: string; coordinates?: unknown });
          collectCoords(g?.coordinates, coords);
        }
        if (!feats.length && data.coordinates) collectCoords(data.coordinates, coords);
      } catch {
        return "That file is not GeoJSON or a height list";
      }
    } else {
      const re = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(trimmed)) && coords.length < 800) coords.push([Number(m[1]), Number(m[2])]);
    }
    if (!coords.length) return "No coordinates in that file";
    const geo = coords.some((c) => Math.abs(c[0]) > 44 || Math.abs(c[1]) > 44);
    let painted = 0;
    this.beginStroke();
    for (const [a, b] of coords.slice(0, 500)) {
      const x = geo ? Math.round((a - this.lon) / 0.002 + W / 2) : Math.round(a);
      const z = geo ? Math.round((this.lat - b) / 0.002 + H / 2) : Math.round(b);
      if (x < 0 || z < 0 || x >= W || z >= H) continue;
      const t = this.tile(x, z);
      if (t.ground === 1 && !t.basin) continue;
      this.remember(this.idx(x, z));
      t.road = true;
      if (!t.roadKind) t.roadKind = 0;
      painted++;
    }
    this.endStroke();
    this.recompute(false);
    this.dirtyVisual = true;
    return painted ? null : "Those coordinates fall outside this sector";
  }

  showcase() {
    this.blank();
    const setRoad = (x: number, z: number) => {
      if (x < 0 || z < 0 || x >= W || z >= H) return;
      const t = this.tile(x, z);
      if (t.ground) return;
      t.road = true;
    };
    for (const z of [6, 14, 22, 29]) for (let x = 2; x <= 36; x++) setRoad(x, z);
    for (const x of [8, 16, 24, 32]) for (let z = 2; z <= 32; z++) setRoad(x, z);
    for (let x = 33; x <= 41; x++) {
      const t = this.tile(x, 12);
      if (t.plop !== "none") continue;
      t.road = true;
      t.roadKind = 2;
      t.zone = "none";
      t.level = 0;
      t.grow = 0;
    }
    for (const z of [6, 14, 22]) {
      for (let x = 2; x <= 36; x++) if (this.tile(x, z).road) this.tile(x, z).roadKind = 1;
    }
    for (const x of [16, 24]) {
      for (let z = 2; z <= 32; z++) if (this.tile(x, z).road) this.tile(x, z).roadKind = 1;
    }
    for (let z = 7; z <= 13; z++) for (let x = 9; x <= 15; x++) if (!this.tile(x, z).road) this.tile(x, z).district = 1;
    for (let z = 7; z <= 13; z++) for (let x = 17; x <= 23; x++) if (!this.tile(x, z).road) this.tile(x, z).district = 2;
    for (let z = 15; z <= 21; z++) for (let x = 25; x <= 31; x++) if (!this.tile(x, z).road) this.tile(x, z).district = 3;
    const fill = (x0: number, z0: number, x1: number, z1: number, zone: Zone, minL: number, maxL: number, skip: number) => {
      for (let z = z0; z <= z1; z++) {
        for (let x = x0; x <= x1; x++) {
          const t = this.tile(x, z);
          if (t.ground || t.road || t.track !== "none") continue;
          const front =
            (x > 0 && this.tile(x - 1, z).road) ||
            (x + 1 < W && this.tile(x + 1, z).road) ||
            (z > 0 && this.tile(x, z - 1).road) ||
            (z + 1 < H && this.tile(x, z + 1).road);
          if (!front) {
            if (t.plop === "none" && hash(x, z, 9) > 0.78) t.plop = "trees";
            continue;
          }
          if (hash(x, z) < skip) continue;
          t.zone = zone;
          const span = maxL - minL + 1;
          t.level = minL + Math.floor(hash(x, z, 2) * span);
          t.grow = 20 + Math.floor(hash(x, z, 3) * 50);
        }
      }
    };
    fill(9, 7, 15, 13, "r", 1, 2, 0.1);
    fill(9, 15, 15, 21, "r", 1, 2, 0.12);
    fill(25, 7, 31, 13, "r", 1, 2, 0.14);
    fill(17, 23, 23, 28, "r", 1, 2, 0.16);
    fill(9, 23, 15, 28, "r", 1, 1, 0.2);
    fill(17, 7, 23, 13, "c", 1, 2, 0.12);
    fill(19, 15, 23, 20, "o", 1, 3, 0.15);
    fill(25, 15, 31, 21, "i", 1, 2, 0.16);
    fill(25, 23, 31, 28, "r", 1, 1, 0.35);

    for (let x = 4; x <= 34; x++) {
      const t = this.tile(x, 5);
      if (t.ground) continue;
      t.track = "metro";
      if (!t.road) {
        t.zone = "none";
        t.level = 0;
      }
    }
    this.tile(12, 5).plop = "metrostation";
    this.tile(26, 5).plop = "metrostation";
    for (let x = 4; x <= 36; x++) {
      const t = this.tile(x, 31);
      if (t.ground) continue;
      t.track = "rail";
      if (!t.road) {
        t.zone = "none";
        t.level = 0;
      }
    }
    this.tile(18, 31).plop = "station";
    for (let x = 6; x <= 34; x++) {
      const t = this.tile(x, 2);
      if (t.ground) continue;
      t.track = "rrts";
      if (!t.road) {
        t.zone = "none";
        t.level = 0;
      }
    }
    this.tile(20, 2).plop = "rrtsstation";
    for (const [x, z] of [
      [8, 14],
      [16, 22],
      [24, 6],
      [32, 22],
    ] as const) {
      this.tile(x, z).plop = "bus";
    }
    const put = (x: number, z: number, plop: Plop) => {
      const t = this.tile(x, z);
      t.plop = plop;
      t.zone = "none";
      t.level = 0;
      t.road = false;
      t.track = "none";
    };
    put(9, 7, "school");
    put(25, 23, "school");
    put(17, 7, "hospital");
    put(17, 25, "hospital");
    put(25, 7, "police");
    put(9, 23, "police");
    put(31, 15, "fire");
    put(15, 28, "fire");
    put(11, 11, "park");
    put(21, 19, "park");
    put(27, 25, "park");
    put(33, 15, "power");
    put(33, 7, "water");
    put(7, 12, "solar");
    put(25, 16, "factory");
    put(23, 15, "landmark");
    put(7, 18, "stadium");
    put(7, 27, "farm");
    put(15, 32, "airport");
    for (let x = 10; x <= 22; x++) {
      const t = this.tile(x, 33);
      t.track = "runway";
      t.road = false;
      t.zone = "none";
      t.plop = "none";
    }
    put(31, 21, "cargo");
    put(31, 9, "warehouse");
    const port = this.tile(37, 14);
    port.plop = "port";
    const marina = this.tile(37, 22);
    marina.plop = "marina";
    const ferry = this.tile(37, 29);
    ferry.plop = "ferry";
    for (let z = 8; z <= 30; z++) {
      for (const x of [0, 1]) {
        const t = this.tile(x, z);
        if (!t.road && t.track === "none" && t.plop === "none") t.plop = hash(x, z, 5) > 0.35 ? "trees" : "none";
      }
    }
    this.cash = 850000;
    this.month = 10;
    this.pathStamp = "";
    this.recompute(false);
    const s = this.snap;
    this.history = [];
    for (let k = 8; k >= 1; k--) {
      const f = 1 - k * 0.04;
      this.history.push({
        month: this.month - k,
        gdp: Math.round(s.gdp * Math.max(0.55, f)),
        income: Math.round(s.income * Math.max(0.5, f - 0.08)),
        pop: Math.round(s.pop * (0.78 + (8 - k) * 0.025)),
      });
    }
    this.snap.history = this.history;
    this.dirtyVisual = true;
  }

  toJSON() {
    return {
      version: 11,
      revision: this.revision,
      month: this.month,
      cash: this.cash,
      sandbox: this.sandbox,
      taxes: this.taxes,
      laws: this.laws,
      sector: this.sector,
      unlocked: this.unlocked,
      banks: this.banks,
      placeName: this.placeName,
      lat: this.lat,
      lon: this.lon,
      milestone: this.lastMilestone,
      history: this.history,
      construction: this.construction,
      camera: this.camera,
      tiles: this.dump(),
    };
  }

  private dump() {
    return this.tiles.map((t) => [
      t.ground,
      t.road ? 1 : 0,
      t.track,
      t.zone,
      t.plop,
      t.level,
      Math.round(t.grow),
      t.roadKind,
      t.oneWay,
      t.district,
      t.elev || 0,
      t.junction || 0,
      t.gauge || 0,
      t.basin || 0,
      t.bid || 0,
      t.brot || 0,
      t.bseed || 0,
      t.bstage || 0,
      t.bax,
      t.baz,
    ]);
  }

  private loadDump(rows: unknown[]) {
    rows.forEach((row, i) => {
      if (!Array.isArray(row) || i >= this.tiles.length) return;
      const t = this.tiles[i];
      t.ground = row[0] === 1 ? 1 : i % W >= WATER_X ? 1 : 0;
      t.road = row[1] === 1;
      t.track = isTrack(row[2]) ? row[2] : "none";
      t.zone = isZone(row[3]) ? row[3] : "none";
      t.plop = isPlop(row[4]) ? row[4] : "none";
      t.level = clamp(Number(row[5]) || 0, 0, 5);
      t.grow = clamp(Number(row[6]) || 0, 0, 120);
      t.roadKind = row[7] === 2 ? 2 : row[7] === 1 ? 1 : 0;
      t.oneWay = row[8] === 4 ? 4 : row[8] === 3 ? 3 : row[8] === 2 ? 2 : row[8] === 1 ? 1 : 0;
      t.district = clamp(Number(row[9]) || 0, 0, 4);
      t.elev = clamp(Number(row[10]) || 0, 0, 4);
      t.junction = clamp(Number(row[11]) || 0, 0, 5);
      t.gauge = clamp(Number(row[12]) || 0, 0, 3);
      t.basin = row[13] === 1 ? 1 : 0;
      const bid = clamp(Number(row[14]) || 0, 0, BUILDINGS.length);
      t.bid = buildingAt(bid) ? bid : 0;
      t.brot = row[15] === 1 ? 1 : row[15] === 2 ? 2 : row[15] === 3 ? 3 : 0;
      t.bseed = clamp(Number(row[16]) || 0, 0, 100000);
      t.bstage = clamp(Number(row[17]) || 0, 0, 6);
      t.bax = Number.isFinite(Number(row[18])) ? clamp(Number(row[18]), -1, W - 1) : -1;
      t.baz = Number.isFinite(Number(row[19])) ? clamp(Number(row[19]), -1, H - 1) : -1;
      if (!t.bid) {
        t.bax = -1;
        t.baz = -1;
      }
      if (t.basin) t.ground = 1;
      if (t.ground === 1 && !t.basin && i % W < WATER_X) t.ground = 0;
      if (t.ground === 1) {
        t.zone = "none";
        t.level = 0;
        if (t.plop !== "port" && t.plop !== "marina" && t.plop !== "ferry") t.plop = "none";
        if (!t.road && t.track !== "none" && t.track !== "runway") t.track = "none";
        t.bid = 0;
        t.brot = 0;
        t.bseed = 0;
        t.bstage = 0;
        t.bax = -1;
        t.baz = -1;
      }
    });
  }

  fromJSON(data: unknown): string | null {
    if (!data || typeof data !== "object") return "That file is not a city";
    const obj = data as Record<string, unknown>;
    const modern = modernSave(obj.version) && Array.isArray(obj.tiles) && obj.tiles.length === W * H;
    const legacy = Array.isArray(obj.grid);
    if (!modern && !legacy) return "Unrecognized city file";
    if (modern && (obj.tiles as unknown[]).some((row) => !Array.isArray(row))) {
      return "That city file is damaged. Your current city was kept.";
    }
    if (legacy) {
      const grid = obj.grid as unknown[];
      if (!grid.length || !grid.every((row) => Array.isArray(row))) return "Unrecognized city file";
    }
    const backup = this.toJSON();
    try {
      const err = modern ? this.loadModern(obj) : this.loadLegacy(obj);
      if (err) throw new Error(err);
      if (!Number.isFinite(this.cash) || !Number.isFinite(this.laws.fare) || !Number.isFinite(this.taxes.tariff) || !Number.isFinite(this.snap.cash)) {
        throw new Error("non-finite");
      }
      return null;
    } catch {
      try {
        this.loadModern(backup as unknown as Record<string, unknown>);
      } catch {
        this.blank();
      }
      return "That city file is damaged. Your current city was kept.";
    }
  }

  private loadModern(obj: Record<string, unknown>): string | null {
    if (modernSave(obj.version) && Array.isArray(obj.tiles) && obj.tiles.length === W * H) {
      const keptRevision = finite(obj.revision, this.revision, 0, 1e12);
      this.blank();
      this.loadDump(obj.tiles as unknown[]);
      if (Number(obj.version) < 10) {
        for (const t of this.tiles) if (t.oneWay === 2) t.oneWay = 3;
      }
      this.cash = finite(obj.cash, 850000, -250000, 1e12);
      this.month = finite(obj.month, 0, 0, 5000);
      this.sandbox = obj.sandbox === true;
      if (obj.laws && typeof obj.laws === "object") {
        const law = obj.laws as Record<string, unknown>;
        this.laws = {
          night: law.night === true,
          trucks: law.trucks === true,
          busLane: law.busLane === true,
          adapt: law.adapt === true,
          fare: finite(law.fare, 8, 0, 30),
          toll: finite(law.toll, 0, 0, 20),
          headway: finite(law.headway, 6, 2, 20),
        };
      }
      if (typeof obj.placeName === "string" && obj.placeName.trim()) this.placeName = obj.placeName.trim().slice(0, 32);
      if (Number.isFinite(Number(obj.lat))) this.lat = Number(obj.lat);
      if (Number.isFinite(Number(obj.lon))) this.lon = Number(obj.lon);
      if (Array.isArray(obj.unlocked) && obj.unlocked.length === 4) this.unlocked = obj.unlocked.map((v) => v === true);
      this.unlocked[0] = true;
      if (Array.isArray(obj.banks)) this.banks = obj.banks.slice(0, 4).map((b) => (Array.isArray(b) ? (b as unknown[][]) : null));
      if (Number.isFinite(Number(obj.sector))) this.sector = clamp(Number(obj.sector) || 0, 0, 3);
      if (obj.taxes && typeof obj.taxes === "object") {
        const tax = obj.taxes as Record<string, unknown>;
        this.setTax({
          r: finite(tax.r, 9, 1, 25),
          c: finite(tax.c, 10, 1, 25),
          i: finite(tax.i, 8, 1, 25),
          o: finite(tax.o, 10, 1, 25),
          tariff: finite(tax.tariff, 4, 0, 20),
        });
      }
      this.history = Array.isArray(obj.history)
        ? obj.history
            .filter((h): h is Hist => !!h && typeof h === "object")
            .slice(-36)
            .map((h) => ({
              month: finite(h.month, 0, 0, 5000),
              gdp: finite(h.gdp, 0, 0, 1e12),
              income: finite(h.income, 0, -1e12, 1e12),
              pop: finite(h.pop, 0, 0, 1e9),
            }))
        : [];
      if (obj.camera && typeof obj.camera === "object") {
        const c = obj.camera as Record<string, unknown>;
        this.camera = {
          yaw: finite(c.yaw, 0.62),
          pitch: finite(c.pitch, 0.78, 0.35, 1.3),
          distance: finite(c.distance, 118, 22, 280),
          x: finite(c.x, this.camera.x, -400, 400),
          z: finite(c.z, this.camera.z, -400, 400),
        };
      }
      this.pathStamp = "";
      this.undoStack = [];
      this.redoStack = [];
      this.recompute(false);
      this.snap.history = this.history;
      this.revision = keptRevision;
      this.dirtyVisual = true;
      return null;
    }
    return "Unrecognized city file";
  }

  private loadLegacy(obj: Record<string, unknown>): string | null {
    const grid = obj.grid as { type?: string; level?: number }[][];
    if (!grid.length || !Array.isArray(grid[0])) return "Unrecognized city file";
    this.blank();
    for (let z = 0; z < Math.min(H, grid.length); z++) {
      for (let x = 0; x < Math.min(W, grid[z].length); x++) {
        const cell = grid[z][x];
        if (!cell || typeof cell !== "object") continue;
        const t = this.tile(x, z);
        const type = String(cell.type || "grass");
        const level = clamp(Number(cell.level) || 1, 1, 5);
        const onRiver = x >= WATER_X;
        if (type === "water") {
          t.ground = 1;
          continue;
        }
        if (onRiver && type !== "road" && type !== "bus" && type !== "port" && type !== "marina" && type !== "ferry") continue;
        if (!onRiver) t.ground = 0;
        if (type === "road" || type === "bus") {
          t.road = true;
          if (onRiver) t.ground = 1;
        }
        if (type === "bus") t.plop = "bus";
        if (type === "rail" || type === "station") t.track = "rail";
        if (type === "station") t.plop = "station";
        if (type === "metro" || type === "metrostation") t.track = "metro";
        if (type === "metrostation") t.plop = "metrostation";
        if (type === "rrts" || type === "rrtsstation") t.track = "rrts";
        if (type === "rrtsstation") t.plop = "rrtsstation";
        if (type === "runway") t.track = "runway";
        if (type === "res") {
          t.zone = "r";
          t.level = level;
        }
        if (type === "com") {
          t.zone = "c";
          t.level = level;
        }
        if (type === "ind") {
          t.zone = "i";
          t.level = level;
        }
        if (type === "office") {
          t.zone = "o";
          t.level = level;
        }
        const plopMap: Record<string, Plop> = {
          factory: "factory",
          park: "park",
          tree: "trees",
          power: "power",
          waterplant: "water",
          hospital: "hospital",
          school: "school",
          police: "police",
          fire: "fire",
          cargo: "cargo",
          warehouse: "warehouse",
          airport: "airport",
          farm: "farm",
          solar: "solar",
          stadium: "stadium",
          landmark: "landmark",
          port: "port",
          marina: "marina",
          ferry: "ferry",
        };
        if (plopMap[type]) {
          t.plop = plopMap[type];
          if (t.plop === "port" || t.plop === "marina" || t.plop === "ferry") t.ground = 1;
        }
      }
    }
    this.cash = finite(obj.cash, this.cash, -250000, 1e12);
    this.month = finite(obj.month, this.month, 0, 5000);
    if (obj.mode === "sandbox") this.sandbox = true;
    const ops = obj.operationsV4 as { policy?: { incomeTax?: number; businessTax?: number; tariff?: number } } | undefined;
    if (ops?.policy) {
      const policy = ops.policy;
      this.taxes.r = finite(policy.incomeTax, this.taxes.r, 1, 25);
      this.taxes.c = finite(policy.businessTax, this.taxes.c, 1, 25);
      this.taxes.i = finite(policy.businessTax, this.taxes.i, 1, 25);
      this.taxes.tariff = finite(policy.tariff, this.taxes.tariff, 0, 20);
    }
    this.pathStamp = "";
    this.recompute(false);
    this.revision = finite(obj.revision, 0, 0, 1e12);
    this.dirtyVisual = true;
    return null;
  }
}

function cityJson(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const data = JSON.parse(raw) as unknown;
    return !!data && typeof data === "object" && !Array.isArray(data);
  } catch {
    return false;
  }
}

export function commitCitySave(
  storage: { getItem(key: string): string | null; setItem(key: string, value: string): void },
  key: string,
  fallbackKey: string,
  payload: string,
  previous: string,
): { stamp: string; error: string | null } {
  if (payload === previous) return { stamp: previous, error: null };
  try {
    const existing = storage.getItem(key);
    if (cityJson(existing) && existing !== payload) storage.setItem(fallbackKey, existing as string);
    storage.setItem(key, payload);
  } catch {
    return { stamp: previous, error: "Couldn't save on this phone. Export a backup before you leave." };
  }
  return { stamp: payload, error: null };
}

export function restoreCitySave(city: City, storage: { getItem(key: string): string | null }, keys: string[]): string | null {
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      continue;
    }
    if (city.fromJSON(data)) continue;
    const name = data && typeof data === "object" ? (data as { name?: unknown }).name : "";
    return typeof name === "string" && name.trim() ? name.trim().slice(0, 32) : "Riverside";
  }
  return null;
}

function collectCoords(node: unknown, out: [number, number][]) {
  if (!node || out.length > 800) return;
  if (Array.isArray(node) && node.length >= 2 && typeof node[0] === "number" && typeof node[1] === "number") {
    out.push([node[0], node[1]]);
    return;
  }
  if (Array.isArray(node)) for (const child of node) collectCoords(child, out);
}

function makeQuests(s: {
  roads: number;
  bridges: number;
  power: number;
  water: number;
  res: number;
  happy: number;
  pop: number;
  metroStations: number;
  buses: number;
}): Quest[] {
  return [
    { id: "roads", title: "Open a street grid", detail: "Paint at least a dozen road tiles.", done: s.roads >= 12 },
    { id: "homes", title: "Zone a neighbourhood", detail: "Homes grow on tiles that touch a road.", done: s.res >= 6 },
    { id: "power", title: "Keep the lights on", detail: "Power coverage at 95% or better.", done: s.power >= 95 },
    { id: "water", title: "Pressurise the taps", detail: "Water coverage at 95% or better.", done: s.water >= 95 },
    { id: "bridge", title: "Span the river", detail: "Paint the road tool onto the water. Bridges cost more.", done: s.bridges >= 3 },
    {
      id: "transit",
      title: "Give them a ride",
      detail: "Two metro stations, or four bus stops, on connected lines.",
      done: s.metroStations >= 2 || s.buses >= 4,
    },
    { id: "mood", title: "A city people like", detail: "Happiness 78 or higher. Parks and schools move it.", done: s.happy >= 78 },
    { id: "size", title: "Reach City size", detail: "Grow past 4,000 people.", done: s.pop >= 4000 },
  ];
}

function roadsCount(tiles: Tile[]) {
  let n = 0;
  for (const t of tiles) if (t.road) n++;
  return n;
}

function modernSave(v: unknown) {
  return v === 7 || v === 8 || v === 9 || v === 10 || v === 11;
}

function finite(v: unknown, fallback: number, min?: number, max?: number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && max !== undefined) return clamp(n, min, max);
  return n;
}

function roadLegal(city: City, x: number, z: number, nx: number, nz: number) {
  const dx = Math.sign(nx - x);
  const dz = Math.sign(nz - z);
  if (dx === 0 && dz === 0) return false;
  const from = city.tile(x, z).oneWay;
  const to = city.tile(nx, nz).oneWay;
  if (!bearingOk(from, dx, dz)) return false;
  return !bearingAgainst(to, dx, dz);
}

function bearingOk(oneWay: number, dx: number, dz: number) {
  if (oneWay === 1) return dx === 1 && dz === 0;
  if (oneWay === 2) return dx === -1 && dz === 0;
  if (oneWay === 3) return dx === 0 && dz === 1;
  if (oneWay === 4) return dx === 0 && dz === -1;
  return true;
}

function bearingAgainst(oneWay: number, dx: number, dz: number) {
  if (oneWay === 1) return dx < 0;
  if (oneWay === 2) return dx > 0;
  if (oneWay === 3) return dz < 0;
  if (oneWay === 4) return dz > 0;
  return false;
}

const WAY = ["", "east", "west", "south", "north"] as const;

function neighbors(city: City, x: number, z: number, ok: (x: number, z: number) => boolean) {
  const out: Pt[] = [];
  for (const [dx, dz] of DIRS) {
    const nx = x + dx;
    const nz = z + dz;
    if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
    if (ok(nx, nz)) out.push({ x: nx, z: nz });
  }
  return out;
}

function walk(city: City, start: Pt, ok: (x: number, z: number) => boolean, max: number, salt: number, edge?: (x: number, z: number, nx: number, nz: number) => boolean) {
  const path: Pt[] = [{ ...start }];
  let prev = -1;
  let cur = start.z * W + start.x;
  for (let n = 0; n < max; n++) {
    const x = cur % W;
    const z = (cur / W) | 0;
    const nbs = neighbors(city, x, z, ok).filter((p) => p.z * W + p.x !== prev && (!edge || edge(x, z, p.x, p.z)));
    if (!nbs.length) break;
    const straight = nbs.find((p) => {
      if (path.length < 2) return false;
      const a = path[path.length - 2];
      return Math.sign(p.x - x) === Math.sign(x - a.x) && Math.sign(p.z - z) === Math.sign(z - a.z);
    });
    const pick = straight && hash(x, z, salt) > 0.25 ? straight : nbs[Math.floor(hash(x, z, salt + n) * nbs.length) % nbs.length];
    path.push(pick);
    prev = cur;
    cur = pick.z * W + pick.x;
    if (path.length > 4 && pick.x === start.x && pick.z === start.z) break;
  }
  return path;
}

function isTrack(v: unknown): v is Track {
  return v === "none" || v === "rail" || v === "metro" || v === "rrts" || v === "runway";
}
function isZone(v: unknown): v is Zone {
  return v === "none" || v === "r" || v === "c" || v === "i" || v === "o";
}
function isPlop(v: unknown): v is Plop {
  return typeof v === "string" && v in PLOP || v === "none";
}
