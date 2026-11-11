import { City, H, W, hash, type Plop, type ToolId, type Tile, type Zone } from "./city";
import { HEX, cssHex, shade } from "./colors";
import type { CityView } from "./view";

export class FlatCity implements CityView {
  keys = new Set<string>();
  private ctx: CanvasRenderingContext2D;
  private camX = W / 2;
  private camZ = H / 2;
  private zoom = 16;
  private ghost: { x: number; z: number; tool: ToolId | null } = { x: -1, z: -1, tool: null };
  private night = false;
  private street = false;
  private streetT = 0;

  private fitted = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private city: City,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.fitted && this.canvas.clientWidth > 0) {
      const fit = Math.min(this.canvas.clientWidth / (W + 2), this.canvas.clientHeight / (H + 2));
      this.zoom = Math.max(fit, Math.min(28, this.canvas.clientWidth / 14));
      this.camX = 18;
      this.camZ = 14;
      this.fitted = true;
    }
  }

  frame(dt: number) {
    const k = this.keys;
    let dx = 0;
    let dy = 0;
    if (k.has("KeyA") || k.has("ArrowLeft")) dx -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) dx += 1;
    if (k.has("KeyW") || k.has("ArrowUp")) dy -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) dy += 1;
    const step = (18 * dt * 40) / Math.max(8, this.zoom);
    if (this.street && !dx && !dy) {
      const path = this.city.carPaths[0];
      if (path && path.length > 1) {
        this.streetT += dt * 0.35;
        const f = (this.streetT % 1) * (path.length - 1);
        const i0 = Math.floor(f);
        const i1 = Math.min(path.length - 1, i0 + 1);
        const t = f - i0;
        this.camX = path[i0].x + (path[i1].x - path[i0].x) * t + 0.5;
        this.camZ = path[i0].z + (path[i1].z - path[i0].z) * t + 0.5;
        this.zoom = Math.max(this.zoom, 34);
      } else this.street = false;
    } else {
      if (dx || dy) this.street = false;
      this.camX += dx * step;
      this.camZ += dy * step;
    }
    this.draw();
  }

  sync() {
    this.draw();
  }

  pick(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const { ox, oy, s } = this.view();
    const x = Math.floor((clientX - rect.left - ox) / s);
    const z = Math.floor((clientY - rect.top - oy) / s);
    if (x < 0 || z < 0 || x >= W || z >= H) return null;
    return { x, z };
  }

  setGhost(x: number, z: number, tool: ToolId | null) {
    this.ghost = { x, z, tool };
  }

  focus(x: number, z: number) {
    this.camX = x + 0.5;
    this.camZ = z + 0.5;
    this.zoom = Math.max(this.zoom, 28);
  }

  panBy(dx: number, dy: number) {
    this.street = false;
    this.camX -= dx / this.zoom;
    this.camZ -= dy / this.zoom;
  }

  zoomBy(factor: number) {
    this.zoom = Math.max(6, Math.min(64, this.zoom / factor));
  }

  rotateBy() {}
  pitchBy() {}

  toggleNight() {
    this.night = !this.night;
  }

  setStreet(on: boolean) {
    this.street = on;
    this.streetT = 0;
  }

  streetOn() {
    return this.street;
  }

  dispose() {}

  private view() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    const s = this.zoom;
    return { w, h, s, ox: w / 2 - this.camX * s, oy: h / 2 - this.camZ * s };
  }

  private draw() {
    const ctx = this.ctx;
    const { w, h, s, ox, oy } = this.view();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = this.night ? "#070b14" : "#102033";
    ctx.fillRect(0, 0, w, h);
    const city = this.city;
    for (let z = 0; z < H; z++) {
      for (let x = 0; x < W; x++) {
        const t = city.tile(x, z);
        ctx.fillStyle = tileFill(t, x, this.night, city.layer);
        const px = ox + x * s;
        const py = oy + z * s;
        ctx.fillRect(px, py, s + 0.5, s + 0.5);
        if (t.elev > 0 && city.layer === "city" && t.ground === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(px, py, s * (t.elev / 4), 2);
        }
        if (t.junction && city.layer === "city") {
          ctx.fillStyle = t.junction === 2 ? "#e7eef2" : t.junction === 5 ? "#e4c27a" : "#ef8b78";
          ctx.beginPath();
          ctx.arc(px + s * 0.5, py + s * 0.5, Math.max(1.5, s * 0.16), 0, Math.PI * 2);
          ctx.fill();
        }
        if (t.oneWay && city.layer === "city" && s >= 8) {
          ctx.fillStyle = "#f2e2a0";
          ctx.beginPath();
          const cx = px + s * 0.5;
          const cy = py + s * 0.5;
          const a = s * 0.22;
          if (t.oneWay === 1) {
            ctx.moveTo(cx + a, cy);
            ctx.lineTo(cx - a * 0.55, cy - a * 0.7);
            ctx.lineTo(cx - a * 0.55, cy + a * 0.7);
          } else if (t.oneWay === 2) {
            ctx.moveTo(cx - a, cy);
            ctx.lineTo(cx + a * 0.55, cy - a * 0.7);
            ctx.lineTo(cx + a * 0.55, cy + a * 0.7);
          } else if (t.oneWay === 3) {
            ctx.moveTo(cx, cy + a);
            ctx.lineTo(cx - a * 0.7, cy - a * 0.55);
            ctx.lineTo(cx + a * 0.7, cy - a * 0.55);
          } else {
            ctx.moveTo(cx, cy - a);
            ctx.lineTo(cx - a * 0.7, cy + a * 0.55);
            ctx.lineTo(cx + a * 0.7, cy + a * 0.55);
          }
          ctx.fill();
        }
        if (t.district && city.layer === "city") {
          ctx.fillStyle = ["#0000", "#c46b4a", "#7eb6e6", "#e4c27a", "#6dcea0"][t.district] ?? "#fff";
          ctx.fillRect(px + s - Math.max(3, s * 0.16), py, Math.max(3, s * 0.16), Math.max(3, s * 0.16));
        }
        if (city.layer === "city") drawStructure(ctx, t, x, z, px, py, s);
      }
    }
    const g = this.ghost;
    if (g.tool && g.tool !== "inspect" && g.x >= 0) {
      const bad = city.hintAt(g.x, g.z, g.tool);
      if (!bad && city.layer === "city" && (isZone(g.tool) || isPlanPlop(g.tool))) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        drawStructure(
          ctx,
          ghostTile(g.tool),
          g.x,
          g.z,
          ox + g.x * s,
          oy + g.z * s,
          s,
        );
        ctx.restore();
      }
      ctx.strokeStyle = bad ? "#ef8b78" : "#6eecc8";
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + g.x * s + 1, oy + g.z * s + 1, s - 2, s - 2);
    }
    const sel = city.selected;
    if (sel) {
      ctx.strokeStyle = "#e7f1f4";
      ctx.lineWidth = 2;
      ctx.strokeRect(ox + sel.x * s + 0.5, oy + sel.z * s + 0.5, s - 1, s - 1);
    }
  }
}

function tileFill(t: Tile, x: number, night: boolean, layer: City["layer"]) {
  if (layer === "zone") {
    if (t.zone === "r") return "#6dcea0";
    if (t.zone === "c") return "#7eb6e6";
    if (t.zone === "i") return "#e4c27a";
    if (t.zone === "o") return "#8fd0c8";
    if (t.road) return "#3c4550";
    return night ? "#102818" : cssHex(HEX.grass);
  }
  if (layer === "traffic") return t.road ? cssHex(t.traffic > 0.62 ? HEX.roadHot : HEX.road) : night ? "#102818" : cssHex(HEX.grass);
  if (layer === "power") return t.powered ? "#e4c27a" : "#241c18";
  if (layer === "water") return t.watered ? "#3d9ad4" : "#1a2830";
  if (layer === "smog") return cssHex(shade(0xc45a3a, 0.45 + t.pollution));
  if (layer === "density") return t.zone === "r" ? cssHex(shade(0x6dcea0, 0.35 + t.level * 0.18)) : night ? "#102818" : cssHex(HEX.grass);
  if (layer === "value") return cssHex(shade(0xe4c27a, 0.3 + t.level * 0.2));
  if (layer === "flood") return t.ground === 1 || t.basin || t.elev === 0 ? "#3d9ad4" : cssHex(HEX.grass);
  if (layer === "noise") return t.road ? cssHex(t.traffic > 0.5 ? HEX.roadHot : HEX.road) : t.zone === "i" ? "#c45a3a" : cssHex(HEX.grass);
  if (layer === "hill") return cssHex(shade(0x14532c, 0.7 + t.elev * 0.35));
  if (t.road && t.ground === 1) return t.roadKind === 2 ? "#8d6a3a" : "#c6a36a";
  if (t.road) return t.roadKind === 2 ? "#2c343c" : cssHex(t.traffic > 0.62 ? HEX.roadHot : HEX.road);
  if (t.ground === 1 && t.plop === "none" && t.track === "none") return night ? "#0c3344" : cssHex(x > 40 ? HEX.waterDeep : HEX.water);
  if (t.track === "metro") return cssHex(HEX.metro);
  if (t.track === "rail") return cssHex(HEX.rail);
  if (t.track === "rrts") return cssHex(HEX.rrts);
  if (t.track === "runway") return cssHex(HEX.runway);
  if (t.plop === "park" || t.plop === "trees") return cssHex(HEX.park);
  if (t.plop !== "none") return "#d7e2ea";
  if (t.zone === "r") return cssHex(t.level ? HEX.res[0] : HEX.lotR);
  if (t.zone === "c") return cssHex(t.level ? HEX.com[0] : HEX.lotC);
  if (t.zone === "i") return cssHex(t.level ? HEX.ind[0] : HEX.lotI);
  if (t.zone === "o") return cssHex(t.level ? HEX.off[0] : HEX.lotO);
  return night ? "#102818" : cssHex(HEX.grass);
}

function buildingFill(t: Tile) {
  if (!t.powered || !t.watered) return cssHex(shade(0x888888, 0.7));
  if (t.zone === "r") return cssHex(HEX.res[Math.min(3, t.level - 1)] ?? HEX.res[0]);
  if (t.zone === "c") return cssHex(HEX.com[0]);
  if (t.zone === "i") return cssHex(HEX.ind[1]);
  return cssHex(HEX.off[1]);
}

function isZone(tool: string): tool is Zone {
  return tool === "r" || tool === "c" || tool === "i" || tool === "o";
}

function isPlanPlop(tool: string): tool is Plop {
  return (
    tool === "power" ||
    tool === "solar" ||
    tool === "water" ||
    tool === "hospital" ||
    tool === "school" ||
    tool === "police" ||
    tool === "fire" ||
    tool === "park" ||
    tool === "trees" ||
    tool === "factory" ||
    tool === "farm" ||
    tool === "warehouse" ||
    tool === "stadium" ||
    tool === "airport" ||
    tool === "landmark"
  );
}

function ghostTile(tool: ToolId): Tile {
  return {
    ground: 0,
    road: false,
    roadKind: 0,
    oneWay: 0,
    district: 0,
    track: "none",
    zone: isZone(tool) ? tool : "none",
    plop: isPlanPlop(tool) ? tool : "none",
    level: isZone(tool) ? 0 : 1,
    grow: isZone(tool) ? 55 : 0,
    powered: true,
    watered: true,
    served: true,
    comp: 0,
    pollution: 0,
    traffic: 0,
    elev: 0,
    junction: 0,
    gauge: 0,
    basin: 0,
  };
}

function drawStructure(ctx: CanvasRenderingContext2D, t: Tile, x: number, z: number, px: number, py: number, s: number) {
  if (s < 7) {
    if (t.zone !== "none" && t.level > 0 && t.plop === "none") {
      const inset = Math.max(1, s * 0.22);
      ctx.fillStyle = buildingFill(t);
      ctx.fillRect(px + inset, py + inset, s - inset * 2, s - inset * 2);
    }
    return;
  }
  if (t.plop !== "none" && t.plop !== "bus" && t.plop !== "station" && t.plop !== "metrostation" && t.plop !== "rrtsstation") {
    drawPlopPlan(ctx, t.plop, px, py, s, t.powered);
    return;
  }
  if (t.plop === "station" || t.plop === "metrostation" || t.plop === "rrtsstation") {
    ctx.fillStyle = t.plop === "metrostation" ? cssHex(HEX.metro) : t.plop === "rrtsstation" ? cssHex(HEX.rrts) : cssHex(HEX.rail);
    ctx.fillRect(px + s * 0.12, py + s * 0.28, s * 0.76, s * 0.44);
    return;
  }
  if (t.zone !== "none") drawZonePlan(ctx, t, x, z, px, py, s);
}

function drawZonePlan(ctx: CanvasRenderingContext2D, t: Tile, x: number, z: number, px: number, py: number, s: number) {
  const zone = t.zone;
  if (zone !== "r" && zone !== "c" && zone !== "i" && zone !== "o") return;
  const style = Math.floor(hash(x, z, 11) * 4);
  const pal = zone === "r" ? HEX.res : zone === "c" ? HEX.com : zone === "i" ? HEX.ind : HEX.off;
  const base = pal[style % pal.length];
  const col = cssHex(t.level > 0 && (!t.powered || !t.watered) ? shade(base, 0.48) : base);
  const roof = cssHex(shade(base, 0.7));
  const pad = s * (zone === "i" ? 0.08 : 0.14);
  const x0 = px + pad;
  const y0 = py + pad;
  const w = s - pad * 2;
  const h = s - pad * 2;
  const floors = t.level;

  if (floors <= 0) {
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.setLineDash([Math.max(2, s * 0.16), Math.max(2, s * 0.1)]);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = col;
    ctx.fillRect(x0 + w * 0.2, y0 + h * 0.2, w * 0.6, h * 0.6);
    ctx.restore();
    return;
  }

  if (zone === "r") {
    const bw = w * (floors >= 4 ? 0.92 : floors >= 2 ? 0.72 : 0.56);
    const bh = h * (floors >= 4 ? 0.9 : 0.64);
    const bx = x0 + (w - bw) / 2;
    const by = y0 + (h - bh) / 2;
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = roof;
    ctx.fillRect(bx, by, bw, Math.max(2, bh * (floors >= 4 ? 0.12 : 0.22)));
    ctx.fillStyle = "#241c18";
    ctx.fillRect(bx + bw * 0.4, by + bh * 0.62, Math.max(2, bw * 0.2), bh * 0.38);
    if (s > 13 && floors >= 2) {
      ctx.fillStyle = t.powered ? cssHex(HEX.window) : "#1a2430";
      const cols = Math.min(4, floors);
      for (let i = 0; i < cols; i++) ctx.fillRect(bx + bw * (0.12 + i * 0.2), by + bh * 0.34, Math.max(1, bw * 0.1), Math.max(1, bh * 0.14));
    }
  } else if (zone === "c") {
    ctx.fillStyle = col;
    ctx.fillRect(x0, y0 + h * 0.08, w, h * 0.72);
    ctx.fillStyle = cssHex(HEX.sand);
    ctx.fillRect(x0, y0 + h * 0.74, w, Math.max(2, h * 0.14));
    if (s > 12) {
      ctx.fillStyle = t.powered ? "#d7e8f4" : "#1a2430";
      const bays = Math.min(3, Math.max(1, floors - 1));
      const gap = w * 0.08;
      const bayW = (w - gap * (bays + 1)) / bays;
      for (let i = 0; i < bays; i++) ctx.fillRect(x0 + gap + i * (bayW + gap), y0 + h * 0.22, bayW, h * 0.36);
    }
  } else if (zone === "i") {
    ctx.fillStyle = col;
    ctx.fillRect(x0, y0 + h * 0.22, w * 0.76, h * 0.68);
    ctx.fillStyle = roof;
    ctx.fillRect(x0, y0 + h * 0.22, w * 0.76, Math.max(2, h * 0.12));
    ctx.fillStyle = cssHex(HEX.chimney);
    ctx.beginPath();
    ctx.arc(x0 + w * 0.86, y0 + h * 0.28, Math.max(1.6, s * 0.09), 0, Math.PI * 2);
    ctx.fill();
    if (floors >= 3) {
      ctx.beginPath();
      ctx.arc(x0 + w * 0.68, y0 + h * 0.16, Math.max(1.2, s * 0.055), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = roof;
    ctx.fillRect(x0, y0 + h * 0.62, w, h * 0.32);
    const tw = w * (floors >= 4 ? 0.58 : 0.44);
    const th = h * Math.min(0.78, 0.28 + floors * 0.1);
    const tx = x0 + (w - tw) / 2;
    const ty = y0 + h * 0.62 - th;
    ctx.fillStyle = col;
    ctx.fillRect(tx, ty, tw, th);
    if (s > 12) {
      ctx.fillStyle = t.powered ? cssHex(HEX.window) : "#1a2430";
      const rows = Math.min(floors, 5);
      for (let r = 0; r < rows; r++) {
        ctx.fillRect(tx + tw * 0.16, ty + th * (0.12 + r * 0.16), tw * 0.68, Math.max(1, th * 0.07));
      }
    }
  }

  if (t.grow > 28 && floors < 5) {
    ctx.strokeStyle = cssHex(HEX.sand);
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.strokeRect(x0, y0, w, h);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + w, y0 + h);
    ctx.moveTo(x0 + w, y0);
    ctx.lineTo(x0, y0 + h);
    ctx.stroke();
    const p = Math.max(0, Math.min(1, t.grow / 100));
    ctx.fillStyle = cssHex(HEX.sand);
    ctx.fillRect(px + 1, py + s - Math.max(2, s * 0.1), (s - 2) * p, Math.max(2, s * 0.08));
  }
}

function drawPlopPlan(ctx: CanvasRenderingContext2D, kind: Plop, px: number, py: number, s: number, powered: boolean) {
  const dim = powered ? 1 : 0.55;
  const body = (color: number, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = cssHex(shade(color, dim));
    ctx.fillRect(px + s * x, py + s * y, s * w, s * h);
  };
  if (kind === "park" || kind === "trees") {
    ctx.fillStyle = cssHex(kind === "park" ? HEX.park : HEX.grass);
    ctx.fillRect(px + s * 0.08, py + s * 0.08, s * 0.84, s * 0.84);
    ctx.fillStyle = cssHex(HEX.tree);
    for (const [ox, oy, r] of [
      [0.32, 0.36, 0.16],
      [0.64, 0.42, 0.18],
      [0.46, 0.68, 0.14],
    ] as const) {
      ctx.beginPath();
      ctx.arc(px + s * ox, py + s * oy, s * r, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (kind === "power" || kind === "factory") {
    body(kind === "factory" ? HEX.factory : HEX.power, 0.1, 0.28, 0.62, 0.56);
    ctx.fillStyle = cssHex(HEX.chimney);
    ctx.beginPath();
    ctx.arc(px + s * 0.8, py + s * 0.32, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "solar") {
    body(HEX.solar, 0.08, 0.18, 0.84, 0.64);
    ctx.fillStyle = cssHex(shade(HEX.solarCell, dim));
    for (let i = 0; i < 3; i++) ctx.fillRect(px + s * (0.16 + i * 0.24), py + s * 0.26, s * 0.16, s * 0.48);
    return;
  }
  if (kind === "water") {
    body(HEX.waterworks, 0.12, 0.34, 0.46, 0.42);
    ctx.fillStyle = "#7eb8d4";
    ctx.beginPath();
    ctx.arc(px + s * 0.72, py + s * 0.48, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "hospital") {
    body(HEX.hospital, 0.14, 0.18, 0.72, 0.64);
    ctx.fillStyle = cssHex(HEX.cross);
    ctx.fillRect(px + s * 0.42, py + s * 0.28, s * 0.16, s * 0.44);
    ctx.fillRect(px + s * 0.3, py + s * 0.42, s * 0.4, s * 0.16);
    return;
  }
  if (kind === "school") {
    body(HEX.school, 0.1, 0.22, 0.8, 0.56);
    body(shade(HEX.school, 0.75), 0.08, 0.16, 0.84, 0.1);
    return;
  }
  if (kind === "police") {
    body(HEX.police, 0.16, 0.28, 0.68, 0.5);
    body(shade(HEX.police, 1.25), 0.34, 0.12, 0.32, 0.22);
    return;
  }
  if (kind === "fire") {
    body(HEX.fire, 0.12, 0.3, 0.58, 0.5);
    body(shade(HEX.fire, 0.75), 0.62, 0.16, 0.22, 0.64);
    return;
  }
  if (kind === "farm") {
    body(HEX.farm, 0.08, 0.4, 0.84, 0.42);
    body(HEX.barn, 0.18, 0.18, 0.36, 0.28);
    return;
  }
  if (kind === "warehouse" || kind === "cargo") {
    body(kind === "cargo" ? HEX.cargo : HEX.warehouse, 0.08, 0.22, 0.84, 0.58);
    ctx.fillStyle = "#241c18";
    ctx.fillRect(px + s * 0.38, py + s * 0.48, s * 0.2, s * 0.32);
    return;
  }
  if (kind === "stadium") {
    ctx.strokeStyle = cssHex(HEX.stadium);
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.beginPath();
    ctx.arc(px + s * 0.5, py + s * 0.5, s * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = cssHex(HEX.tree);
    ctx.beginPath();
    ctx.arc(px + s * 0.5, py + s * 0.5, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (kind === "airport") {
    body(HEX.airport, 0.12, 0.28, 0.76, 0.28);
    body(HEX.airport, 0.38, 0.16, 0.24, 0.68);
    return;
  }
  body(HEX.landmark, 0.22, 0.16, 0.56, 0.68);
}
