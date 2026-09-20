"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParticleSystem = void 0;
class ParticleSystem {
    particles = [];
    emitDust(x, y, count = 6, color = '#00ffff') {
        for (let i = 0; i < count; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8; // mostly upward
            const speed = 20 + Math.random() * 50;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 12,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.5,
                life: 0.2 + Math.random() * 0.2,
                maxLife: 0.4,
                size: 3 + Math.random() * 3,
                color,
                shape: 'circle',
            });
        }
    }
    emitSparks(x, y, count = 16, color = '#ffe600') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 120;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.6,
                size: 2 + Math.random() * 3,
                color,
                shape: 'spark',
            });
        }
    }
    emitTrail(x, y, width, height, color) {
        this.particles.push({
            x,
            y,
            vx: 0,
            vy: 0,
            life: 0.15,
            maxLife: 0.15,
            size: width,
            height: height,
            color,
            shape: 'square',
        });
    }
    emitAmbientMote(x, y, color) {
        if (this.particles.length > 150)
            return;
        this.particles.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 15,
            vy: -10 - Math.random() * 20,
            life: 0.8 + Math.random() * 0.6,
            maxLife: 1.4,
            size: 2 + Math.random() * 2,
            color,
            shape: 'circle',
        });
    }
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 60 * dt; // slight gravity for sparks/dust
        }
    }
    render(ctx) {
        ctx.save();
        for (const p of this.particles) {
            const progress = p.life / p.maxLife;
            ctx.globalAlpha = Math.max(0, Math.min(1, progress));
            ctx.fillStyle = p.color;
            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * progress, 0, Math.PI * 2);
                ctx.fill();
            }
            else if (p.shape === 'spark') {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;
                ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
            }
            else if (p.shape === 'square') {
                // Character ghost trail
                ctx.fillRect(p.x, p.y, p.size, p.height || p.size * 1.5);
            }
        }
        ctx.restore();
    }
    clear() {
        this.particles = [];
    }
    get count() {
        return this.particles.length;
    }
}
exports.ParticleSystem = ParticleSystem;
