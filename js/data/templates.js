/** Content banks for procedural empire generation. */

export const TAG_LEXICON = {
  space: ["garage", "closet", "bay", "sqft", "square", "room", "shelf", "wall", "cramped", "small space", "tiny", "apartment", "studio"],
  storage: ["bin", "bins", "storage", "inventory", "crate", "box", "shelf", "shelves", "organize", "organization", "clutter"],
  sleep: ["sleep", "nap", "naps", "night", "insomnia", "rest", "bedtime", "wake"],
  parenting: ["newborn", "baby", "infant", "toddler", "kid", "kids", "child", "daycare", "parent"],
  shipping: ["shipping", "delay", "delays", "carton", "package", "fulfillment", "warehouse", "logistics", "carrier", "usps", "ups", "fedex"],
  vehicle: ["tesla", "trunk", "frunk", "car", "vehicle", "suv", "pickup", "van", "parking"],
  time: ["minutes", "hours", "schedule", "window", "windows", "free time", "commute", "shift", "calendar"],
  budget: ["budget", "money", "cash", "rent", "broke", "cheap", "cost", "expensive", "paycheck"],
  food: ["kitchen", "fridge", "meal", "food", "grocery", "pantry", "cook"],
  noise: ["noise", "walls", "neighbor", "neighbors", "quiet", "loud", "apartment"],
  privacy: ["privacy", "shared", "family", "laptop", "office", "workspace", "password"],
};

export const ARCHETYPES = {
  space: {
    id: "densify",
    title: "Micro-fulfillment densification",
    adj: ["Liminal", "Vertical", "Stacked", "Nested", "Cubed", "Folded"],
    noun: ["Crate", "Bay", "Rack", "Cell", "Vault", "Niche"],
    unit: ["Collective", "Works", "Syndicate", "Lab", "Exchange", "Guild"],
  },
  storage: {
    id: "inventory",
    title: "Constraint inventory theater",
    adj: ["Shadow", "Ghost", "Phantom", "Hidden", "Blackout", "Cipher"],
    noun: ["Shelf", "Bin", "Stash", "Reserve", "Cache", "Hold"],
    unit: ["Ops", "Network", "Cartel", "Bureau", "Index", "Ring"],
  },
  sleep: {
    id: "window-ops",
    title: "Window-bound service operations",
    adj: ["Nocturnal", "Twilight", "Nap", "Lull", "Silent", "Drift"],
    noun: ["Shift", "Window", "Pulse", "Cycle", "Interval", "Slot"],
    unit: ["Bureau", "Service", "Dispatch", "Relay", "Studio", "Desk"],
  },
  parenting: {
    id: "care-ops",
    title: "Care-window micro-services",
    adj: ["Cradle", "Soft", "Hush", "Nest", "Latch", "Sling"],
    noun: ["Circuit", "Loop", "Relay", "Pocket", "Kit", "Route"],
    unit: ["Collective", "Co-op", "Guild", "Network", "Circle", "Lab"],
  },
  shipping: {
    id: "delay-arb",
    title: "Delay arbitrage logistics",
    adj: ["Lag", "Async", "Deferred", "Pending", "Buffer", "Backlog"],
    noun: ["Lane", "Parcel", "Slip", "Manifest", "Dock", "Ledger"],
    unit: ["Arbitrage", "Exchange", "Syndicate", "Desk", "Hub", "Ops"],
  },
  vehicle: {
    id: "mobile-cell",
    title: "Mobile inventory cells",
    adj: ["Rolling", "Trunk", "Frunk", "Nomad", "Docked", "Curb"],
    noun: ["Cell", "Pod", "Vault", "Bay", "Hold", "Kit"],
    unit: ["Fleet", "Cartel", "Network", "Exchange", "Ring", "Lab"],
  },
  time: {
    id: "slot-economy",
    title: "Slot economy brokerage",
    adj: ["Ninety", "Micro", "Burst", "Sprint", "Compressed", "Atomic"],
    noun: ["Slot", "Minute", "Block", "Cadence", "Beat", "Slice"],
    unit: ["Exchange", "Market", "Bureau", "Desk", "Guild", "Ops"],
  },
  budget: {
    id: "lean-float",
    title: "Lean float micro-capital",
    adj: ["Scrap", "Thrift", "Lean", "Boot", "Float", "Ration"],
    noun: ["Float", "Pool", "Stack", "Ledger", "Reserve", "Chip"],
    unit: ["Collective", "Club", "Syndicate", "Circle", "Fund", "Ring"],
  },
  food: {
    id: "pantry-ops",
    title: "Pantry-cycle operations",
    adj: ["Cold", "Batch", "Prep", "Shelf", "Jar", "Batch"],
    noun: ["Pantry", "Batch", "Kit", "Line", "Mise", "Stock"],
    unit: ["Kitchen", "Lab", "Co-op", "Desk", "Guild", "Works"],
  },
  noise: {
    id: "quiet-trade",
    title: "Quiet-hours trade craft",
    adj: ["Muted", "Soft", "Acoustic", "Hushed", "Felt", "Silent"],
    noun: ["Signal", "Whisper", "Pad", "Layer", "Mask", "Tone"],
    unit: ["Studio", "Atelier", "Desk", "Lab", "Bureau", "Guild"],
  },
  privacy: {
    id: "ghost-ops",
    title: "Ghost-session operations",
    adj: ["Ghost", "Incognito", "Borrowed", "Shared", "Ephemeral", "Masked"],
    noun: ["Session", "Tab", "Profile", "Vault", "Key", "Alias"],
    unit: ["Ops", "Desk", "Bureau", "Network", "Cell", "Ring"],
  },
  default: {
    id: "general",
    title: "Constraint-native micro-empire",
    adj: ["Shadow", "Parallel", "Hidden", "Lateral", "Oblique", "Under"],
    noun: ["Market", "Trade", "Craft", "System", "Protocol", "Scheme"],
    unit: ["Exchange", "Collective", "Works", "Syndicate", "Lab", "Guild"],
  },
};

export const PITCH_FRAGMENTS = {
  open: [
    "While everyone else fights the constraint, this empire treats it as inventory.",
    "The constraint is not a bug — it is the operating system.",
    "Scarcity here is a feature: it forces density, discipline, and weird margins.",
  ],
  because: [
    "Because “{constraint}” collapses optionality, the surviving moves become a playbook.",
    "Because “{constraint}” is non-negotiable, customers pay for systems that respect it.",
    "Because “{constraint}” filters out lazy competitors, the niche stays quiet and rich.",
  ],
  close: [
    "Revenue is measured in avoided friction, not vanity scale.",
    "The market is local, deniable, and slightly embarrassing to explain at parties.",
    "Growth means tighter loops, not louder ads.",
  ],
};

export const ORIGIN_BITS = [
  "Started as a spreadsheet joke that accidentally cleared $400 in week two.",
  "Born when a neighbor asked “how do you even make that work?” and paid for the answer.",
  "First customer was a friend who wanted the system, not the product.",
  "Prototyped between alarms, with tape, receipts, and a ruthless kill-list of features.",
  "Scaled only after the third person asked for the same weird workaround.",
];

export const HANDLE_PARTS = {
  a: ["void", "shadow", "liminal", "ghost", "mute", "lag", "trunk", "nap", "bin", "soft", "lean", "cipher"],
  b: ["garage", "ops", "desk", "cartel", "lane", "slot", "hold", "lab", "ring", "vault", "pulse", "float"],
};

export const BLUEPRINT_BANKS = {
  product: [
    {
      titleTpl: "{Adj} {Noun} kit for “{short}”",
      summaryTpl: "A physical kit that turns “{constraint}” into a repeatable station others will copy (and pay for).",
      steps: [
        "Photograph your real constraint setup in natural light.",
        "List every object that must stay within the limited zone.",
        "Design a modular insert / bin / strap system around those hard limits.",
        "Price the kit as “installable peace of mind,” not raw materials.",
      ],
      materials: ["corrugated inserts", "labeled bins", "tension straps", "QR care card"],
      riskNote: "Lookalike kits appear fast — keep one proprietary fold or fixture.",
    },
    {
      titleTpl: "Pocket-scale {Noun} for constraint carriers",
      summaryTpl: "A small product that only makes sense if you live with “{constraint}.”",
      steps: [
        "Interview 5 people with the same constraint; capture their failed hacks.",
        "Prototype in cardboard; reject anything that needs “more space later.”",
        "Ship with a one-page layout diagram tied to the constraint.",
        "Offer a refill / sticker / accessory SKU that fits the same footprint.",
      ],
      materials: ["die-cut card", "elastics", "micro-labels", "mailer"],
      riskNote: "Do not expand SKU count until the footprint rule is sacred.",
    },
  ],
  process: [
    {
      titleTpl: "The {short} cadence protocol",
      summaryTpl: "A timed process that only works because “{constraint}” forces batching.",
      steps: [
        "Map the constraint to fixed windows (what can only happen then).",
        "Write a 7-step checklist that fits one window with 2 minutes slack.",
        "Instrument one metric per run (minutes saved, errors avoided, $ float).",
        "Sell the checklist as a service: you run it for others remotely.",
      ],
      materials: ["timer", "checklist card", "shared log", "status emoji code"],
      riskNote: "If the process requires ideal conditions, it is not constraint-native.",
    },
    {
      titleTpl: "Constraint triage board",
      summaryTpl: "A visual system that ranks work by what the constraint forbids.",
      steps: [
        "Create three columns: Impossible / Only-in-window / Anytime.",
        "Move every task for a week; delete anything that never leaves Impossible.",
        "Automate Anytime; reserve human energy for Only-in-window.",
        "Productize the board template with your constraint vocabulary.",
      ],
      materials: ["whiteboard or digital board", "color tags", "weekly review slot"],
      riskNote: "Over-tagging recreates chaos — max 3 columns forever.",
    },
  ],
  marketing: [
    {
      titleTpl: "“Because of {short}” confession ads",
      summaryTpl: "Marketing that leads with the constraint as social proof, not a flaw to hide.",
      steps: [
        "Film a 20-second clip showing the real constraint, unglamorous.",
        "Caption: what the constraint unlocked that free people miss.",
        "Post where people with the same constraint already complain.",
        "DM script: offer the blueprint, not a hard sell.",
      ],
      materials: ["phone video", "3 caption variants", "landing note"],
      riskNote: "Pity framing kills conversion — pride-in-constraint only.",
    },
    {
      titleTpl: "Shadow referral seals",
      summaryTpl: "A quiet referral loop for people who do not want to look like marketers.",
      steps: [
        "Give every buyer a one-line seal they can forward.",
        "Reward with a free process upgrade, not cash (keeps heat low).",
        "Track which seals bring operators vs tourists.",
        "Kill channels that attract people without the constraint.",
      ],
      materials: ["unique code strings", "upgrade pack", "simple CRM sheet"],
      riskNote: "Public virality raises heat — prefer sealed rooms and DMs.",
    },
  ],
};

export const MARKET_EVENTS = [
  { id: "viral", w: 8, text: "A quiet post about your constraint-hack goes semi-viral in a niche group.", effects: { reputation: 6, marketShare: 2, heat: 4, capital: 40 } },
  { id: "glitch", w: 12, text: "Supply glitch: a key material is late. You invent a workaround.", effects: { stress: 8, inventory: -5, reputation: 2 } },
  { id: "inspector", w: 6, text: "Someone asks too many questions. Heat rises.", effects: { heat: 12, stress: 6, reputation: -2 } },
  { id: "neighbor", w: 9, text: "A neighbor complains — then asks to buy in.", effects: { heat: 5, capital: 55, stress: 4 } },
  { id: "constraint_worse", w: 10, text: "Your real constraint tightens. The empire adapts denser loops.", effects: { stress: 10, revenueMod: 0.05, burnMod: 0.03 } },
  { id: "constraint_ease", w: 7, text: "Constraint eases slightly. Discipline slips; margins soften.", effects: { stress: -6, revenueMod: -0.04, reputation: -1 } },
  { id: "ally_boost", w: 5, text: "An ally routes a small order your way.", effects: { capital: 70, inventory: 4, reputation: 3 } },
  { id: "sabotage_hit", w: 5, text: "A rival’s sabotage attempt clips your lane for a cycle.", effects: { capital: -35, stress: 12, marketShare: -1 } },
  { id: "praise", w: 10, text: "A customer says your system “feels inevitable.”", effects: { reputation: 5, stress: -4, capital: 25 } },
  { id: "burnout", w: 8, text: "You push too hard inside the constraint. Stress spikes.", effects: { stress: 15, revenueMod: -0.06 } },
  { id: "float_win", w: 9, text: "Float discipline pays: capital compounds quietly.", effects: { capital: 90, inventory: 2 } },
  { id: "heat_drop", w: 7, text: "Attention drifts elsewhere. Heat cools.", effects: { heat: -10, stress: -3 } },
];

export const RIVAL_CONSTRAINTS = [
  "closet only — no garage, no shed",
  "night-shift parent with 3am energy only",
  "rural shipping that takes 10 days minimum",
  "minivan trunk as the only warehouse",
  "student budget under $80/month for materials",
  "shared kitchen with four roommates",
  "open office where everything is overheard",
  "one free hour before sunrise",
  "HOA rules against visible storage",
  "tiny fridge and no freezer space",
  "phone-only — no laptop for ops",
  "chronic migraines: max 25-minute work blocks",
];
