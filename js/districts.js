/** Optional flavor from the player's constraint. */

export const PRESETS = [
  { id: "garage", label: "Garage squeeze", text: "limited garage space" },
  { id: "sleep", label: "Sleep windows", text: "newborn sleep windows" },
  { id: "ship", label: "Shipping delays", text: "supplement shipping delays" },
  { id: "tesla", label: "Trunk only", text: "Tesla trunk organization" },
  { id: "budget", label: "Tight budget", text: "tight monthly budget" },
];

export function districtFromConstraint(raw) {
  const t = (raw || "").toLowerCase();
  const base = {
    name: "Grayline Ward",
    accent: "#4ab4ff",
    payMult: 1,
    speedMult: 1,
    cargoBonus: 0,
    heatMult: 1,
    blurb: "Standard night routes.",
  };

  if (/garage|space|closet|storage|trunk|tesla|frunk|vehicle|car/.test(t)) {
    return {
      ...base,
      name: "Bay Compact",
      accent: "#f0b429",
      cargoBonus: 1,
      speedMult: 0.95,
      blurb: "Tight lots — more cargo, slightly slower.",
    };
  }
  if (/sleep|nap|newborn|baby|night|parent/.test(t)) {
    return {
      ...base,
      name: "Lull District",
      accent: "#a78bfa",
      payMult: 1.2,
      heatMult: 1.1,
      blurb: "Quiet hours pay more. Patrols are twitchy.",
    };
  }
  if (/ship|delay|parcel|package|ups|fedex|logistics/.test(t)) {
    return {
      ...base,
      name: "Backlog Docks",
      accent: "#3dd68c",
      payMult: 1.15,
      cargoBonus: 0,
      blurb: "Delayed crates stack up. Juicy payouts.",
    };
  }
  if (/budget|broke|cheap|rent|money|cash/.test(t)) {
    return {
      ...base,
      name: "Scrape Block",
      accent: "#ff8c5c",
      payMult: 0.9,
      speedMult: 1.08,
      blurb: "Thin margins. You move faster hungry.",
    };
  }
  if (t.trim()) {
    const name = t.trim().slice(0, 22).replace(/\b\w/g, (c) => c.toUpperCase());
    return { ...base, name: name + " Zone", blurb: "Custom district rules apply." };
  }
  return base;
}
