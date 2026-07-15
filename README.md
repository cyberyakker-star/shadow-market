# ShadowMarket

A **hidden, parallel economy** inside your browser — not crypto, not trading cards — **personal micro-empires** built from everyday constraints.

You name a real limit (“limited garage space”, “newborn sleep windows”, “supplement shipping delays”). ShadowMarket generates a fictional system that **thrives because of that constraint**, shown as a **live industrial empire map** (nodes, glowing lanes, minimap, resource bars) — not a wall of text.

- **Visual empire floor** — HQ, blueprint outposts, rival sites on a connected map  
- **Playable simulation** — accelerated time, packets on paths, SPACE / TIME / HAULS meters  
- **Click any node** — inspect HQ, blueprints, or rival actions (ally / sabotage / merge)  
- **Exportable blueprints** — Markdown / JSON / print from the drawer  
- **Empire Seals** — share codes to import another operator’s empire as a rival  

## Play locally

ES modules need a static server (not `file://`):

```bash
cd shadow-market
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080).

## How to use

1. **Intake** — type a constraint or pick a preset → **Found micro-empire**  
2. **Dossier** — read the pitch, stats, archetype  
3. **Simulation** — Run / Pause; speed **1× / 10× / 60×** (keys `1` `2` `3`, Space to toggle)  
4. **Blueprints** — export Markdown, JSON, or print  
5. **Rivals** — ally / sabotage / merge; paste an **Empire Seal** to import someone else’s system  

State is stored in `localStorage` (`shadowmarket:v1`) on this device only.

## Currency fiction

**₡** is a shadow-market unit of account for the sim — not real money.

## Stack

Pure HTML, CSS, and ES-module JavaScript. No build step, no API keys, no backend.

Empire generation is **procedural** (constraint tagging + seeded templates). Optional LLM remix can be added later server-side without changing the data model.

## Repo

https://github.com/cyberyakker-star/shadow-market

## License

MIT
