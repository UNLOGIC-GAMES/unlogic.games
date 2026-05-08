// ─── Atmospheric Particle System ─────────────────────────────────────────────

function initParticles() {
    particles = [];
    const numParticles = window.innerWidth < 768 ? 40 : 80;
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x:     Math.random() * window.innerWidth,
            y:     Math.random() * window.innerHeight,
            vx:    (Math.random() - 0.5) * 0.3,
            vy:    (Math.random() - 0.5) * 0.5 - 0.2,
            size:  Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.4 + 0.1
        });
    }
}

function drawParticles(layout) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0)        p.y = layout.h;
        if (p.y > layout.h) p.y = 0;
        if (p.x < 0)        p.x = layout.w;
        if (p.x > layout.w) p.x = 0;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}
