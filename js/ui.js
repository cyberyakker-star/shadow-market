import { formatSimTime } from "./simulate.js";

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

export function showView(name) {
  $all("[data-view]").forEach((el) => {
    el.hidden = el.dataset.view !== name;
  });
  $all("[data-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === name);
  });
}

export function toast(msg, ms = 2800) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

function meter(label, value, max, cls = "") {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return `
    <div class="meter ${cls}">
      <div class="meter-head"><span>${label}</span><span>${Math.round(value)}${max !== 100 || label.includes("₡") ? "" : ""}</span></div>
      <div class="meter-track"><div class="meter-fill" style="width:${pct}%"></div></div>
    </div>`;
}

export function renderPresets(presets, onPick) {
  const host = $("#preset-list");
  if (!host) return;
  host.innerHTML = presets
    .map(
      (p) =>
        `<button type="button" class="chip" data-preset="${p.id}">${escapeHtml(p.label)}</button>`
    )
    .join("");
  host.onclick = (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    const p = presets.find((x) => x.id === btn.dataset.preset);
    if (p) onPick(p);
  };
}

export function renderDossier(empire) {
  const host = $("#dossier");
  if (!host || !empire) {
    if (host) host.innerHTML = `<p class="muted">Found an empire from a constraint to open the dossier.</p>`;
    return;
  }
  const tags = (empire.constraint.tags || [])
    .filter((t) => t !== "default")
    .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
    .join(" ");

  host.innerHTML = `
    <div class="dossier-header">
      <div>
        <p class="kicker">${escapeHtml(empire.archetypeTitle || "")}</p>
        <h2>${escapeHtml(empire.displayName)}</h2>
        <p class="handle">${escapeHtml(empire.handle)}</p>
      </div>
      <div class="status-pill status-${empire.status}">${escapeHtml(empire.status)}</div>
    </div>
    <p class="constraint-line"><strong>Constraint fuel:</strong> ${escapeHtml(empire.constraint.raw)}</p>
    <div class="tags">${tags || '<span class="tag">general</span>'}</div>
    <p class="pitch">${escapeHtml(empire.pitch)}</p>
    <p class="origin muted">${escapeHtml(empire.originStory)}</p>
    <div class="stat-grid">
      ${statCard("Capital", "₡" + Math.round(empire.resources.capital))}
      ${statCard("Inventory", Math.round(empire.resources.inventory))}
      ${statCard("Reputation", Math.round(empire.resources.reputation))}
      ${statCard("Stress", Math.round(empire.resources.stress))}
      ${statCard("Rev/tick", empire.metrics.revenuePerTick.toFixed(1))}
      ${statCard("Burn/tick", empire.metrics.burnPerTick.toFixed(1))}
      ${statCard("Share", empire.metrics.marketShare.toFixed(1) + "%")}
      ${statCard("Heat", Math.round(empire.metrics.heat))}
    </div>
  `;
}

function statCard(label, value) {
  return `<div class="stat-card"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

export function renderSim(state) {
  const empire = state.player;
  const meters = $("#sim-meters");
  const meta = $("#sim-meta");
  const spark = $("#sparkline");
  if (!empire) {
    if (meters) meters.innerHTML = "";
    if (meta) meta.textContent = "No empire running.";
    return;
  }

  if (meta) {
    meta.innerHTML = `
      <span>${escapeHtml(empire.displayName)}</span>
      <span class="sep">·</span>
      <span>${formatSimTime(empire.tick || 0)}</span>
      <span class="sep">·</span>
      <span class="status-${empire.status}">${escapeHtml(empire.status)}</span>
    `;
  }

  if (meters) {
    meters.innerHTML = [
      meter("Capital ₡", empire.resources.capital, Math.max(400, empire.resources.capital)),
      meter("Stress", empire.resources.stress, 100, empire.resources.stress > 70 ? "danger" : ""),
      meter("Heat", empire.metrics.heat, 100, empire.metrics.heat > 60 ? "warn" : ""),
      meter("Reputation", empire.resources.reputation, 100, "ok"),
      meter("Market share", empire.metrics.marketShare, 50, "ok"),
      meter("Inventory", empire.resources.inventory, 100),
    ].join("");
  }

  if (spark) {
    const hist = state.capitalHistory || [];
    if (hist.length < 2) {
      spark.innerHTML = `<span class="muted">Capital history appears as the sim runs.</span>`;
    } else {
      const max = Math.max(...hist, 1);
      const min = Math.min(...hist, 0);
      const range = Math.max(1, max - min);
      const bars = hist
        .map((v) => {
          const h = 8 + ((v - min) / range) * 52;
          return `<i style="height:${h}px" title="₡${Math.round(v)}"></i>`;
        })
        .join("");
      spark.innerHTML = `<div class="bars">${bars}</div>`;
    }
  }

  renderLedger(state.ledger || []);
}

export function renderLedger(ledger) {
  const host = $("#ledger");
  if (!host) return;
  if (!ledger.length) {
    host.innerHTML = `<li class="muted">Ledger empty — start the simulation.</li>`;
    return;
  }
  host.innerHTML = ledger
    .slice(0, 40)
    .map(
      (e) =>
        `<li><span class="tick">t${e.t}</span> ${escapeHtml(e.line)}</li>`
    )
    .join("");
}

export function renderBlueprints(empire) {
  const host = $("#blueprint-list");
  if (!host) return;
  if (!empire?.blueprints?.length) {
    host.innerHTML = `<p class="muted">Blueprints appear after you found an empire.</p>`;
    return;
  }
  host.innerHTML = empire.blueprints
    .map(
      (bp) => `
    <article class="bp-card" data-kind="${bp.kind}">
      <header>
        <span class="bp-kind">${escapeHtml(bp.kind)}</span>
        <h3>${escapeHtml(bp.title)}</h3>
      </header>
      <p>${escapeHtml(bp.summary)}</p>
      <ol>${(bp.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
      <p class="materials"><strong>Materials:</strong> ${escapeHtml((bp.materials || []).join(", "))}</p>
      <p class="risk"><strong>Risk:</strong> ${escapeHtml(bp.riskNote || "—")}</p>
    </article>`
    )
    .join("");
}

export function renderRivals(state, handlers) {
  const host = $("#rival-list");
  if (!host) return;
  const rivals = state.rivals || [];
  if (!rivals.length) {
    host.innerHTML = `<p class="muted">No rivals on the floor yet.</p>`;
    return;
  }
  host.innerHTML = rivals
    .map((r) => {
      const disabled = r.relation === "merged" ? "disabled" : "";
      return `
      <article class="rival-card relation-${r.relation || "neutral"}">
        <header>
          <div>
            <h3>${escapeHtml(r.displayName)}</h3>
            <p class="handle">${escapeHtml(r.handle)}</p>
          </div>
          <span class="relation-pill">${escapeHtml(r.relation || "neutral")}</span>
        </header>
        <p class="constraint-line">${escapeHtml(r.constraint?.raw || "")}</p>
        <p class="muted small">${escapeHtml((r.pitch || "").slice(0, 140))}…</p>
        <div class="rival-actions">
          <button type="button" data-act="ally" data-id="${r.id}" ${disabled || r.relation === "ally" ? "disabled" : ""}>Ally</button>
          <button type="button" data-act="sabotage" data-id="${r.id}" ${disabled}>Sabotage</button>
          <button type="button" data-act="merge" data-id="${r.id}" ${disabled}>Merge</button>
        </div>
      </article>`;
    })
    .join("");

  host.onclick = (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn || btn.disabled) return;
    const act = btn.dataset.act;
    const id = btn.dataset.id;
    if (act === "ally") handlers.onAlly(id);
    if (act === "sabotage") handlers.onSabotage(id);
    if (act === "merge") handlers.onMerge(id);
  };
}

export function setNavEnabled(hasEmpire) {
  $all("[data-nav]").forEach((btn) => {
    if (btn.dataset.nav === "intake") return;
    btn.disabled = !hasEmpire;
  });
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
