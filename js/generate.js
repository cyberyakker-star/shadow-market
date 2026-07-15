import {
  TAG_LEXICON,
  ARCHETYPES,
  PITCH_FRAGMENTS,
  ORIGIN_BITS,
  HANDLE_PARTS,
  BLUEPRINT_BANKS,
  RIVAL_CONSTRAINTS,
} from "./data/templates.js";

export function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function uid(prefix = "e") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN(rand, arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(rand() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

export function tagConstraint(text) {
  const norm = text.toLowerCase().replace(/[^\w\s-]/g, " ");
  const scores = {};
  for (const [tag, words] of Object.entries(TAG_LEXICON)) {
    let s = 0;
    for (const w of words) {
      if (norm.includes(w)) s += w.length > 4 ? 2 : 1;
    }
    if (s) scores[tag] = s;
  }
  const tags = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t);
  if (!tags.length) tags.push("default");
  return { raw: text.trim(), tags, normalized: norm };
}

function primaryArchetype(tags) {
  const key = tags.find((t) => ARCHETYPES[t]) || "default";
  return ARCHETYPES[key];
}

function shortConstraint(raw) {
  const s = raw.replace(/\s+/g, " ").trim();
  if (s.length <= 42) return s;
  return s.slice(0, 39).trim() + "…";
}

function fillTpl(tpl, map) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? `{${k}}`);
}

function makeHandle(rand, tags) {
  const a = pick(rand, HANDLE_PARTS.a);
  const b = pick(rand, HANDLE_PARTS.b);
  const n = Math.floor(rand() * 90) + 7;
  const tagHint = tags[0] && tags[0] !== "default" ? tags[0].slice(0, 4) : "ops";
  return `@${a}.${b}.${tagHint}${n}`;
}

function makeBlueprints(rand, constraint, arch) {
  const kinds = ["product", "process", "marketing"];
  const count = 3 + Math.floor(rand() * 3); // 3–5
  const out = [];
  const map = {
    constraint: constraint.raw,
    short: shortConstraint(constraint.raw),
    Adj: pick(rand, arch.adj),
    Noun: pick(rand, arch.noun),
  };

  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const bank = BLUEPRINT_BANKS[kind];
    const base = pick(rand, bank);
    const localMap = {
      ...map,
      Adj: pick(rand, arch.adj),
      Noun: pick(rand, arch.noun),
    };
    out.push({
      id: uid("bp"),
      kind,
      title: fillTpl(base.titleTpl, localMap),
      summary: fillTpl(base.summaryTpl, localMap),
      steps: [...base.steps],
      materials: [...base.materials],
      riskNote: base.riskNote,
    });
  }
  return out;
}

function startingResources(rand, tags) {
  const base = {
    capital: 180 + Math.floor(rand() * 120),
    inventory: 20 + Math.floor(rand() * 25),
    reputation: 8 + Math.floor(rand() * 12),
    stress: 12 + Math.floor(rand() * 18),
    timeSlots: 3 + Math.floor(rand() * 3),
  };
  if (tags.includes("budget")) base.capital = Math.floor(base.capital * 0.65);
  if (tags.includes("time") || tags.includes("sleep") || tags.includes("parenting")) {
    base.timeSlots = Math.max(1, base.timeSlots - 1);
    base.stress += 8;
  }
  if (tags.includes("space") || tags.includes("storage")) {
    base.inventory = Math.floor(base.inventory * 0.7);
  }
  if (tags.includes("shipping")) {
    base.capital += 40;
    base.inventory += 10;
  }
  return base;
}

function startingMetrics(rand, tags) {
  let revenue = 8 + rand() * 10;
  let burn = 5 + rand() * 6;
  if (tags.includes("budget")) {
    revenue *= 0.85;
    burn *= 0.8;
  }
  if (tags.includes("shipping")) revenue *= 1.1;
  if (tags.includes("time")) burn *= 1.05;
  return {
    revenuePerTick: Math.round(revenue * 10) / 10,
    burnPerTick: Math.round(burn * 10) / 10,
    marketShare: Math.round((1 + rand() * 4) * 10) / 10,
    heat: Math.round((5 + rand() * 15) * 10) / 10,
  };
}

/**
 * Generate a full Empire from a constraint string.
 * @param {string} constraintText
 * @param {{ seed?: number, isRival?: boolean }} [opts]
 */
export function generateEmpire(constraintText, opts = {}) {
  const constraint = tagConstraint(constraintText || "an unnamed everyday constraint");
  const seed = opts.seed ?? hashSeed(constraint.raw + "|" + Date.now() + "|" + Math.random());
  const rand = mulberry32(seed);
  const arch = primaryArchetype(constraint.tags);

  const displayName = `${pick(rand, arch.adj)} ${pick(rand, arch.noun)} ${pick(rand, arch.unit)}`;
  const pitch = [
    pick(rand, PITCH_FRAGMENTS.open),
    fillTpl(pick(rand, PITCH_FRAGMENTS.because), { constraint: constraint.raw }),
    pick(rand, PITCH_FRAGMENTS.close),
  ].join(" ");

  const empire = {
    id: uid(opts.isRival ? "rv" : "pl"),
    seed,
    displayName,
    handle: makeHandle(rand, constraint.tags),
    constraint,
    archetype: arch.id,
    archetypeTitle: arch.title,
    pitch,
    originStory: pick(rand, ORIGIN_BITS),
    resources: startingResources(rand, constraint.tags),
    metrics: startingMetrics(rand, constraint.tags),
    blueprints: makeBlueprints(rand, constraint, arch),
    status: "idle",
    tick: 0,
    createdAt: Date.now(),
    relation: opts.isRival ? "neutral" : "self", // neutral | ally | sabotaged | merged
    isRival: !!opts.isRival,
  };

  return empire;
}

export function generateRivalPool(count = 8) {
  const rivals = [];
  for (let i = 0; i < count; i++) {
    const text = RIVAL_CONSTRAINTS[i % RIVAL_CONSTRAINTS.length];
    const seed = hashSeed(`rival:${i}:${text}`);
    rivals.push(generateEmpire(text, { seed, isRival: true }));
  }
  return rivals;
}

export function ensureRivalPool(existing = [], min = 8) {
  if (existing.length >= min) return existing;
  const needed = min - existing.length;
  const extra = [];
  for (let i = 0; i < needed; i++) {
    const text = RIVAL_CONSTRAINTS[(existing.length + i) % RIVAL_CONSTRAINTS.length];
    const seed = hashSeed(`rival:extra:${existing.length + i}:${text}:${Date.now()}`);
    extra.push(generateEmpire(text, { seed, isRival: true }));
  }
  return [...existing, ...extra];
}
