/**
 * Night Ops — the actual game.
 * Grab packages, deliver to drops, avoid patrols, clear nightly quotas.
 */

import { districtFromConstraint } from "./districts.js";

const W = 960;
const H = 540;

function rand(a, b) {
  return a + Math.random() * (b - a);
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function safeSpot(obstacles, margin = 50) {
  for (let i = 0; i < 40; i++) {
    const p = { x: rand(margin, W - margin), y: rand(margin + 30, H - margin) };
    if (obstacles.every((o) => dist(p, o) > 70)) return p;
  }
  return { x: rand(80, W - 80), y: rand(80, H - 80) };
}

export function createGame(constraintText = "") {
  const district = districtFromConstraint(constraintText);
  return {
    phase: "playing", // playing | shop | won | lost | pause
    district,
    constraint: constraintText,
    night: 1,
    cash: 0,
    heat: 0,
    delivered: 0,
    quota: 4,
    upgrades: { speed: 0, cargo: 0, cool: 0, dash: 0 },
    player: null,
    packages: [],
    drops: [],
    patrols: [],
    particles: [],
    floaters: [],
    buildings: [],
    message: "",
    messageT: 0,
    dashCd: 0,
    time: 0,
    keys: new Set(),
    pointer: null, // {x,y,down} for touch/mouse drive assist
    wonNights: 0,
  };
}

export function startNight(g) {
  g.phase = "playing";
  g.delivered = 0;
  g.quota = 3 + g.night; // 4,5,6...
  g.heat = Math.max(0, g.heat - 15 - g.upgrades.cool * 8);
  g.dashCd = 0;
  g.message = `Night ${g.night} — deliver ${g.quota} packages`;
  g.messageT = 2.5;

  const cargoMax = 2 + g.upgrades.cargo + g.district.cargoBonus;
  g.player = {
    x: W * 0.5,
    y: H * 0.5,
    vx: 0,
    vy: 0,
    angle: 0,
    r: 14,
    cargo: [],
    cargoMax,
    baseSpeed: 170 * g.district.speedMult * (1 + g.upgrades.speed * 0.12),
  };

  // decorative buildings (collision soft)
  g.buildings = [];
  for (let i = 0; i < 12; i++) {
    g.buildings.push({
      x: rand(40, W - 40),
      y: rand(40, H - 40),
      w: rand(36, 70),
      h: rand(28, 55),
    });
  }

  // drop zones (2-3)
  g.drops = [];
  const nDrops = g.night >= 3 ? 3 : 2;
  for (let i = 0; i < nDrops; i++) {
    const p = safeSpot([...g.drops, g.player], 70);
    g.drops.push({ ...p, r: 36, pulse: Math.random() * 10 });
  }

  // packages
  g.packages = [];
  spawnPackages(g, g.quota + 2);

  // patrols
  g.patrols = [];
  const nPat = 1 + Math.floor(g.night / 2) + (g.night > 4 ? 1 : 0);
  for (let i = 0; i < nPat; i++) {
    const p = safeSpot([g.player, ...g.drops], 100);
    g.patrols.push({
      x: p.x,
      y: p.y,
      angle: rand(0, Math.PI * 2),
      speed: 55 + g.night * 6 + i * 5,
      mode: Math.random() > 0.5 ? "patrol" : "sweep",
      t: rand(0, 10),
      r: 16,
      alert: 0,
    });
  }

  g.particles = [];
  g.floaters = [];
  g.time = 0;
}

function spawnPackages(g, n) {
  for (let i = 0; i < n; i++) {
    const p = safeSpot([g.player, ...g.packages, ...g.drops, ...g.patrols], 55);
    g.packages.push({
      id: uid(),
      x: p.x,
      y: p.y,
      r: 11,
      value: Math.round(28 * g.district.payMult * (1 + g.night * 0.08)),
      bob: Math.random() * 5,
    });
  }
}

function pop(g, x, y, text, color) {
  g.floaters.push({ x, y, text, color, life: 1 });
}

function burst(g, x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = rand(40, 140);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: rand(0.3, 0.7),
      color,
      r: rand(2, 4),
    });
  }
}

export function setMessage(g, text, t = 2) {
  g.message = text;
  g.messageT = t;
}

/** Main fixed update, dt in seconds */
export function update(g, dt) {
  if (g.phase !== "playing") return;

  dt = Math.min(dt, 0.033);
  g.time += dt;
  g.dashCd = Math.max(0, g.dashCd - dt);
  if (g.messageT > 0) g.messageT -= dt;

  const p = g.player;
  const speed = p.baseSpeed;

  // Input — keyboard
  let ax = 0;
  let ay = 0;
  const k = g.keys;
  if (k.has("ArrowLeft") || k.has("a") || k.has("A")) ax -= 1;
  if (k.has("ArrowRight") || k.has("d") || k.has("D")) ax += 1;
  if (k.has("ArrowUp") || k.has("w") || k.has("W")) ay -= 1;
  if (k.has("ArrowDown") || k.has("s") || k.has("S")) ay += 1;

  // Pointer steer: pull toward pointer when held
  if (g.pointer?.down) {
    const dx = g.pointer.x - p.x;
    const dy = g.pointer.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 8) {
      ax += dx / d;
      ay += dy / d;
    }
  }

  if (ax || ay) {
    const len = Math.hypot(ax, ay) || 1;
    ax /= len;
    ay /= len;
    p.angle = Math.atan2(ay, ax);
  }

  // Dash
  let dashMult = 1;
  if ((k.has(" ") || k.has("Shift")) && g.dashCd <= 0 && (ax || ay || g.pointer?.down)) {
    dashMult = 2.6 + g.upgrades.dash * 0.3;
    g.dashCd = Math.max(0.55, 1.1 - g.upgrades.dash * 0.12);
    burst(g, p.x, p.y, g.district.accent, 8);
  }

  p.vx = ax * speed * dashMult;
  p.vy = ay * speed * dashMult;
  p.x = clamp(p.x + p.vx * dt, 18, W - 18);
  p.y = clamp(p.y + p.vy * dt, 18, H - 18);

  // Soft building push
  for (const b of g.buildings) {
    const cx = clamp(p.x, b.x - b.w / 2, b.x + b.w / 2);
    const cy = clamp(p.y, b.y - b.h / 2, b.y + b.h / 2);
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < p.r && d > 0.01) {
      p.x += (dx / d) * (p.r - d);
      p.y += (dy / d) * (p.r - d);
    }
  }

  // Pickup packages
  for (let i = g.packages.length - 1; i >= 0; i--) {
    const pkg = g.packages[i];
    if (dist(p, pkg) < p.r + pkg.r && p.cargo.length < p.cargoMax) {
      p.cargo.push(pkg);
      g.packages.splice(i, 1);
      pop(g, pkg.x, pkg.y, "PICKUP", "#f0b429");
      burst(g, pkg.x, pkg.y, "#f0b429", 6);
    }
  }

  // Deliver
  if (p.cargo.length) {
    for (const drop of g.drops) {
      if (dist(p, drop) < drop.r) {
        const delivered = p.cargo.splice(0, p.cargo.length);
        let pay = 0;
        for (const c of delivered) pay += c.value;
        g.cash += pay;
        g.delivered += delivered.length;
        g.heat = clamp(g.heat - 4 * delivered.length, 0, 100);
        pop(g, drop.x, drop.y - 10, `+₡${pay}`, "#3dd68c");
        burst(g, drop.x, drop.y, "#3dd68c", 14);
        setMessage(g, `Delivered ${delivered.length} · ${g.delivered}/${g.quota}`, 1.5);

        // top up packages so the night stays alive
        if (g.packages.length < 3 && g.delivered < g.quota) {
          spawnPackages(g, 2);
        }
      }
    }
  }

  // Patrols
  for (const pat of g.patrols) {
    pat.t += dt;
    const toPlayer = dist(pat, p);
    const seeRange = 130 + g.night * 8;

    if (toPlayer < seeRange) {
      pat.alert = Math.min(1, pat.alert + dt * 1.2);
      // chase
      const dx = p.x - pat.x;
      const dy = p.y - pat.y;
      const d = Math.hypot(dx, dy) || 1;
      pat.angle = Math.atan2(dy, dx);
      const chase = pat.speed * (0.9 + pat.alert * 0.5);
      pat.x += (dx / d) * chase * dt;
      pat.y += (dy / d) * chase * dt;
    } else {
      pat.alert = Math.max(0, pat.alert - dt * 0.5);
      if (pat.mode === "patrol") {
        pat.angle += Math.sin(pat.t * 0.7) * 0.8 * dt;
        pat.x += Math.cos(pat.angle) * pat.speed * 0.55 * dt;
        pat.y += Math.sin(pat.angle) * pat.speed * 0.55 * dt;
      } else {
        pat.x += Math.cos(pat.t * 0.4 + pat.speed) * pat.speed * 0.5 * dt;
        pat.y += Math.sin(pat.t * 0.55) * pat.speed * 0.5 * dt;
      }
    }

    pat.x = clamp(pat.x, 20, W - 20);
    pat.y = clamp(pat.y, 20, H - 20);

    // Heat when close
    if (toPlayer < 100) {
      const prox = 1 - toPlayer / 100;
      g.heat += prox * 22 * g.district.heatMult * dt;
    }

    // Caught
    if (toPlayer < p.r + pat.r) {
      g.heat += 28;
      // dump cargo
      if (p.cargo.length) {
        const lost = p.cargo.length;
        p.cargo = [];
        pop(g, p.x, p.y, `LOST ×${lost}`, "#ff5c5c");
        setMessage(g, "Patrol shook you down — cargo gone", 2);
      }
      // knockback
      const dx = p.x - pat.x;
      const dy = p.y - pat.y;
      const d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d) * 40;
      p.y += (dy / d) * 40;
      burst(g, p.x, p.y, "#ff5c5c", 12);
    }
  }

  g.heat = clamp(g.heat, 0, 100);

  // particles / floaters
  g.particles = g.particles.filter((pt) => {
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.98;
    pt.vy *= 0.98;
    return pt.life > 0;
  });
  g.floaters = g.floaters.filter((f) => {
    f.life -= dt * 0.9;
    f.y -= 28 * dt;
    return f.life > 0;
  });

  // Win night
  if (g.delivered >= g.quota) {
    g.wonNights += 1;
    if (g.night >= 5) {
      g.phase = "won";
      setMessage(g, "Five nights. You're legend on the floor.", 5);
    } else {
      g.phase = "shop";
      g.night += 1;
    }
  }

  // Lose
  if (g.heat >= 100) {
    g.phase = "lost";
    setMessage(g, "Heat maxed — busted.", 5);
  }
}

export function buyUpgrade(g, id) {
  const catalog = shopCatalog(g);
  const item = catalog.find((c) => c.id === id);
  if (!item || item.soldOut || g.cash < item.cost) return false;
  g.cash -= item.cost;
  g.upgrades[id] += 1;
  // apply immediate effects
  if (g.player) {
    g.player.cargoMax = 2 + g.upgrades.cargo + g.district.cargoBonus;
    g.player.baseSpeed = 170 * g.district.speedMult * (1 + g.upgrades.speed * 0.12);
  }
  return true;
}

export function shopCatalog(g) {
  const u = g.upgrades;
  return [
    {
      id: "speed",
      name: "Torque kit",
      desc: `+12% move speed (lv ${u.speed}/5)`,
      cost: 40 + u.speed * 35,
      soldOut: u.speed >= 5,
    },
    {
      id: "cargo",
      name: "Extra bay",
      desc: `+1 cargo slot (lv ${u.cargo}/3)`,
      cost: 55 + u.cargo * 45,
      soldOut: u.cargo >= 3,
    },
    {
      id: "cool",
      name: "Cold plates",
      desc: `More heat shed between nights (lv ${u.cool}/4)`,
      cost: 35 + u.cool * 30,
      soldOut: u.cool >= 4,
    },
    {
      id: "dash",
      name: "Boost coil",
      desc: `Stronger dash, less cooldown (lv ${u.dash}/4)`,
      cost: 45 + u.dash * 40,
      soldOut: u.dash >= 4,
    },
  ];
}

export { W, H };
