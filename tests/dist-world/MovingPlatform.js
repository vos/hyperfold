"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MovingPlatform = void 0;
class MovingPlatform {
    config;
    x;
    y;
    vx = 0;
    vy = 0;
    prevX;
    prevY;
    width;
    height;
    oneWay;
    themeColor;
    progress = 0;
    constructor(config, initialTime = 0) {
        this.config = config;
        this.width = config.width;
        this.height = config.height ?? 16;
        this.oneWay = config.oneWay !== false;
        this.themeColor = config.themeColor;
        const initialState = MovingPlatform.computePlatformState(config, initialTime);
        this.x = initialState.x;
        this.y = initialState.y;
        this.vx = initialState.vx;
        this.vy = initialState.vy;
        this.prevX = this.x;
        this.prevY = this.y;
        this.progress = initialState.progress;
    }
    update(time) {
        this.prevX = this.x;
        this.prevY = this.y;
        const state = MovingPlatform.computePlatformState(this.config, time);
        this.x = state.x;
        this.y = state.y;
        this.vx = state.vx;
        this.vy = state.vy;
        this.progress = state.progress;
    }
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }
    /**
     * Deterministically calculates platform position, velocity, and progress at any given game time.
     * Uses harmonic sinusoidal easing for smooth acceleration and deceleration at endpoints.
     */
    static computePlatformState(config, time) {
        const { startX, startY, endX, endY } = config;
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist <= 0.001) {
            return { x: startX, y: startY, vx: 0, vy: 0, progress: 0 };
        }
        const speed = Math.max(1, config.speed);
        const moveDuration = dist / speed;
        const pauseDuration = Math.max(0, config.pauseTime ?? 0.4);
        const halfCycle = moveDuration + pauseDuration;
        const fullCycle = halfCycle * 2;
        const phase = ((config.initialProgress ?? 0) * fullCycle) % fullCycle;
        let t = (time + phase) % fullCycle;
        if (t < 0)
            t += fullCycle;
        if (t < moveDuration) {
            // Transit from start -> end
            const s = t / moveDuration;
            const p = 0.5 * (1 - Math.cos(Math.PI * s)); // 0 -> 1
            const dpDt = (0.5 * Math.PI * Math.sin(Math.PI * s)) / moveDuration;
            return {
                x: startX + dx * p,
                y: startY + dy * p,
                vx: dx * dpDt,
                vy: dy * dpDt,
                progress: p,
            };
        }
        else if (t < halfCycle) {
            // Paused at end
            return {
                x: endX,
                y: endY,
                vx: 0,
                vy: 0,
                progress: 1,
            };
        }
        else if (t < halfCycle + moveDuration) {
            // Transit from end -> start
            const s = (t - halfCycle) / moveDuration;
            const p = 0.5 * (1 - Math.cos(Math.PI * s)); // 0 -> 1
            const dpDt = (0.5 * Math.PI * Math.sin(Math.PI * s)) / moveDuration;
            return {
                x: endX - dx * p,
                y: endY - dy * p,
                vx: -dx * dpDt,
                vy: -dy * dpDt,
                progress: 1 - p,
            };
        }
        else {
            // Paused at start
            return {
                x: startX,
                y: startY,
                vx: 0,
                vy: 0,
                progress: 0,
            };
        }
    }
}
exports.MovingPlatform = MovingPlatform;
