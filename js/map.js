/**
 * Visual empire floor — canvas map inspired by industrial node networks.
 */

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function shortName(s, n = 18) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

const KIND_COLORS = {
  hq: { top: "#e8a84a", side: "#a86a20", accent: "#ffd080" },
  product: { top: "#4a9ec8", side: "#2a6080", accent: "#80d0ff" },
  process: { top: "#5a8a6a", side: "#2a5040", accent: "#80c0a0" },
  marketing: { top: "#9a6ac8", side: "#503080", accent: "#d0a0ff" },
  rival: { top: "#c45c4a", side: "#702820", accent: "#ff9080" },
  ally: { top: "#4ac87a", side: "#207040", accent: "#80ffb0" },
  sabotaged: { top: "#6a4040", side: "#301818", accent: "#a06060" },
  merged: { top: "#555555", side: "#333333", accent: "#888888" },
};

export class EmpireMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.nodes = [];
    this.debris = [];
    this.particles = [];
    this.selectedId = null;
    this.hoverId = null;
    this.t = 0;
    this.animId = 0;
    this.state = null;
    this.onSelect = null;
    this.running = false;
    this.dpr = 1;

    canvas.addEventListener("pointermove", (e) => this._pointer(e, false));
    canvas.addEventListener("pointerdown", (e) => this._pointer(e, true));
    canvas.addEventListener("pointerleave", () => {
      this.hoverId = null;
      canvas.style.cursor = "default";
    });

    window.addEventListener("resize", () => this.resize());
    this.resize();
    this._loop();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || 960;
    const h = parent?.clientHeight || 540;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.W = w;
    this.H = h;
    if (this.state?.player) this.rebuild(this.state);
  }

  setState(state) {
    this.state = state;
    this.running = state?.player?.status === "running";
    this.rebuild(state);
  }

  rebuild(state) {
    if (!state?.player) {
      this.nodes = [];
      this.debris = [];
      return;
    }
    const p = state.player;
    const seed = p.seed || 1;
    const rand = mulberry32(seed);
    const cx = this.W * 0.5;
    const cy = this.H * 0.52;
    const nodes = [];

    // HQ center
    nodes.push({
      id: "hq",
      kind: "hq",
      label: shortName(p.displayName, 22),
      sub: "HQ",
      x: cx,
      y: cy,
      scale: 1.25,
      pulse: 0,
      meta: { type: "hq", empire: p },
    });

    // Blueprint nodes in inner ring
    const bps = p.blueprints || [];
    const nBp = Math.max(bps.length, 1);
    bps.forEach((bp, i) => {
      const a = -Math.PI / 2 + (i / nBp) * Math.PI * 2 + 0.2;
      const r = Math.min(this.W, this.H) * 0.22;
      nodes.push({
        id: bp.id,
        kind: bp.kind || "product",
        label: shortName(bp.title, 16),
        sub: (bp.kind || "ops").toUpperCase(),
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * 0.72,
        scale: 0.85,
        pulse: rand(),
        meta: { type: "blueprint", bp },
      });
    });

    // Rival nodes outer ring
    const rivals = (state.rivals || []).filter((r) => r.relation !== "merged").slice(0, 6);
    const nR = Math.max(rivals.length, 1);
    rivals.forEach((r, i) => {
      const a = (i / nR) * Math.PI * 2 + 0.4;
      const rOut = Math.min(this.W, this.H) * 0.38;
      let kind = "rival";
      if (r.relation === "ally") kind = "ally";
      if (r.relation === "sabotaged") kind = "sabotaged";
      nodes.push({
        id: r.id,
        kind,
        label: shortName(r.displayName, 14),
        sub: r.relation === "ally" ? "ALLY" : r.relation === "sabotaged" ? "HOSTILE" : "RIVAL",
        x: cx + Math.cos(a) * rOut,
        y: cy + Math.sin(a) * rOut * 0.68,
        scale: 0.95,
        pulse: rand(),
        meta: { type: "rival", rival: r },
      });
    });

    this.nodes = nodes;

    // Decorative debris
    this.debris = [];
    for (let i = 0; i < 28; i++) {
      this.debris.push({
        x: rand() * this.W,
        y: rand() * this.H,
        s: 4 + rand() * 14,
        rot: rand() * Math.PI,
        type: rand() > 0.5 ? "crate" : "barrel",
      });
    }
  }

  _pointer(e, click) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let hit = null;
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const n = this.nodes[i];
      const r = 36 * n.scale;
      if (Math.hypot(x - n.x, y - n.y) < r) {
        hit = n;
        break;
      }
    }
    this.hoverId = hit?.id || null;
    this.canvas.style.cursor = hit ? "pointer" : "default";
    if (click && hit) {
      this.selectedId = hit.id;
      if (this.onSelect) this.onSelect(hit);
    }
  }

  _loop = () => {
    this.t += 0.016;
    this.draw();
    // particles when running
    if (this.running && Math.random() < 0.35) {
      const hq = this.nodes.find((n) => n.id === "hq");
      if (hq) {
        this.particles.push({
          x: hq.x + (Math.random() - 0.5) * 20,
          y: hq.y - 30,
          vx: (Math.random() - 0.5) * 12,
          vy: -20 - Math.random() * 30,
          life: 1,
          r: 2 + Math.random() * 3,
        });
      }
    }
    this.particles = this.particles.filter((p) => {
      p.life -= 0.012;
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 8 * 0.016;
      return p.life > 0;
    });
    this.animId = requestAnimationFrame(this._loop);
  };

  draw() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    if (!W) return;

    // Sky / ground
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a2230");
    g.addColorStop(0.45, "#2a3038");
    g.addColorStop(1, "#3a3834");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Floating rocks
    ctx.fillStyle = "rgba(40,40,45,0.7)";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 + this.t * 3) % (W + 80)) - 40;
      const y = 40 + (i * 47) % (H * 0.35);
      ctx.beginPath();
      ctx.ellipse(x, y, 18 + (i % 3) * 8, 10 + (i % 2) * 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground plane grid
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let i = -4; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, H * 0.35 + i * 28);
      ctx.lineTo(W, H * 0.45 + i * 28);
      ctx.stroke();
    }
    ctx.restore();

    // Debris
    this.debris.forEach((d) => this._drawDebris(d));

    // Paths (HQ to all others)
    const hq = this.nodes.find((n) => n.id === "hq");
    if (hq) {
      this.nodes.forEach((n) => {
        if (n.id === "hq") return;
        this._drawPath(hq, n);
      });
      // ring paths between outer nodes
      const outer = this.nodes.filter((n) => n.id !== "hq");
      for (let i = 0; i < outer.length; i++) {
        const a = outer[i];
        const b = outer[(i + 1) % outer.length];
        if (a.meta?.type === b.meta?.type || (a.meta?.type === "rival" && b.meta?.type === "rival")) {
          this._drawPath(a, b, 0.35);
        }
      }
    }

    // Nodes
    const sorted = [...this.nodes].sort((a, b) => a.y - b.y);
    sorted.forEach((n) => this._drawNode(n));

    // Smoke particles
    this.particles.forEach((p) => {
      ctx.fillStyle = `rgba(200,200,210,${p.life * 0.45})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1.5 - p.life), 0, Math.PI * 2);
      ctx.fill();
    });

    // Empty state
    if (!this.nodes.length) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "600 18px IBM Plex Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Found an empire to open the floor", W / 2, H / 2);
    }
  }

  _drawPath(a, b, alpha = 1) {
    const ctx = this.ctx;
    const pulse = this.running ? 0.5 + 0.5 * Math.sin(this.t * 4 + a.x * 0.01) : 0.65;
    ctx.save();
    ctx.strokeStyle = `rgba(80, 180, 255, ${0.55 * alpha * pulse})`;
    ctx.lineWidth = 10 * alpha;
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(60, 160, 255, 0.8)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    // isometric-ish polyline via mid control
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2 + 8;
    ctx.moveTo(a.x, a.y + 10);
    ctx.quadraticCurveTo(mx, my + 20, b.x, b.y + 10);
    ctx.stroke();

    // center strip
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(180, 230, 255, ${0.35 * alpha})`;
    ctx.lineWidth = 3 * alpha;
    ctx.stroke();

    // moving packet when running
    if (this.running && alpha > 0.5) {
      const u = (this.t * 0.25 + a.pulse) % 1;
      const t = u;
      const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x;
      const py = (1 - t) * (1 - t) * (a.y + 10) + 2 * (1 - t) * t * (my + 20) + t * t * (b.y + 10);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#4af";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDebris(d) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    if (d.type === "crate") {
      ctx.fillStyle = "#5a4030";
      ctx.fillRect(-d.s / 2, -d.s / 3, d.s, d.s * 0.55);
      ctx.fillStyle = "#6a5040";
      ctx.fillRect(-d.s / 2, -d.s / 2, d.s, d.s * 0.25);
    } else {
      ctx.fillStyle = "#4a3020";
      ctx.beginPath();
      ctx.ellipse(0, 0, d.s * 0.35, d.s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2818";
      ctx.fillRect(-d.s * 0.28, -d.s * 0.35, d.s * 0.56, d.s * 0.4);
    }
    ctx.restore();
  }

  _drawNode(n) {
    const ctx = this.ctx;
    const sel = n.id === this.selectedId;
    const hover = n.id === this.hoverId;
    const colors = KIND_COLORS[n.kind] || KIND_COLORS.rival;
    const s = n.scale * (hover ? 1.08 : 1) * (sel ? 1.1 : 1);
    const bob = Math.sin(this.t * 2 + n.pulse * 6) * 2;
    const x = n.x;
    const y = n.y + bob;

    // ground pad
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 28 * s, 42 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // glowing ring
    ctx.strokeStyle = sel ? colors.accent : `rgba(80,180,255,${0.35 + (hover ? 0.3 : 0)})`;
    ctx.lineWidth = sel ? 3 : 2;
    ctx.shadowColor = colors.accent;
    ctx.shadowBlur = sel ? 16 : 6;
    ctx.beginPath();
    ctx.ellipse(x, y + 28 * s, 48 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // isometric building stack
    this._isoBuilding(x, y, s, colors, n.kind);

    // label plate
    const label = n.label;
    ctx.font = `600 ${Math.round(11 * Math.min(s, 1.1))}px IBM Plex Sans, sans-serif`;
    const tw = ctx.measureText(label).width;
    const pad = 8;
    const lx = x - tw / 2 - pad;
    const ly = y - 58 * s;
    ctx.fillStyle = "rgba(12,14,18,0.82)";
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    roundRect(ctx, lx, ly, tw + pad * 2, 28, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8eef5";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, ly + 12);
    ctx.font = `500 8px IBM Plex Mono, monospace`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(n.sub, x, ly + 22);

    ctx.restore();
  }

  _isoBuilding(x, y, s, colors, kind) {
    const ctx = this.ctx;
    const w = 28 * s;
    const d = 18 * s;
    const h = kind === "hq" ? 36 * s : 26 * s;

    // left face
    ctx.fillStyle = colors.side;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x, y + d * 0.5);
    ctx.lineTo(x, y + d * 0.5 - h);
    ctx.lineTo(x - w, y - h);
    ctx.closePath();
    ctx.fill();

    // right face
    ctx.fillStyle = shade(colors.side, -20);
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + d * 0.5);
    ctx.lineTo(x, y + d * 0.5 - h);
    ctx.lineTo(x + w, y - h);
    ctx.closePath();
    ctx.fill();

    // top
    ctx.fillStyle = colors.top;
    ctx.beginPath();
    ctx.moveTo(x - w, y - h);
    ctx.lineTo(x, y - h - d * 0.5);
    ctx.lineTo(x + w, y - h);
    ctx.lineTo(x, y - h + d * 0.5);
    ctx.closePath();
    ctx.fill();

    // chimney / crane accents for HQ
    if (kind === "hq") {
      ctx.fillStyle = "#333";
      ctx.fillRect(x - 4 * s, y - h - 22 * s, 8 * s, 22 * s);
      ctx.fillStyle = "#555";
      ctx.beginPath();
      ctx.arc(x, y - h - 22 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      // crane arm
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(x + 10 * s, y - h);
      ctx.lineTo(x + 38 * s, y - h - 18 * s);
      ctx.stroke();
    }

    // windows
    ctx.fillStyle = "rgba(255,220,120,0.7)";
    for (let i = 0; i < 2; i++) {
      const wy = y - 8 * s - i * 10 * s;
      ctx.fillRect(x - 14 * s, wy, 6 * s, 5 * s);
      ctx.fillRect(x + 4 * s, wy, 6 * s, 5 * s);
    }
  }

  drawMinimap(canvas) {
    if (!canvas || !this.W) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,12,16,0.85)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(80,180,255,0.4)";
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    if (!this.nodes.length) return;
    const sx = w / this.W;
    const sy = h / this.H;
    // paths
    const hq = this.nodes.find((n) => n.id === "hq");
    if (hq) {
      ctx.strokeStyle = "rgba(80,180,255,0.5)";
      ctx.lineWidth = 1;
      this.nodes.forEach((n) => {
        if (n.id === "hq") return;
        ctx.beginPath();
        ctx.moveTo(hq.x * sx, hq.y * sy);
        ctx.lineTo(n.x * sx, n.y * sy);
        ctx.stroke();
      });
    }
    this.nodes.forEach((n) => {
      const c = KIND_COLORS[n.kind] || KIND_COLORS.rival;
      ctx.fillStyle = c.top;
      ctx.beginPath();
      ctx.arc(n.x * sx, n.y * sy, n.kind === "hq" ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt;
  let g = ((n >> 8) & 0xff) + amt;
  let b = (n & 0xff) + amt;
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  return `rgb(${r},${g},${b})`;
}

/** Map empire stats to visual resource bars (SPACE / TIME / HAULS). */
export function visualResources(empire) {
  if (!empire) {
    return [
      { key: "space", label: "SPACE", value: 0, max: 100 },
      { key: "time", label: "TIME", value: 0, max: 100 },
      { key: "hauls", label: "HAULS", value: 0, max: 100 },
    ];
  }
  const inv = empire.resources.inventory ?? 0;
  const stress = empire.resources.stress ?? 0;
  const share = empire.metrics.marketShare ?? 0;
  const capital = empire.resources.capital ?? 0;
  return [
    {
      key: "space",
      label: "SPACE",
      value: clamp(100 - inv * 0.8, 0, 100),
      max: 100,
      hint: "Free capacity in the constraint",
    },
    {
      key: "time",
      label: "TIME",
      value: clamp(100 - stress, 0, 100),
      max: 100,
      hint: "Operator bandwidth left",
    },
    {
      key: "hauls",
      label: "HAULS",
      value: clamp(share * 2 + capital / 20, 0, 100),
      max: 100,
      hint: "Throughput / market pull",
    },
  ];
}
