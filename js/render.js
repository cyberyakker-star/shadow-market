import { W, H } from "./game.js";

export function resizeCanvas(canvas) {
  // logical size fixed; CSS scales
  canvas.width = W;
  canvas.height = H;
}

export function draw(ctx, g) {
  // asphalt
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#1c2430");
  bg.addColorStop(1, "#141820");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // grid roads
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // main avenues
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.33);
  ctx.lineTo(W, H * 0.33);
  ctx.moveTo(0, H * 0.66);
  ctx.lineTo(W, H * 0.66);
  ctx.moveTo(W * 0.28, 0);
  ctx.lineTo(W * 0.28, H);
  ctx.moveTo(W * 0.72, 0);
  ctx.lineTo(W * 0.72, H);
  ctx.stroke();
  ctx.restore();

  // buildings
  for (const b of g.buildings) {
    ctx.fillStyle = "#0e1218";
    ctx.strokeStyle = "rgba(80,120,160,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 4);
    ctx.fill();
    ctx.stroke();
    // windows (stable per building)
    const lit = ((b.x * 13 + b.y * 7) | 0) % 5 === 0;
    ctx.fillStyle = lit ? "rgba(255,220,120,0.4)" : "rgba(40,60,80,0.35)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(b.x - b.w * 0.3 + i * 10, b.y - 4, 5, 5);
    }
  }

  // drops
  for (const d of g.drops) {
    d.pulse += 0.05;
    const pr = d.r + Math.sin(d.pulse) * 3;
    const grd = ctx.createRadialGradient(d.x, d.y, 4, d.x, d.y, pr);
    grd.addColorStop(0, "rgba(61,214,140,0.45)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(d.x, d.y, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(61,214,140,0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(61,214,140,0.9)";
    ctx.font = "700 10px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText("DROP", d.x, d.y + 3);
  }

  // packages
  for (const pkg of g.packages) {
    pkg.bob += 0.08;
    const by = Math.sin(pkg.bob) * 3;
    ctx.save();
    ctx.translate(pkg.x, pkg.y + by);
    ctx.fillStyle = "#f0b429";
    ctx.strokeStyle = "#a67c00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-10, -8, 20, 16, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 8);
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.restore();
  }

  // patrols
  for (const pat of g.patrols) {
    // vision cone
    ctx.save();
    ctx.translate(pat.x, pat.y);
    ctx.rotate(pat.angle);
    const alert = pat.alert || 0;
    ctx.fillStyle = `rgba(255, 80, 80, ${0.08 + alert * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 120, -0.55, 0.55);
    ctx.closePath();
    ctx.fill();
    // body
    ctx.fillStyle = alert > 0.3 ? "#ff5c5c" : "#c44";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // player
  const p = g.player;
  if (p) {
    // cargo dots
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // glow
    ctx.fillStyle = g.district.accent + "55";
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    // van body
    ctx.fillStyle = "#e8eef6";
    ctx.strokeStyle = g.district.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-16, -10, 32, 20, 5);
    ctx.fill();
    ctx.stroke();
    // cab
    ctx.fillStyle = "#2a3544";
    ctx.fillRect(4, -7, 10, 14);
    // direction nose
    ctx.fillStyle = g.district.accent;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(22, -5);
    ctx.lineTo(22, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // cargo indicators above player
    for (let i = 0; i < p.cargo.length; i++) {
      ctx.fillStyle = "#f0b429";
      ctx.beginPath();
      ctx.arc(p.x - 10 + i * 12, p.y - 24, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // particles
  for (const pt of g.particles) {
    ctx.globalAlpha = clamp(pt.life * 1.5, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // floaters
  for (const f of g.floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = "700 14px IBM Plex Sans, sans-serif";
    ctx.fillStyle = f.color;
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    ctx.fillText(f.text, f.x, f.y);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // message
  if (g.messageT > 0 && g.message) {
    ctx.globalAlpha = clamp(g.messageT * 2, 0, 1);
    ctx.fillStyle = "rgba(10,12,16,0.75)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 180, 48, 360, 36, 10);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 14px IBM Plex Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(g.message, W / 2, 71);
    ctx.globalAlpha = 1;
  }

  // vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  vig.addColorStop(0, "transparent");
  vig.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// polyfill roundRect for older safari if needed
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    this.moveTo(x + rr, y);
    this.arcTo(x + w, y, x + w, y + h, rr);
    this.arcTo(x + w, y + h, x, y + h, rr);
    this.arcTo(x, y + h, x, y, rr);
    this.arcTo(x, y, x + w, y, rr);
    this.closePath();
  };
}
