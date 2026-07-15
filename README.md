# ShadowMarket

A **constraint-native micro-empire game**: your real-life limit becomes a warehouse floor.  
**MAKE** stock → **SHIP** hauls for cash → **UPGRADE** nodes → manage **energy** and **heat**.

## How to play (30 seconds)

1. Name a constraint (or pick a preset) → **Build empire floor**
2. **MAKE** — spend 1 energy, fill STOCK (limited by SPACE)
3. **SHIP** — convert stock into ₡ cash + 1 haul (raises HEAT)
4. **UPGRADE** — spend cash to level HQ / blueprint nodes (better MAKE)
5. **COOL** — dump heat · **REST** — refill energy (rivals act)
6. **Win:** 10 hauls **or** ₡800 · **Lose:** heat hits 100

**Keys:** `1` MAKE · `2` SHIP · `3` UPGRADE · `4` COOL · `5`/`R` REST

Click map nodes: HQ, blueprints (upgrade), rivals (ally / hit).

## Run locally

```bash
cd shadow-market
python3 -m http.server 8080
```

Open http://localhost:8080

## Why it exists

Not crypto. Not cards. A short, readable loop where **scarcity is the ruleset** — space, energy, and heat — flavored by whatever constraint you typed.

## Stack

Static HTML / CSS / Canvas JS. No build step. State in `localStorage`.

## License

MIT
