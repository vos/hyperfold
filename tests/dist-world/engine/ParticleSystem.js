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
    emitLaserSparks(x, y, count = 10, color = '#ff0055', normalX = 0, normalY = 0) {
        const hasNormal = normalX !== 0 || normalY !== 0;
        const baseAngle = hasNormal ? Math.atan2(normalY, normalX) : 0;
        for (let i = 0; i < count; i++) {
            const angle = hasNormal
                ? baseAngle + (Math.random() - 0.5) * Math.PI * 0.85
                : Math.random() * Math.PI * 2;
            const speed = 70 + Math.random() * 150;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 4,
                y: y + (Math.random() - 0.5) * 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.2 + Math.random() * 0.25,
                maxLife: 0.45,
                size: 2 + Math.random() * 3,
                color,
                shape: 'spark',
            });
        }
    }
    emitLaserCharge(x, y, color = '#ff0055') {
        if (this.particles.length > 200)
            return;
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 14;
        const spawnX = x + Math.cos(angle) * dist;
        const spawnY = y + Math.sin(angle) * dist;
        const speed = 40 + Math.random() * 30;
        this.particles.push({
            x: spawnX,
            y: spawnY,
            vx: -Math.cos(angle) * speed,
            vy: -Math.sin(angle) * speed,
            life: 0.25 + Math.random() * 0.15,
            maxLife: 0.4,
            size: 1.5 + Math.random() * 2,
            color,
            shape: 'circle',
        });
    }
    emitLaserVaporize(x, y, color = '#ff0055') {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 90 + Math.random() * 180;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 16,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.85,
                life: 0.35 + Math.random() * 0.35,
                maxLife: 0.7,
                size: 2.5 + Math.random() * 4,
                color: Math.random() < 0.3 ? '#ffffff' : color,
                shape: 'spark',
            });
        }
    }
    emitLaserMuzzle(x, y, dirX, dirY, color = '#ff0055') {
        const baseAngle = Math.atan2(dirY, dirX);
        for (let i = 0; i < 8; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * 0.9;
            const speed = 60 + Math.random() * 100;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.15 + Math.random() * 0.15,
                maxLife: 0.3,
                size: 2 + Math.random() * 3,
                color,
                shape: 'spark',
            });
        }
    }
    emitPlayerExplosion(x, y, primaryColor = '#00ffff', accentColor = '#ff007f') {
        // 1. Expanding energy shockwave rings
        for (let r = 0; r < 2; r++) {
            this.particles.push({
                x,
                y,
                vx: 0,
                vy: 0,
                life: 0.35 + r * 0.15,
                maxLife: 0.35 + r * 0.15,
                size: 55 + r * 35,
                color: r === 0 ? '#ffffff' : primaryColor,
                shape: 'ring',
            });
        }
        // 2. High-velocity directional shards in all directions (360 degrees)
        const shardCount = 48;
        for (let i = 0; i < shardCount; i++) {
            const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
            const speed = 120 + Math.random() * 260;
            const colors = ['#ffffff', primaryColor, accentColor, '#ffe600', '#ff0055'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const isSquare = Math.random() < 0.45;
            this.particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.4 + Math.random() * 0.45,
                maxLife: 0.85,
                size: isSquare ? 3.5 + Math.random() * 4 : 2.5 + Math.random() * 3,
                color,
                shape: isSquare ? 'square' : 'spark',
                drag: 0.94,
            });
        }
        // 3. Smoke / plasma motes billowing outward
        for (let i = 0; i < 22; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 85;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.7,
                life: 0.35 + Math.random() * 0.3,
                maxLife: 0.65,
                size: 5 + Math.random() * 8,
                color: Math.random() < 0.5 ? primaryColor : accentColor,
                shape: 'circle',
                drag: 0.92,
            });
        }
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
            if (p.drag) {
                const factor = Math.pow(p.drag, dt * 60);
                p.vx *= factor;
                p.vy *= factor;
            }
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
                // Character ghost trail or debris shard
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 4;
                ctx.fillRect(p.x, p.y, p.size, p.height || p.size);
            }
            else if (p.shape === 'ring') {
                // Expanding circular shockwave ring
                const radius = p.size * (1 - progress);
                ctx.strokeStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 12;
                ctx.lineWidth = 3 * progress;
                ctx.beginPath();
                ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
                ctx.stroke();
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
