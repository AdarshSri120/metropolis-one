import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createServer } from "vite";

const root = "/workspace";

let vite;
let City;
let W;
let H;
let commitCitySave;
let restoreCitySave;
let BUILDINGS;
let structureParts;

test.before(async () => {
  vite = await createServer({
    configFile: `${root}/vite.config.ts`,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  const mod = await vite.ssrLoadModule("/src/game/city.ts");
  City = mod.City;
  W = mod.W;
  H = mod.H;
  commitCitySave = mod.commitCitySave;
  restoreCitySave = mod.restoreCitySave;
  const buildings = await vite.ssrLoadModule("/src/game/buildings.ts");
  BUILDINGS = buildings.BUILDINGS;
  structureParts = buildings.structureParts;
});

test.after(async () => {
  await vite?.close();
});

function steps(path) {
  const out = [];
  for (let i = 1; i < path.length; i++) {
    out.push({ dx: path[i].x - path[i - 1].x, dz: path[i].z - path[i - 1].z });
  }
  return out;
}

function paintLine(city, axis, at, from, to) {
  city.brush = "street";
  city.sandbox = true;
  city.beginStroke();
  for (let n = from; n <= to; n++) {
    const x = axis === "x" ? n : at;
    const z = axis === "z" ? n : at;
    const err = city.place(x, z, "road");
    assert.equal(err, null, `road ${x},${z} ${err}`);
  }
  city.endStroke();
}

function paintWay(city, axis, at, from, to, taps) {
  city.brush = "oneway";
  city.sandbox = true;
  for (let tap = 0; tap < taps; tap++) {
    city.beginStroke();
    for (let n = from; n <= to; n++) {
      const x = axis === "x" ? n : at;
      const z = axis === "z" ? n : at;
      const err = city.place(x, z, "road");
      assert.equal(err, null, `one-way ${x},${z} ${err}`);
    }
    city.endStroke();
  }
}

test("a saved zero fare and a zero import duty come back as zero", () => {
  const city = new City();
  city.blank();
  const file = city.toJSON();
  file.laws.fare = 0;
  file.laws.toll = 0;
  file.laws.headway = 2;
  file.laws.night = true;
  file.taxes.tariff = 0;
  file.taxes.r = 1;
  file.sector = 2;
  file.tiles[8 * W + 5][9] = 3;
  file.tiles[8 * W + 6][8] = 1;
  file.tiles[8 * W + 7][8] = 4;
  assert.equal(city.fromJSON(file), null);
  assert.equal(city.laws.fare, 0);
  assert.equal(city.laws.toll, 0);
  assert.equal(city.laws.headway, 2);
  assert.equal(city.laws.night, true);
  assert.equal(city.taxes.tariff, 0);
  assert.equal(city.taxes.r, 1);
  assert.equal(city.sector, 2);
  assert.equal(city.tile(5, 8).district, 3);
  assert.equal(city.tile(6, 8).oneWay, 1);
  assert.equal(city.tile(7, 8).oneWay, 4);
  const again = city.toJSON();
  assert.equal(again.laws.fare, 0);
  assert.equal(again.taxes.tariff, 0);
  assert.equal(again.version, 11);
  assert.equal(city.fromJSON(again), null);
  assert.equal(city.laws.fare, 0);
  assert.equal(city.taxes.tariff, 0);
  assert.equal(city.tile(7, 8).oneWay, 4);
});

test("an older north-south one-way stays southbound, not westbound", () => {
  const city = new City();
  city.blank();
  const file = city.toJSON();
  file.version = 9;
  file.tiles[4 * W + 3][1] = 1;
  file.tiles[4 * W + 3][8] = 2;
  assert.equal(city.fromJSON(file), null);
  assert.equal(city.tile(3, 4).oneWay, 3);
  const current = city.toJSON();
  current.tiles[4 * W + 3][8] = 2;
  assert.equal(city.fromJSON(current), null);
  assert.equal(city.tile(3, 4).oneWay, 2);
});

test("broken numbers in a save stay finite", () => {
  const city = new City();
  city.blank();
  const file = city.toJSON();
  file.cash = Number.NaN;
  file.month = Number.POSITIVE_INFINITY;
  file.camera = { yaw: Number.NaN, pitch: Number.NaN, distance: Number.NaN, x: Number.NaN, z: Number.NaN };
  file.laws.fare = Number.NaN;
  file.taxes.tariff = Number.NaN;
  assert.equal(city.fromJSON(file), null);
  assert.equal(city.cash, 850000);
  assert.equal(city.month, 0);
  assert.ok(Number.isFinite(city.camera.x));
  assert.ok(Number.isFinite(city.camera.distance));
  assert.equal(city.laws.fare, 8);
  assert.equal(city.taxes.tariff, 4);
});

test("one-way roads reject the reverse direction", () => {
  const east = new City();
  east.blank();
  paintLine(east, "x", 8, 4, 18);
  paintWay(east, "x", 8, 4, 18, 1);
  assert.equal(east.tile(4, 8).oneWay, 1);
  assert.equal(east.inspectInfo(10, 8).title.includes("east only"), true);
  assert.ok(east.carPaths.length > 0);
  for (const path of east.carPaths) {
    for (const step of steps(path)) {
      assert.equal(step.dx, 1, "eastbound traffic stepped backward");
      assert.equal(step.dz, 0);
    }
  }

  const west = new City();
  west.blank();
  paintLine(west, "x", 8, 4, 18);
  paintWay(west, "x", 8, 4, 18, 2);
  assert.equal(west.tile(4, 8).oneWay, 2);
  assert.ok(west.carPaths.length > 0);
  for (const path of west.carPaths) {
    for (const step of steps(path)) {
      assert.equal(step.dx, -1, "westbound traffic stepped east");
      assert.equal(step.dz, 0);
    }
  }

  const south = new City();
  south.blank();
  paintLine(south, "z", 10, 4, 18);
  paintWay(south, "z", 10, 4, 18, 3);
  assert.equal(south.tile(10, 4).oneWay, 3);
  assert.ok(south.carPaths.length > 0);
  for (const path of south.carPaths) {
    for (const step of steps(path)) {
      assert.equal(step.dx, 0);
      assert.equal(step.dz, 1, "southbound traffic stepped north");
    }
  }

  const north = new City();
  north.blank();
  paintLine(north, "z", 10, 4, 18);
  paintWay(north, "z", 10, 4, 18, 4);
  assert.equal(north.tile(10, 4).oneWay, 4);
  assert.ok(north.carPaths.length > 0);
  for (const path of north.carPaths) {
    for (const step of steps(path)) {
      assert.equal(step.dx, 0);
      assert.equal(step.dz, -1, "northbound traffic stepped south");
    }
  }
});

test("the duty is charged on imports and leaves export sales alone", () => {
  const buying = new City();
  buying.blank();
  buying.sandbox = true;
  buying.beginStroke();
  for (let x = 4; x <= 10; x++) buying.place(x, 8, "road");
  buying.place(4, 7, "c");
  buying.endStroke();
  buying.tile(4, 7).level = 3;
  buying.recompute(false);
  assert.equal(buying.snap.exports, 0);
  assert.equal(buying.snap.budget.exportSales, 0);
  assert.ok(buying.snap.imports > 0);
  buying.setTax({ tariff: 0 });
  const trade0 = buying.snap.budget.trade;
  const income0 = buying.snap.income;
  assert.equal(trade0, 0);
  buying.setTax({ tariff: 20 });
  const duty = buying.snap.imports * 0.2 * 6;
  assert.equal(buying.snap.exports, 0);
  assert.ok(buying.snap.budget.trade > 0);
  assert.ok(Math.abs(buying.snap.budget.trade - duty) <= 2);
  assert.ok(buying.snap.income > income0);

  const selling = new City();
  selling.blank();
  selling.sandbox = true;
  selling.beginStroke();
  for (let x = 30; x <= 36; x++) selling.place(x, 8, "road");
  selling.place(35, 7, "i");
  selling.place(37, 8, "port");
  selling.endStroke();
  selling.tile(35, 7).level = 3;
  selling.recompute(false);
  assert.ok(selling.snap.exports > 0, "a port should ship the surplus");
  assert.equal(selling.snap.imports, 0);
  selling.setTax({ tariff: 0 });
  assert.equal(selling.snap.budget.trade, 0);
  const sales = selling.snap.budget.exportSales;
  assert.equal(sales, Math.round(selling.snap.exports * 1.8));
  assert.ok(sales > 0);
  const incomeAt0 = selling.snap.income;
  const exported = selling.snap.exports;
  selling.setTax({ tariff: 20 });
  assert.equal(selling.snap.exports, exported);
  assert.equal(selling.snap.imports, 0);
  assert.equal(selling.snap.budget.trade, 0);
  assert.equal(selling.snap.budget.exportSales, sales);
  assert.equal(selling.snap.income, incomeAt0);
});

test("an empty map still has no phantom output, and a lone plant does not cover the city", () => {
  const city = new City();
  city.blank();
  assert.equal(city.snap.gdp, 0);
  assert.equal(city.snap.power, 0);
  assert.equal(city.snap.water, 0);
  city.sandbox = true;
  assert.equal(city.place(5, 5, "power"), null);
  city.recompute(false);
  assert.equal(city.snap.power, 0);
  assert.equal(city.place(8, 8, "water"), null);
  city.recompute(false);
  assert.equal(city.snap.water, 0);
});

test("the sample city still spans the river", () => {
  const city = new City();
  city.showcase();
  const bridges = city.tiles.filter((t) => t.road && t.ground === 1).length;
  assert.equal(bridges, 5);
  assert.ok(city.snap.pop > 2000);
  assert.ok(city.snap.power >= 90);
  assert.ok(city.snap.water >= 90);
  assert.equal(city.snap.gdp > 0, true);
});

test("autosave watches the whole city file, not just cash and month", () => {
  const app = readFileSync(`${root}/src/components/city-app.tsx`, "utf8");
  assert.match(app, /commitCitySave\(localStorage, SAVE_KEY, SAVE_FALLBACK, payload, saveStampRef\.current\)/);
  assert.equal(app.includes("saveStamp = payload"), false);
  assert.equal(app.includes("${city.cash}|${city.month}|"), false);
  assert.match(app, /canvas\.removeEventListener\("wheel", onWheel\)/);
  assert.match(app, /canvas\.removeEventListener\("contextmenu", onMenu\)/);

  const city = new City();
  city.blank();
  city.tile(3, 2).road = true;
  const occupied = () => city.tiles.filter((t) => t.road || t.zone !== "none" || t.plop !== "none").length;
  const oldStamp = `${city.cash}|${city.month}|${occupied()}`;
  const before = JSON.stringify({ ...city.toJSON(), name: "Riverside" });
  city.taxes.tariff = 0;
  city.laws.fare = 0;
  city.tile(2, 2).district = 2;
  city.tile(3, 2).oneWay = 2;
  const still = `${city.cash}|${city.month}|${occupied()}`;
  const after = JSON.stringify({ ...city.toJSON(), name: "Riverside" });
  assert.equal(oldStamp, still);
  assert.notEqual(before, after);
});

test("the treasury shown after a month includes that month's balance", () => {
  const city = new City();
  city.showcase();
  const before = city.cash;
  city.monthTick();
  assert.notEqual(city.snap.income, 0);
  assert.equal(city.snap.cash, Math.round(city.cash));
  assert.equal(city.cash, before + city.snap.income);
  assert.equal(city.snap.month, 11);
});

test("a damaged city file does not replace the city you are playing", () => {
  const city = new City();
  city.showcase();
  const pop = city.snap.pop;
  const cash = city.cash;
  const broken = city.fromJSON({ version: 10, tiles: Array(W * H).fill(null), cash: 1 });
  assert.match(broken, /kept/);
  assert.equal(city.snap.pop, pop);
  assert.equal(city.cash, cash);
  const unrecognized = city.fromJSON({ version: 10, tiles: [] });
  assert.equal(unrecognized, "Unrecognized city file");
  assert.equal(city.cash, cash);
  assert.equal(city.fromJSON(null), "That file is not a city");
  assert.equal(city.snap.pop, pop);
});

test("an older grid save keeps a zero tariff, a river road, and finite money", () => {
  const city = new City();
  city.showcase();
  const row = Array.from({ length: 38 }, () => ({ type: "grass" }));
  row[36] = { type: "road" };
  row[37] = { type: "road" };
  const err = city.fromJSON({
    grid: [row, [{ type: "res", level: 2 }, { type: "water" }]],
    cash: 12345,
    month: 3,
    operationsV4: { policy: { incomeTax: 11, businessTax: 7, tariff: 0 } },
  });
  assert.equal(err, null);
  assert.equal(city.cash, 12345);
  assert.equal(city.month, 3);
  assert.equal(city.taxes.tariff, 0);
  assert.equal(city.taxes.r, 11);
  assert.equal(city.tile(36, 0).road, true);
  assert.equal(city.tile(37, 0).road, true);
  assert.equal(city.tile(37, 0).ground, 1);
  assert.equal(city.tile(0, 1).zone, "r");
  assert.equal(city.tile(0, 1).level, 2);
  assert.equal(city.tile(1, 1).ground, 1);

  const poisoned = new City();
  poisoned.showcase();
  const kept = poisoned.snap.pop;
  const bad = poisoned.fromJSON({
    grid: [[{ type: "road" }]],
    cash: Number.NaN,
    month: Number.POSITIVE_INFINITY,
    operationsV4: { policy: { incomeTax: Number.NaN, tariff: Number.NaN } },
  });
  assert.equal(bad, null);
  assert.equal(Number.isFinite(poisoned.cash), true);
  assert.equal(Number.isFinite(poisoned.month), true);
  assert.equal(Number.isFinite(poisoned.taxes.tariff), true);
  assert.equal(Number.isFinite(poisoned.taxes.r), true);
  assert.notEqual(poisoned.snap.pop, kept);
});

test("one-way directions 0 through 4 survive a save and a load", () => {
  const src = readFileSync(`${root}/src/game/city.ts`, "utf8");
  assert.match(src, /export type OneWay = 0 \| 1 \| 2 \| 3 \| 4;/);
  for (const way of [0, 1, 2, 3, 4]) {
    const city = new City();
    city.blank();
    city.tile(0, 0).road = true;
    city.tile(0, 0).oneWay = way;
    const data = city.toJSON();
    assert.equal(data.version, 11);
    assert.equal(data.tiles[0][8], way);
    const next = new City();
    next.showcase();
    assert.equal(next.fromJSON(data), null);
    assert.equal(next.tile(0, 0).road, true);
    assert.equal(next.tile(0, 0).oneWay, way);
    assert.equal(next.toJSON().tiles[0][8], way);
  }
});

function memStore(initial = {}) {
  const box = { ...initial };
  const api = {
    fail: new Set(),
    box,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(box, key) ? box[key] : null;
    },
    setItem(key, value) {
      if (api.fail.has(key)) throw new Error("QuotaExceededError");
      box[key] = value;
    },
  };
  return api;
}

test("a failed save stays dirty so the next try can store it", () => {
  const store = memStore();
  store.fail.add("metropolis-one-v8");
  const first = commitCitySave(store, "metropolis-one-v8", "metropolis-one-v7", "{\"cash\":0}", "");
  assert.equal(first.stamp, "");
  assert.match(first.error, /Export a backup/);
  assert.equal(store.box["metropolis-one-v8"], undefined);

  store.fail.clear();
  const second = commitCitySave(store, "metropolis-one-v8", "metropolis-one-v7", "{\"cash\":0}", first.stamp);
  assert.equal(second.error, null);
  assert.equal(second.stamp, "{\"cash\":0}");
  assert.equal(store.box["metropolis-one-v8"], "{\"cash\":0}");

  const skip = commitCitySave(store, "metropolis-one-v8", "metropolis-one-v7", second.stamp, second.stamp);
  assert.equal(skip.error, null);
  assert.equal(skip.stamp, second.stamp);
  assert.equal(store.box["metropolis-one-v8"], "{\"cash\":0}");
});

test("a new save keeps the previous city, and a bad file is not copied over it", () => {
  const store = memStore({ "metropolis-one-v8": "{\"fare\":0}" });
  store.fail.add("metropolis-one-v8");
  const blocked = commitCitySave(store, "metropolis-one-v8", "metropolis-one-v7", "{\"fare\":1}", "");
  assert.equal(blocked.stamp, "");
  assert.match(blocked.error, /Export a backup/);
  assert.equal(store.box["metropolis-one-v8"], "{\"fare\":0}");
  assert.equal(store.box["metropolis-one-v7"], "{\"fare\":0}");

  store.fail.clear();
  const wrote = commitCitySave(store, "metropolis-one-v8", "metropolis-one-v7", "{\"fare\":1}", blocked.stamp);
  assert.equal(wrote.error, null);
  assert.equal(wrote.stamp, "{\"fare\":1}");
  assert.equal(store.box["metropolis-one-v8"], "{\"fare\":1}");
  assert.equal(store.box["metropolis-one-v7"], "{\"fare\":0}");

  const full = memStore({ "metropolis-one-v8": "{\"fare\":0}", "metropolis-one-v7": "{\"older\":1}" });
  full.fail.add("metropolis-one-v7");
  const held = commitCitySave(full, "metropolis-one-v8", "metropolis-one-v7", "{\"fare\":1}", "");
  assert.equal(held.stamp, "");
  assert.match(held.error, /Export a backup/);
  assert.equal(full.box["metropolis-one-v8"], "{\"fare\":0}");
  assert.equal(full.box["metropolis-one-v7"], "{\"older\":1}");

  const rotten = memStore({
    "metropolis-one-v8": "{broken",
    "metropolis-one-v7": "{\"fare\":0}",
  });
  const replaced = commitCitySave(rotten, "metropolis-one-v8", "metropolis-one-v7", "{\"fare\":1}", "");
  assert.equal(replaced.error, null);
  assert.equal(rotten.box["metropolis-one-v8"], "{\"fare\":1}");
  assert.equal(rotten.box["metropolis-one-v7"], "{\"fare\":0}");
});

test("a corrupt newest save falls back to the previous city", () => {
  const kept = new City();
  kept.blank();
  kept.laws.fare = 0;
  kept.taxes.tariff = 0;
  kept.recompute(false);
  const file = JSON.stringify({ ...kept.toJSON(), name: "  Kept  " });
  const store = memStore({
    "metropolis-one-v8": "{broken",
    "metropolis-one-v7": file,
  });
  const city = new City();
  city.showcase();
  const sample = city.snap.pop;
  assert.ok(sample > 2000);
  const name = restoreCitySave(city, store, ["metropolis-one-v8", "metropolis-one-v7"]);
  assert.equal(name, "Kept");
  assert.equal(city.laws.fare, 0);
  assert.equal(city.taxes.tariff, 0);
  assert.notEqual(city.snap.pop, sample);
  assert.ok(city.snap.pop < 100);

  const newer = new City();
  newer.blank();
  newer.laws.fare = 3;
  const older = new City();
  older.blank();
  older.laws.fare = 9;
  const both = memStore({
    a: JSON.stringify({ ...newer.toJSON(), name: "Newer" }),
    b: JSON.stringify({ ...older.toJSON(), name: "Older" }),
  });
  const live = new City();
  live.showcase();
  assert.equal(restoreCitySave(live, both, ["a", "b"]), "Newer");
  assert.equal(live.laws.fare, 3);

  const none = new City();
  none.showcase();
  const pop = none.snap.pop;
  assert.equal(restoreCitySave(none, memStore({ a: "{broken", b: "not json" }), ["a", "b"]), null);
  assert.equal(none.snap.pop, pop);
});

function stroke(city, x, z, tool) {
  city.beginStroke();
  const err = city.place(x, z, tool);
  city.endStroke();
  assert.equal(err, null, `${tool} ${x},${z} ${err}`);
}

function serviceStreet(city) {
  for (let x = 4; x <= 14; x++) stroke(city, x, 8, "road");
  for (let z = 4; z <= 7; z++) stroke(city, 7, z, "road");
  stroke(city, 4, 7, "power");
  stroke(city, 10, 7, "water");
}

test("the catalogue has twenty-four different buildings", () => {
  assert.equal(BUILDINGS.length, 24);
  const ids = new Set(BUILDINGS.map((b) => b.id));
  assert.equal(ids.size, 24);
  const cats = new Set(BUILDINGS.map((b) => b.cat));
  for (const cat of ["r", "c", "i", "o", "civic"]) assert.equal(cats.has(cat), true);
  const sizes = new Set(BUILDINGS.map((b) => `${b.w}x${b.d}`));
  for (const size of ["1x1", "1x2", "2x2", "2x3", "3x3"]) assert.equal(sizes.has(size), true);
  const silhouettes = new Set(
    BUILDINGS.map((def) =>
      structureParts(def, 0, 4, true)
        .map((p) => `${p.k}:${p.sx.toFixed(2)}:${p.sy.toFixed(2)}:${p.sz.toFixed(2)}:${p.y.toFixed(2)}:${p.x.toFixed(2)}:${p.c}`)
        .join("|"),
    ),
  );
  assert.equal(silhouettes.size, 24);
  const society = BUILDINGS.find((b) => b.id === "society");
  const faded = structureParts(society, 1, 4, true)[0].c;
  const other = structureParts(society, 8, 4, true)[0].c;
  assert.notEqual(faded, other);
});

test("a rotated 2x2 society keeps people, seed and treasury after three months", () => {
  const city = new City();
  city.blank();
  serviceStreet(city);

  const before = city.cash;
  city.beginStroke();
  assert.equal(city.placeBuilding(5, 6, "society", 0), null);
  city.endStroke();
  assert.equal(city.cash, before - 28000);
  const seed = city.tile(5, 6).bseed;
  for (const [x, z] of [
    [5, 6],
    [6, 6],
    [5, 7],
    [6, 7],
  ]) {
    const t = city.tile(x, z);
    assert.equal(t.bax, 5);
    assert.equal(t.baz, 6);
    assert.equal(t.brot, 0);
    assert.equal(t.bseed, seed);
    assert.equal(t.bstage, 0);
  }
  assert.equal(city.tile(7, 6).bid, 0);
  const looked = city.inspectInfo(6, 7);
  assert.equal(looked.title, "Housing society");
  assert.equal(looked.subtitle, "Excavation");
  assert.equal(looked.rows.find((row) => row.k === "Facing").v, "south");
  assert.equal(looked.rows.find((row) => row.k === "Visual seed").v, String(seed));
  assert.equal(looked.rows.find((row) => row.k === "Occupants").v, "0");

  const parked = city.cash;
  city.beginStroke();
  const overlap = city.placeBuilding(6, 6, "society", 0);
  city.endStroke();
  assert.match(overlap, /overlap/);
  assert.equal(city.cash, parked);
  assert.equal(city.tile(7, 6).bid, 0);

  city.beginStroke();
  const blocked = city.placeBuilding(1, 1, "shop", 0);
  city.endStroke();
  assert.match(blocked, /road/);
  assert.equal(city.tile(1, 1).bid, 0);

  city.beginStroke();
  assert.equal(city.turnBuilding(6, 7), null);
  city.endStroke();
  assert.equal(city.tile(5, 6).brot, 1);
  assert.equal(city.tile(6, 7).bseed, seed);
  assert.equal(city.inspectInfo(5, 6).rows.find((row) => row.k === "Facing").v, "east");

  assert.equal(city.undo(), true);
  assert.equal(city.tile(5, 6).brot, 0);
  assert.equal(city.redo(), true);
  assert.equal(city.tile(5, 6).brot, 1);
  assert.equal(city.undo(), true);
  const withHouse = city.cash;
  assert.equal(city.undo(), true);
  assert.equal(city.tile(5, 6).bid, 0);
  assert.equal(city.tile(6, 7).bid, 0);
  assert.equal(city.cash, withHouse + 28000);
  assert.equal(city.redo(), true);
  assert.equal(city.tile(5, 6).bseed, seed);
  assert.equal(city.cash, withHouse);
  city.beginStroke();
  assert.equal(city.turnBuilding(5, 6), null);
  city.endStroke();

  for (let month = 0; month < 3; month++) city.monthTick();
  const anchor = city.tile(5, 6);
  assert.equal(anchor.bstage, 3);
  assert.equal(anchor.brot, 1);
  assert.equal(anchor.bseed, seed);
  assert.equal(anchor.powered, true);
  assert.equal(anchor.watered, true);
  assert.equal(Math.round(city.snap.pop), 99);
  assert.equal(city.snap.cash, Math.round(city.cash));
  const people = city.inspectInfo(6, 6).rows.find((row) => row.k === "Occupants").v;
  assert.equal(people, "99");

  const file = city.toJSON();
  assert.equal(file.version, 11);
  const next = new City();
  next.showcase();
  assert.equal(next.fromJSON(file), null);
  const back = next.tile(5, 6);
  assert.equal(back.bax, 5);
  assert.equal(back.baz, 6);
  assert.equal(back.brot, 1);
  assert.equal(back.bseed, seed);
  assert.equal(back.bstage, 3);
  assert.equal(Math.round(next.snap.pop), 99);
  assert.equal(next.cash, city.cash);
  assert.equal(next.snap.cash, city.snap.cash);
  assert.equal(next.snap.budget.exportSales, city.snap.budget.exportSales);
  assert.equal(next.snap.income, city.snap.income);

  const cashBefore = next.cash;
  next.beginStroke();
  assert.equal(next.place(6, 7, "bulldoze"), null);
  next.endStroke();
  for (const [x, z] of [
    [5, 6],
    [6, 6],
    [5, 7],
    [6, 7],
  ]) {
    assert.equal(next.tile(x, z).bid, 0);
  }
  assert.equal(next.cash, cashBefore + Math.round(28000 * 0.3));
  assert.equal(next.undo(), true);
  assert.equal(next.tile(5, 6).bseed, seed);
  assert.equal(next.tile(5, 6).bstage, 3);

  const current = next.toJSON();
  current.tiles[0][1] = 1;
  current.tiles[0][8] = 2;
  assert.equal(next.fromJSON(current), null);
  assert.equal(next.tile(0, 0).oneWay, 2);
  assert.equal(next.tile(5, 6).brot, 1);

  const old = city.toJSON();
  old.version = 10;
  old.tiles = old.tiles.map((row) => row.slice(0, 14));
  old.tiles[2][1] = 1;
  old.tiles[2][8] = 2;
  const host = new City();
  host.blank();
  assert.equal(host.fromJSON(old), null);
  assert.equal(host.tile(2, 0).oneWay, 2);
  assert.equal(host.tile(5, 6).bid, 0);
});

test("affordable housing upgrades, and a dark society is abandoned", () => {
  const city = new City();
  city.blank();
  serviceStreet(city);
  city.beginStroke();
  assert.equal(city.placeBuilding(5, 6, "affordable", 0), null);
  city.endStroke();
  for (const [x, z] of [
    [5, 6],
    [6, 6],
    [5, 7],
    [6, 7],
  ]) {
    city.tile(x, z).bstage = 4;
  }
  city.recompute(false);
  assert.equal(city.tile(5, 6).powered, true);
  assert.equal(city.upgrade(6, 7), null);
  assert.equal(city.inspectInfo(5, 6).title, "Housing society");
  assert.equal(city.tile(6, 6).bstage, 5);
  city.monthTick();
  assert.equal(city.tile(5, 6).bstage, 4);
  assert.ok(city.snap.pop > 200);

  const dark = new City();
  dark.blank();
  for (let x = 4; x <= 14; x++) stroke(dark, x, 8, "road");
  dark.beginStroke();
  assert.equal(dark.placeBuilding(5, 6, "society", 0), null);
  dark.endStroke();
  for (let month = 0; month < 5; month++) dark.monthTick();
  assert.equal(dark.tile(5, 6).bstage, 6);
  assert.equal(Math.round(dark.snap.pop), 0);
  assert.equal(dark.snap.budget.services, 80);
  assert.equal(dark.inspectInfo(5, 7).subtitle, "Abandoned");
});

