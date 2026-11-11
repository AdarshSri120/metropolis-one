export const HEX = {
  grass: 0x1c4a32,
  grassDeep: 0x163c2a,
  water: 0x17657c,
  waterDeep: 0x0e4558,
  sand: 0xc6b48a,
  road: 0x3c4550,
  roadHot: 0x8a4636,
  mark: 0xe6d48a,
  rail: 0x7a5340,
  metro: 0x49c4ae,
  rrts: 0xd27b62,
  runway: 0x2b313a,
  runwayMark: 0xe7eef2,
  lotR: 0x1e6b45,
  lotC: 0x1d4f86,
  lotI: 0x8a6a28,
  lotO: 0x1e6e72,
  res: [0xc4a882, 0xd8c4a4, 0xb08d6a, 0xefe2cf],
  com: [0x4e86c6, 0x6aa4d8, 0x3c6ca6, 0x8ec0ea],
  ind: [0x6e675e, 0x8a8174, 0x544e46, 0xa39886],
  off: [0x9fd6dc, 0xc5eef2, 0x74b4be, 0xe8fcff],
  park: 0x2f7d45,
  tree: 0x1e6a38,
  treeDark: 0x14532c,
  trunk: 0x6b4a32,
  power: 0x4a5560,
  chimney: 0x2e333a,
  solar: 0x16324f,
  solarCell: 0x2f6ea8,
  waterworks: 0x3d7ea8,
  hospital: 0xf4f7fb,
  cross: 0xd24b4b,
  school: 0xe6d3a1,
  police: 0x2f4f86,
  fire: 0xc4493a,
  bus: 0xf0c14a,
  factory: 0x5c5852,
  farm: 0x7ea24a,
  barn: 0x8d4d32,
  stadium: 0x2c6b52,
  landmark: 0xe8e4dc,
  port: 0x35556a,
  marina: 0x3a7e9a,
  cargo: 0xc45a3a,
  warehouse: 0x8d6a45,
  airport: 0xdfe7ee,
  window: 0xffc27a,
  lamp: 0xffe1a8,
  car: [0xf2f5f7, 0xe85d4c, 0xf0c14a, 0x49c4ae, 0x2f4f86, 0x1a1e24],
} as const;

export function cssHex(n: number) {
  return `#${n.toString(16).padStart(6, "0")}`;
}

export function shade(hex: number, m: number) {
  const r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * m)));
  const g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * m)));
  const b = Math.max(0, Math.min(255, Math.round((hex & 255) * m)));
  return (r << 16) | (g << 8) | b;
}
