# Hyperfold: Infinite Cube

> Traverse infinite sectors folded across the faces of a rotating 3D hypercube.

[![Play Game](https://img.shields.io/badge/🎮%20Play%20Game-GitHub%20Pages-00ffff?style=for-the-badge)](https://vos.github.io/hyperfold/)
[![World Editor](https://img.shields.io/badge/🛠️%20World%20Editor-Online%20App-ff8800?style=for-the-badge)](https://vos.github.io/hyperfold/editor/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Play online:** [🎮 Launch Hyperfold Game ↗](https://vos.github.io/hyperfold/) &bull; [🛠️ Launch World Editor ↗](https://vos.github.io/hyperfold/editor/)

The game combines classic 2D jump & run platforming mechanics with a pseudo-3D cube world that tumbles 90° whenever the player crosses any of the four screen edges. While physically appearing as a 3D cube tumbling in deep space, topologically the game world is an **infinite non-Euclidean manifold** featuring fixed, hand-crafted screens that never loop in circles (unless specifically designed) and always preserve round-trip navigation.

![Hyperfold Gameplay](./screenshot.jpg)

---

## 🌟 Key Features

### 🎲 Infinite Non-Euclidean Cube Rebinding Engine
* **Higher-Dimensional Topology**: Rooms exist on an open $(X, Y)$ coordinate manifold. Traversing 6 consecutive screens yields unique sectors without looping back to old screens, while traveling backward deterministically returns to your exact origin.
* **Seamless 3D Tumble Transitions**: When crossing an edge boundary or jumping through an inter-sector portal, the cube executes a smooth 90° slerp rotation (`easeInOutCubic`, ~420ms).
* **Zero Pop-In Predictive Pre-Rendering**: The destination face, the incoming trailing face (Face 5: $-Z$), and all perpendicular adjacent faces are dynamically pre-rendered *before* the tumble begins, eliminating texture pop-in or mid-turn replacements.
* **Canvas-to-WebGL Pipeline**: Crisp 2D Canvas tilemaps and dynamic sprites rendered directly onto Three.js `CanvasTexture` materials with dynamic player point lighting.

---

### 🏃 Precision 2D Platforming Kinematics
* **Fluid Movement**: Snappy ground acceleration, crisp deceleration, and variable jump height (cutting vertical velocity on early jump release).
* **Coyote Time (100ms)**: Jump gracefully even after walking off a platform ledge.
* **Jump Buffering (120ms)**: Queue jumps immediately before touching down on solid ground.
* **Ducking & Crawling (`Down` / `S`)**: Crouch to reduce player hitbox height from 36px to 22px, allowing players to duck under high laser beams and crawl through 1-tile crawlspaces with ceiling clearance raycasting.
* **Moving Platforms & Passenger Physics**: Floating hover cruisers and vertical elevators that carry players with horizontal momentum inheritance.
* **Down + Jump Drop-Through**: Press `Down + Jump` while standing on one-way or moving platforms to drop through, mirroring classic platformer conventions.
* **Dynamic Laser Barriers & Angled Turrets**: Mobile laser barriers that patrol harmonic tracks cycling between idle, telegraph warning, and lethal states; stationary and auto-targeting turrets shooting high-velocity laser bolts or continuous raycast beams that dynamically clip against moving platforms (enabling platforms to act as moving shields).
* **Multi-Directional Spikes**: Hazard spikes mounted on floors, walls, ceilings/roofs, and solid floating platforms with forgiving apex-matched hitboxes and automatic geometric orientation detection.
* **Interactive Elements**: One-way ledges, crumble blocks with respawn timers, super bounce launch pads, and collectible Energy Prisms.

---

### 💥 Explosive Death & Dual-Action Reset System
* **360° Particle Burst**: On death, the player detonates with 72 high-velocity particles flying in all directions—concentric expanding shockwave rings, tumbling debris shards with aerodynamic drag physics ($0.94^{\Delta t \cdot 60}$), and billowing plasma motes.
* **Sprite Hiding & Materialization**: Player chassis and eyes are hidden during the explosion, reappearing with materialization sparks upon sector respawn.
* **Tap R to Die & Respawn**: Pressing `R` (or clicking `Reset [R]`) triggers an immediate player death sequence and sector respawn.
* **Hold R to Restart Entire Level**: Long-pressing `R` ($\ge 0.8\text{s}$) renders an in-world holographic radial charging ring around the player avatar, converging particle motes, and a live HUD hold percentage banner. Holding to completion resets the entire level back to Genesis Core `[0, 0]`, restores all collected Energy Prisms, resets discovered rooms, snaps 3D cube rotation back to identity, and detonates a dimensional reboot warp effect.

---

### ⚡ 3D Engine & Geometry Optimizations
* **Dynamic Entity Detection**: Automatically categorizes rooms as static or dynamic; static chambers are rendered once and cached, bypassing redundant canvas re-renders.
* **Merged Chassis Geometry**: Merged internal Three.js player chassis meshes into unified geometries, reducing draw calls from 21 down to 3.
* **Round-Robin Texture Throttling**: Side-face texture uploading is throttled to at most 1 upload per tick, ensuring smooth 60 FPS transitions without frame spikes.

---

### 🌌 Synthwave Atmosphere & Procedural Audio
* **Cosmic Starfield**: Independent deep-space starfield and drifting wireframe octahedra that remain stationary relative to the camera to accentuate the cube's 3D rotation.
* **Dynamic Particle Systems**: Landing dust, jump bursts, collectible pickup sparks, motion trails, laser impact sparks, charging motes, muzzle flashes, 360° death explosions, expanding shockwaves, and screen-edge boundary luminescence.
* **Zero-Asset Web Audio API Synthesizer**: Fully procedural sound effects—resonant 3D rotation whooshes, synth jump arps, landing thuds, collectible chimes, blaster zaps, impact sizzles, warning telegraph chirps, portal warp chirps, locked gate buzzes, a 3-layer cyberpunk synth explosion (sub-bass drop + detuned dual sawtooth/square filter sweep + filtered noise burst), an ascending 6-note level reboot fanfare, and a low-pass ambient drone. No external audio files required.

---

### 🎥 Interactive 3D Camera Controls
* **Free Orbit**: Click and drag with the left mouse button to orbit around the cube from any angle.
* **Zoom**: Scroll the mouse wheel to inspect details up close or view the cosmic void.
* **Camera Reset & Flat Mode**: Hit `V` to reset the camera to the default dramatic angle, or `C` to toggle between 3D Depth View and Orthographic 2D Flat Face View.

---

### 📊 Real-Time Performance & Telemetry HUD
* **Built-In Profiler**: Real-time FPS graph, average/min/max frame-time tracking, sample ring buffers, and memory telemetry.
* **Movable Overlay**: Drag and drop the telemetry card by its header to position it anywhere on screen (with automatic position persistence via `localStorage` and viewport edge clamping).
* **Toggle Shortcut**: Press `P`, `F3`, or `` ` `` anytime during gameplay to view diagnostic stats.

---

### 🌀 Quantum Teleportation Portals
* **Intra-Sector & Inter-Sector Travel**: Wormholes linking points within the same chamber or bridging distant sectors across the non-Euclidean manifold.
* **Topological $N \to 1$ Routing**: Multiple source portals can target the same destination portal; each source portal binds to a single destination via globally unique IDs.
* **Cyberpunk Visuals**: Multi-layer cyber glow with customizable neon palette, high-frequency vibrating outer containment borders with oscillating corner pylons, and a swirling vortex aperture **reflecting the primary theme color of the destination sector**.
* **Fluid Chained Portal Jumping**: Collision-box exit debouncing tracks arrival state until the player physically leaves the portal's bounding box—eliminating artificial cooldown timers and enabling fluid, rapid portal chaining.
* **Reversed Outbound Velocity (`reverseVelocity`)**: Optional kinematic inversion on destination portals that negates the player's velocity vector ($\vec{v}_{\text{out}} = -\vec{v}_{\text{in}}$, inverting both $v_x$ and $v_y$). Dropping into a portal from above launches the player upward toward the ceiling with automatic upward momentum preservation (`isBouncePropelled`).
* **Procedural Warp Audio**: Custom zero-asset Web Audio synthesis featuring an FM phase-shift warp chirp, sub-bass dimensional drop, and crystalline rematerialization shimmer.

---

### 🔑 Gate Keys & Key-Gated Exits
* **Collectible Sector Keys**: Themed keys placed throughout the world requiring exploration and puzzle-solving to acquire.
* **Locked Boundary Forcefields**: Sector exits gated by key requirements (`gateKeys`), projecting impenetrable energy forcefields until the player collects the matching key.
* **Tactile Feedback**: Audible lockout buzz and floating key requirement glyphs when touching a locked gate, accompanied by unlocked chime sound effects upon unlocking.
* **HUD Key Inventory**: Real-time inventory bar displaying all currently held keys with color-coded theme accents.
* **Sector Map Markers**: Discovered locked gates and key locations are plotted directly onto the 2D Sector Map with `🔑` indicators.

---

### 🗺️ Interactive 2D Sector Map Overlay (`M` key)
* **Panoramic Manifold Minimap**: Press `M` anytime to open the full-screen interactive 2D coordinate grid overlay.
* **Fog-of-War Exploration**: Tracks visited sectors, dynamically highlights undiscovered adjacent sectors, and marks current player coordinates.
* **Live Sector Thumbnails**: Renders accurate tilemap miniatures reflecting each room's custom theme colors, keys, locked gates, and portal connections.
* **Pan, Zoom & Auto-Fit**: Smooth drag panning, scroll zooming, and automatic fit-to-screen scaling accommodating sprawling custom worlds.

---

### 🌌 Procedural Infinite World Generator
* **Deterministic Infinite Manifold**: Procedural world generator creating endless non-Euclidean sectors on demand based on a numeric seed.
* **Difficulty Scaling**: Mathematical threat curve that progressively ramps hazard density, laser speeds, and moving platform timing as the player traverses deeper into the manifold.
* **Guaranteed Reachability & Safety**: Rigorous doorway alignment, safe spawn threshold checks, and vertical chute reachability guarantees.
* **Power Sanctuaries**: Unique peaceful rest-stop chambers generated every 8 sectors with zero lethal hazards and bonus Energy Prisms.
* **Difficulty Modes**: Select from Easy, Normal, Hard, and Void Abyss modes directly from the in-game menu.

---

### 🛠️ Developer Console & Debug Diagnostics (`F2`)
* **Dedicated Shortcut & Gear Menu Access**: Press `F2` or open the in-game Gear Menu (**🛠 Dev Tools [F2]**) to summon the developer debug console.
* **Movable / Draggable Overlays**: Click and drag the console header to reposition it anywhere on your screen. Positions are safely constrained to viewport bounds and persist across browser reloads via `localStorage`.
* **Header Icon Controls & Top HUD Badges**:
  * **Dev Mode Master Toggle (`⚡`)**: Suspend or reactivate all configured modifiers on the fly without resetting preferences.
  * **Reset All Modifiers (`↺`)**: Instantly restore all cheats and kinematics to vanilla defaults.
  * **Top Menu Status Bar**: Live modifier pills and master suspend toggle rendered directly in the center of the top HUD bar (`#hud-dev-badges`).
* **Navigation & Sector Warping**:
  * Jump instantly to any sector via dropdown selector or coordinate inputs $(X, Y)$.
  * **Cardinal Jumps**: Move North, South, East, or West with automated doorway reachability validation.
  * **Shift + Click Teleportation**: Hold `Shift` and Left-Click anywhere in the active chamber to instantly relocate the player avatar.
  * **Reveal Full Sector Map**: Unveil all rooms in fixed world campaigns or iteratively discover unexplored frontier sectors in procedural void maps.
* **Kinematics & Dynamic Hazard Controls**:
  * **3-Tier Hazard Lethality**: Cycle between **Normal (Lethal)**, **Non-Lethal** (lasers & turrets pass through player without damage), and **Frozen (OFF)** (all lasers/turrets halted and active projectiles despawned).
  * **God Mode & Spike Immunity**: Total invulnerability to all hazards, falls, and spikes.
  * **Fly Mode / No-Clip (`WASD`)**: Free omnidirectional flight through solid terrain.
  * **Infinite Air-Jump**: Jump indefinitely mid-air without landing.
* **Diagnostics & Visual Overlays**:
  * **Hitbox & Collision Visualizer**: Render AABB hitboxes, turret raycast lines, and dynamic moving platform shielding points directly on the canvas.
  * **20×20 Tile Grid**: Overlay coordinate tile grids to measure jump distances and inspect room layouts.
  * **Live Telemetry**: Real-time readouts of player coordinates, velocity vectors ($V_x, V_y$), and kinematic states (grounded, ducking).
* **Inventory & Time Simulation Controls**:
  * Instantly unlock all key-gated exits, collect room or world Energy Prisms, respawn items, or trigger victory.
  * Adjust game simulation speed (`0.25x` to `4.0x`), pause physics (`⏸ PAUSE PHYSICS`), and single-step through frames (`⏭ STEP`).
* **Procedural VOID Controls**:
  * Quick-warp across deep procedural distances (Depth 10, 25, 50, 100) and jump directly to the nearest peaceful **Power Sanctuary**.
* **Browser Storage Persistence**:
  * All configured dev modifiers, hazard states, and panel coordinates are remembered in `localStorage` across page reloads while keeping the overlay unobtrusively closed on initial load until summoned.

---

## 🛠️ Hyperfold World Editor

Hyperfold includes a visual web-based world editor built with **React**, **TypeScript**, **Tailwind CSS**, and **Lucide Icons** located in the [`editor/`](./editor) directory. You can design levels directly in your browser using the online editor at **[vos.github.io/hyperfold/editor/ ↗](https://vos.github.io/hyperfold/editor/)** or run it locally.

### Key Editor Features
* **Instant `F5` Playtesting & Browser Tab Reuse**:
  * **Dedicated Quick-Access Shortcut**: Hit **`F5`** anywhere in the editor (or click the prominent **Test in Game [F5]** button in the header) to instantly playtest your level.
  * **Accidental Reload Protection**: Intercepts `F5` with `e.preventDefault()`, safeguarding against browser page reloads and lost level edits.
  * **Smart Tab Reuse**: Binds to a dedicated target window (`hyperfold_playtest_window`) and uses `postMessage` (`HYPERFOLD_LOAD_WORLD`) to hot-reload levels inside the already open game instance without spawning redundant browser tabs.
* **Sector World Graph View**:
  * Visual 2D coordinate grid showing all sectors in the manifold with coordinate badges, room titles, theme colors, and doorway links.
  * **Drag & Drop Sector Repositioning**: Click and drag any sector to move it to a vacant coordinate.
  * **Modifier-Key Sector Duplication**: Hold `Alt` / `Option` while dragging a sector to clone it to a vacant coordinate slot.
  * Start sector indicator (`START [0,0]`) and locked gate indicators.
* **Interactive Grid Canvas**:
  * Visual tile painter for solid blocks, one-way ledges, hazard spikes, crumble blocks, and bounce pads.
  * Entity drag-and-drop handles for moving platforms, laser barriers, turrets, portals, collectibles, keys, and spawn points.
  * **Ground-Aligned Snapping**: Portals, bounce pads, and platforms automatically snap flush with ground tiles ($y + 6$ portal alignment).
  * **Doorway Obstruction Guides**: Visual red warning indicators if solid blocks obstruct sector doorways.
* **Entity Inspector**:
  * **Quantum Portals**: Configure unique IDs, destination portal dropdowns with cross-sector lookup, neon glow color pickers with palette presets, and **Reversed Velocity** toggles.
  * **Laser Barriers & Turrets**: Edit harmonic movement paths, cycle timings (idle/warning/active), projectile speeds, auto-targeting radius, and continuous beam mode.
  * **Moving Platforms**: Configure start/end points, speeds, pause durations, and one-way platform toggles.
  * **Keys & Locked Gates**: Assign key colors, labels, and bind keys to sector exit doorways.
* **Diagnostics & Linting Validator**:
  * Real-time validation flagging duplicate IDs, broken portal targets, self-targeting portals, missing keys, and solid obstructions.
* **Direct Export to Game & Custom World Loading**:
  * **One-Click / Hotkey Testing**: Send levels directly to the game over the real-time cross-window `postMessage` / `localStorage` bridge.
  * **Custom World File Loading**: Download complete world bundles (`.json`) or single room files from the editor, and load them directly into the game at any time using the in-game **"+ Load Custom World (.json)..."** menu dropdown.
* **Import & Export**:
  * Direct export and import of complete world bundles or individual room JSON files conforming to [`room.schema.json`](./worlds/schemas/room.schema.json), with clipboard copying and local file downloads.

---

## 🎮 Controls

| Action | Keyboard | Gamepad | Mouse / Touch |
| :--- | :--- | :--- | :--- |
| **Move Left / Right** | `A` / `D` or `←` / `→` | D-Pad / Left Stick | — |
| **Jump** | `Space` / `W` / `↑` | Button `A` / Cross | — |
| **Duck / Crouch / Crawl** | `S` or `↓` | `Down` on D-Pad / Stick | — |
| **Drop Through Platform** | `S + Space` or `↓ + Jump` | `Down + Button A` | — |
| **Sector Map (2D Overlay)** | `M` | Button `Y` / Triangle | HUD Map Button |
| **Reset Sector / Die (Tap)** | `R` (Tap) | Button `Select` / `Back` (Tap) | `Reset [R]` Button (Tap) |
| **Restart Whole Level (Hold 0.8s)** | `Hold R` | `Hold Select` / `Back` | `Reset [R]` Button (Hold) |
| **Toggle Sound** | `U` | — | HUD Sound Button |
| **Toggle 3D / Flat View** | `C` | — | HUD View Button |
| **Reset 3D Camera** | `V` | Button `R3` (Stick Click) | HUD Camera Button |
| **Performance Telemetry** | `P` / `F3` / `` ` `` | — | HUD Profiler Button |
| **Developer Console** | `F2` | — | Gear Menu &bull; Status Badges |
| **Shift+Click Teleport (Dev Mode)** | `Shift + Left Click` | — | Click anywhere in chamber |
| **Orbit 3D Camera** | `I` / `J` / `K` / `L` | Right Thumbstick | Left Click + Drag |
| **Zoom In / Out** | — | — | Mouse Wheel |

---

## 🗺️ Demo Level: 10 Non-Euclidean Sectors

The included demo campaign demonstrates the infinite hypercube topology and advanced mechanics:

* **Sectors $(0,0) \rightarrow (6,0)$**: A continuous 7-screen horizontal voyage exceeding the 6 physical faces of a 3D cube.
* **Sector $(0,0)$ Genesis Core $\leftrightarrow$ $(2,2)$ Starlight Zenith**: Features interconnected **Quantum Portals** bridging the starting room directly with the high-altitude zenith.
* **Sector $(2,1)$ The Spire & $(2,2)$ Starlight Zenith**: Vertical climb chambers testing Up/Down 90° tumble rotations, laser barriers, and moving elevator lifts.
* **Sector $(4,-1)$ Sub-Zero Crypt**: Secret subterranean vault accessed by falling through a chasm, containing hidden Energy Prisms and high-power launch pads.
* **Key-Gated Passages**: The Warp Core Key chamber guarding the final sector doorway.
* **Sector $(6,0)$ Prism Horizon**: The Warp Core Goal Portal completing the stage.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 22.0 or 24.0 recommended)
* `npm` (bundled with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/vos/hyperfold.git
cd hyperfold

# Install game dependencies
npm install

# Install editor dependencies
npm --prefix editor install
```

### Running the Game

```bash
# Start local game development server (HMR enabled)
npm run dev

# Or build and preview the optimized production game bundle
npm start
```
Open `http://localhost:3000` in your browser.

### Running the World Editor

```bash
# Start the visual World Editor
npm run editor

# Build the World Editor for production
npm run editor:build

# Preview the World Editor production build
npm run editor:preview
```
Open `http://localhost:5174` in your browser.

### Unified Build & Deployment

To build both the game and the world editor together into `dist/` (placing the editor in the `dist/editor/` subfolder, exactly matching the GitHub Pages deployment structure):

```bash
# Build both game and editor into dist/
npm run build:all

# Preview the unified build locally (game at / and editor at /editor/)
npm run preview
```

The repository includes a [GitHub Actions Workflow](.github/workflows/deploy.yml) running on **Node.js 24** that automatically builds and deploys both the game (`/`) and the editor (`/editor/`) to GitHub Pages upon pushing to `main` or triggering manually via `workflow_dispatch`.

> **💡 Instant Playtesting:** You can directly export and test your custom levels in the game with zero manual setup by pressing **`F5`** or clicking **Test in Game [F5]** in the editor header, or by downloading the `.json` world bundle and selecting **"+ Load Custom World (.json)..."** from the game's world selection dropdown. The editor automatically reuses your open game tab and hot-reloads the world instantaneously.

---

## 🧪 Running Automated Tests

Run the comprehensive unit and integration test suite powered by Node.js's native test runner:

```bash
npm test
```

**187 automated tests passing across 18 test suites**:
* `tests/shared-entities.test.mjs` — Single source of truth verification: canonical spatial constants, entity defaults, gate key palettes, turret base angles, turret sanitization, kinematics solvers, tile conversions, portal geometry, and coordinate navigation math.
* `tests/dev-tools.test.mjs` — Developer manager singleton, dynamic hazard modes, god mode, fly mode, kinematics cheats, sector discovery, draggable overlay interaction, boundary clamping, and state persistence.
* `tests/portals.test.mjs` — Quantum portal routing, $N \to 1$ topology, collision exit debouncing, intra/inter-sector kinematics, and reversed velocity vector inversion.
* `tests/gate-keys.test.mjs` — Key pickups, locked exit forcefields, collision rejection, and sector map key markers.
* `tests/danger-spikes.test.mjs` — Directional spikes (walls, roof, platform) collision & geometric orientation detection.
* `tests/ducking.test.mjs` — Crouch kinematics, hitbox reduction, 1-tile crawlspaces, and laser avoidance.
* `tests/laser-hazards.test.mjs` — Laser barrier timing cycles, harmonic motion, raycast beams, projectiles, and dynamic moving platform shielding.
* `tests/moving-platforms.test.mjs` — Moving platform kinematics, passenger physics, momentum inheritance, and 3D pre-render face mapping.
* `tests/procedural.test.mjs` — Seed determinism, exit symmetry, safe spawn guarantees, difficulty curves, and Power Sanctuary archetypes.
* `tests/renderer-optimization.test.mjs` — Dynamic entity detection, chassis geometry merging, and round-robin texture upload throttling.
* `tests/sector-map.test.mjs` — 2D Sector Map discovery, bounding box calculation, key markers, and locked gate symbols.
* `tests/editor-integration.test.mjs` — World editor serialization, import/export, schema validation diagnostics, F5 playtest shortcut validation, and test in game window reuse.
* `tests/floor.test.mjs` — Floor integrity and safe spawn points across all campaign sectors.
* `tests/player-explosion.test.mjs` — 360° death explosion, synth sound, & R tap/hold reset logic.
* `tests/navigation.test.mjs` — Infinite non-Euclidean topology invariants.
* `tests/perf-tracker.test.mjs` — Telemetry statistics, FPS tracking, and sample ring buffers.
* `tests/world-registry.test.mjs` — Dynamic world bundle loading and memory isolation.
* `tests/declarative-level.test.mjs` — JSON level loading and schema compliance.

---

## 📁 Project Architecture

```
hyperfold/
├── index.html                     # WebGL viewport, HUD overlays, and styling
├── package.json                   # Project metadata and build scripts
├── tsconfig.json                  # Strict TypeScript configuration (with @shared paths)
├── vite.config.ts                 # Vite bundler configuration (with @shared alias)
├── screenshot.jpg                 # Gameplay showcase image
├── shared/                        # Single source of truth shared between game and editor
│   ├── index.ts                   # Central barrel export
│   ├── constants.ts               # Canonical spatial dimensions (ROOM_SIZE 800, TILE_SIZE 40, GRID 20x20)
│   ├── types/                     # Entity, world, and tile data contracts
│   │   ├── entities.ts            # MovingPlatformConfig, LaserBarrierConfig, Turret, Portal, Collectible
│   │   ├── world.ts               # RoomData, WorldData, WorldManifest, RoomExits, ExitGateConfig
│   │   └── tiles.ts               # TileType (strip-compatible const), TileGlyph, TileDefinition
│   ├── entities/                  # Entity defaults, kinematics, turret, portal, & gate helpers
│   │   ├── defaults.ts            # Canonical entity defaults (DEFAULT_MOVING_PLATFORM, etc.)
│   │   ├── platform.ts            # Harmonic sinusoidal moving platform kinematic solver
│   │   ├── barrier.ts             # Laser barrier kinematics and 3-phase activation solver
│   │   ├── turret.ts              # Turret base angle calculations and mode sanitization
│   │   ├── portal.ts              # Portal bounding box and center point helpers
│   │   └── collectible.ts         # GATE_KEY_PALETTE, getGateColor, and exit gate helpers
│   ├── tiles/                     # Tile definitions, hotkeys, and converters
│   │   ├── tileRegistry.ts        # TILE_DEFINITIONS, glyphToTileType, tileTypeToGlyph
│   │   └── spikes.ts              # Surface-attached spike orientation resolver
│   └── navigation/                # Hypercube lattice navigation and adjacent sector math
│       └── coordinates.ts         # getAdjacentCoords, getOppositeDirection, getAdjacentSectors
├── editor/                        # Hyperfold World Editor (React + Vite + Tailwind)
│   ├── index.html                 # Editor mount point
│   ├── package.json               # Editor dependencies
│   ├── src/
│   │   ├── App.tsx                # Main editor shell and view coordinator
│   │   ├── components/
│   │   │   ├── GridCanvas.tsx     # Interactive 2D room canvas with entity handles
│   │   │   ├── InspectorPanel.tsx # Entity and sector property editor
│   │   │   ├── WorldGraphView.tsx # 2D topological sector map with drag & drop
│   │   │   └── Toolbar.tsx        # Tool selection, world/room actions
│   │   ├── types/world.ts         # Re-exports from @shared and declares editor UI states
│   │   └── utils/
│   │       ├── navigation.ts      # Re-exports navigation math from @shared
│   │       ├── serialization.ts   # World/room import, export, and cloning via @shared
│   │       ├── tileDefinitions.ts # Re-exports tile registry from @shared
│   │       └── validator.ts       # Diagnostics linting engine
│   └── vite.config.ts             # Editor bundler configuration (with @shared alias)
├── src/
│   ├── main.ts                    # Game loop, state coordinator, and transition manager
│   ├── engine/
│   │   ├── AudioManager.ts        # Procedural Web Audio API sound synthesizer
│   │   ├── DevManager.ts          # Cheats, kinematics overrides, hazard modes, and persistence
│   │   ├── InputManager.ts        # Keyboard, mouse, and Gamepad API handlers
│   │   ├── ParticleSystem.ts      # 2D canvas particle emitter and trail effects
│   │   ├── PerformanceTracker.ts  # Frame time profiler and ring buffer
│   │   └── PhysicsEngine.ts       # Kinematics, AABB collision, moving platforms, lasers, portals
│   ├── entities/
│   │   ├── LaserBarrier.ts        # Laser barrier entity delegating kinematics to @shared
│   │   ├── LaserTurret.ts         # Wall/ceiling turrets with projectile and raycast beam collision
│   │   ├── MovingPlatform.ts      # Moving platform entity delegating kinematics to @shared
│   │   └── Player.ts              # Player state, kinematics, ducking, and rendering
│   ├── graphics/
│   │   ├── CubeRenderer.ts        # Three.js 3D beveled cube, orbit camera, and tumble slerp
│   │   ├── FaceRenderer.ts        # 2D Canvas tilemap, portals, and HUD compositor for cube faces
│   │   └── VoidBackground.ts      # Deep space starfield and floating polyhedra
│   ├── ui/
│   │   ├── DevDebugOverlay.ts     # Developer debug console, cheats, and diagnostics
│   │   ├── Draggable.ts           # Pointer-based draggable overlay controller with persistence
│   │   ├── PerformanceDebugView.ts# Real-time telemetry, FPS graphing, and profiler
│   │   └── SectorMapView.ts       # 2D panoramic sector map overlay
│   └── world/
│       ├── LevelLoader.ts         # ASCII grid parser and JSON loader via @shared
│       ├── LevelMap.ts            # Dynamic coordinate-based room map and portal indexing
│       ├── ProceduralLevelMap.ts  # On-demand infinite procedural sector generator
│       ├── ProceduralWorldGenerator.ts # Seeded room generator with difficulty curve
│       ├── ScreenData.ts          # Re-exports @shared and defines runtime ScreenData
│       └── WorldRegistry.ts       # Auto-discovery and registration of worlds
├── worlds/
│   ├── demo/                      # Built-in campaign sectors (Genesis Core, Spire, Zenith, etc.)
│   └── schemas/                   # JSON schemas for room and world validation
└── tests/                         # Node.js automated test suites (187 tests)
```

---

## 📐 How the Non-Euclidean Cube Works

In Euclidean space, a cube has exactly 6 faces. If you walk across 4 faces in one direction, you return to where you started.

**Hyperfold** decouples the physical 3D representation from the logical room topology:
1. The player always plays on the **Front Face ($+Z$)** of a 3D cube.
2. The world is an open coordinate plane $\mathbb{Z}^2$.
3. When crossing an exit seam in direction $\vec{d}$ (or stepping into a cross-sector portal), the target room is rendered onto the corresponding adjacent face.
4. The cube rotates 90° toward $\vec{d}$.
5. Once rotation completes, the coordinate state updates, the cube's rotation quaternion is instantaneously reset to identity $(0, 0, 0, 1)$, and all surrounding faces are immediately rebound to the new room's logical neighbors.

The visual illusion is a seamless tumble in 3D space; the mathematical reality is an infinite, navigable plane folded across a 6-sided die.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
