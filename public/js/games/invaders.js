// ─── Space Invaders Experience ────────────────────────────────────────────────

function initAliens() {
    siAliens = [];
    const w   = window.innerWidth;
    const h   = window.innerHeight;
    const lvl = siLevel;

    const rows   = Math.min(3 + Math.floor(lvl / 2), 6);
    const cols   = Math.max(6, Math.min(Math.floor(w / 80), 10));
    const alienW = Math.min(w * 0.05, 36);
    const alienH = alienW * 0.7;
    const gap    = alienW * 0.4;
    const totalW = cols * alienW + (cols - 1) * gap;
    const offsetX = (w - totalW) / 2;
    const offsetY = 50;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            siAliens.push({
                x: offsetX + c * (alienW + gap),
                y: offsetY + r * (alienH + gap),
                w: alienW, h: alienH,
                alive: true, row: r, col: c
            });
        }
    }

    siAlienDir        = 1;
    const lvlNorm     = (lvl - 1) / (SI_MAX_LEVEL - 1);
    siAlienSpeed      = w * (0.03 + lvlNorm * 0.06);
    siAlienDropTimer  = 0;
    siAlienShootTimer = 0;
    siBullets         = [];
    siAlienBullets    = [];
}

function updateAndDrawInvaders(dt, layout, now) {
    const siShipSpeed = layout.w * 0.55;
    const shooting    = siInputShoot || siTouchActive;

    // Move ship (keyboard)
    if (siInputLeft)  siShipX -= siShipSpeed * dt;
    if (siInputRight) siShipX += siShipSpeed * dt;
    siShipX = Math.max(layout.siShipW / 2, Math.min(layout.w - layout.siShipW / 2, siShipX));

    // Shooting
    siShootCooldown -= dt;
    if (shooting && siShootCooldown <= 0) {
        siBullets.push({ x: siShipX, y: layout.siShipY - 4, vy: -layout.h * 0.8 });
        siShootCooldown = 0.25;
        playSound('beep');
    }

    // Update player bullets
    for (let bi = siBullets.length - 1; bi >= 0; bi--) {
        const b = siBullets[bi];
        b.y += b.vy * dt;
        if (b.y < -10) { siBullets.splice(bi, 1); continue; }

        for (let ai = 0; ai < siAliens.length; ai++) {
            const a = siAliens[ai];
            if (!a.alive) continue;
            if (b.x >= a.x && b.x <= a.x + a.w && b.y >= a.y && b.y <= a.y + a.h) {
                a.alive = false;
                siBullets.splice(bi, 1);
                siScore += 10 + (siLevel - 1) * 5;
                document.getElementById('score-invaders').innerText = siScore;
                document.getElementById('inv-total').innerText      = siScore;
                playSound('hit');
                break;
            }
        }
    }

    // Move aliens
    let hitEdge = false;
    const aliveAliens = siAliens.filter(a => a.alive);

    if (aliveAliens.length > 0) {
        const minX = Math.min(...aliveAliens.map(a => a.x));
        const maxX = Math.max(...aliveAliens.map(a => a.x + a.w));
        if (maxX + siAlienSpeed * siAlienDir * dt > layout.w - 10 ||
            minX + siAlienSpeed * siAlienDir * dt < 10) {
            hitEdge = true;
        }
    }

    if (hitEdge) {
        siAlienDir *= -1;
        const dropAmt = aliveAliens.length > 0 ? aliveAliens[0].h * 0.6 : 10;
        siAliens.forEach(a => { if (a.alive) a.y += dropAmt; });
    } else {
        siAliens.forEach(a => { if (a.alive) a.x += siAlienSpeed * siAlienDir * dt; });
    }

    // Speed up as aliens are destroyed
    const aliveCount = siAliens.filter(a => a.alive).length;
    const totalCount = siAliens.length;
    if (totalCount > 0 && aliveCount > 0) {
        const killRatio = 1 - (aliveCount / totalCount);
        const lvlNorm   = (siLevel - 1) / (SI_MAX_LEVEL - 1);
        siAlienSpeed    = layout.w * (0.03 + lvlNorm * 0.06) * (1 + killRatio * 2.5);
    }

    // Alien shooting
    siAlienShootTimer -= dt;
    if (siAlienShootTimer <= 0 && aliveAliens.length > 0) {
        const lvlNorm  = (siLevel - 1) / (SI_MAX_LEVEL - 1);
        const interval = Math.max(0.3, 1.5 - lvlNorm * 1.0);
        siAlienShootTimer = interval + Math.random() * interval;

        const cols = {};
        aliveAliens.forEach(a => {
            if (!cols[a.col] || a.y > cols[a.col].y) cols[a.col] = a;
        });
        const shooters = Object.values(cols);
        const shooter  = shooters[Math.floor(Math.random() * shooters.length)];
        if (shooter) {
            siAlienBullets.push({
                x: shooter.x + shooter.w / 2,
                y: shooter.y + shooter.h,
                vy: layout.h * (0.3 + lvlNorm * 0.35)
            });
        }
    }

    // Update alien bullets
    for (let bi = siAlienBullets.length - 1; bi >= 0; bi--) {
        const b = siAlienBullets[bi];
        b.y += b.vy * dt;
        if (b.y > layout.h + 10) { siAlienBullets.splice(bi, 1); continue; }

        if (b.x >= siShipX - layout.siShipW / 2 &&
            b.x <= siShipX + layout.siShipW / 2 &&
            b.y >= layout.siShipY &&
            b.y <= layout.siShipY + layout.siShipH) {
            siAlienBullets.splice(bi, 1);
            siLives--;
            playSound('score');
            if (siLives <= 0) triggerGameOver(siScore);
            continue;
        }
    }

    // Aliens reached player
    const lowestAlien = aliveAliens.length > 0
        ? Math.max(...aliveAliens.map(a => a.y + a.h))
        : 0;
    if (lowestAlien >= layout.siShipY) triggerGameOver(siScore);

    // All cleared — next level
    if (aliveAliens.length === 0) {
        if (siLevel >= SI_MAX_LEVEL) {
            triggerGameOver(siScore);
        } else {
            siLevel++;
            trackLevelUp('invaders', siLevel);
            document.getElementById('inv-level').innerText = 'LVL ' + siLevel;
            siLevelTransition = Date.now();
            playSound('start');
            initAliens();
        }
    }

    // ─── Drawing ───────────────────────────────────────────────────────────────

    drawPolygon(layout.siShipLeftPts);
    drawPolygon(layout.siShipRightPts);

    siAliens.forEach(alien => {
        if (!alien.alive) return;
        const rowAlpha = 0.6 + 0.4 * (1 - alien.row / 6);
        drawAlienSprite(alien, rowAlpha);
    });

    // Player bullets
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur  = 8;
    siBullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 6, 4, 12));
    ctx.restore();

    // Alien bullets
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.shadowBlur  = 5;
    siAlienBullets.forEach(b => ctx.fillRect(b.x - 2, b.y, 4, 8));
    ctx.restore();

    // Lives as hearts
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 0.55;
    for (let li = 0; li < siLives; li++) {
        const hx = 22 + li * 30, hy = layout.h - 22, hs = 12;
        ctx.beginPath();
        ctx.moveTo(hx, hy + hs * 0.4);
        ctx.bezierCurveTo(hx - hs, hy - hs * 0.6, hx - hs * 0.5, hy - hs, hx, hy - hs * 0.3);
        ctx.bezierCurveTo(hx + hs * 0.5, hy - hs, hx + hs, hy - hs * 0.6, hx, hy + hs * 0.4);
        ctx.fill();
    }
    ctx.restore();

    // Level flash
    if (siLevelTransition > 0) {
        const flashElapsed = now - siLevelTransition;
        if (flashElapsed < 1500) {
            ctx.save();
            const flashAlpha = Math.max(0, 1 - flashElapsed / 1500);
            ctx.globalAlpha  = flashAlpha * 0.8;
            ctx.fillStyle    = '#ffffff';
            ctx.shadowBlur   = 0;
            ctx.font         = '900 ' + Math.min(layout.w * 0.08, 60) + 'px Inter';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LEVEL ' + siLevel, layout.w / 2, layout.h / 2);
            ctx.restore();
        }
    }
}
