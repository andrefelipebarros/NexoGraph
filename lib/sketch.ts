
export function seedFrom(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

export function random(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (value: number) => value.toFixed(1);

function roughOutline(w: number, h: number, rand: () => number, wobble: number) {
  const j = () => (rand() - 0.5) * wobble * 2;
  const corners: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
  const points: string[] = [];
  const startX = corners[0][0] + j();
  const startY = corners[0][1] + j();
  points.push(`M${f(startX)} ${f(startY)}`);
  for (let side = 0; side < 4; side += 1) {
    const [ax, ay] = corners[side];
    const [bx, by] = corners[(side + 1) % 4];
    const sag = (rand() - 0.5) * wobble * 1.6;
    const mx = (ax + bx) / 2 + (by - ay === 0 ? 0 : sag) + j() * 0.3;
    const my = (ay + by) / 2 + (bx - ax === 0 ? 0 : sag) + j() * 0.3;
    const overshoot = side === 3 ? 1.04 : 1;
    const ex = side === 3 ? ax + (bx - ax) * overshoot + j() : bx + j();
    const ey = side === 3 ? ay + (by - ay) * overshoot + j() : by + j();
    points.push(`Q${f(mx)} ${f(my)} ${f(ex)} ${f(ey)}`);
  }
  return points.join(' ');
}

export function roughRect(w: number, h: number, seed: number) {
  const rand = random(seed);
  return [roughOutline(w, h, rand, 2.2), roughOutline(w, h, rand, 2.2)];
}

export function hatch(w: number, h: number, seed: number, gap = 9) {
  const rand = random(seed ^ 0x9e3779b1);
  const parts: string[] = [];
  for (let x = -h; x < w; x += gap) {
    const jitter = () => (rand() - 0.5) * 1.6;
    parts.push(`M${f(x + jitter())} ${f(h + jitter())} L${f(x + h + jitter())} ${f(0 + jitter())}`);
  }
  return parts.join(' ');
}

export type Point = { x: number; y: number };

export function curvedArrow(a: Point, b: Point, seed: number) {
  const rand = random(seed);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const bend = (rand() - 0.5) * 0.5 + (dy === 0 ? 0.18 : 0.12);
  const c1 = { x: a.x + dx * 0.3 + nx * length * bend, y: a.y + dy * 0.3 + ny * length * bend };
  const c2 = { x: a.x + dx * 0.72 + nx * length * bend * 0.6, y: a.y + dy * 0.72 + ny * length * bend * 0.6 };
  const line = `M${f(a.x)} ${f(a.y)} C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(b.x)} ${f(b.y)}`;
  const tx = b.x - c2.x;
  const ty = b.y - c2.y;
  const angle = Math.atan2(ty, tx);
  const spread = 0.5;
  const size = 15 + rand() * 3;
  const left = { x: b.x - Math.cos(angle - spread) * size, y: b.y - Math.sin(angle - spread) * size };
  const right = { x: b.x - Math.cos(angle + spread) * size, y: b.y - Math.sin(angle + spread) * size };
  const head = `M${f(left.x)} ${f(left.y)} L${f(b.x)} ${f(b.y)} L${f(right.x)} ${f(right.y)}`;
  return { line, head };
}
