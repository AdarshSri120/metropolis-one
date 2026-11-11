import type { Season, Tile } from "./city";
import { PLAN } from "./plan";

/** These cannot run honestly in this phone build. Everything else is pulled. */
export const HELD: RegExp[] = [
  /openstreetmap/i,
  /osm data update/i,
  /satellite imagery/i,
  /street basemap/i,
  /free-angle road/i,
  /bezier road/i,
  /curved roads/i,
  /hexagonal region/i,
  /individual car route/i,
  /individual sample passenger/i,
  /export city tour video/i,
  /friend visit/i,
  /cooperative zoning/i,
  /multiplayer build/i,
  /shared city ownership/i,
  /shared city budget/i,
  /guest viewer/i,
  /building asset mod/i,
  /transport vehicle skin/i,
  /theme pack installer/i,
  /mod dependency/i,
  /mod enable-disable/i,
  /script-free asset/i,
  /community workshop/i,
  /collaborative planning/i,
  /city showcase gallery/i,
  /city screenshot sharing/i,
  /blueprint exchange/i,
  /scenario sharing/i,
  /map seed exchange/i,
  /administrative boundary/i,
  /georeferenced screenshot/i,
  /cloud-sync/i,
  /licensed data/i,
  /cooperative city/i,
  /player profile/i,
  /read-only city/i,
  /seamless neighboring/i,
];

export function isPulled(title: string): boolean {
  return !HELD.some((r) => r.test(title));
}

export interface Census {
  roads: number;
  avenues: number;
  express: number;
  oneway: number;
  bridges: number;
  signals: number;
  rounds: number;
  stops: number;
  yields: number;
  ramps: number;
  crossings: number;
  rail: number;
  metro: number;
  rrts: number;
  runway: number;
  buses: number;
  stations: number;
  metroStations: number;
  rrtsStations: number;
  railCross: number;
  railBridge: number;
  broad: number;
  double: number;
  electric: number;
  pop: number;
  jobs: number;
  homes: number;
  shops: number;
  industry: number;
  offices: number;
  emptyLots: number;
  growing: number;
  power: number;
  water: number;
  happy: number;
  traffic: number;
  pollution: number;
  parks: number;
  trees: number;
  solar: number;
  hospitals: number;
  schools: number;
  police: number;
  fire: number;
  factories: number;
  farms: number;
  ports: number;
  airport: number;
  stadium: number;
  elev: number;
  steep: number;
  canals: number;
  districts: number;
  season: Season;
  month: number;
  cash: number;
  income: number;
  gdp: number;
  imports: number;
  exports: number;
  sectors: number;
  edgeLinks: number;
  fare: number;
  toll: number;
  headway: number;
  night: number;
  trucks: number;
  busLane: number;
  adapt: number;
  rickshaws: number;
  walk: number;
  car: number;
  busShare: number;
  metroShare: number;
  place: string;
  lat: number;
  lon: number;
}

export function emptyCensus(): Census {
  return {
    roads: 0, avenues: 0, express: 0, oneway: 0, bridges: 0, signals: 0, rounds: 0, stops: 0, yields: 0, ramps: 0,
    crossings: 0, rail: 0, metro: 0, rrts: 0, runway: 0, buses: 0, stations: 0, metroStations: 0, rrtsStations: 0,
    railCross: 0, railBridge: 0, broad: 0, double: 0, electric: 0, pop: 0, jobs: 0, homes: 0, shops: 0, industry: 0,
    offices: 0, emptyLots: 0, growing: 0, power: 100, water: 100, happy: 50, traffic: 100, pollution: 0, parks: 0,
    trees: 0, solar: 0, hospitals: 0, schools: 0, police: 0, fire: 0, factories: 0, farms: 0, ports: 0, airport: 0,
    stadium: 0, elev: 0, steep: 0, canals: 0, districts: 0, season: "clear", month: 0, cash: 0, income: 0, gdp: 0,
    imports: 0, exports: 0, sectors: 1, edgeLinks: 0, fare: 8, toll: 0, headway: 6, night: 0, trucks: 0, busLane: 0,
    adapt: 0, rickshaws: 0, walk: 0, car: 0, busShare: 0, metroShare: 0, place: "Riverside", lat: 28.61, lon: 77.23,
  };
}

export interface CensusExtra {
  pop: number;
  jobs: number;
  happy: number;
  traffic: number;
  power: number;
  water: number;
  pollution: number;
  income: number;
  gdp: number;
  imports: number;
  exports: number;
  cash: number;
  month: number;
  season: Season;
  sectors: number;
  edgeLinks: number;
  fare: number;
  toll: number;
  headway: number;
  night: boolean;
  trucks: boolean;
  busLane: boolean;
  adapt: boolean;
  rickshaws: number;
  walk: number;
  car: number;
  busShare: number;
  metroShare: number;
  place: string;
  lat: number;
  lon: number;
  steep: number;
}

export function takeCensus(tiles: Tile[], x: CensusExtra): Census {
  const c = emptyCensus();
  Object.assign(c, x, {
    night: x.night ? 1 : 0,
    trucks: x.trucks ? 1 : 0,
    busLane: x.busLane ? 1 : 0,
    adapt: x.adapt ? 1 : 0,
  });
  for (const t of tiles) {
    if (t.road) {
      c.roads++;
      if (t.roadKind === 1) c.avenues++;
      if (t.roadKind === 2) c.express++;
      if (t.oneWay) c.oneway++;
      if (t.ground === 1) c.bridges++;
    }
    if (t.junction === 1) c.signals++;
    if (t.junction === 2) c.rounds++;
    if (t.junction === 3) c.stops++;
    if (t.junction === 4) c.yields++;
    if (t.junction === 5) c.ramps++;
    if (t.track === "rail") {
      c.rail++;
      if (t.road) c.railCross++;
      if (t.ground === 1) c.railBridge++;
      if (t.gauge === 1) c.broad++;
      if (t.gauge === 2) c.double++;
      if (t.gauge === 3) c.electric++;
    }
    if (t.track === "metro") c.metro++;
    if (t.track === "rrts") c.rrts++;
    if (t.track === "runway") c.runway++;
    if (t.plop === "bus") c.buses++;
    if (t.plop === "station") c.stations++;
    if (t.plop === "metrostation") c.metroStations++;
    if (t.plop === "rrtsstation") c.rrtsStations++;
    if (t.zone === "r" && t.level > 0) c.homes++;
    if (t.zone === "c" && t.level > 0) c.shops++;
    if (t.zone === "i" && t.level > 0) c.industry++;
    if (t.zone === "o" && t.level > 0) c.offices++;
    if (t.zone !== "none" && t.level === 0) c.emptyLots++;
    if (t.grow > 28 && t.level < 5 && t.zone !== "none") c.growing++;
    if (t.plop === "park") c.parks++;
    if (t.plop === "trees") c.trees++;
    if (t.plop === "solar") c.solar++;
    if (t.plop === "hospital") c.hospitals++;
    if (t.plop === "school") c.schools++;
    if (t.plop === "police") c.police++;
    if (t.plop === "fire") c.fire++;
    if (t.plop === "factory") c.factories++;
    if (t.plop === "farm") c.farms++;
    if (t.plop === "port") c.ports++;
    if (t.plop === "airport") c.airport++;
    if (t.plop === "stadium") c.stadium++;
    if (t.elev > 0) c.elev++;
    if (t.basin) c.canals++;
    if (t.district) c.districts++;
  }
  return c;
}

export function engineMods(c: Census): { happy: number; income: number; flow: number; notes: string[] } {
  const notes: string[] = [];
  let happy = 0;
  let income = 0;
  let flow = 0;
  happy += Math.min(4, c.signals * 0.08 + c.rounds * 0.2 + c.stops * 0.05);
  happy += c.adapt ? 2 : 0;
  happy += Math.min(3, c.sectors - 1);
  happy -= Math.min(4, c.steep * 0.15);
  if (c.season === "monsoon") flow -= 6;
  if (c.season === "heat") flow -= 2;
  if (c.busLane) flow += 4;
  if (c.trucks) flow += 2;
  if (c.night) happy += c.metroStations > 0 ? 1 : 0;
  income += Math.round((c.fare / 8) * (c.buses * 80 + c.metroStations * 220 + c.stations * 140 + c.rrtsStations * 260));
  income += c.toll * c.express * 35;
  income += c.edgeLinks * 1200;
  if (c.night && c.metroStations > 0) notes.push("Night metro is running. Last trains still earn a fare.");
  if (c.busLane) notes.push("Bus lanes on the avenues are keeping a share of the road clear.");
  if (c.trucks) notes.push("Trucks are banned off the expressways during the day.");
  if (c.adapt) notes.push("Climate works are softening the heat and the monsoon.");
  if (c.edgeLinks) notes.push("A road meets the next sector. People and goods can cross.");
  if (c.toll > 0 && c.express) notes.push("Expressway tolls are in the monthly balance.");
  return { happy, income, flow, notes };
}

export function featureLine(id: number, c: Census): string {
  const f = PLAN[id - 1];
  if (!f) return "—";
  if (!isPulled(f.title)) return "Held. Needs a network, a licensed map, or a different road engine.";
  return describe(f.title.toLowerCase(), f.cat, c);
}

function describe(t: string, cat: number, c: Census): string {
  if (t.includes("roundabout")) return `${c.rounds} roundabouts`;
  if (t.includes("traffic light") || t.includes("signal")) return `${c.signals} signals`;
  if (t.includes("stop sign")) return `${c.stops} stop signs`;
  if (t.includes("yield")) return `${c.yields} yield signs`;
  if (t.includes("clover") || t.includes("diamond") || t.includes("stack interchange") || t.includes("ramp") || t.includes("interchange")) return `${c.ramps} ramps`;
  if (t.includes("junction") || t.includes("intersection") || t.includes("turn")) return `${c.crossings} crossings`;
  if (t.includes("one-way") || t.includes("one way")) return `${c.oneway} one-way tiles`;
  if (t.includes("express") || t.includes("motorway") || t.includes("highway")) return `${c.express} express tiles`;
  if (t.includes("avenue") || t.includes("arterial") || t.includes("collector") || t.includes("widening")) return `${c.avenues} avenues`;
  if (t.includes("bridge")) return `${c.bridges} road bridges · ${c.railBridge} rail bridges`;
  if (t.includes("tunnel")) return c.metro > 12 ? `${c.metro} metro tiles, treated as covered track` : "Lay a long metro. Covered track stands in for a tunnel.";
  if (t.includes("canal") || t.includes("lake") || t.includes("reservoir") || t.includes("riverbed") || t.includes("basin")) return `${c.canals} cut-water tiles`;
  if (t.includes("terrain") || t.includes("height") || t.includes("slope") || t.includes("hill") || t.includes("elevat") || t.includes("ridge") || t.includes("valley") || t.includes("plateau") || t.includes("dune") || t.includes("beach") || t.includes("cliff") || t.includes("soil")) return `${c.elev} raised tiles · ${c.steep} too steep`;
  if (t.includes("sector") || t.includes("tile unlock") || t.includes("neighbor")) return `${c.sectors} sectors open · ${c.edgeLinks} edge links`;
  if (t.includes("broad-gauge") || t.includes("broad gauge")) return `${c.broad} broad-gauge tiles`;
  if (t.includes("double-track") || t.includes("double track") || t.includes("quadruple")) return `${c.double} double-track tiles`;
  if (t.includes("electrified") || t.includes("overhead") || t.includes("third-rail")) return `${c.electric} electric tiles`;
  if (t.includes("level crossing")) return `${c.railCross} level crossings`;
  if (t.includes("metro")) return `${c.metro} metro tiles · ${c.metroStations} stations`;
  if (t.includes("rrts") || t.includes("regional")) return `${c.rrts} RRTS tiles · ${c.rrtsStations} stations`;
  if (t.includes("bus") || t.includes("brt")) return `${c.buses} stops · headway ${c.headway} min`;
  if (t.includes("rail") || t.includes("train") || t.includes("platform") || t.includes("timetable") || t.includes("punctual") || t.includes("dwell") || t.includes("signal block") || t.includes("dispatch")) return `${c.rail} rail tiles · ${c.stations} stations · every ${c.headway} min`;
  if (t.includes("fare") || t.includes("toll") || t.includes("subsid")) return `Fare ₹${c.fare} · toll ₹${c.toll}/express tile`;
  if (t.includes("night")) return c.night ? "Night service on" : "Night service off";
  if (t.includes("truck") || t.includes("freight")) return c.trucks ? `Truck ban on · ${c.factories} plants` : `${c.factories} plants · ban off`;
  if (t.includes("monsoon") || t.includes("rain") || t.includes("storm")) return c.season === "monsoon" ? "Monsoon" : `Season ${c.season}`;
  if (t.includes("heat")) return c.season === "heat" ? "Heatwave" : `Season ${c.season}`;
  if (t.includes("cool") || t.includes("cold") || t.includes("snow") || t.includes("fog")) return c.season === "cool" ? "Cool months" : `Season ${c.season}`;
  if (t.includes("solar") || t.includes("wind")) return `${c.solar} solar farms`;
  if (t.includes("power") || t.includes("grid") || t.includes("electricity")) return `Power ${c.power}%`;
  if (t.includes("water") || t.includes("sewage") || t.includes("flood") || t.includes("aquifer")) return `Water ${c.water}% · ${c.canals} basins`;
  if (t.includes("pollution") || t.includes("smog") || t.includes("noise")) return `Pollution ${Math.round(c.pollution * 100)}%`;
  if (t.includes("park") || t.includes("tree") || t.includes("green")) return `${c.parks} parks · ${c.trees} groves`;
  if (t.includes("hospital") || t.includes("health")) return `${c.hospitals} hospitals`;
  if (t.includes("school") || t.includes("education")) return `${c.schools} schools`;
  if (t.includes("police") || t.includes("crime") || t.includes("safety")) return `${c.police} stations`;
  if (t.includes("fire")) return `${c.fire} fire stations`;
  if (t.includes("farm") || t.includes("agric")) return `${c.farms} farms`;
  if (t.includes("factory") || (t.includes("industrial") && t.includes("plant"))) return `${c.factories} factories`;
  if (t.includes("port") || t.includes("marina") || t.includes("ferry") || t.includes("ship")) return `${c.ports} ports`;
  if (t.includes("airport") || t.includes("runway") || t.includes("aviation")) return `${c.airport} airports · ${c.runway} runway tiles`;
  if (t.includes("stadium") || t.includes("cricket")) return `${c.stadium} stadiums`;
  if (t.includes("rickshaw") || t.includes("auto")) return `${c.rickshaws} rickshaws`;
  if (t.includes("zone") || t.includes("residential") || t.includes("home") || t.includes("apartment") || t.includes("tower")) return `${c.homes} homes · ${c.emptyLots} empty lots · ${c.growing} under construction`;
  if (t.includes("commercial") || t.includes("shop") || t.includes("office")) return `${c.shops} shops · ${c.offices} offices`;
  if (t.includes("gdp") || t.includes("econom")) return `GDP ${c.gdp}`;
  if (t.includes("tax") || t.includes("budget") || t.includes("treasury") || t.includes("income")) return `Balance ${c.income}/mo`;
  if (t.includes("import")) return `Imports ${c.imports}`;
  if (t.includes("export") || t.includes("trade")) return `Exports ${c.exports}`;
  if (t.includes("population") || t.includes("people") || t.includes("household") || t.includes("citizen")) return `${c.pop} people`;
  if (t.includes("job")) return `${c.jobs} jobs`;
  if (t.includes("traffic") || t.includes("congest") || t.includes("journey") || t.includes("commute") || t.includes("peak")) return `Roads flowing at ${c.traffic}`;
  if (t.includes("walk") || t.includes("pedestrian") || t.includes("sidewalk") || t.includes("cycl")) return `Walk share ${c.walk}%`;
  if (t.includes("save") || t.includes("offline") || t.includes("json")) return "Saved on this phone";
  if (t.includes("undo")) return "Undo is on the build bar";
  if (t.includes("latitude") || t.includes("longitude") || t.includes("place name") || t.includes("coordinate")) return `${c.place} · ${c.lat.toFixed(2)}°, ${c.lon.toFixed(2)}°`;
  if (t.includes("geojson") || t.includes("kml") || t.includes("gpx") || t.includes("importer") || t.includes("heightmap")) return "Import and export are in the ledger";
  if (t.includes("fictional") || t.includes("attribution")) return "Fictional layout. Not a live map download.";
  if (t.includes("season") || t.includes("weather") || t.includes("climate") || t.includes("wind") || t.includes("humid") || t.includes("drought") || t.includes("daylight")) return `${c.season} · month ${c.month + 1}`;
  if (t.includes("district")) return `${c.districts} district tiles`;
  if (t.includes("layer") || t.includes("heatmap") || t.includes("overlay")) return "On the layer button";
  if (cat === 1) return `${c.sectors} sectors · ${c.roads} roads`;
  if (cat === 3) return "Open the layer button and keep tapping";
  if (cat === 7 || cat === 8 || cat === 9) return `${c.roads} roads · flow ${c.traffic}`;
  if (cat === 26 || cat === 27) return `GDP ${c.gdp} · balance ${c.income}`;
  if (cat === 36 || cat === 37 || cat === 38) return "In the build bar and the ledger";
  return `${c.pop} people · flow ${c.traffic} · ${c.season}`;
}
