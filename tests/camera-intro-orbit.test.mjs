import assert from 'node:assert/strict';
import test from 'node:test';

test('Intro 3D Camera Orbit and 2D Transition Verification', async (t) => {
  await t.test('Intro 3D Orbit mathematical model orbits the front face (+Z) continuously', () => {
    // Model of CubeRenderer intro orbit
    const orbitSpeed = 0.45;
    const radiusYaw = 0.36;
    const radiusPitch = 0.20;

    function computeOrbit(t) {
      const angle = t * orbitSpeed;
      const yaw = Math.sin(angle) * radiusYaw + Math.sin(angle * 2.3) * 0.04;
      const pitch = Math.cos(angle) * radiusPitch + Math.cos(angle * 1.7) * 0.03;
      const distance = 37.5 + Math.sin(angle * 2.0) * 1.8;
      const lookTarget = {
        x: -1.2 * Math.sin(angle),
        y: -0.6 * Math.cos(angle),
        z: 0,
      };

      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);

      const targetX = sinY * cosP * distance;
      const targetY = sinP * distance;
      const targetZ = cosY * cosP * distance;

      return { yaw, pitch, distance, lookTarget, targetX, targetY, targetZ };
    }

    // Verify initial state at t = 0
    const start = computeOrbit(0);
    assert.ok(Math.abs(start.yaw - 0) < 0.05, 'Initial yaw should be near 0');
    assert.ok(start.pitch > 0.15, 'Initial pitch should be slightly elevated above front face');
    assert.ok(start.targetZ > 30, 'Camera must be positioned in front (+Z) of the cube');

    // Sample across a full 360-degree orbit revolution (~8.4 seconds)
    const fullCycleTime = (Math.PI * 2) / orbitSpeed;
    let minZ = Infinity;
    let maxAbsX = 0;
    let maxAbsY = 0;

    for (let time = 0; time <= fullCycleTime; time += 0.2) {
      const state = computeOrbit(time);
      if (state.targetZ < minZ) minZ = state.targetZ;
      if (Math.abs(state.targetX) > maxAbsX) maxAbsX = Math.abs(state.targetX);
      if (Math.abs(state.targetY) > maxAbsY) maxAbsY = Math.abs(state.targetY);

      // Verify front face (+Z normal) is always facing camera
      assert.ok(state.targetZ > 25, `targetZ (${state.targetZ}) must remain positive and in front of cube at t=${time}`);
      assert.ok(Math.cos(state.pitch) > 0.9, 'Pitch angle must stay moderate without flipping cube');
      assert.ok(Math.cos(state.yaw) > 0.85, 'Yaw angle must stay facing front face');
    }

    // Verify that the orbit sweeps sufficiently in both X and Y to showcase 3D depth
    assert.ok(maxAbsX > 10, 'Orbit must swing horizontally to reveal adjacent faces');
    assert.ok(maxAbsY > 6, 'Orbit must swoop vertically to reveal top and bottom faces');
  });

  await t.test('First player interaction triggers exit from intro orbit and transitions to 2D', () => {
    function hasPlayerMovementOrAction(input) {
      return (
        input.left ||
        input.right ||
        input.up ||
        input.down ||
        input.jump ||
        input.jumpJustPressed ||
        input.dashJustPressed ||
        input.restart ||
        input.restartJustPressed ||
        Math.abs(input.cameraOrbitX || 0) > 0.05 ||
        Math.abs(input.cameraOrbitY || 0) > 0.05 ||
        input.cameraResetJustPressed
      );
    }

    // Neutral input should not trigger exit
    const idleInput = {
      left: false, right: false, up: false, down: false,
      jump: false, jumpJustPressed: false, dashJustPressed: false,
      restart: false, restartJustPressed: false,
      cameraOrbitX: 0, cameraOrbitY: 0, cameraResetJustPressed: false,
    };
    assert.equal(hasPlayerMovementOrAction(idleInput), false);

    // Any gameplay movement triggers exit
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, left: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, right: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, up: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, down: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, jump: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, jumpJustPressed: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, dashJustPressed: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, restart: true }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, restartJustPressed: true }), true);

    // Any camera controls trigger exit
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, cameraOrbitX: 0.5 }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, cameraOrbitY: -0.4 }), true);
    assert.equal(hasPlayerMovementOrAction({ ...idleInput, cameraResetJustPressed: true }), true);
  });

  await t.test('Smooth transition glides from 3D orbit position into 2D orthogonal alignment', () => {
    // Starting camera position from 3D orbit
    const cameraPos = { x: 12.5, y: 7.2, z: 35.8 };
    const currentLookAt = { x: -1.0, y: -0.5, z: 0 };
    const targetZ = 36.0;

    let frames = 0;
    const dt = 0.0166;
    const lerpSpeed = Math.min(1.0, dt * 5.0);

    while (frames < 120) {
      frames++;
      if (Math.abs(cameraPos.x) < 0.02 && Math.abs(cameraPos.y) < 0.02) {
        cameraPos.x = 0;
        cameraPos.y = 0;
        cameraPos.z = targetZ;
        currentLookAt.x = 0;
        currentLookAt.y = 0;
        currentLookAt.z = 0;
        break;
      }

      cameraPos.x += (0 - cameraPos.x) * lerpSpeed;
      cameraPos.y += (0 - cameraPos.y) * lerpSpeed;
      cameraPos.z += (targetZ - cameraPos.z) * lerpSpeed;
      currentLookAt.x += (0 - currentLookAt.x) * lerpSpeed;
      currentLookAt.y += (0 - currentLookAt.y) * lerpSpeed;
      currentLookAt.z += (0 - currentLookAt.z) * lerpSpeed;
    }

    // Verify it settled cleanly within ~1 second (~60-90 frames)
    assert.ok(frames > 15, 'Transition must be a smooth multi-frame glide, not an instant teleport');
    assert.ok(frames < 90, `Transition should settle within ~1.5 seconds (took ${frames} frames)`);
    assert.equal(cameraPos.x, 0, 'Camera X must settle strictly to 0 in 2D mode');
    assert.equal(cameraPos.y, 0, 'Camera Y must settle strictly to 0 in 2D mode');
    assert.equal(cameraPos.z, 36.0, 'Camera Z must settle to target 2D distance');
    assert.equal(currentLookAt.x, 0, 'LookAt must settle strictly to 0 in 2D mode');
    assert.equal(currentLookAt.y, 0, 'LookAt must settle strictly to 0 in 2D mode');
  });

  await t.test('Camera state lifecycle: launches in intro orbit, transitions to 2D, stays in 2D until manual switch, restarts on load/reset', () => {
    class MockGame {
      constructor() {
        this.camera3DMode = true;
        this.isIntroOrbiting = true;
        this.cameraViewLabel = 'View: 3D Depth';
      }

      startIntroOrbit() {
        this.isIntroOrbiting = true;
        this.camera3DMode = true;
        this.cameraViewLabel = ' View: 3D Depth ';
      }

      stopIntroOrbitAndTransitionTo2D() {
        if (!this.isIntroOrbiting) return;
        this.isIntroOrbiting = false;
        this.camera3DMode = false;
        this.cameraViewLabel = ' View: Flat Face ';
      }

      onManualCameraToggle() {
        if (this.isIntroOrbiting) {
          this.stopIntroOrbitAndTransitionTo2D();
          return;
        }
        this.camera3DMode = !this.camera3DMode;
        this.cameraViewLabel = this.camera3DMode ? ' View: 3D Depth ' : ' View: Flat Face ';
      }

      onFirstPlayerInteraction() {
        if (this.isIntroOrbiting) {
          this.stopIntroOrbitAndTransitionTo2D();
        }
      }

      loadWorld() {
        this.startIntroOrbit();
      }
    }

    const game = new MockGame();

    // 1. Initial launch state
    assert.equal(game.isIntroOrbiting, true, 'Game should launch with intro 3D orbit');
    assert.equal(game.camera3DMode, true, 'Game should launch in 3D camera mode');

    // 2. First player interaction transitions to 2D
    game.onFirstPlayerInteraction();
    assert.equal(game.isIntroOrbiting, false, 'Intro orbit should stop after first player interaction');
    assert.equal(game.camera3DMode, false, 'Camera mode must transition to 2D');
    assert.equal(game.cameraViewLabel, ' View: Flat Face ');

    // 3. Stays in 2D mode during gameplay and further interactions
    game.onFirstPlayerInteraction();
    assert.equal(game.camera3DMode, false, 'Game must stay in 2D mode during ongoing play');

    // 4. Player decides to switch to 3D mode
    game.onManualCameraToggle();
    assert.equal(game.camera3DMode, true, 'Player can manually switch to 3D mode');
    assert.equal(game.isIntroOrbiting, false, 'Manual 3D mode is standard orbit, not intro orbit');
    assert.equal(game.cameraViewLabel, ' View: 3D Depth ');

    // 5. Player switches back to 2D mode
    game.onManualCameraToggle();
    assert.equal(game.camera3DMode, false, 'Player can toggle back to 2D mode');
    assert.equal(game.cameraViewLabel, ' View: Flat Face ');

    // 6. Game reset or loaded restarts intro 3D orbit
    game.loadWorld();
    assert.equal(game.isIntroOrbiting, true, 'Game reset/loaded must restart intro 3D orbit');
    assert.equal(game.camera3DMode, true, 'Game reset/loaded must be in 3D orbit mode');

    // 7. Manual camera toggle while in intro orbit switches directly to 2D mode
    game.onManualCameraToggle();
    assert.equal(game.isIntroOrbiting, false, 'Manual toggle during intro orbit stops orbit');
    assert.equal(game.camera3DMode, false, 'Manual toggle during intro orbit switches to 2D mode');
    assert.equal(game.cameraViewLabel, ' View: Flat Face ');
  });
});
