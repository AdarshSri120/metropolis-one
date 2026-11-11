import { useEffect, useMemo, useRef, useState } from "react";
import {
  Anchor,
  Building2,
  Bus,
  Car,
  Download,
  Droplets,
  Factory,
  Flame,
  GraduationCap,
  Hand,
  Home,
  Hospital,
  Landmark,
  Layers,
  Map as MapIcon,
  Mountain,
  Moon,
  Pause,
  Plane,
  Play,
  Redo2,
  RotateCcw,
  RotateCw,
  Route,
  Save,
  ScrollText,
  Search,
  Settings,
  Shield,
  Ship,
  Store,
  SunMedium,
  TrainFront,
  TrainTrack,
  Trash2,
  Trees,
  TreePine,
  Undo2,
  Upload,
  Warehouse,
  Wheat,
  Zap,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  CATS,
  City,
  commitCitySave,
  DISTRICTS,
  H,
  PLACES,
  SECTORS,
  TOOL_LIST,
  TOOLS,
  W,
  compact,
  indianCityName,
  restoreCitySave,
  rupee,
  type Brush,
  type CatId,
  type MapLayer,
  type ToolId,
} from "@/game/city";
import { CityScene } from "@/game/scene";
import { FlatCity } from "@/game/flat";
import { PLAN, PLAN_CATS, PLAN_LIVE } from "@/game/plan";
import { featureLine } from "@/game/census";
import type { CityView, Gfx, ViewMode } from "@/game/view";

const SAVE_KEY = "metropolis-one-v8";
const SAVE_FALLBACK = "metropolis-one-v7";

const ICONS: Record<string, LucideIcon> = {
  inspect: Search,
  road: Route,
  land: Mountain,
  bulldoze: Trash2,
  runway: Plane,
  r: Home,
  c: Store,
  i: Factory,
  o: Building2,
  rail: TrainTrack,
  station: TrainFront,
  metro: TrainTrack,
  metrostation: TrainFront,
  rrts: TrainTrack,
  rrtsstation: TrainFront,
  bus: Bus,
  power: Zap,
  solar: SunMedium,
  water: Droplets,
  hospital: Hospital,
  school: GraduationCap,
  police: Shield,
  fire: Flame,
  park: Trees,
  trees: TreePine,
  factory: Factory,
  farm: Wheat,
  warehouse: Warehouse,
  cargo: Warehouse,
  port: Ship,
  marina: Anchor,
  ferry: Ship,
  airport: Plane,
  stadium: Landmark,
  landmark: Landmark,
};

interface Probe {
  ready: boolean;
  enter: () => void;
  snap: () => City["snap"];
  place: (x: number, z: number, tool: ToolId) => string | null;
  setKeys: (codes: string[]) => void;
  getCam: () => { x: number; z: number; yaw: number; pitch: number; distance: number };
}

declare global {
  interface Window {
    __city?: Probe;
  }
}

function line(x0: number, z0: number, x1: number, z1: number, visit: (x: number, z: number) => void) {
  const dx = Math.abs(x1 - x0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let err = dx - dz;
  for (let n = 0; n < 400; n++) {
    visit(x0, z0);
    if (x0 === x1 && z0 === z1) break;
    const e2 = 2 * err;
    if (e2 > -dz) {
      err -= dz;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      z0 += sz;
    }
  }
}

const BRUSHES: { id: Brush; label: string }[] = [
  { id: "street", label: "Street" },
  { id: "avenue", label: "Avenue" },
  { id: "express", label: "Express" },
  { id: "oneway", label: "One-way" },
  { id: "district", label: "District" },
];

const LAYERS: MapLayer[] = ["city", "zone", "traffic", "power", "water", "smog", "density", "value", "flood", "noise", "hill"];
const LAYER_NAME: Record<MapLayer, string> = {
  city: "City",
  zone: "Zones",
  traffic: "Traffic",
  power: "Power",
  water: "Water",
  smog: "Smog",
  density: "Density",
  value: "Value",
  flood: "Flood",
  noise: "Noise",
  hill: "Hills",
};

const SEASON_WORD = { clear: "Clear", heat: "Heat", monsoon: "Monsoon", cool: "Cool" } as const;

function brushPrice(id: Brush) {
  if (id === "street") return "₹80";
  if (id === "avenue") return "₹160";
  if (id === "express") return "₹320";
  if (id === "oneway") return "₹40";
  if (id === "signal" || id === "roundabout" || id === "stop" || id === "yield" || id === "ramp") return "₹60";
  if (id === "raise") return "₹40";
  if (id === "lower") return "₹25";
  if (id === "flat") return "₹20";
  if (id === "canal") return "₹90";
  if (id === "broad" || id === "double" || id === "electric") return "₹320";
  return "Free";
}

const ROAD_BRUSHES: { id: Brush; label: string }[] = [
  ...BRUSHES,
  { id: "signal", label: "Signal" },
  { id: "roundabout", label: "Roundabout" },
  { id: "stop", label: "Stop" },
  { id: "yield", label: "Yield" },
  { id: "ramp", label: "Ramp" },
];
const LAND_BRUSHES: { id: Brush; label: string }[] = [
  { id: "raise", label: "Raise" },
  { id: "lower", label: "Lower" },
  { id: "flat", label: "Flatten" },
  { id: "canal", label: "Canal" },
];
const RAIL_BRUSHES: { id: Brush; label: string }[] = [
  { id: "broad", label: "Broad" },
  { id: "double", label: "Double" },
  { id: "electric", label: "Electric" },
];

function roadCostLine(brush: Brush) {
  if (brush === "oneway") return "One-way. Tap again for east, west, south, then north. Cars cannot reverse. ₹40.";
  if (brush === "district") return "Name a district. Free. Tap District again to change which one.";
  if (brush === "signal" || brush === "roundabout" || brush === "stop" || brush === "yield") return "Paint a junction on a road. ₹60.";
  if (brush === "ramp") return "Ramp on an expressway. ₹60.";
  if (brush === "express") return "Expressway. ₹320 on land, ₹900 as a bridge.";
  if (brush === "avenue") return "Avenue. ₹160 on land, ₹640 as a bridge.";
  if (brush === "raise") return "Raise the ground. ₹40, more as it gets higher.";
  if (brush === "lower") return "Lower raised ground. ₹25.";
  if (brush === "canal") return "Cut a canal. ₹90. Bulldoze buildings first.";
  if (brush === "flat") return "Flatten toward the neighbours. ₹20.";
  if (brush === "double") return "Double track. ₹320 a tile. It can cross the river.";
  if (brush === "electric") return "Electric rail. ₹320 a tile.";
  if (brush === "broad") return "Broad gauge. ₹320 a tile.";
  return "Street. ₹80 on land, ₹420 as a bridge.";
}

function loadSave(city: City) {
  return restoreCitySave(city, localStorage, [SAVE_KEY, SAVE_FALLBACK]);
}

export function CityApp() {
  const cityRef = useRef<City | null>(null);
  if (!cityRef.current) {
    const created = new City();
    created.showcase();
    cityRef.current = created;
  }
  const city = cityRef.current;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<CityView | null>(null);
  const toolRef = useRef<ToolId>("road");
  const handRef = useRef(false);
  const nameRef = useRef("Riverside");
  const enteredRef = useRef(false);
  const saveStampRef = useRef("");
  const saveWarned = useRef(false);

  const [entered, setEntered] = useState(false);
  const [source, setSource] = useState<"save" | "sample">("sample");
  const [name, setName] = useState("Riverside");
  const [tool, setTool] = useState<ToolId>("road");
  const [cat, setCat] = useState<CatId>("plan");
  const [hand, setHand] = useState(false);
  const [menu, setMenu] = useState(false);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [gfx, setGfx] = useState<Gfx>("lite");
  const [mode, setMode] = useState<ViewMode>("3d");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [street, setStreet] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [planQ, setPlanQ] = useState("");
  const [planMode, setPlanMode] = useState<"live" | "all" | "P0">("live");
  const [planCatId, setPlanCatId] = useState(0);
  const [chart, setChart] = useState<"pop" | "gdp" | "income">("pop");
  const streetRef = useRef(false);
  const viewLock = useRef(false);
  const toldLots = useRef(false);
  const miniRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  useEffect(() => {
    handRef.current = hand;
  }, [hand]);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);
  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  useEffect(() => {
    const savedName = loadSave(city);
    if (savedName) {
      setSource("save");
      setName(savedName);
      nameRef.current = savedName;
    }
    const gfxSaved = localStorage.getItem("metropolis-one-gfx");
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (coarse) setHand(true);
    if (gfxSaved === "crisp" || gfxSaved === "lite") setGfx(gfxSaved);
    else if (!coarse) setGfx("crisp");
    const viewSaved = localStorage.getItem("metropolis-one-view");
    if (viewSaved === "map") setMode("map");
  }, [city]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let view: CityView;
    try {
      view = mode === "map" ? new FlatCity(canvas, city) : new CityScene(canvas, city, gfx);
    } catch {
      if (mode !== "map") {
        setMode("map");
        setToast("3D couldn't start here. Map view is on, and every tool still works.");
        return;
      }
      setToast("The city view failed to start. Reload the page.");
      return;
    }
    viewRef.current = view;
    view.setStreet(streetRef.current);
    view.resize();
    const ro = new ResizeObserver(() => view.resize());
    ro.observe(canvas);

    const pointers = new Map<number, { x: number; y: number }>();
    let painting = false;
    let last: { x: number; z: number } | null = null;
    let pinch: { dist: number; ang: number; x: number; y: number } | null = null;
    let camDrag: { x: number; y: number } | null = null;
    let arm: { x: number; y: number; hit: { x: number; z: number } | null; button: number } | null = null;
    let moved = 0;
    let warned = "";

    const paintAt = (x: number, z: number) => {
      const err = city.place(x, z, toolRef.current);
      if (err && err !== warned) {
        warned = err;
        setToast(err);
      }
    };

    const onDown = (e: PointerEvent) => {
      if (!enteredRef.current) return;
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) moved = 0;
      if (pointers.size >= 2) {
        if (painting) {
          city.endStroke();
          painting = false;
          last = null;
        }
        arm = null;
        camDrag = null;
        pinch = measure(pointers);
        return;
      }
      if (e.button === 2 || e.button === 1 || handRef.current) {
        camDrag = { x: e.clientX, y: e.clientY };
        if (e.button === 0) arm = { x: e.clientX, y: e.clientY, hit: view.pick(e.clientX, e.clientY), button: 0 };
        return;
      }
      const hit = view.pick(e.clientX, e.clientY);
      if (toolRef.current === "inspect" && hit) {
        city.place(hit.x, hit.z, "inspect");
        setTick((n) => n + 1);
        return;
      }
      arm = { x: e.clientX, y: e.clientY, hit, button: e.button };
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId) && e.pointerType === "mouse" && e.buttons === 0) {
        const hit = view.pick(e.clientX, e.clientY);
        view.setGhost(hit?.x ?? -1, hit?.z ?? -1, toolRef.current);
        return;
      }
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const now = measure(pointers);
        if (pinch && now) {
          if (pinch.dist > 0) view.zoomBy(pinch.dist / now.dist);
          let dAng = now.ang - pinch.ang;
          if (dAng > Math.PI) dAng -= Math.PI * 2;
          if (dAng < -Math.PI) dAng += Math.PI * 2;
          view.rotateBy(dAng);
          view.panBy(now.x - pinch.x, now.y - pinch.y);
        }
        pinch = now;
        return;
      }
      if (camDrag) {
        const dx = e.clientX - camDrag.x;
        const dy = e.clientY - camDrag.y;
        moved += Math.hypot(dx, dy);
        view.panBy(dx, dy);
        camDrag = { x: e.clientX, y: e.clientY };
        return;
      }
      if (!arm || arm.button !== 0) return;
      if (!painting) {
        if (Math.hypot(e.clientX - arm.x, e.clientY - arm.y) < 8) return;
        if (!arm.hit) return;
        warned = "";
        city.beginStroke();
        painting = true;
        last = arm.hit;
        paintAt(arm.hit.x, arm.hit.z);
        try {
          navigator.vibrate?.(6);
        } catch {
          /* ignore */
        }
      }
      const hit = view.pick(e.clientX, e.clientY);
      if (!hit || !last) return;
      if (hit.x === last.x && hit.z === last.z) return;
      line(last.x, last.z, hit.x, hit.z, paintAt);
      last = hit;
      view.setGhost(hit.x, hit.z, toolRef.current);
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      const tap = arm;
      const travel = moved;
      const didPaint = painting;
      camDrag = null;
      arm = null;
      moved = 0;
      if (didPaint) {
        painting = false;
        last = null;
        city.endStroke();
        setTick((n) => n + 1);
        return;
      }
      if (tap && tap.button === 0 && travel < 10 && tap.hit) {
        if (toolRef.current === "inspect") {
          city.place(tap.hit.x, tap.hit.z, "inspect");
          setTick((n) => n + 1);
          return;
        }
        warned = "";
        city.beginStroke();
        paintAt(tap.hit.x, tap.hit.z);
        city.endStroke();
        setTick((n) => n + 1);
        try {
          navigator.vibrate?.(8);
        } catch {
          /* ignore */
        }
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    const onMenu = (e: Event) => {
      e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) view.pitchBy(e.deltaY > 0 ? -0.06 : 0.06);
      else view.zoomBy(e.deltaY > 0 ? 1.08 : 0.92);
    };
    canvas.addEventListener("contextmenu", onMenu);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let acc = 0;
    let lastT = performance.now();
    let lastUi = 0;
    let lastSave = performance.now();
    const writeSave = () => {
      if (!enteredRef.current) return;
      let payload = "";
      try {
        payload = JSON.stringify({ ...city.toJSON(), name: nameRef.current });
      } catch {
        if (!saveWarned.current) {
          saveWarned.current = true;
          setToast("Couldn't save on this phone. Export a backup before you leave.");
        }
        return;
      }
      const result = commitCitySave(localStorage, SAVE_KEY, SAVE_FALLBACK, payload, saveStampRef.current);
      saveStampRef.current = result.stamp;
      if (result.error) {
        if (!saveWarned.current) {
          saveWarned.current = true;
          setToast(result.error);
        }
        return;
      }
      saveWarned.current = false;
    };
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      if (!city.paused && enteredRef.current) {
        acc += dt * city.speed;
        let guard = 0;
        while (acc >= 2.35 && guard++ < 3) {
          acc -= 2.35;
          const mile = city.monthTick();
          if (mile) setToast(`The city is now a ${mile}.`);
        }
      }
      if (city.dirtyVisual && now - lastUi > 40) {
        view.sync();
        city.dirtyVisual = false;
      }
      view.frame(dt);
      if (now - lastUi > 240) {
        lastUi = now;
        const riding = view.streetOn();
        if (riding !== streetRef.current) {
          streetRef.current = riding;
          setStreet(riding);
        }
        setTick((n) => n + 1);
      }
      if (enteredRef.current && now - lastSave > 12000) {
        lastSave = now;
        writeSave();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        city.paused = !city.paused;
        setTick((n) => n + 1);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) city.redo();
        else city.undo();
        setTick((n) => n + 1);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyY") {
        city.redo();
        setTick((n) => n + 1);
        return;
      }
      view.keys.add(e.code);
      if (e.code.startsWith("Arrow") || e.code === "KeyW" || e.code === "KeyA" || e.code === "KeyS" || e.code === "KeyD") {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => view.keys.delete(e.code);
    const blur = () => view.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    window.__city = {
      ready: true,
      enter: () => setEntered(true),
      snap: () => city.snap,
      place: (x, z, t) => {
        city.beginStroke();
        const err = city.place(x, z, t);
        city.endStroke();
        setTick((n) => n + 1);
        return err;
      },
      setKeys: (codes) => {
        view.keys.clear();
        for (const c of codes) view.keys.add(c);
      },
      getCam: () => ({ ...city.camera }),
    };

    return () => {
      writeSave();
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("contextmenu", onMenu);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      view.dispose();
      viewRef.current = null;
    };
  }, [city, mode, gfx]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const canvas = miniRef.current;
    if (!canvas || mode !== "3d") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = 168;
    const h = 128;
    canvas.width = w;
    canvas.height = h;
    const sx = w / W;
    const sy = h / H;
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = city.tile(x, z);
        ctx.fillStyle =
          t.ground && t.plop === "none"
            ? "#17657c"
            : t.road
              ? "#3c4550"
              : t.track !== "none"
                ? "#49c4ae"
                : t.zone === "r"
                  ? "#c4a882"
                  : t.zone === "c"
                    ? "#4e86c6"
                    : t.zone === "i"
                      ? "#8a8174"
                      : t.zone === "o"
                        ? "#9fd6dc"
                        : t.plop !== "none"
                          ? "#d7e2ea"
                          : "#1c4a32";
        ctx.fillRect(x * sx, z * sy, sx + 0.4, sy + 0.4);
      }
    }
  }, [tick, city, mode]);

  const snap = city.snap;
  const tools = TOOL_LIST.filter((t) => t.cat === cat);
  const info = city.selected ? city.inspectInfo(city.selected.x, city.selected.z) : null;
  const tileX = Math.round(city.camera.x / 4 + W / 2 - 0.5);
  const tileZ = Math.round(city.camera.z / 4 + H / 2 - 0.5);
  const planRows = useMemo(() => {
    const q = planQ.trim().toLowerCase();
    return PLAN.filter((f) => {
      if (planMode === "live" && f.status !== "live") return false;
      if (planMode === "P0" && f.priority !== "P0") return false;
      if (planCatId && f.cat !== planCatId) return false;
      if (!q) return true;
      return f.title.toLowerCase().includes(q) || f.catName.toLowerCase().includes(q) || String(f.id) === q;
    }).slice(0, 80);
  }, [planQ, planMode, planCatId]);

  const cycleLayer = () => {
    const i = LAYERS.indexOf(city.layer);
    city.layer = LAYERS[(i + 1) % LAYERS.length];
    city.dirtyVisual = true;
    setTick((n) => n + 1);
  };

  const pickBrush = (id: Brush) => {
    if (id === "district" && city.brush === "district") {
      city.districtBrush = city.districtBrush >= 4 ? 1 : city.districtBrush + 1;
    }
    city.brush = id;
    setHand(false);
    setTick((n) => n + 1);
  };

  const saveNow = () => {
    let payload = "";
    try {
      payload = JSON.stringify({ ...city.toJSON(), name: nameRef.current });
    } catch {
      setToast("Couldn't save on this phone. Export a backup before you leave.");
      return;
    }
    const result = commitCitySave(localStorage, SAVE_KEY, SAVE_FALLBACK, payload, "\0");
    if (result.error) {
      saveWarned.current = true;
      setToast(result.error);
      return;
    }
    saveStampRef.current = result.stamp;
    saveWarned.current = false;
    setSource("save");
    setToast("City saved on this device.");
  };

  const exportCity = () => {
    const blob = new Blob([JSON.stringify({ ...city.toJSON(), name })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.metropolis.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importCity = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as { name?: string };
        const err = city.fromJSON(data);
        if (err) {
          setToast(err);
          return;
        }
        if (typeof data.name === "string" && data.name.trim()) setName(data.name.trim().slice(0, 32));
        setSource("save");
        setToast("Backup imported.");
        setTick((n) => n + 1);
      } catch {
        setToast("That file isn't a city backup.");
      }
    };
    reader.readAsText(file);
  };

  const useSample = () => {
    city.showcase();
    setName("Riverside");
    setToast("Sample metropolis loaded. The treasury is still yours to spend.");
    setMenu(false);
    setEntered(true);
    setTick((n) => n + 1);
  };

  const useEmpty = () => {
    city.blank();
    setName("New city");
    setTool("road");
    setCat("plan");
    setToast("Empty land. Lay a road, zone beside it, then add power and water.");
    setMenu(false);
    setConfirmEmpty(false);
    setEntered(true);
    setTick((n) => n + 1);
  };

  return (
    <div className={`city-root ${snap.season}`}>
      <canvas key={`${mode}-${gfx}`} ref={canvasRef} className="city-canvas" aria-label="City view" />
      {mode === "3d" ? <canvas ref={miniRef} className="minimap" aria-hidden /> : null}
      <div className="map-meta">
        <div className="compass" style={{ transform: `rotate(${(-city.camera.yaw * 180) / Math.PI}deg)` }} aria-hidden>
          <i />
          <span>N</span>
        </div>
        <div>
          <div className="k">Map</div>
          <b className="mono">
            {tileX}, {tileZ}
          </b>
          <div className="muted">1 block ≈ 80 m</div>
        </div>
      </div>

      <header className="topbar">
        <div className="brand-row">
          <div>
            <div className="brand-mark">Metropolis One</div>
            <div className="muted">{name} · {snap.milestone}</div>
          </div>
          <div className="brand-side">
            <span className={`season-pill ${snap.season}`}>{SEASON_WORD[snap.season]}</span>
            <div className="mono muted">{snap.monthLabel}</div>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat">
            <span className="k">Treasury</span>
            <b className="mono">{rupee(snap.cash)}</b>
            <span className={snap.income >= 0 ? "pos" : "neg"}>{rupee(snap.income)}/mo</span>
          </div>
          <div className="stat">
            <span className="k">People</span>
            <b className="mono">{compact(snap.pop)}</b>
            <span className="muted">{snap.unemployment}% jobless</span>
          </div>
          <div className="stat">
            <span className="k">Mood</span>
            <b className="mono">{snap.happy}</b>
            <span className="muted">traffic {snap.traffic}</span>
          </div>
        </div>
        <div className="demand-row" aria-label="Demand">
          <Demand label="Homes" klass="res" n={snap.demand.r} />
          <Demand label="Shops" klass="com" n={snap.demand.c} />
          <Demand label="Industry" klass="ind" n={snap.demand.i} />
          <Demand label="Offices" klass="off" n={snap.demand.o} />
        </div>
      </header>

      {info && tool === "inspect" ? (
        <aside className="inspector">
          <div className="muted">{info.subtitle}</div>
          <h2>{info.title}</h2>
          <div className="rows">
            {info.rows.map((row) => (
              <div key={row.k}>
                <span>{row.k}</span>
                <b>{row.v}</b>
              </div>
            ))}
          </div>
          <div className="row-actions">
            <button
              className="primary"
              disabled={!info.canUpgrade}
              onClick={() => {
                const err = city.upgrade(info.x, info.z);
                setToast(err ?? "Floors added.");
                setTick((n) => n + 1);
              }}
            >
              Upgrade
            </button>
            <button
              className="ghost-btn"
              onClick={() => {
                viewRef.current?.focus(info.x, info.z);
              }}
            >
              Focus
            </button>
            <button
              className="ghost-btn"
              disabled={!info.canBulldoze}
              onClick={() => {
                city.beginStroke();
                city.place(info.x, info.z, "bulldoze");
                city.endStroke();
                setTick((n) => n + 1);
              }}
            >
              Bulldoze
            </button>
          </div>
        </aside>
      ) : null}

      <div className="dock">
        <div className="mode-switch" role="group" aria-label="Finger mode">
          <button className={hand ? "on" : ""} onClick={() => setHand(true)}>
            <Hand size={16} /> Move
          </button>
          <button
            className={!hand ? "on" : ""}
            onClick={() => {
              setHand(false);
              setToast("Build is on. Drag to paint, or tap a tile.");
            }}
          >
            Build
          </button>
        </div>
        <p className="hint desk-hint">
          <b>{TOOLS[tool].name}.</b>{" "}
          {tool === "road" || tool === "land" || tool === "rail"
            ? roadCostLine(city.brush)
            : hand
              ? "Drag to slide the map. A tap still places one tile."
              : TOOLS[tool].hint}
        </p>
        <div className="brief">
          <span className="k">{snap.quests.find((q) => !q.done) ? "Brief" : "City"}</span>
          <b>{(snap.quests.find((q) => !q.done) ?? { title: snap.notes[0] }).title}</b>
          <span className="muted">{snap.quests.find((q) => !q.done)?.detail ?? ""}</span>
        </div>
        <div className="cats">
          {CATS.map((c) => (
            <button key={c.id} className={c.id === cat ? "cat on" : "cat"} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="tool-row">
          {tools.map((t) => {
            const Icon = ICONS[t.id] ?? Route;
            return (
              <button
                key={t.id}
                className={tool === t.id ? "tool on" : "tool"}
                onClick={() => {
                  setTool(t.id);
                  if (t.id !== "inspect") setHand(false);
                  if (t.id === "land" && !LAND_BRUSHES.some((b) => b.id === city.brush)) city.brush = "raise";
                  if (t.id === "rail" && !RAIL_BRUSHES.some((b) => b.id === city.brush)) city.brush = "broad";
                  if (t.id === "road" && !ROAD_BRUSHES.some((b) => b.id === city.brush)) city.brush = "street";
                  const lots =
                    t.id === "r" ||
                    t.id === "c" ||
                    t.id === "i" ||
                    t.id === "o" ||
                    t.cat === "civic" ||
                    t.cat === "special";
                  if (lots && mode === "3d" && !viewLock.current) {
                    setMode("map");
                    if (!toldLots.current) {
                      toldLots.current = true;
                      setToast("Lot plan. Dashed tiles are zoned. Scaffold means the next floor is going up. Tap 3D to leave.");
                    }
                  }
                }}
              >
                <Icon size={16} />
                <span>{t.name}</span>
                {t.id === "road" || t.id === "land" || t.id === "rail" ? (
                  tool === t.id ? (
                    <small>{brushPrice(city.brush)}</small>
                  ) : (
                    <small>{rupee(t.cost)}</small>
                  )
                ) : t.cost > 0 ? (
                  <small>{rupee(t.cost)}</small>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="brush-row">
          {(tool === "road" ? ROAD_BRUSHES : tool === "land" ? LAND_BRUSHES : tool === "rail" ? RAIL_BRUSHES : []).map((b) => (
            <button key={b.id} className={city.brush === b.id ? "chip on" : "chip"} onClick={() => pickBrush(b.id)}>
              {b.id === "district" && city.brush === "district" ? DISTRICTS[city.districtBrush] : `${b.label} ${brushPrice(b.id)}`}
            </button>
          ))}
          <button
            className="chip"
            onClick={() => {
              const err = city.cycleSector();
              const open = city.unlocked.filter(Boolean).length;
              setToast(err ?? `${SECTORS[city.sector]}. ${open} of 4 sectors. A road on the edge links them.`);
              setTick((n) => n + 1);
            }}
          >
            {SECTORS[city.sector]}
          </button>
          <button
            className={mode === "map" ? "chip on" : "chip"}
            onClick={() => {
              const next = mode === "map" ? "3d" : "map";
              viewLock.current = next === "3d";
              setMode(next);
              localStorage.setItem("metropolis-one-view", next);
            }}
          >
            {mode === "map" ? "3D" : "Lots"}
          </button>
          <button className="chip" onClick={cycleLayer} aria-label="Cycle map layer">
            <Layers size={14} /> {LAYER_NAME[city.layer]}
          </button>
          <button
            className="chip"
            onClick={() => {
              setPlanOpen(true);
              setMenu(false);
            }}
          >
            <ScrollText size={14} /> Roadmap
          </button>
        </div>
        <div className="ctrl">
          <button className="icon-btn" aria-label="Undo" disabled={!snap.canUndo} onClick={() => { city.undo(); setTick((n) => n + 1); }}>
            <Undo2 size={18} />
          </button>
          <button className="icon-btn" aria-label="Redo" disabled={!snap.canRedo} onClick={() => { city.redo(); setTick((n) => n + 1); }}>
            <Redo2 size={18} />
          </button>
          <button
            className="icon-btn wide"
            onClick={() => {
              city.paused = !city.paused;
              setTick((n) => n + 1);
            }}
          >
            {city.paused ? <Play size={16} /> : <Pause size={16} />}
            <span>{city.paused ? "Play" : "Pause"}</span>
          </button>
          <button
            className="icon-btn wide"
            onClick={() => {
              city.speed = city.speed >= 3 ? 1 : city.speed + 1;
              city.paused = false;
              setTick((n) => n + 1);
            }}
          >
            {city.speed}×
          </button>
          <button className="icon-btn" aria-label="Zoom in" onClick={() => viewRef.current?.zoomBy(0.85)}>
            <ZoomIn size={18} />
          </button>
          <button className="icon-btn" aria-label="Zoom out" onClick={() => viewRef.current?.zoomBy(1.18)}>
            <ZoomOut size={18} />
          </button>
          <button className="icon-btn" aria-label="Rotate left" onClick={() => viewRef.current?.rotateBy(0.35)}>
            <RotateCcw size={18} />
          </button>
          <button className="icon-btn" aria-label="Rotate right" onClick={() => viewRef.current?.rotateBy(-0.35)}>
            <RotateCw size={18} />
          </button>
          <button className="icon-btn" aria-label="Night and day" onClick={() => viewRef.current?.toggleNight()}>
            <Moon size={18} />
          </button>
          <button
            className={street ? "icon-btn on" : "icon-btn"}
            aria-label="Ride the streets"
            onClick={() => {
              const next = !streetRef.current;
              streetRef.current = next;
              setStreet(next);
              viewRef.current?.setStreet(next);
              setToast(next ? "Street ride. Drag the map to hop off." : "Back above the roofs.");
            }}
          >
            <Car size={18} />
          </button>
          <button
            className="icon-btn"
            aria-label="City ledger"
            onClick={() => {
              setMenu(true);
              setPlanOpen(false);
              setConfirmEmpty(false);
            }}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      <div className="fabs">
        <button className="icon-btn" aria-label="Zoom in" onClick={() => viewRef.current?.zoomBy(0.85)}>
          <ZoomIn size={18} />
        </button>
        <button className="icon-btn" aria-label="Zoom out" onClick={() => viewRef.current?.zoomBy(1.18)}>
          <ZoomOut size={18} />
        </button>
        <button className="icon-btn" aria-label="Undo" disabled={!snap.canUndo} onClick={() => { city.undo(); setTick((n) => n + 1); }}>
          <Undo2 size={18} />
        </button>
        <button
          className="icon-btn"
          aria-label={city.paused ? "Play" : "Pause"}
          onClick={() => {
            city.paused = !city.paused;
            setTick((n) => n + 1);
          }}
        >
          {city.paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        <button
          className={street ? "icon-btn on" : "icon-btn"}
          aria-label="Ride the streets"
          onClick={() => {
            const next = !streetRef.current;
            streetRef.current = next;
            setStreet(next);
            viewRef.current?.setStreet(next);
            setToast(next ? "Street ride. Drag the map to hop off." : "Back above the roofs.");
          }}
        >
          <Car size={18} />
        </button>
        <button
          className="icon-btn"
          aria-label="Speed"
          onClick={() => {
            city.speed = city.speed >= 3 ? 1 : city.speed + 1;
            city.paused = false;
            setTick((n) => n + 1);
          }}
        >
          <span className="fab-speed">{city.speed}×</span>
        </button>
        <button
          className="icon-btn"
          aria-label="City ledger"
          onClick={() => {
            setMenu(true);
            setPlanOpen(false);
            setConfirmEmpty(false);
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      {menu ? (
        <section className="sheet" role="dialog" aria-label="City ledger">
          <div className="muted">Ledger</div>
          <h2>{name}</h2>
          <input className="field" value={name} maxLength={32} aria-label="City name" onChange={(e) => setName(e.target.value)} />
          <button
            className="ghost-btn name-btn"
            onClick={() => {
              const next = indianCityName(name);
              setName(next);
              setToast(`${next}. The name stays on this device until you change it.`);
            }}
          >
            Indian name
          </button>
          <div className="grid-2">
            <button className="ghost-btn" onClick={saveNow}>
              <Save size={16} /> Save
            </button>
            <button className="ghost-btn" onClick={exportCity}>
              <Download size={16} /> Export
            </button>
            <label className="ghost-btn file-btn">
              <span>
                <Upload size={16} /> Import
              </span>
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importCity(file);
                  e.target.value = "";
                }}
              />
            </label>
            <button className="ghost-btn" onClick={useSample}>
              Sample city
            </button>
          </div>
          <div className="tax">
            <span>Sandbox</span>
            <input
              type="checkbox"
              checked={city.sandbox}
              onChange={(e) => {
                city.sandbox = e.target.checked;
                city.recompute(false);
                setTick((n) => n + 1);
              }}
            />
            <span className="muted">{city.sandbox ? "On" : "Off"}</span>
          </div>
          {(
            [
              ["Homes", "r"],
              ["Shops", "c"],
              ["Industry", "i"],
              ["Offices", "o"],
            ] as const
          ).map(([label, key]) => (
            <label key={key} className="tax">
              <span>{label}</span>
              <input
                type="range"
                min={1}
                max={25}
                value={snap.taxes[key]}
                onChange={(e) => {
                  city.setTax({ [key]: Number(e.target.value) });
                  setTick((n) => n + 1);
                }}
              />
              <b className="mono">{snap.taxes[key]}%</b>
            </label>
          ))}
          <label className="tax">
            <span>Import duty</span>
            <input
              type="range"
              min={0}
              max={20}
              value={snap.taxes.tariff}
              aria-label="Import duty"
              onChange={(e) => {
                city.setTax({ tariff: Number(e.target.value) });
                setTick((n) => n + 1);
              }}
            />
            <b className="mono">{snap.taxes.tariff}%</b>
          </label>
          <p className="muted sheet-note">Charged on goods the city buys in, not on what it sells.</p>
          <p className="muted sheet-note">Laws</p>
          {(
            [
              ["night", "Night"],
              ["trucks", "Trucks"],
              ["busLane", "Bus lane"],
              ["adapt", "Climate"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="tax">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={city.laws[key]}
                onChange={(e) => {
                  city.laws[key] = e.target.checked;
                  city.recompute(false);
                  setTick((n) => n + 1);
                }}
              />
              <span className="muted">{city.laws[key] ? "On" : "Off"}</span>
            </label>
          ))}
          {(
            [
              ["fare", "Fare", 0, 30, `₹${city.laws.fare}`],
              ["toll", "Toll", 0, 20, `₹${city.laws.toll}`],
              ["headway", "Headway", 2, 20, `${city.laws.headway}m`],
            ] as const
          ).map(([key, label, min, max, shown]) => (
            <label key={key} className="tax">
              <span>{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                value={city.laws[key]}
                onChange={(e) => {
                  city.laws[key] = Number(e.target.value);
                  city.recompute(false);
                  setTick((n) => n + 1);
                }}
              />
              <b className="mono">{shown}</b>
            </label>
          ))}
          <label className="muted sheet-note" htmlFor="place-pick">
            Place — fictional ground, not a downloaded map
          </label>
          <select
            id="place-pick"
            className="field"
            aria-label="Place"
            value={PLACES.some((p) => p.name === city.placeName) ? city.placeName : "local"}
            onChange={(e) => {
              if (e.target.value === "local") return;
              city.seedPlace(e.target.value);
              setToast(`${e.target.value}. West edge rises. This is not a live map.`);
              setTick((n) => n + 1);
            }}
          >
            <option value="local">This layout</option>
            {PLACES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="grid-2">
            <button
              className="ghost-btn"
              onClick={() => {
                const blob = new Blob([JSON.stringify(city.geoJSON())], { type: "application/geo+json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.geojson`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download size={16} /> GeoJSON
            </button>
            <label className="ghost-btn file-btn">
              <span>
                <Upload size={16} /> Map file
              </span>
              <input
                type="file"
                accept=".json,.geojson,.kml,.gpx,application/json,application/geo+json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const err = city.importGeo(String(reader.result ?? ""));
                    setToast(err ?? "Roads painted from that file.");
                    setTick((n) => n + 1);
                  };
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="rows">
            <div>
              <span>Power</span>
              <b>{snap.power}%</b>
            </div>
            <div>
              <span>Water</span>
              <b>{snap.water}%</b>
            </div>
            <div>
              <span>GDP</span>
              <b>{rupee(snap.gdp)}</b>
            </div>
            <div>
              <span>Exports</span>
              <b>{compact(snap.exports)}</b>
            </div>
            <div>
              <span>Export sales</span>
              <b>{rupee(snap.budget.exportSales)}</b>
            </div>
            <div>
              <span>Imports</span>
              <b>{compact(snap.imports)}</b>
            </div>
            <div>
              <span>Import duty</span>
              <b>{rupee(snap.budget.trade)}</b>
            </div>
            <div>
              <span>Jobs</span>
              <b>
                {compact(snap.employed)}/{compact(snap.jobSlots)}
              </b>
            </div>
            <div>
              <span>Rickshaws</span>
              <b>{compact(snap.rickshaws)}</b>
            </div>
          </div>
          <div className="brush-row chart-switch" role="group" aria-label="History chart">
            {(
              [
                ["pop", "People"],
                ["gdp", "GDP"],
                ["income", "Balance"],
              ] as const
            ).map(([key, label]) => (
              <button key={key} className={chart === key ? "chip on" : "chip"} onClick={() => setChart(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={snap.history}>
                <Area type="monotone" dataKey={chart} stroke="var(--color-mint)" fill="var(--color-mint)" fillOpacity={0.2} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid-2">
            <button
              className={gfx === "lite" ? "primary" : "ghost-btn"}
              onClick={() => {
                setGfx("lite");
                localStorage.setItem("metropolis-one-gfx", "lite");
              }}
            >
              Smooth
            </button>
            <button
              className={gfx === "crisp" ? "primary" : "ghost-btn"}
              onClick={() => {
                setGfx("crisp");
                localStorage.setItem("metropolis-one-gfx", "crisp");
              }}
            >
              Crisp 3D
            </button>
            <button
              className={mode === "3d" ? "primary" : "ghost-btn"}
              onClick={() => {
                setMode("3d");
                localStorage.setItem("metropolis-one-view", "3d");
              }}
            >
              3D city
            </button>
            <button
              className={mode === "map" ? "primary" : "ghost-btn"}
              onClick={() => {
                setMode("map");
                localStorage.setItem("metropolis-one-view", "map");
              }}
            >
              <MapIcon size={16} /> Map
            </button>
          </div>
          <p className="muted sheet-note">
            Drag with one finger to slide the map, then tap a tile to place. Tap Build to paint a whole road or zone in one stroke. Pinch to zoom. Two fingers twist to rotate.
          </p>
          {confirmEmpty ? (
            <div className="row-actions sheet-note">
              <button className="primary" onClick={useEmpty}>
                Yes, clear it
              </button>
              <button className="ghost-btn" onClick={() => setConfirmEmpty(false)}>
                Keep city
              </button>
            </div>
          ) : (
            <div className="row-actions sheet-note">
              <button className="ghost-btn" onClick={() => setConfirmEmpty(true)}>
                Empty land
              </button>
              <button className="primary" onClick={() => setMenu(false)}>
                Back to city
              </button>
            </div>
          )}
        </section>
      ) : null}

      {planOpen ? (
        <section className="sheet" role="dialog" aria-label="Feature roadmap">
          <div className="muted">Roadmap</div>
          <h2>
            {PLAN_LIVE} live of {PLAN.length}
          </h2>
          <p className="muted sheet-note">
            Each live row is something this city already counts or lets you paint. Held stays out: live map downloads, free-angle roads, one agent per person, and anything that needs the internet.
          </p>
          <input
            className="field"
            value={planQ}
            placeholder="Search the plan"
            aria-label="Search the plan"
            onChange={(e) => setPlanQ(e.target.value)}
          />
          <div className="brush-row">
            {(
              [
                ["live", "Live"],
                ["all", "All"],
                ["P0", "Core"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} className={planMode === id ? "chip on" : "chip"} onClick={() => setPlanMode(id)}>
                {label}
              </button>
            ))}
          </div>
          <select
            className="field"
            aria-label="Category"
            value={planCatId}
            onChange={(e) => setPlanCatId(Number(e.target.value))}
          >
            <option value={0}>Every category</option>
            {PLAN_CATS.map((c) => (
              <option key={c.id} value={c.id}>
                {String(c.id).padStart(2, "0")} {c.name}
              </option>
            ))}
          </select>
          <ul className="plan-list">
            {planRows.map((f) => (
              <li key={f.id}>
                <span className={f.status === "live" ? "pill live" : "pill"}>{f.status === "live" ? "Live" : "Held"}</span>
                <span>
                  <b>
                    {f.id}. {f.title}
                  </b>
                  <span className="muted">
                    {f.catName} · {featureLine(f.id, city.census)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">{planRows.length === 80 ? "Showing the first 80 matches. Narrow the search." : `${planRows.length} shown.`}</p>
          <button className="primary" onClick={() => setPlanOpen(false)}>
            Back to city
          </button>
        </section>
      ) : null}

      {!entered ? (
        <div className="veil">
          <div className="card">
            <div className="brand-mark">Metropolis One</div>
            <h1>{source === "save" ? `Back to ${name}` : "A city that grows"}</h1>
            <ol className="steps">
              <li>One finger moves the map. Pinch to zoom. Tap the car to ride a street.</li>
              <li>Tap Build and drag to paint. A road on the river becomes a bridge.</li>
              <li>Zone beside roads, then power and water. The brief says what the city needs next.</li>
              <li>Roadmap lists all 1,000. Held ones need a live map, curved roads, or the internet.</li>
            </ol>
            <div className="stack">
              <button
                className="primary"
                onClick={() => {
                  setEntered(true);
                  setToast(
                    source === "save"
                      ? "Welcome back. Drag to look around, tap a tile to build."
                      : "Drag the map to look. Tap Build, then drag, to paint roads.",
                  );
                }}
              >
                {source === "save" ? "Continue" : "Enter Riverside"}
              </button>
              {source === "save" ? (
                <button className="ghost-btn" onClick={useSample}>
                  Load the sample instead
                </button>
              ) : null}
              <button className="ghost-btn" onClick={useEmpty}>
                Start on empty land
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function Demand({ label, klass, n }: { label: string; klass: string; n: number }) {
  const mag = Math.min(50, Math.abs(n)) / 50;
  return (
    <div className={`demand ${klass}`}>
      <span className="k">
        {label} {n > 0 ? `+${n}` : n}
      </span>
      <div className="track">
        <i className={n >= 0 ? "pos-bar" : "neg-bar"} style={{ transform: `scaleX(${mag})` }} />
      </div>
    </div>
  );
}

function measure(pointers: Map<number, { x: number; y: number }>) {
  const pts = [...pointers.values()];
  if (pts.length < 2) return null;
  const dx = pts[1].x - pts[0].x;
  const dy = pts[1].y - pts[0].y;
  return {
    dist: Math.hypot(dx, dy) || 1,
    ang: Math.atan2(dy, dx),
    x: (pts[0].x + pts[1].x) / 2,
    y: (pts[0].y + pts[1].y) / 2,
  };
}
