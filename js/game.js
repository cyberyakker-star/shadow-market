/**
 * ShadowMarket — actual game rules.
 *
 * Fantasy (one sentence):
 *   Your real-life constraint is a warehouse with limited SPACE and ENERGY.
 *   MAKE stock → SHIP hauls for cash → UPGRADE nodes → don't overheat.
 *
 * Win:  10 successful hauls  OR  ₡800 cash
 * Lose: HEAT hits 100
 */

import { pushLedger } from "./state.js";

export const WIN_HAULS = 10;
export const WIN_CASH = 800;
export const HEAT_MAX = 100;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/** Attach playable stats to a generated empire (player only). */
export function initGame(empire) {
  const tags = empire.constraint?.tags || [];
  let stockMax = 18;
  let energyMax = 5;
  let cash = 60;
  let produceBase = 4;

  if (tags.includes("space") || tags.includes("storage") || tags.includes("vehicle")) {
    stockMax = 14; // tighter space = harder, but produce pays more later
    produceBase = 5;
  }
  if (tags.includes("time") || tags.includes("sleep") || tags.includes("parenting")) {
    energyMax = 4;
  }
  if (tags.includes("budget")) cash = 40;
  if (tags.includes("shipping")) {
    cash = 75;
    produceBase = 5;
  }

  empire.game = {
    energy: energyMax,
    energyMax,
    stock: 0,
    stockMax,
    cash,
    heat: 8,
    hauls: 0,
    shift: 1,
    produceBase,
    hqLevel: 1,
    // per-blueprint level id -> level
    levels: Object.fromEntries((empire.blueprints || []).map((b) => [b.id, 1])),
    threat: 0, // rises when rivals unchecked
    lastAction: null,
    log: [],
  };

  // mirror legacy fields for any old UI
  syncLegacy(empire);
  return empire;
}

export function ensureGame(empire) {
  if (empire && !empire.game) initGame(empire);
  return empire;
}

function syncLegacy(empire) {
  const g = empire.game;
  if (!g) return;
  empire.resources = empire.resources || {};
  empire.metrics = empire.metrics || {};
  empire.resources.capital = g.cash;
  empire.resources.inventory = g.stock;
  empire.resources.stress = 100 - (g.energy / g.energyMax) * 100;
  empire.metrics.heat = g.heat;
  empire.metrics.marketShare = g.hauls * 5;
  empire.tick = g.shift;
}

function push(state, msg) {
  const g = state.player.game;
  g.lastAction = msg;
  g.log = [{ msg, shift: g.shift }, ...(g.log || [])].slice(0, 40);
  pushLedger(state, msg, g.shift);
}

function ended(empire) {
  return empire.status === "collapsed" || empire.status === "ascended";
}

function checkEnd(state) {
  const p = state.player;
  const g = p.game;
  if (g.heat >= HEAT_MAX) {
    p.status = "collapsed";
    push(state, "🔥 HEAT maxed — the operation got shut down.");
    return { ok: true, ended: true, reason: "collapsed", msg: "Heat shut you down." };
  }
  if (g.hauls >= WIN_HAULS || g.cash >= WIN_CASH) {
    p.status = "ascended";
    push(state, "🏆 You hit the target. Empire secured.");
    return { ok: true, ended: true, reason: "ascended", msg: "You won!" };
  }
  return null;
}

export function getGoal(empire) {
  ensureGame(empire);
  const g = empire.game;
  if (empire.status === "ascended") return { title: "You won", detail: "Start a new empire from ＋", progress: 1 };
  if (empire.status === "collapsed") return { title: "Shut down", detail: "Start a new empire from ＋", progress: 0 };

  if (g.hauls < 3) {
    return {
      title: `Ship ${3 - g.hauls} more haul${3 - g.hauls === 1 ? "" : "s"}`,
      detail: "MAKE stock, then SHIP it for cash",
      progress: g.hauls / 3,
      step: 1,
    };
  }
  if (g.hqLevel < 2 && g.cash >= 50) {
    return {
      title: "Upgrade HQ",
      detail: "Spend cash to make more stock per MAKE",
      progress: 0.4,
      step: 2,
    };
  }
  if (g.hauls < WIN_HAULS) {
    return {
      title: `Hauls ${g.hauls}/${WIN_HAULS}`,
      detail: `or cash ₡${Math.round(g.cash)}/${WIN_CASH} · keep heat under ${HEAT_MAX}`,
      progress: Math.max(g.hauls / WIN_HAULS, g.cash / WIN_CASH),
      step: 3,
    };
  }
  return { title: "Keep going", detail: "", progress: 1, step: 3 };
}

/** Produce stock at HQ (and leveled blueprints). */
export function actionMake(state) {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;
  if (g.energy < 1) return { ok: false, error: "No ENERGY — hit REST to start a new shift." };
  if (g.stock >= g.stockMax) return { ok: false, error: "SPACE full — SHIP stock before making more." };

  g.energy -= 1;
  const bpBonus = Object.values(g.levels || {}).reduce((s, lv) => s + (lv - 1), 0);
  const amount = Math.min(
    g.stockMax - g.stock,
    g.produceBase + (g.hqLevel - 1) * 2 + Math.floor(bpBonus / 2)
  );
  g.stock += amount;
  // using space raises heat slightly
  g.heat = clamp(g.heat + 1, 0, HEAT_MAX);
  p.status = "running";
  const msg = `MAKE +${amount} stock (space ${g.stock}/${g.stockMax})`;
  push(state, msg);
  syncLegacy(p);
  return { ok: true, msg, fx: { kind: "make", amount }, ...(checkEnd(state) || {}) };
}

/** Ship stock for cash + haul count. */
export function actionShip(state) {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;
  if (g.energy < 1) return { ok: false, error: "No ENERGY — hit REST." };
  if (g.stock < 3) return { ok: false, error: "Need at least 3 stock to fill a haul. MAKE first." };

  g.energy -= 1;
  const shipped = Math.min(g.stock, 6 + g.hqLevel);
  g.stock -= shipped;
  const pay = shipped * (8 + g.hqLevel * 3) + (state.modifiers?.allyIds?.length || 0) * 5;
  // threat from rivals reduces pay
  const threatCut = Math.floor(pay * Math.min(0.4, (g.threat || 0) * 0.05));
  const gained = pay - threatCut;
  g.cash += gained;
  g.hauls += 1;
  g.heat = clamp(g.heat + 4 + Math.floor(shipped / 2), 0, HEAT_MAX);
  p.status = "running";
  let msg = `SHIP haul #${g.hauls}: −${shipped} stock → +₡${gained}`;
  if (threatCut) msg += ` (rivals stole ₡${threatCut})`;
  push(state, msg);
  syncLegacy(p);
  return { ok: true, msg, fx: { kind: "ship", amount: gained }, ...(checkEnd(state) || {}) };
}

/** Upgrade HQ or a blueprint node. */
export function actionUpgrade(state, targetId = "hq") {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;
  if (g.energy < 1) return { ok: false, error: "No ENERGY — hit REST." };

  const isHq = !targetId || targetId === "hq";
  const level = isHq ? g.hqLevel : g.levels[targetId] || 1;
  if (level >= 5) return { ok: false, error: "Already max level (5)." };
  const cost = 40 + level * 35;
  if (g.cash < cost) return { ok: false, error: `Need ₡${cost} to upgrade (have ₡${Math.round(g.cash)}).` };

  // Expanding eats space capacity a bit
  if (g.stockMax <= 8) return { ok: false, error: "No SPACE left to expand. Ship stock and cool heat first." };

  g.energy -= 1;
  g.cash -= cost;
  g.stockMax = Math.max(8, g.stockMax - 1);
  g.heat = clamp(g.heat + 3, 0, HEAT_MAX);

  if (isHq) {
    g.hqLevel += 1;
    push(state, `UPGRADE HQ → Lv${g.hqLevel} (−₡${cost}, −1 space cap)`);
  } else {
    g.levels[targetId] = level + 1;
    const bp = (p.blueprints || []).find((b) => b.id === targetId);
    push(state, `UPGRADE ${bp?.title?.slice(0, 28) || "node"} → Lv${level + 1}`);
  }
  p.status = "running";
  syncLegacy(p);
  return { ok: true, msg: g.lastAction, fx: { kind: "upgrade" }, ...(checkEnd(state) || {}) };
}

/** Spend energy to dump heat. */
export function actionCool(state) {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;
  if (g.energy < 1) return { ok: false, error: "No ENERGY — hit REST." };
  if (g.heat <= 0) return { ok: false, error: "Heat already low." };

  g.energy -= 1;
  const drop = 12 + g.hqLevel * 2;
  g.heat = clamp(g.heat - drop, 0, HEAT_MAX);
  push(state, `COOL −${drop} heat (now ${Math.round(g.heat)})`);
  p.status = "running";
  syncLegacy(p);
  return { ok: true, msg: g.lastAction, fx: { kind: "cool" } };
}

/**
 * End shift: refill energy, rivals act, small heat drift.
 * This is the only "clock" — no confusing auto sim.
 */
export function actionRest(state) {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;

  g.shift += 1;
  g.energy = g.energyMax;
  g.heat = clamp(g.heat - 2, 0, HEAT_MAX);

  // Rivals act
  const rivals = (state.rivals || []).filter((r) => r.relation !== "merged");
  const hostile = rivals.filter((r) => r.relation === "sabotaged" || r.relation === "neutral");
  const allies = rivals.filter((r) => r.relation === "ally");
  let rivalMsg = "";

  if (allies.length) {
    g.cash += allies.length * 8;
    rivalMsg += ` Allies sent ₡${allies.length * 8}.`;
  }
  if (hostile.length) {
    g.threat = clamp((g.threat || 0) + 1, 0, 10);
    if (Math.random() < 0.45 + hostile.length * 0.08) {
      const steal = Math.min(g.stock, 2 + Math.floor(hostile.length / 2));
      g.stock -= steal;
      g.heat = clamp(g.heat + 5, 0, HEAT_MAX);
      rivalMsg += ` Rivals hit you (−${steal} stock, +heat).`;
    } else {
      rivalMsg += " Rivals prowled but missed.";
    }
  } else {
    g.threat = clamp((g.threat || 0) - 1, 0, 10);
  }

  const msg = `REST → shift ${g.shift}, energy full.${rivalMsg}`;
  push(state, msg);
  p.status = "paused";
  syncLegacy(p);
  return { ok: true, msg, fx: { kind: "rest" }, ...(checkEnd(state) || {}) };
}

/** Hit a rival to cut threat (select rival on map first). */
export function actionHitRival(state, rivalId) {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;
  if (g.energy < 1) return { ok: false, error: "No ENERGY." };
  const rival = (state.rivals || []).find((r) => r.id === rivalId);
  if (!rival || rival.relation === "merged") return { ok: false, error: "Pick a living rival on the map." };

  g.energy -= 1;
  g.heat = clamp(g.heat + 6, 0, HEAT_MAX);
  g.threat = clamp((g.threat || 0) - 2, 0, 10);
  rival.relation = "sabotaged";
  state.modifiers.allyIds = (state.modifiers.allyIds || []).filter((id) => id !== rivalId);
  push(state, `HIT ${rival.handle} — threat down, heat up.`);
  syncLegacy(p);
  return { ok: true, msg: g.lastAction, fx: { kind: "hit" }, ...(checkEnd(state) || {}) };
}

export function actionAllyRival(state, rivalId) {
  const p = state.player;
  if (!p || ended(p)) return { ok: false, error: "No active empire." };
  ensureGame(p);
  const g = p.game;
  const rival = (state.rivals || []).find((r) => r.id === rivalId);
  if (!rival || rival.relation === "merged") return { ok: false, error: "Pick a rival." };
  if (rival.relation === "ally") return { ok: false, error: "Already allied." };
  if (g.cash < 25) return { ok: false, error: "Need ₡25 to seal an alliance." };
  if (g.energy < 1) return { ok: false, error: "No ENERGY." };

  g.energy -= 1;
  g.cash -= 25;
  rival.relation = "ally";
  state.modifiers.allyIds = [...new Set([...(state.modifiers.allyIds || []), rivalId])];
  g.threat = clamp((g.threat || 0) - 1, 0, 10);
  push(state, `ALLY ${rival.handle} (−₡25). They'll kick cash on REST.`);
  syncLegacy(p);
  return { ok: true, msg: g.lastAction, fx: { kind: "ally" } };
}

/** Visual resource bars for HUD. */
export function visualBars(empire) {
  if (!empire?.game) {
    return [
      { key: "stock", label: "STOCK", value: 0, max: 20, hint: "Goods waiting to ship" },
      { key: "energy", label: "ENERGY", value: 0, max: 5, hint: "Actions left this shift" },
      { key: "heat", label: "HEAT", value: 0, max: 100, hint: "Get shut down at 100" },
    ];
  }
  const g = empire.game;
  return [
    {
      key: "stock",
      label: "STOCK",
      value: g.stock,
      max: g.stockMax,
      hint: "MAKE fills this · SHIP empties it for cash",
    },
    {
      key: "energy",
      label: "ENERGY",
      value: g.energy,
      max: g.energyMax,
      hint: "Each action costs 1 · REST refills",
    },
    {
      key: "heat",
      label: "HEAT",
      value: g.heat,
      max: HEAT_MAX,
      hint: "Shipping & upgrades raise heat · COOL or lose at 100",
    },
  ];
}

export function canAffordUpgrade(empire, targetId = "hq") {
  if (!empire?.game) return false;
  const g = empire.game;
  const level = !targetId || targetId === "hq" ? g.hqLevel : g.levels[targetId] || 1;
  const cost = 40 + level * 35;
  return g.cash >= cost && g.energy >= 1 && level < 5;
}

export function upgradeCost(empire, targetId = "hq") {
  if (!empire?.game) return 0;
  const g = empire.game;
  const level = !targetId || targetId === "hq" ? g.hqLevel : g.levels[targetId] || 1;
  return 40 + level * 35;
}
