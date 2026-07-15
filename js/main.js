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
import {
  $,
  showView,
  toast,
  renderPresets,
  renderDossier,
  renderSim,
  renderBlueprints,
  renderRivals,
  setNavEnabled,
} from "./ui.js";

let state = loadState();
let simTimer = null;

function persist() {
  saveState(state);
}

function refreshAll() {
  const has = !!state.player;
  setNavEnabled(has);
  renderDossier(state.player);
  renderSim(state);
  renderBlueprints(state.player);
  renderRivals(state, {
    onAlly: (id) => act(() => allyWith(state, id)),
    onSabotage: (id) => act(() => sabotage(state, id)),
    onMerge: (id) => act(() => mergeWith(state, id)),
  });
  updateSpeedUI();
  $("#btn-seal-copy") && ($("#btn-seal-copy").disabled = !has);
}

function act(fn) {
  const res = fn();
  if (!res.ok) {
    toast(res.error || "Action failed");
    return;
  }
  toast(res.outcome || "Done");
  persist();
  refreshAll();
}

function foundEmpire(text) {
  const trimmed = (text || "").trim();
  if (trimmed.length < 4) {
    toast("Describe a real constraint (a few words at least).");
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
  pushLedger(state, `Founded ${state.player.displayName} from constraint.`, 0);
  persist();
  refreshAll();
  showView("dossier");
  toast(`Empire online: ${state.player.handle}`);
}

function stopSim() {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  if (state.player && state.player.status === "running") {
    state.player.status = "paused";
  }
}

function startSim() {
  if (!state.player) {
    toast("Found an empire first.");
    return;
  }
  if (state.player.status === "collapsed" || state.player.status === "ascended") {
    toast("This empire has ended. Found a new one from the intake floor.");
    return;
  }
  stopSim();
  state.player.status = "running";
  const speed = state.settings.speed || 10;
  // base: 1 logical tick per interval; speed scales interval
  const interval = Math.max(50, Math.round(1000 / speed));
  simTimer = setInterval(() => {
    const res = tickOnce(state);
    persist();
    renderSim(state);
    renderDossier(state.player);
    if (res.ended) {
      stopSim();
      refreshAll();
      if (res.reason === "ascended") toast("Ascended — your micro-empire is the quiet standard.");
      else if (res.reason === "collapsed") toast("Collapsed — the constraint claimed another operator.");
    }
  }, interval);
  persist();
  refreshAll();
  toast(`Simulation running at ${speed}×`);
}

function updateSpeedUI() {
  const speed = state.settings.speed || 10;
  $allSpeed().forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.speed) === speed);
  });
}

function $allSpeed() {
  return [...document.querySelectorAll("[data-speed]")];
}

function boot() {
  renderPresets(PRESETS, (p) => {
    $("#constraint-input").value = p.text;
  });

  // Navigation
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      showView(btn.dataset.nav);
    });
  });

  $("#btn-found")?.addEventListener("click", () => {
    foundEmpire($("#constraint-input")?.value);
  });

  $("#constraint-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      foundEmpire(e.target.value);
    }
  });

  $("#btn-sim-start")?.addEventListener("click", startSim);
  $("#btn-sim-pause")?.addEventListener("click", () => {
    stopSim();
    persist();
    refreshAll();
    toast("Simulation paused");
  });

  $allSpeed().forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.speed = Number(btn.dataset.speed) || 10;
      persist();
      if (simTimer) startSim();
      else updateSpeedUI();
    });
  });

  $("#btn-export-md")?.addEventListener("click", () => {
    if (!state.player) return toast("No empire to export");
    exportMarkdown(state.player);
    toast("Markdown downloaded");
  });
  $("#btn-export-json")?.addEventListener("click", () => {
    if (!state.player) return toast("No empire to export");
    exportJSON(state.player, { rivals: state.rivals?.length, tick: state.player.tick });
    toast("JSON downloaded");
  });
  $("#btn-print")?.addEventListener("click", () => {
    if (!state.player) return toast("No empire to print");
    printBlueprints();
  });

  $("#btn-seal-copy")?.addEventListener("click", async () => {
    if (!state.player) return;
    const seal = encodeSeal(state.player);
    try {
      await navigator.clipboard.writeText(seal);
      toast("Empire Seal copied — send it to another operator");
    } catch {
      prompt("Copy your Empire Seal:", seal);
    }
  });

  $("#btn-seal-import")?.addEventListener("click", () => {
    const seal = $("#seal-input")?.value;
    if (!seal?.trim()) return toast("Paste an Empire Seal first");
    const res = importRivalSeal(state, seal.trim());
    if (!res.ok) return toast(res.error);
    $("#seal-input").value = "";
    persist();
    refreshAll();
    showView("rivals");
    toast(`Imported ${res.empire.handle}`);
  });

  $("#btn-reset")?.addEventListener("click", () => {
    if (!confirm("Wipe local ShadowMarket state on this device?")) return;
    stopSim();
    state = resetState();
    initRivals(state);
    persist();
    refreshAll();
    showView("intake");
    toast("State wiped");
  });

  // Ensure rivals exist even without player (for empty market feel)
  if (!state.rivals?.length) initRivals(state);

  if (state.player) {
    refreshAll();
    showView("dossier");
  } else {
    setNavEnabled(false);
    showView("intake");
    renderRivals(state, {
      onAlly: () => toast("Found an empire first"),
      onSabotage: () => toast("Found an empire first"),
      onMerge: () => toast("Found an empire first"),
    });
  }

  // Keyboard: 1/2/3 speed when on sim
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "1") {
      state.settings.speed = 1;
      if (simTimer) startSim();
      else updateSpeedUI();
    }
    if (e.key === "2") {
      state.settings.speed = 10;
      if (simTimer) startSim();
      else updateSpeedUI();
    }
    if (e.key === "3") {
      state.settings.speed = 60;
      if (simTimer) startSim();
      else updateSpeedUI();
    }
    if (e.key === " ") {
      const simVisible = !$("[data-view='sim']")?.hidden;
      if (simVisible) {
        e.preventDefault();
        if (simTimer) {
          stopSim();
          persist();
          refreshAll();
        } else startSim();
      }
    }
  });
}

boot();
