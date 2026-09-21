import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PerformanceTracker } = require('./dist-world/engine/PerformanceTracker.js');

test('Performance Tracker & Telemetry Statistics', async (t) => {
  await t.test('Initial snapshot returns sensible baseline when uninitialized', () => {
    const tracker = new PerformanceTracker(60);
    const snap = tracker.getSnapshot();

    assert.equal(snap.fps, 60);
    assert.equal(snap.frameTimeMs, 16.7);
    assert.equal(snap.avgFrameTimeMs, 16.7);
    assert.equal(snap.minFrameTimeMs, 16.7);
    assert.equal(snap.maxFrameTimeMs, 16.7);
    assert.equal(snap.history.length, 1);
  });

  await t.test('Accurately tracks steady 60 FPS frames (16.67ms)', () => {
    const tracker = new PerformanceTracker(60);
    let time = 1000;

    tracker.recordFrame(time); // Initial frame

    for (let i = 0; i < 30; i++) {
      time += 16.666;
      tracker.recordFrame(time);
    }

    const snap = tracker.getSnapshot();
    assert.ok(snap.fps >= 59.5 && snap.fps <= 60.5, `FPS was ${snap.fps}, expected ~60`);
    assert.ok(snap.frameTimeMs >= 16.5 && snap.frameTimeMs <= 16.8, `Frame time was ${snap.frameTimeMs}`);
    assert.equal(snap.history.length, 30);
  });

  await t.test('Correctly identifies min and max frame times', () => {
    const tracker = new PerformanceTracker(60);
    let time = 2000;

    tracker.recordFrame(time);
    time += 10; tracker.recordFrame(time); // 10ms (fast)
    time += 25; tracker.recordFrame(time); // 25ms (slow)
    time += 15; tracker.recordFrame(time); // 15ms

    const snap = tracker.getSnapshot();
    assert.equal(snap.minFrameTimeMs, 10);
    assert.equal(snap.maxFrameTimeMs, 25);
    assert.equal(snap.frameTimeMs, 15);
    assert.equal(snap.avgFrameTimeMs, 16.7); // (10 + 25 + 15) / 3 = 16.67 -> 16.7
  });

  await t.test('Enforces maximum sample buffer capacity (ring buffer)', () => {
    const maxSamples = 20;
    const tracker = new PerformanceTracker(maxSamples);
    let time = 1000;

    tracker.recordFrame(time);
    for (let i = 0; i < 50; i++) {
      time += 16.67;
      tracker.recordFrame(time);
    }

    const snap = tracker.getSnapshot();
    assert.equal(snap.history.length, maxSamples, `Expected ring buffer length to cap at ${maxSamples}`);
  });

  await t.test('Filters out large background pauses (>1000ms) without corrupting statistics', () => {
    const tracker = new PerformanceTracker(60);
    let time = 1000;

    tracker.recordFrame(time);
    time += 16.67; tracker.recordFrame(time);
    time += 16.67; tracker.recordFrame(time);

    // Simulate tab blur / long pause of 5 seconds
    time += 5000;
    const returnedDelta = tracker.recordFrame(time);

    // Should return previous valid frameTime and not add 5000 to samples
    assert.ok(returnedDelta < 100, `Delta should be bounded, was ${returnedDelta}`);
    const snap = tracker.getSnapshot();
    assert.ok(snap.maxFrameTimeMs < 100, `Max frame time should not reflect the 5s pause, was ${snap.maxFrameTimeMs}`);
  });

  await t.test('Reset cleans buffer and state', () => {
    const tracker = new PerformanceTracker(60);
    tracker.recordFrame(1000);
    tracker.recordFrame(1016);
    tracker.reset();

    const snap = tracker.getSnapshot();
    assert.equal(snap.fps, 60);
    assert.equal(snap.history.length, 1);
  });
});

