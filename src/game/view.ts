import type { ToolId } from "./city";

export interface CityView {
  keys: Set<string>;
  resize(): void;
  frame(dt: number): void;
  sync(): void;
  pick(clientX: number, clientY: number): { x: number; z: number } | null;
  setGhost(x: number, z: number, tool: ToolId | null): void;
  focus(x: number, z: number): void;
  panBy(dx: number, dy: number): void;
  zoomBy(factor: number): void;
  rotateBy(yaw: number): void;
  pitchBy(v: number): void;
  toggleNight(): void;
  setStreet(on: boolean): void;
  streetOn(): boolean;
  dispose(): void;
}

export type Gfx = "crisp" | "lite";
export type ViewMode = "3d" | "map";
