# Shadow Market — Night Ops

A **real browser game**: you’re an underground courier.

**Grab packages → deliver to drop zones → dodge patrols → clear 5 nights.**

## Play

```bash
cd shadow-market
python3 -m http.server 8080
```

Open http://localhost:8080

## Controls

| Input | Action |
|--------|--------|
| **WASD** / arrows | Drive |
| **Space** / Shift | Dash (cooldown) |
| **Mouse / touch drag** | Steer toward pointer |
| **P** / Esc | Pause |

## Loop

1. Pick up **yellow packages** (limited cargo).
2. Drop them on **green DROP pads** for cash.
3. Stay away from **red patrols** — proximity raises **HEAT**.
4. Contact dumps your cargo. **Heat 100 = busted**.
5. Hit the night **quota** → safehouse **upgrades** → next night.
6. Survive **5 nights** to win.

Optional **district constraint** only flavors the map (pay, speed, cargo) — it isn’t a wall of text.

## Stack

Vanilla HTML / CSS / Canvas. No build step, no accounts, no crypto.

## Repo

https://github.com/cyberyakker-star/shadow-market
