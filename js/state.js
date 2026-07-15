const STORAGE_KEY = "shadowmarket:v1";

const defaultState = () => ({
  version: 1,
  player: null,
  rivals: [],
  actions: [],
  ledger: [],
  settings: {
    speed: 10,
    sound: false,
  },
  capitalHistory: [],
  modifiers: {
    revenueMult: 1,
    burnMult: 1,
    allyIds: [],
    sabotageUntil: {}, // rivalId -> tick
  },
});

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      settings: { ...defaultState().settings, ...(parsed.settings || {}) },
      modifiers: { ...defaultState().modifiers, ...(parsed.modifiers || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("ShadowMarket: could not persist state", e);
  }
}

export function resetState() {
  const s = defaultState();
  saveState(s);
  return s;
}

export function pushLedger(state, line, tick = null) {
  const entry = {
    t: tick ?? state.player?.tick ?? 0,
    line,
    at: Date.now(),
  };
  state.ledger = [entry, ...(state.ledger || [])].slice(0, 120);
  return entry;
}
