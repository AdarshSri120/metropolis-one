import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createServer } from "vite";

const root = "/workspace";

let vite;
let City;
let W;

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
  assert.equal(again.version, 10);
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
  const sold = selling.snap.budget.trade;
  const exported = selling.snap.exports;
  selling.setTax({ tariff: 20 });
  assert.equal(selling.snap.exports, exported);
  assert.equal(selling.snap.imports, 0);
  assert.equal(selling.snap.budget.trade, sold);
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
  assert.match(app, /const payload = JSON\.stringify\(\{ \.\.\.city\.toJSON\(\), name: nameRef\.current \}\)/);
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
