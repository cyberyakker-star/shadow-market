import { PRESETS } from "./data/presets.js";
import { loadState, saveState, resetState, pushLedger } from "./state.js";
import { generateEmpire } from "./generate.js";
import { tickOnce } from "./simulate.js";
import {
  initRivals,
  allyWith,
  sabotage,
  mergeWith,
  encodeSeal,
  importRivalSeal,
} from "./rivals.js";
import { exportMarkdown, exportJSON, printBlueprints } from "./export.js";
import { EmpireMap } from "./map.js";
import {
  $,
  toast,
  showIntake,
  showDrawer,
  showSettings,
  renderPresets,
  renderHud,
  renderInspect,
  renderBlueprints,
  flashEvent,
} from "./ui.js";

let state = loadState();
let simTimer = null;
let map = null;

function persist() {
  saveState(state);
}

function refreshVisual() {
  map?.setState(state);
  map?.drawMinimap($("#minimap"));
  renderHud(state);
  renderBlueprints(state.player);
}

function act(fn) {
  const res = fn();
  if (!res.ok) {
    toast(res.error || "Action failed");
    return;
  }
  toast(res.outcome || "Done");
  flashEvent(res.outcome);
  persist();
  refreshVisual();
}

function foundEmpire(text) {
  const trimmed = (text || "").trim();
  if (trimmed.length < 4) {
    toast("Name a real constraint (a few words).");
    return;
  }
  stopSim();
  state.player = generateEmpire(trimmed);
  state.ledger = [];
  state.capitalHistory = [state.player.resources.capital];
  state.actions = [];
  state.modifiers = { revenueMult: 1, burnMult: 1, allyIds: [], sabotageUntil: {} };
  state.rivals = [];
  initRivals(state);
  pushLedger(state, `Founded ${state.player.displayName}`, 0);
  persist();
  showIntake(false);
  refreshVisual();
  toast("Empire floor online");
}

function stopSim() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  if (state.player?.status === "running") state.player.status = "paused";
  if (map) map.running = false;
}

function startSim() {
  if (!state.player) return toast("Found an empire first");
  if (state.player.status === "collapsed" || state.player.status === "ascended") {
    return toast("Empire ended — start a new one");
  }
  stopSim();
  state.player.status = "running";
  if (map) map.running = true;
  const speed = state.settings.speed || 10;
  const interval = Math.max(50, Math.round(1000 / speed));
  simTimer = setInterval(() => {
    const res = tickOnce(state);
    persist();
    refreshVisual();
    if (res.events?.length) flashEvent(res.events[res.events.length - 1]);
    if (res.ended) {
      stopSim();
      refreshVisual();
      if (res.reason === "ascended") toast("Ascended — niche standard achieved");
      else toast("Collapsed — constraint won this round");
    }
  }, interval);
  persist();
  refreshVisual();
}

function updateSpeedUI() {
  const speed = state.settings.speed || 10;
  document.querySelectorAll("[data-speed]").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.speed) === speed);
  });
}

function boot() {
  const canvas = $("#empire-map");
  map = new EmpireMap(canvas);
  map.onSelect = (node) => {
    renderInspect(node, {
      onBlueprints: () => showDrawer(true),
      onAlly: (id) => act(() => allyWith(state, id)),
      onSabotage: (id) => act(() => sabotage(state, id)),
      onMerge: (id) => act(() => mergeWith(state, id)),
    });
  };

  renderPresets(PRESETS, (p) => {
    $("#constraint-input").value = p.text;
  });

  $("#btn-found")?.addEventListener("click", () => foundEmpire($("#constraint-input")?.value));
  $("#constraint-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) foundEmpire(e.target.value);
  });

  $("#btn-sim-start")?.addEventListener("click", startSim);
  $("#btn-sim-pause")?.addEventListener("click", () => {
    stopSim();
    persist();
    refreshVisual();
    toast("Paused");
  });

  document.querySelectorAll("[data-speed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.speed = Number(btn.dataset.speed) || 10;
      persist();
      updateSpeedUI();
      if (simTimer) startSim();
    });
  });

  $("#btn-new-empire")?.addEventListener("click", () => showIntake(true));
  $("#btn-blueprints-hud")?.addEventListener("click", () => {
    if (!state.player) return;
    renderBlueprints(state.player);
    showDrawer(true);
  });
  $("#bp-close")?.addEventListener("click", () => showDrawer(false));
  $("#inspect-close")?.addEventListener("click", () => {
    $("#inspect").hidden = true;
    if (map) map.selectedId = null;
  });

  $("#btn-export-md")?.addEventListener("click", () => {
    if (!state.player) return;
    exportMarkdown(state.player);
    toast("Markdown downloaded");
  });
  $("#btn-export-json")?.addEventListener("click", () => {
    if (!state.player) return;
    exportJSON(state.player);
    toast("JSON downloaded");
  });
  $("#btn-print")?.addEventListener("click", () => printBlueprints());

  $("#btn-seal-copy")?.addEventListener("click", async () => {
    if (!state.player) return;
    const seal = encodeSeal(state.player);
    try {
      await navigator.clipboard.writeText(seal);
      toast("Empire Seal copied");
    } catch {
      prompt("Empire Seal:", seal);
    }
  });

  $("#btn-settings")?.addEventListener("click", () => showSettings(true));
  $("#settings-close")?.addEventListener("click", () => showSettings(false));
  $("#btn-seal-import")?.addEventListener("click", () => {
    const seal = $("#seal-input")?.value;
    if (!seal?.trim()) return toast("Paste a seal first");
    if (!state.player) return toast("Found your empire first");
    const res = importRivalSeal(state, seal.trim());
    if (!res.ok) return toast(res.error);
    $("#seal-input").value = "";
    showSettings(false);
    persist();
    refreshVisual();
    toast(`Rival ${res.empire.handle} on the floor`);
  });
  $("#btn-reset")?.addEventListener("click", () => {
    if (!confirm("Wipe all local ShadowMarket data?")) return;
    stopSim();
    state = resetState();
    showSettings(false);
    showIntake(true);
    refreshVisual();
    toast("Wiped");
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "1") {
      state.settings.speed = 1;
      updateSpeedUI();
      if (simTimer) startSim();
    }
    if (e.key === "2") {
      state.settings.speed = 10;
      updateSpeedUI();
      if (simTimer) startSim();
    }
    if (e.key === "3") {
      state.settings.speed = 60;
      updateSpeedUI();
      if (simTimer) startSim();
    }
    if (e.key === " " && state.player) {
      e.preventDefault();
      if (simTimer) {
        stopSim();
        persist();
        refreshVisual();
      } else startSim();
    }
    if (e.key === "Escape") {
      showDrawer(false);
      showSettings(false);
      $("#inspect").hidden = true;
    }
  });

  if (!state.rivals?.length && state.player) initRivals(state);

  if (state.player) {
    showIntake(false);
    refreshVisual();
  } else {
    showIntake(true);
    refreshVisual();
  }
  updateSpeedUI();
}

boot();
