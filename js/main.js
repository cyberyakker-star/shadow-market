// Night Ops entry
import { PRESETS } from "./districts.js";
import {
  createGame,
  startNight,
  update,
  buyUpgrade,
  shopCatalog,
  W,
  H,
} from "./game.js";
import { draw, resizeCanvas } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
resizeCanvas(canvas);

const el = {
  menu: document.getElementById("screen-menu"),
  shop: document.getElementById("screen-shop"),
  pause: document.getElementById("screen-pause"),
  end: document.getElementById("screen-end"),
  hud: document.getElementById("hud"),
  constraint: document.getElementById("constraint"),
  presets: document.getElementById("presets"),
  start: document.getElementById("btn-start"),
  nextNight: document.getElementById("btn-next-night"),
  resume: document.getElementById("btn-resume"),
  quit: document.getElementById("btn-quit"),
  again: document.getElementById("btn-again"),
  shopItems: document.getElementById("shop-items"),
  shopCash: document.getElementById("shop-cash"),
  shopNight: document.getElementById("shop-night"),
  endTitle: document.getElementById("end-title"),
  endBlurb: document.getElementById("end-blurb"),
  hudDistrict: document.getElementById("hud-district"),
  hudNight: document.getElementById("hud-night"),
  hudQuota: document.getElementById("hud-quota"),
  hudCash: document.getElementById("hud-cash"),
  hudCargo: document.getElementById("hud-cargo"),
  hudHeat: document.getElementById("hud-heat"),
  touchHint: document.getElementById("touch-hint"),
};

let g = null;
let last = 0;
let prevPhase = null;

// Presets
el.presets.innerHTML = PRESETS.map(
  (p) => `<button type="button" data-text="${p.text.replace(/"/g, "&quot;")}">${p.label}</button>`
).join("");
el.presets.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-text]");
  if (b) el.constraint.value = b.dataset.text;
});

function show(screen) {
  el.menu.hidden = screen !== "menu";
  el.shop.hidden = screen !== "shop";
  el.pause.hidden = screen !== "pause";
  el.end.hidden = screen !== "end";
  el.hud.hidden = screen !== "playing";
}

function startRun() {
  g = createGame(el.constraint.value.trim());
  startNight(g);
  prevPhase = "playing";
  show("playing");
  last = performance.now();
  syncHud();
  // touch hint on coarse pointers
  if (matchMedia("(pointer: coarse)").matches) {
    el.touchHint.classList.add("show");
    setTimeout(() => el.touchHint.classList.remove("show"), 4000);
  }
}

function openShop() {
  show("shop");
  el.shopCash.textContent = `₡${g.cash}`;
  el.shopNight.textContent = String(g.night - 1);
  const items = shopCatalog(g);
  el.shopItems.innerHTML = items
    .map(
      (it) => `
      <button type="button" class="shop-item" data-id="${it.id}" ${it.soldOut || g.cash < it.cost ? "disabled" : ""}>
        <strong>${it.name}</strong>
        <span>${it.desc}</span>
        <em>${it.soldOut ? "MAXED" : "₡" + it.cost}</em>
      </button>`
    )
    .join("");
}

el.shopItems.addEventListener("click", (e) => {
  const b = e.target.closest("[data-id]");
  if (!b || !g) return;
  if (buyUpgrade(g, b.dataset.id)) openShop();
});

el.start.addEventListener("click", startRun);
el.nextNight.addEventListener("click", () => {
  startNight(g);
  show("playing");
  prevPhase = "playing";
});
el.resume.addEventListener("click", () => {
  if (!g) return;
  g.phase = "playing";
  show("playing");
  last = performance.now();
});
el.quit.addEventListener("click", () => {
  g = null;
  show("menu");
});
el.again.addEventListener("click", () => {
  g = null;
  show("menu");
});

function syncHud() {
  if (!g || !g.player) return;
  el.hudDistrict.textContent = g.district.name;
  el.hudDistrict.style.borderColor = g.district.accent;
  el.hudNight.textContent = `Night ${g.night}/5`;
  el.hudQuota.textContent = `${g.delivered} / ${g.quota}`;
  el.hudCash.textContent = String(g.cash);
  el.hudCargo.textContent = `${g.player.cargo.length}/${g.player.cargoMax}`;
  el.hudHeat.style.width = `${Math.min(100, g.heat)}%`;
}

// Keyboard
window.addEventListener("keydown", (e) => {
  if (e.key === "p" || e.key === "P" || e.key === "Escape") {
    if (g?.phase === "playing") {
      g.phase = "pause";
      show("pause");
      e.preventDefault();
      return;
    }
    if (g?.phase === "pause") {
      g.phase = "playing";
      show("playing");
      last = performance.now();
      e.preventDefault();
      return;
    }
  }
  if (!g) return;
  g.keys.add(e.key);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
});
window.addEventListener("keyup", (e) => {
  if (g) g.keys.delete(e.key);
});

// Pointer drive (mouse / touch)
function canvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width;
  const scaleY = H / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
}
function ptrDown(e) {
  if (!g || g.phase !== "playing") return;
  e.preventDefault();
  const p = canvasPos(e);
  g.pointer = { ...p, down: true };
}
function ptrMove(e) {
  if (!g?.pointer?.down) return;
  e.preventDefault();
  const p = canvasPos(e);
  g.pointer.x = p.x;
  g.pointer.y = p.y;
}
function ptrUp() {
  if (g?.pointer) g.pointer.down = false;
}
canvas.addEventListener("mousedown", ptrDown);
window.addEventListener("mousemove", ptrMove);
window.addEventListener("mouseup", ptrUp);
canvas.addEventListener("touchstart", ptrDown, { passive: false });
canvas.addEventListener("touchmove", ptrMove, { passive: false });
window.addEventListener("touchend", ptrUp);

function loop(now) {
  requestAnimationFrame(loop);
  if (!g) {
    // idle menu backdrop
    ctx.fillStyle = "#141820";
    ctx.fillRect(0, 0, W, H);
    return;
  }

  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;

  if (g.phase === "playing") {
    update(g, dt);
    draw(ctx, g);
    syncHud();
  } else if (g.phase === "pause") {
    draw(ctx, g);
  } else {
    draw(ctx, g);
  }

  // phase transitions
  if (g.phase !== prevPhase) {
    if (g.phase === "shop") openShop();
    if (g.phase === "won") {
      show("end");
      el.endTitle.textContent = "Floor legend";
      el.endBlurb.textContent = `Five nights clean. Cash on hand: ₡${g.cash}. ${g.district.blurb}`;
    }
    if (g.phase === "lost") {
      show("end");
      el.endTitle.textContent = "Busted";
      el.endBlurb.textContent = `Heat cooked the run on night ${g.night}. Delivered ${g.delivered} this night. Cash: ₡${g.cash}.`;
    }
    prevPhase = g.phase;
  }
}

show("menu");
requestAnimationFrame(loop);
