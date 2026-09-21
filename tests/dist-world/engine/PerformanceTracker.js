"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceTracker = void 0;
class PerformanceTracker {
    maxSamples;
    frameTimes = [];
    lastTimestamp = 0;
    currentFrameTime = 0;
    constructor(maxSamples = 60) {
        this.maxSamples = Math.max(10, maxSamples);
    }
    /**
     * Records a frame timestamp (in ms) and computes frame delta time.
     * Returns instantaneous frame time in milliseconds.
     */
    recordFrame(timestampMs) {
        if (this.lastTimestamp === 0) {
            this.lastTimestamp = timestampMs;
            this.currentFrameTime = 16.67;
            return this.currentFrameTime;
        }
        const delta = timestampMs - this.lastTimestamp;
        this.lastTimestamp = timestampMs;
        // Filter out crazy tab-switching pauses (> 1000ms) to avoid skewing rolling statistics
        if (delta <= 0 || delta > 1000) {
            return this.currentFrameTime;
        }
        this.currentFrameTime = delta;
        this.frameTimes.push(delta);
        if (this.frameTimes.length > this.maxSamples) {
            this.frameTimes.shift();
        }
        return this.currentFrameTime;
    }
    /**
     * Generates a statistical snapshot of current performance.
     */
    getSnapshot() {
        if (this.frameTimes.length === 0) {
            return {
                fps: 60,
                frameTimeMs: 16.7,
                avgFrameTimeMs: 16.7,
                minFrameTimeMs: 16.7,
                maxFrameTimeMs: 16.7,
                history: [16.7],
            };
        }
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < this.frameTimes.length; i++) {
            const val = this.frameTimes[i];
            sum += val;
            if (val < min)
                min = val;
            if (val > max)
                max = val;
        }
        const avg = sum / this.frameTimes.length;
        const fps = avg > 0 ? 1000 / avg : 0;
        return {
            fps: Math.round(fps * 10) / 10,
            frameTimeMs: Math.round(this.currentFrameTime * 10) / 10,
            avgFrameTimeMs: Math.round(avg * 10) / 10,
            minFrameTimeMs: Math.round(min * 10) / 10,
            maxFrameTimeMs: Math.round(max * 10) / 10,
            history: [...this.frameTimes],
        };
    }
    reset() {
        this.frameTimes = [];
        this.lastTimestamp = 0;
        this.currentFrameTime = 0;
    }
}
exports.PerformanceTracker = PerformanceTracker;
