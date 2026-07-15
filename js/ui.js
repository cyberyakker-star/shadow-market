import { formatSimTime } from "./simulate.js";
import { visualResources } from "./map.js";

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function toast(msg, ms = 2600) {
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

export function renderHud(state) {
  const p = state.player;
  const title = $("#empire-title");
  if (title) {
    title.textContent = p
      ? (p.constraint?.raw || p.displayName).replace(/\s+/g, " ").slice(0, 42)
      : "ShadowMarket";
  }

  const meta = $("#sim-meta");
  if (meta) {
    if (!p) meta.textContent = "No empire";
    else {
      meta.textContent = `${p.status} · ${formatSimTime(p.tick || 0)} · ₡${Math.round(p.resources.capital)}`;
      meta.className = `sim-chip status-${p.status}`;
    }
  }

  const resHost = $("#hud-resources");
  if (resHost) {
    const bars = visualResources(p);
    resHost.innerHTML = bars
      .map((b) => {
        const pct = Math.round((b.value / b.max) * 100);
        const cls = pct < 25 ? "low" : pct > 70 ? "high" : "";
        return `
          <div class="res-bar ${cls}" title="${escapeHtml(b.hint || "")}">
            <span class="res-label">${escapeHtml(b.label)}</span>
            <div class="res-track"><i style="width:${pct}%"></i></div>
            <span class="res-val">${Math.round(b.value)}/${b.max}</span>
          </div>`;
      })
      .join("");
  }

  const has = !!p;
  ["#btn-blueprints-hud", "#btn-seal-copy", "#btn-export-md", "#btn-sim-start", "#btn-sim-pause"].forEach(
    (sel) => {
      const el = $(sel);
      if (el) el.disabled = !has;
    }
  );
}

export function flashEvent(text) {
  const el = $("#event-ticker");
  if (!el || !text) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(flashEvent._t);
  flashEvent._t = setTimeout(() => {
    el.hidden = true;
  }, 3200);
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
    body.innerHTML = `
      <p class="kicker">Headquarters</p>
      <h3>${escapeHtml(e.displayName)}</h3>
      <p class="handle">${escapeHtml(e.handle)}</p>
      <p class="one-liner">${escapeHtml(e.pitch.split(".")[0])}.</p>
      <div class="mini-stats">
        <span>₡${Math.round(e.resources.capital)}</span>
        <span>Rep ${Math.round(e.resources.reputation)}</span>
        <span>Heat ${Math.round(e.metrics.heat)}</span>
      </div>`;
    actions.innerHTML = `<button type="button" data-go="bp">Blueprints</button>`;
  } else if (m.type === "blueprint") {
    const bp = m.bp;
    body.innerHTML = `
      <p class="kicker">${escapeHtml(bp.kind)}</p>
      <h3>${escapeHtml(bp.title)}</h3>
      <p class="one-liner">${escapeHtml(bp.summary)}</p>
      <ol class="tight">${(bp.steps || []).slice(0, 3).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
    actions.innerHTML = `<button type="button" data-go="bp">All blueprints</button>`;
  } else if (m.type === "rival") {
    const r = m.rival;
    body.innerHTML = `
      <p class="kicker">${escapeHtml(r.relation || "rival")}</p>
      <h3>${escapeHtml(r.displayName)}</h3>
      <p class="handle">${escapeHtml(r.handle)}</p>
      <p class="one-liner">${escapeHtml((r.constraint?.raw || "").slice(0, 80))}</p>`;
    const dis = r.relation === "merged" ? "disabled" : "";
    actions.innerHTML = `
      <button type="button" data-act="ally" ${dis || r.relation === "ally" ? "disabled" : ""}>Ally</button>
      <button type="button" data-act="sabotage" ${dis}>Sabotage</button>
      <button type="button" data-act="merge" ${dis}>Merge</button>`;
  }

  actions.onclick = (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.go === "bp" && handlers.onBlueprints) handlers.onBlueprints();
    if (btn.dataset.act === "ally" && handlers.onAlly) handlers.onAlly(m.rival.id);
    if (btn.dataset.act === "sabotage" && handlers.onSabotage) handlers.onSabotage(m.rival.id);
    if (btn.dataset.act === "merge" && handlers.onMerge) handlers.onMerge(m.rival.id);
  };
}

export function renderBlueprints(empire) {
  const host = $("#blueprint-list");
  if (!host) return;
  if (!empire?.blueprints?.length) {
    host.innerHTML = `<p class="muted">No blueprints yet.</p>`;
    return;
  }
  host.innerHTML = empire.blueprints
    .map(
      (bp) => `
    <article class="bp-card" data-kind="${bp.kind}">
      <span class="bp-kind">${escapeHtml(bp.kind)}</span>
      <h3>${escapeHtml(bp.title)}</h3>
      <p>${escapeHtml(bp.summary)}</p>
      <ol>${(bp.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    </article>`
    )
    .join("");
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// stubs kept for any leftover imports
export function showView() {}
export function setNavEnabled() {}
export function renderDossier() {}
export function renderSim() {}
export function renderRivals() {}
