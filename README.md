# ☠ Dead Horizon — Zombie Apocalypse Survival

A browser-based isometric zombie survival game built with **React + Vite** and HTML5 Canvas.

## 🎮 Gameplay

- **Isometric 2D world** — 60×60 tile map with biomes (grass, dirt, water, ruins, sand)
- **Survive 11 waves** of increasingly dangerous zombies
- **12 zombie ranks** — from slow Crawlers to the fearsome Plague Lord boss
- **Gather resources** — Food, Water, Wood, Stone, Meat, and the legendary ⭐ Sun Stone
- **Build defenses** — Fences, Walls, Watchtowers, Firepits, Wells, and Farms
- **Manage survival stats** — Hunger, Water, and Stamina bars deplete in real time
- **Defeat the Plague Lord** using the Sun Stone to restore all zombies to humans — Victory!

## 🕹 Controls

| Key | Action |
|-----|--------|
| `WASD` | Move (isometric) |
| `Shift` | Sprint (drains stamina) |
| `Left Click` | Attack / Place building |
| `Right Click` | Cancel build mode |
| `1` | Eat food |
| `2` | Drink water |
| `3` | Eat meat |
| `4` | Equip Sun Stone |
| `F` | Build Fence |
| `G` | Build Wall |
| `H` | Build Watchtower |
| `J` | Build Firepit |
| `K` | Build Well |
| `L` | Build Farm |
| `ESC` | Cancel build |

## 🧟 Zombie Ranks

| Rank | Name | Special |
|------|------|---------|
| 1 | Crawler | Slow, weak |
| 2 | Walker | Basic zombie |
| 3 | Runner | Fast |
| 4 | Biter | Infects player (speed debuff) |
| 5 | Spitter | Ranged acid |
| 6 | Bloater | Explodes on death |
| 7 | Armored | High defense |
| 8 | Berserker | Double attack speed |
| 9 | Necromancer | Revives fallen zombies |
| 10 | Tank | Massive HP |
| 11 | Shadow | Teleports |
| 12 | **Plague Lord** | Boss — 3 phases, immune without Sun Stone |

## 🏗 Buildings

| Building | Cost | Effect |
|----------|------|--------|
| Fence | 2🪵 1🪨 | Blocks zombie path |
| Wall | 3🪨 | Stronger barrier |
| Watchtower | 4🪵 | Reveals area |
| Firepit | 2🪵 | Restores stamina nearby |
| Well | 3🪨 | Generates water over time |
| Farm | 1🪵 | Generates food over time |

## 🚀 Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🛠 Tech Stack

- **React 18** + **Vite**
- **HTML5 Canvas** for isometric rendering
- **Vanilla CSS** with Orbitron + Rajdhani fonts
- No external game libraries — pure JS game engine
