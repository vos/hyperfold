# Walkthrough: Infinite 3D Cube Platformer

We have designed, implemented, and verified the **Infinite 3D Cube Platformer** game.

The game combines classic 2D jump & run platforming mechanics with a pseudo-3D cube world that tumbles 90° whenever the player crosses any of the four screen edges. While physically appearing as a 3D cube tumbling in deep space, topologically the game world is an **infinite non-Euclidean manifold** featuring fixed, hand-crafted screens that never loop in circles (unless specifically designed) and always preserve round-trip navigation.

![Infinite 3D Cube Platformer Gameplay](./screenshot.jpg)

---

## What Was Built

### 1. The Infinite Pseudo-Cube Rebinding Engine
- **Logical Manifold**: Rooms exist on an arbitrary 2D grid $(X, Y)$ mapped in [`LevelMap.ts`](file:///root/container_test/src/world/LevelMap.ts).
- **Dynamic 3D Face Rebinding**:
  - The player interacts on the **Front Face** ($+Z$) of a 3D beveled cube built in Three.js in [`CubeRenderer.ts`](file:///root/container_test/src/graphics/CubeRenderer.ts).
  - When an edge boundary is crossed, the destination room is pre-rendered onto the adjacent 3D face (Right, Left, Top, or Bottom).
  - The cube executes a smooth 90° slerp rotation using `easeInOutCubic` (~420ms).
  - Upon reaching 90°, the coordinate state is updated, the cube rotation is instantaneously reset to 0, and all neighbor faces are re-bound to the new room's neighbors.
  - This allows levels with **more than 6 screens** to be explored continuously without ever looping back to old screens, while walking back in reverse leads to the exact previous room.

### 2. Snappy 2D Platformer Kinematics
- Implemented in [`PhysicsEngine.ts`](file:///root/container_test/src/engine/PhysicsEngine.ts) and [`Player.ts`](file:///root/container_test/src/entities/Player.ts):
  - Tight acceleration and deceleration with variable jump height (cutting vertical velocity on early button release).
  - **Coyote Time** (100ms tolerance) allowing jumps right after running off edges.
  - **Jump Buffering** (120ms tolerance) registering jump presses right before landing.
  - One-way jump-through platforms, bounce pads with high propulsion, crumble blocks, and spikes with respawn.
  - Preserved velocity and momentum across edge transitions.

### 3. Retro Neon / Synth Void Visuals & Procedural Audio
- **Cosmic Void**: Fixed 3D starfield with drifting wireframe octahedra in [`VoidBackground.ts`](file:///root/container_test/src/graphics/VoidBackground.ts) that stay stationary relative to the camera, emphasizing the 3D rotation of the cube.
- **Particle System**: Glowing jump/landing dust, collectible pickup sparks, motion trails, and boundary glow in [`ParticleSystem.ts`](file:///root/container_test/src/engine/ParticleSystem.ts).
- **Procedural Synthesizer**: Web Audio API audio engine in [`AudioManager.ts`](file:///root/container_test/src/engine/AudioManager.ts) providing resonant 3D rotation whooshes, synth jumps, landing thuds, collectible chimes, death bursts, and a low-pass ambient drone.

### 4. Hand-Crafted 10-Sector Demo Level
Created in [`DemoLevel.ts`](file:///root/container_test/src/world/DemoLevel.ts) demonstrating all mechanics:
- **Sectors (0,0) through (6,0)**: A continuous 7-screen horizontal run exceeding the 6 faces of a physical cube.
- **Sectors (2,1) & (2,2)**: Vertical climb rooms testing Up/Down 90° cube tumble transitions.
- **Sector (4,-1)**: Hidden underground crypt accessed by falling through a chasm, containing secret energy prisms.
- **Sector (6,0)**: The Warp Core Goal Portal completing the stage.

---

## Key Files Created

| File | Description |
| :--- | :--- |
| [`src/world/ScreenData.ts`](file:///root/container_test/src/world/ScreenData.ts) | Tile types, room exit flags, and screen data interfaces |
| [`src/world/LevelMap.ts`](file:///root/container_test/src/world/LevelMap.ts) | Coordinate-based room manager with persistent item tracking |
| [`src/world/DemoLevel.ts`](file:///root/container_test/src/world/DemoLevel.ts) | 10 hand-crafted demo sectors showcasing infinite cube turns |
| [`src/engine/InputManager.ts`](file:///root/container_test/src/engine/InputManager.ts) | Keyboard (WASD/Arrows/Space) and Gamepad API controller |
| [`src/engine/PhysicsEngine.ts`](file:///root/container_test/src/engine/PhysicsEngine.ts) | AABB platformer collision detection and edge crossing events |
| [`src/engine/AudioManager.ts`](file:///root/container_test/src/engine/AudioManager.ts) | Procedural Web Audio API sound effects and synth ambient |
| [`src/engine/ParticleSystem.ts`](file:///root/container_test/src/engine/ParticleSystem.ts) | 2D neon particle effects, dust puffs, and trails |
| [`src/entities/Player.ts`](file:///root/container_test/src/entities/Player.ts) | Cyber runner character with animated legs and glowing core |
| [`src/graphics/FaceRenderer.ts`](file:///root/container_test/src/graphics/FaceRenderer.ts) | 2D canvas room and HUD renderer for cube face textures |
| [`src/graphics/VoidBackground.ts`](file:///root/container_test/src/graphics/VoidBackground.ts) | Stationary 3D starfield and ambient polyhedra in deep space |
| [`src/graphics/CubeRenderer.ts`](file:///root/container_test/src/graphics/CubeRenderer.ts) | Three.js scene, beveled cube, and 90° slerp rotation tweens |
| [`src/main.ts`](file:///root/container_test/src/main.ts) | Game loop, state coordinator, and UI overlays |
| [`index.html`](file:///root/container_test/index.html) | Viewport shell, HUD sector/prism cards, and victory modal |
| [`tests/navigation.test.mjs`](file:///root/container_test/tests/navigation.test.mjs) | Topology unit test validating non-Euclidean navigation |
| [`tests/floor.test.mjs`](file:///root/container_test/tests/floor.test.mjs) | Automated floor & spawn point verification for all 10 sectors |

---

## Verification Results

### 1. Automated Floor, Topology & Kinematics Test
Executed with Node's native test runner:
```bash
npm test
```
```
▶ Screen Floor & Topology Verification
  ✔ All 10 rooms exist and have solid floor on row 18
  ✔ Sector (2,1) The Spire has floor ledges, bounce pads, and vertical chute
  ✔ Sector (2,2) Starlight Zenith has floor ledges and one-way entry platform
  ✔ Sector (4,0) Tesseract Chasm has valid stepping stones and crumble blocks
  ✔ All rooms have grounded, safe spawn points
✔ Screen Floor & Topology Verification
✔ Infinite Cube Topology Invariants
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
```
- Proved all 10 demo sectors have solid floors at row 18.
- Proved all spawn points are safely grounded.
- Proved that traversing 6 consecutive turns yields 7 unique sectors (exceeding standard 6-sided dice limits).
- Proved that traversing back left returns to $(0,0)$ deterministically.
- Proved vertical branch and underground crypt round-trips.

### 2. TypeScript Type-Checking & Vite Production Build
```bash
npm run build
```
- `tsc`: Passed with zero type errors.
- `vite build`: Successfully bundled HTML and minified assets into `dist/`.

### 3. Server Verification
The preview server was started and verified responding to HTTP requests:
```bash
curl -s http://localhost:3000/ | head -n 30
```
- HTTP status 200 with complete HUD overlay and canvas container.

---

## How to Play

1. **Controls**:
   - **Move Left / Right**: `A` / `D` or `Left` / `Right` Arrow keys
   - **Jump**: `Space` or `W` or `Up` Arrow key (variable jump height)
   - **Reset Room**: `R` key
   - **Toggle Sound**: `M` key or HUD button
   - **Toggle View Mode**: `C` key (switches between 3D Depth View and Flat Face View)
   - **Gamepad**: Standard USB/Bluetooth gamepads automatically supported!
2. **Objective**:
   - Run and jump across the platforms to reach the screen edge to trigger the 3D cube rotation.
   - Collect the glowing **Energy Prisms** scattered across the sectors.
   - Reach **Sector 6 (Prism Horizon)** to enter the Warp Core!
