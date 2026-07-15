import { PRESETS } from "./data/presets.js";
import { loadState, saveState, resetState } from "./state.js";
import { generateEmpire } from "./generate.js";
import { initRivals, encodeSeal, importRivalSeal } from "./rivals.js";
import { exportMarkdown, exportJSON } from "./export.js";
import { EmpireMap } from "./map.js";
import {
  initGame,
  ensureGame,
  actionMake,
  actionShip,
  actionUpgrade,
  actionCool,
  actionRest,
  actionHitRival,
  actionAllyRival,
  upgradeCost,
} from "./game.js";
import {
  $,
  toast,
  showIntake,
  showDrawer,
  showSettings,
  showEnd,
  renderPresets,
  renderHud,
  renderInspect,
  renderBlueprints,
  flashEvent,
} from "./ui.js";

const STORAGE_BUMP = "shadowmarket:v2-game";

let state = loadState();
// Force new game schema if missing
if (state.player && !state.player.game) {
  state.player = null;
  saveState(state);
}

let map = null;
let selectedId = "hq";

function persist() {
  saveState(state);
}

function refresh() {
  if (state.player) ensureGame(state.player);
  map?.setState(state);
  map?.drawMinimap($("#minimap"));
  renderHud(state, selectedId);
  renderBlueprints(state.player);
}

function doAction(fn) {
  if (!state.player) return toast("Build an empire first");
  const res = fn();
  if (!res.ok) {
    toast(res.error || "Can't do that");
    return;
  }
  if (res.fx) map?.fx(res.fx.kind, res.fx.amount || 0);
  flashEvent(res.msg);
  toast(res.msg);
  persist();
  refresh();
  // re-open inspect if selection still valid
  const node = map?.nodes?.find((n) => n.id === selectedId);
  if (node) openInspect(node);

  if (res.ended) {
    if (res.reason === "ascended") {
      showEnd(true, "Empire secured", `You hit the win target. ${res.msg || ""}`);
    } else {
      showEnd(true, "Shut down", res.msg || "Heat or collapse ended the run.");
    }
  }
}

function openInspect(node) {
  selectedId = node.id;
  renderInspect(node, {
    getLevel: (id) => state.player?.game?.levels?.[id] || 1,
    upgradeCost: (id) => upgradeCost(state.player, id),
    onMake: () => doAction(() => actionMake(state)),
    onShip: () => doAction(() => actionShip(state)),
    onUpgrade: (id) => doAction(() => actionUpgrade(state, id || "hq")),
    onAlly: (id) => doAction(() => actionAllyRival(state, id)),
    onHit: (id) => doAction(() => actionHitRival(state, id)),
  });
  renderHud(state, selectedId);
}

function foundEmpire(text) {
  const trimmed = (text || "").trim();
  if (trimmed.length < 4) return toast("Type a real constraint (a few words).");

  state.player = initGame(generateEmpire(trimmed));
  state.ledger = [];
  state.capitalHistory = [];
  state.actions = [];
  state.modifiers = { revenueMult: 1, burnMult: 1, allyIds: [], sabotageUntil: {} };
  state.rivals = [];
  initRivals(state);
  // fewer rivals for clarity
  state.rivals = state.rivals.slice(0, 5);

  selectedId = "hq";
  persist();
  showIntake(false);
  showEnd(false);
  refresh();
  toast("Floor online — MAKE stock, then SHIP");
  flashEvent("Goal: complete 3 hauls. MAKE → SHIP → REST when energy is empty.");
}

function boot() {
  // one-time clear of confusing v1 autosim saves
  try {
    if (!localStorage.getItem(STORAGE_BUMP)) {
      localStorage.setItem(STORAGE_BUMP, "1");
    }
  } catch {}

  map = new EmpireMap($("#empire-map"));
  map.onSelect = (node) => openInspect(node);

  renderPresets(PRESETS, (p) => {
    $("#constraint-input").value = p.text;
  });

  $("#btn-found")?.addEventListener("click", () => foundEmpire($("#constraint-input")?.value));
  $("#constraint-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) foundEmpire(e.target.value);
  });

  $("#btn-make")?.addEventListener("click", () => doAction(() => actionMake(state)));
  $("#btn-ship")?.addEventListener("click", () => doAction(() => actionShip(state)));
  $("#btn-upgrade")?.addEventListener("click", () => {
    const id =
      selectedId && state.player?.game?.levels?.[selectedId] != null ? selectedId : "hq";
    doAction(() => actionUpgrade(state, id));
  });
  $("#btn-cool")?.addEventListener("click", () => doAction(() => actionCool(state)));
  $("#btn-rest")?.addEventListener("click", () => doAction(() => actionRest(state)));

  $("#btn-new-empire")?.addEventListener("click", () => {
    showEnd(false);
    showIntake(true);
  });
  $("#btn-end-new")?.addEventListener("click", () => {
    showEnd(false);
    showIntake(true);
  });

  $("#btn-blueprints-hud")?.addEventListener("click", () => {
    renderBlueprints(state.player);
    showDrawer(true);
  });
  $("#bp-close")?.addEventListener("click", () => showDrawer(false));
  $("#inspect-close")?.addEventListener("click", () => {
    $("#inspect").hidden = true;
    if (map) map.selectedId = null;
  });

  $("#btn-export-md")?.addEventListener("click", () => {
    if (state.player) exportMarkdown(state.player);
  });
  $("#btn-export-json")?.addEventListener("click", () => {
    if (state.player) exportJSON(state.player);
  });

  $("#btn-settings")?.addEventListener("click", () => showSettings(true));
  $("#settings-close")?.addEventListener("click", () => showSettings(false));
  $("#btn-seal-copy")?.addEventListener("click", async () => {
    if (!state.player) return toast("No empire");
    const seal = encodeSeal(state.player);
    try {
      await navigator.clipboard.writeText(seal);
      toast("Seal copied");
    } catch {
      prompt("Seal:", seal);
    }
  });
  $("#btn-seal-import")?.addEventListener("click", () => {
    if (!state.player) return toast("Build your empire first");
    const res = importRivalSeal(state, $("#seal-input")?.value || "");
    if (!res.ok) return toast(res.error);
    $("#seal-input").value = "";
    showSettings(false);
    persist();
    refresh();
    toast("Rival imported");
  });
  $("#btn-reset")?.addEventListener("click", () => {
    if (!confirm("Wipe save?")) return;
    state = resetState();
    showSettings(false);
    showIntake(true);
    refresh();
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea")) return;
    if (e.key === "1") doAction(() => actionMake(state));
    if (e.key === "2") doAction(() => actionShip(state));
    if (e.key === "3") doAction(() => actionUpgrade(state, selectedId === "hq" ? "hq" : selectedId));
    if (e.key === "4") doAction(() => actionCool(state));
    if (e.key === "5" || e.key === "r") doAction(() => actionRest(state));
    if (e.key === "Escape") {
      showDrawer(false);
      showSettings(false);
      $("#inspect").hidden = true;
    }
  });

  if (state.player) {
    ensureGame(state.player);
    if (!state.rivals?.length) initRivals(state);
    showIntake(false);
    refresh();
  } else {
    showIntake(true);
    refresh();
  }
}

boot();
