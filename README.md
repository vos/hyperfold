# Hyperfold: Infinite Cube

> Traverse infinite sectors folded across the faces of a rotating 3D hypercube.

The game combines classic 2D jump & run platforming mechanics with a pseudo-3D cube world that tumbles 90° whenever the player crosses any of the four screen edges. While physically appearing as a 3D cube tumbling in deep space, topologically the game world is an **infinite non-Euclidean manifold** featuring fixed, hand-crafted screens that never loop in circles (unless specifically designed) and always preserve round-trip navigation.

![Hyperfold Gameplay](./screenshot.jpg)

---

## 🌟 Key Features

### 🎲 Infinite Non-Euclidean Cube Rebinding Engine
* **Higher-Dimensional Topology**: Rooms exist on an open $(X, Y)$ coordinate manifold. Traversing 6 consecutive screens yields unique sectors without looping back to old screens, while traveling backward deterministically returns to your exact origin.
* **Seamless 3D Tumble Transitions**: When crossing an edge boundary, the cube executes a smooth 90° slerp rotation (`easeInOutCubic`, ~420ms).
* **Zero Pop-In Predictive Pre-Rendering**: The destination face, the incoming trailing face (Face 5: $-Z$), and all perpendicular adjacent faces are dynamically pre-rendered *before* the tumble begins, eliminating texture pop-in or mid-turn replacements.
* **Canvas-to-WebGL Pipeline**: Crisp 2D Canvas tilemaps and dynamic sprites rendered directly onto Three.js `CanvasTexture` materials with dynamic player point lighting.

### 🏃 Precision 2D Platforming Kinematics
* **Fluid Movement**: Smooth acceleration, deceleration, and variable jump height (cutting vertical velocity on early jump release).
* **Coyote Time (100ms)**: Jump gracefully even after walking off a platform edge.
* **Jump Buffering (120ms)**: Queue jumps immediately before touching down on solid ground.
* **Moving Platforms & Passenger Physics**: Floating hover cruisers and vertical elevators that accurately carry players with horizontal momentum inheritance.
* **Down + Jump Drop-Through**: Press `Down + Jump` while standing on one-way or moving platforms to drop through, mirroring classic platformer conventions.
* **Hazard & Interactive Mechanics**: One-way ledges, crumble blocks with respawn timers, super bounce launch pads, and hazard spikes with instant respawn.

### 🌌 Synthwave Atmosphere & Procedural Audio
* **Cosmic Starfield**: Independent deep-space starfield and drifting wireframe octahedra that remain stationary relative to the camera to accentuate the cube's 3D rotation.
* **Dynamic Particle Systems**: Landing dust, jump bursts, collectible pickup sparks, motion trails, and screen-edge boundary luminescence.
* **Zero-Asset Web Audio API Synthesizer**: Fully procedural sound effects—resonant 3D rotation whooshes, synth jump arps, landing thuds, collectible chimes, death bursts, and a low-pass ambient drone. No external audio files required.

### 🎥 Interactive 3D Camera Controls
* **Free Orbit**: Click and drag with the left mouse button to orbit around the cube from any angle.
* **Zoom**: Scroll the mouse wheel to inspect details up close or view the cosmic void.
* **Camera Reset & Flat Mode**: Hit `V` to reset the camera to the default dramatic angle, or `C` to toggle between 3D Depth View and Orthographic 2D Flat Face View.

### 📊 Real-Time Performance & Telemetry HUD
* **Built-In Profiler**: Real-time FPS graph, average/min/max frame-time tracking, sample ring buffers, and memory telemetry.
* **Toggle Shortcut**: Press `P`, `F3`, or `` ` `` anytime during gameplay to view diagnostic stats.

---

## 🎮 Controls

| Action | Keyboard | Gamepad | Mouse |
| :--- | :--- | :--- | :--- |
| **Move Left / Right** | `A` / `D` or `←` / `→` | D-Pad / Left Stick | — |
| **Jump** | `Space` / `W` / `↑` | Button `A` / Cross | — |
| **Drop Through Platform** | `S + Space` or `↓ + Jump` | `Down + Button A` | — |
| **Reset Sector** | `R` | — | — |
| **Toggle Sound** | `M` | — | HUD Button |
| **Toggle 3D / Flat View** | `C` | — | HUD Button |
| **Reset 3D Camera** | `V` | — | HUD Button |
| **Performance Telemetry** | `P` / `F3` / `` ` `` | — | HUD Button |
| **Orbit 3D Camera** | — | — | Left Click + Drag |
| **Zoom In / Out** | — | — | Mouse Wheel |

---

## 🗺️ Demo Level: 10 Non-Euclidean Sectors

The included demo campaign illustrates the infinite hypercube topology:

* **Sectors $(0,0) \rightarrow (6,0)$**: A continuous 7-screen horizontal voyage exceeding the 6 physical faces of a 3D cube.
* **Sector $(2,1)$ The Spire & $(2,2)$ Starlight Zenith**: Vertical climb chambers testing Up/Down 90° tumble rotations.
* **Sector $(4,-1)$ Sub-Zero Crypt**: Secret subterranean vault accessed by falling through a chasm, containing hidden Energy Prisms and high-power launch pads.
* **Sector $(6,0)$ Prism Horizon**: The Warp Core Goal Portal completing the stage.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18.0 or higher recommended)
* `npm` (bundled with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/vos/hyperfold.git
cd hyperfold

# Install dependencies
npm install
```

### Development Server
Run Vite's local dev server with Hot Module Replacement (HMR):
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build & Preview
Build the TypeScript source and preview the optimized production bundle:
```bash
# Build & preview with one command
npm start

# Or run separately
npm run build
npm run preview
```

### Running Automated Tests
Run the unit test suite powered by Node.js's native test runner:
```bash
npm test
```
Validates floor consistency across all 10 rooms, spawn safety, passenger physics, Down+Jump mechanics, non-Euclidean navigation invariants, and 3D transition face mappings (28 tests passing).

---

## 📁 Project Architecture

```
hyperfold/
├── index.html                     # WebGL viewport, HUD overlays, and styling
├── package.json                   # Project metadata and build scripts
├── tsconfig.json                  # Strict TypeScript configuration
├── vite.config.ts                 # Vite bundler configuration
├── screenshot.jpg                 # Gameplay showcase image
├── src/
│   ├── main.ts                    # Game loop, state coordinator, and transition manager
│   ├── engine/
│   │   ├── AudioManager.ts        # Procedural Web Audio API sound synthesizer
│   │   ├── InputManager.ts        # Keyboard, mouse, and Gamepad API handlers
│   │   ├── ParticleSystem.ts      # 2D canvas particle emitter and trail effects
│   │   └── PhysicsEngine.ts       # AABB collision, moving platforms, and seam crossing
│   ├── entities/
│   │   ├── MovingPlatform.ts      # Harmonic moving platforms with displacement tracking
│   │   └── Player.ts              # Player state, kinematics, and rendering
│   ├── graphics/
│   │   ├── CubeRenderer.ts        # Three.js 3D beveled cube, orbit camera, and tumble slerp
│   │   ├── FaceRenderer.ts        # 2D Canvas tilemap and HUD compositor for cube faces
│   │   └── VoidBackground.ts      # Deep space starfield and floating polyhedra
│   ├── ui/
│   │   └── PerformanceDebugView.ts# Real-time telemetry, FPS graphing, and profiler
│   └── world/
│       ├── DemoLevel.ts           # 10 hand-crafted sectors with collectibles and hazards
│       ├── LevelMap.ts            # Dynamic coordinate-based room map and visited states
│       └── ScreenData.ts          # Tile definitions, room schemas, and exits
└── tests/
    ├── floor.test.mjs             # Floor integrity and safe spawn points
    ├── moving-platforms.test.mjs  # Moving platform kinematics & 3D pre-render face mapping
    ├── navigation.test.mjs        # Infinite non-Euclidean topology invariants
    └── perf-tracker.test.mjs      # Telemetry statistics and ring buffer behavior
```

---

## 📐 How the Non-Euclidean Cube Works

In Euclidean space, a cube has exactly 6 faces. If you walk across 4 faces in one direction, you return to where you started.

**Hyperfold** decouples the physical 3D representation from the logical room topology:
1. The player always plays on the **Front Face ($+Z$)** of a 3D cube.
2. The world is an open coordinate plane $\mathbb{Z}^2$.
3. When crossing an exit seam in direction $\vec{d}$, the target room $(x + d_x, y + d_y)$ is rendered onto the corresponding adjacent face.
4. The cube rotates 90° toward $\vec{d}$.
5. Once rotation completes, the coordinate state updates, the cube's rotation quaternion is instantaneously reset to identity $(0, 0, 0, 1)$, and all surrounding faces are immediately rebound to the new room's logical neighbors.

The visual illusion is a seamless tumble in 3D space; the mathematical reality is an infinite, navigable plane folded across a 6-sided die.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
