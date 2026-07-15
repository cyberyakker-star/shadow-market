import { getGoal, visualBars, upgradeCost } from "./game.js";

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function toast(msg, ms = 2400) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

export function showIntake(show) {
  const el = $("#intake-overlay");
  if (el) el.hidden = !show;
}

export function showDrawer(show) {
  const el = $("#bp-drawer");
  if (el) el.hidden = !show;
}

export function showSettings(show) {
  const el = $("#settings-modal");
  if (el) el.hidden = !show;
}

export function showEnd(show, title = "", body = "") {
  const el = $("#end-overlay");
  if (!el) return;
  el.hidden = !show;
  if (title) $("#end-title").textContent = title;
  if (body) $("#end-body").textContent = body;
}

export function renderPresets(presets, onPick) {
  const host = $("#preset-list");
  if (!host) return;
  host.innerHTML = presets
    .map((p) => `<button type="button" class="chip" data-preset="${p.id}">${escapeHtml(p.label)}</button>`)
    .join("");
  host.onclick = (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    const p = presets.find((x) => x.id === btn.dataset.preset);
    if (p) onPick(p);
  };
}

export function flashEvent(text) {
  const el = $("#event-ticker");
  if (!el || !text) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(flashEvent._t);
  flashEvent._t = setTimeout(() => {
    el.hidden = true;
  }, 2800);
}

export function renderHud(state, selectedId = "hq") {
  const p = state.player;
  const g = p?.game;
  const title = $("#empire-title");
  if (title) {
    title.textContent = p
      ? (p.constraint?.raw || p.displayName).replace(/\s+/g, " ").slice(0, 40)
      : "ShadowMarket";
  }

  const cash = $("#cash-chip");
  if (cash) cash.textContent = p?.game ? `₡${Math.round(p.game.cash)}` : "₡0";

  const meta = $("#sim-meta");
  if (meta) {
    if (!g) meta.textContent = "—";
    else {
      meta.textContent = `Shift ${g.shift} · Hauls ${g.hauls}/10 · Threat ${g.threat || 0}`;
    }
  }

  const resHost = $("#hud-resources");
  if (resHost) {
    const bars = visualBars(p);
    resHost.innerHTML = bars
      .map((b) => {
        const pct = Math.round((b.value / Math.max(1, b.max)) * 100);
        const cls = b.key === "heat" ? (pct > 70 ? "low" : "") : pct < 25 ? "low" : pct > 70 ? "high" : "";
        return `
          <div class="res-bar ${cls}" title="${escapeHtml(b.hint || "")}">
            <span class="res-label">${escapeHtml(b.label)}</span>
            <div class="res-track"><i style="width:${pct}%"></i></div>
            <span class="res-val">${Math.round(b.value)}/${b.max}</span>
          </div>`;
      })
      .join("");
  }

  // Goal
  const goalEl = $("#goal-banner");
  if (goalEl) {
    if (!p) {
      goalEl.hidden = true;
    } else {
      goalEl.hidden = false;
      const goal = getGoal(p);
      $("#goal-title").textContent = goal.title;
      $("#goal-detail").textContent = goal.detail;
      const fill = $("#goal-fill");
      if (fill) fill.style.width = `${Math.round(clamp(goal.progress, 0, 1) * 100)}%`;
    }
  }

  const has = !!p && p.status !== "collapsed" && p.status !== "ascended";
  ["#btn-make", "#btn-ship", "#btn-upgrade", "#btn-cool", "#btn-rest", "#btn-blueprints-hud"].forEach((sel) => {
    const el = $(sel);
    if (el) el.disabled = !has;
  });

  // Upgrade button shows cost
  const up = $("#btn-upgrade");
  if (up && g) {
    const tid = selectedId && selectedId !== "hq" && g.levels?.[selectedId] != null ? selectedId : "hq";
    const cost = upgradeCost(p, tid);
    up.textContent = `UPGRADE ₡${cost}`;
  } else if (up) up.textContent = "UPGRADE";

  // Dim help after first haul
  const help = $("#help-strip");
  if (help && g) help.classList.toggle("dim", g.hauls >= 2);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function renderInspect(node, handlers = {}) {
  const panel = $("#inspect");
  const body = $("#inspect-body");
  const actions = $("#inspect-actions");
  if (!panel || !body) return;
  if (!node) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const m = node.meta || {};

  if (m.type === "hq") {
    const e = m.empire;
    const g = e.game;
    body.innerHTML = `
      <p class="kicker">Your HQ · Lv${g?.hqLevel || 1}</p>
      <h3>${escapeHtml(e.displayName)}</h3>
      <p class="one-liner">MAKE here fills stock. UPGRADE raises output. Win at 10 hauls or ₡800.</p>
      <div class="mini-stats">
        <span>Stock ${g?.stock ?? 0}/${g?.stockMax ?? 0}</span>
        <span>Energy ${g?.energy ?? 0}</span>
        <span>Heat ${Math.round(g?.heat ?? 0)}</span>
      </div>`;
    actions.innerHTML = `
      <button type="button" data-act="make">MAKE</button>
      <button type="button" data-act="ship">SHIP</button>
      <button type="button" data-act="upgrade">UPGRADE HQ</button>`;
  } else if (m.type === "blueprint") {
    const bp = m.bp;
    const lv = handlers.getLevel?.(bp.id) || 1;
    body.innerHTML = `
      <p class="kicker">${escapeHtml(bp.kind)} · Lv${lv}</p>
      <h3>${escapeHtml(bp.title)}</h3>
      <p class="one-liner">${escapeHtml(bp.summary)}</p>
      <p class="muted small">Upgrading this node boosts MAKE output.</p>`;
    actions.innerHTML = `<button type="button" data-act="upgrade">UPGRADE ₡${handlers.upgradeCost?.(bp.id) ?? "?"}</button>`;
  } else if (m.type === "rival") {
    const r = m.rival;
    body.innerHTML = `
      <p class="kicker">${escapeHtml(r.relation || "rival")}</p>
      <h3>${escapeHtml(r.displayName)}</h3>
      <p class="one-liner">Constraint: ${escapeHtml((r.constraint?.raw || "").slice(0, 70))}</p>
      <p class="muted small">Allies pay you on REST. Unchecked rivals steal stock and raise threat.</p>`;
    const dis = r.relation === "merged" ? "disabled" : "";
    actions.innerHTML = `
      <button type="button" data-act="ally" ${dis || r.relation === "ally" ? "disabled" : ""}>ALLY ₡25</button>
      <button type="button" data-act="hit" ${dis}>HIT</button>`;
  }

  actions.onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    if (act === "make") handlers.onMake?.();
    if (act === "ship") handlers.onShip?.();
    if (act === "upgrade") handlers.onUpgrade?.(m.type === "blueprint" ? m.bp.id : "hq");
    if (act === "ally") handlers.onAlly?.(m.rival.id);
    if (act === "hit") handlers.onHit?.(m.rival.id);
  };
}

export function renderBlueprints(empire) {
  const host = $("#blueprint-list");
  if (!host) return;
  if (!empire?.blueprints?.length) {
    host.innerHTML = `<p class="muted">No blueprints.</p>`;
    return;
  }
  const levels = empire.game?.levels || {};
  host.innerHTML = empire.blueprints
    .map(
      (bp) => `
    <article class="bp-card" data-kind="${bp.kind}">
      <span class="bp-kind">${escapeHtml(bp.kind)} · Lv${levels[bp.id] || 1}</span>
      <h3>${escapeHtml(bp.title)}</h3>
      <p>${escapeHtml(bp.summary)}</p>
    </article>`
    )
    .join("");
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}
