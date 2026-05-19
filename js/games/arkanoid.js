// ─── Arkanoid Experience ──────────────────────────────────────────────────────

function initBricks() {
    bricks = [];
    const w    = window.innerWidth;
    const h    = window.innerHeight;
    const cols = Math.max(6, Math.floor(w / 90));
    const totalW = w * 0.8;
    const gap    = 4;
    const brickW = (totalW - (cols - 1) * gap) / cols;
    const brickH = Math.max(14, Math.min(22, h * 0.03));
    const offsetX = w * 0.1;
    const offsetY = 40;
    const maxRows = 8;

    function addBrick(r, c) {
        if (c < 0 || c >= cols || r < 0 || r >= maxRows) return;
        bricks.push({
            x: offsetX + c * (brickW + gap),
            y: offsetY + r * (brickH + gap),
            w: brickW, h: brickH, alive: true
        });
    }

    const lvl = arkanoidLevel;

    if (lvl === 1) {
        for (let r = 0; r < 5; r++)
            for (let c = 0; c < cols; c++)
                if ((r + c) % 2 === 0) addBrick(r, c);
    } else if (lvl === 2) {
        for (let r = 0; r < 6; r++) {
            if (r >= 2 && r <= 3) continue;
            for (let c = 0; c < cols; c++) addBrick(r, c);
        }
    } else if (lvl === 3) {
        for (let r = 0; r < 5; r++) {
            const offset = r % 2 === 0 ? 0 : Math.floor(cols * 0.15);
            for (let c = offset; c < cols - (r % 2 === 0 ? Math.floor(cols * 0.15) : 0); c++)
                addBrick(r, c);
        }
    } else if (lvl === 4) {
        for (let r = 0; r < 6; r++)
            for (let c = 0; c < cols; c++)
                if (r === 0 || r === 5 || c === 0 || c === cols - 1) addBrick(r, c);
    } else if (lvl === 5) {
        for (let r = 0; r < 6; r++)
            for (let c = 0; c < cols; c++) {
                if (c >= Math.floor(cols * 0.4) && c <= Math.ceil(cols * 0.6)) continue;
                addBrick(r, c);
            }
    } else if (lvl === 6) {
        for (let r = 0; r < 6; r++) {
            const inset = r;
            for (let c = inset; c < cols - inset; c++) addBrick(r, c);
        }
    } else if (lvl === 7) {
        for (let r = 0; r < 7; r++)
            if (r % 2 === 0)
                for (let c = 0; c < cols; c++) addBrick(r, c);
    } else if (lvl === 8) {
        const midC = Math.floor(cols / 2);
        const armW = Math.max(1, Math.floor(cols * 0.15));
        for (let r = 0; r < 7; r++)
            for (let c = 0; c < cols; c++) {
                const inHBar = (r >= 2 && r <= 4);
                const inVBar = (c >= midC - armW && c <= midC + armW);
                if (inHBar || inVBar) addBrick(r, c);
            }
    } else if (lvl === 9) {
        for (let r = 0; r < 6; r++) {
            const inset = 5 - r;
            for (let c = inset; c < cols - inset; c++) addBrick(r, c);
        }
    } else {
        for (let r = 0; r < maxRows; r++)
            for (let c = 0; c < cols; c++) addBrick(r, c);
    }

    // Assign 3 random power-ups
    const aliveIndices = bricks.map((b, i) => i);
    const shuffled     = aliveIndices.sort(() => Math.random() - 0.5);
    const puTypes      = [...POWERUP_TYPES].sort(() => Math.random() - 0.5);
    for (let pi = 0; pi < 3 && pi < shuffled.length; pi++) {
        bricks[shuffled[pi]].powerup = puTypes[pi];
    }

    // Per-row opacity variation
    const rows = [...new Set(bricks.map(b => b.y))].sort((a, b) => a - b);
    bricks.forEach(brick => {
        const rowIdx  = rows.indexOf(brick.y);
        const rowNorm = rows.length > 1 ? rowIdx / (rows.length - 1) : 0.5;
        const pattern = lvl % 5;
        if      (pattern === 1) brick.alpha = 0.5 + 0.5 * rowNorm;
        else if (pattern === 2) brick.alpha = 0.5 + 0.5 * (1 - rowNorm);
        else if (pattern === 3) brick.alpha = rowIdx % 2 === 0 ? 0.95 : 0.55;
        else if (pattern === 4) brick.alpha = 0.5 + 0.5 * Math.abs(rowNorm * 2 - 1);
        else                    brick.alpha = 0.75 + 0.25 * Math.sin(rowIdx * 1.5);
    });
}

function resetArkBall(withDelay) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ball.x = arkanoidPaddleX;
    ball.y = h - 90;
    ball.prevX = ball.x;
    ball.prevY = ball.y;
    const lvlNorm = (arkanoidLevel - 1) / (ARK_MAX_LEVEL - 1);
    const speed   = w * (0.35 + lvlNorm * 0.25);
    const angle   = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    ball.vx    = Math.cos(angle) * speed;
    ball.vy    = Math.sin(angle) * speed;
    ball.delay = withDelay ? 1.0 : 0;
}

function updateArkBall(b, dt, layout) {
    if (b.delay > 0) { b.delay -= dt; return; }
    b.prevX = b.x;
    b.prevY = b.y;
    b.x += b.vx * slowSpeedFactor * dt;
    b.y += b.vy * slowSpeedFactor * dt;

    // Wall bounces
    if (b.x - b.size / 2 < 0)            { b.x = b.size / 2;            b.vx *= -1; }
    else if (b.x + b.size / 2 > layout.w) { b.x = layout.w - b.size / 2; b.vx *= -1; }
    if (b.y - b.size / 2 < 0)            { b.y = b.size / 2;             b.vy *= -1; }

    // Paddle collision
    const padL = arkanoidPaddleX - layout.arkPadW / 2;
    const padR = arkanoidPaddleX + layout.arkPadW / 2;
    if (b.vy > 0 &&
        b.prevY + b.size / 2 <= layout.arkPadY &&
        b.y    + b.size / 2 >= layout.arkPadY &&
        b.x >= padL && b.x <= padR) {
        b.y = layout.arkPadY - b.size / 2;
        playSound('hit');
        const hitPos     = (b.x - arkanoidPaddleX) / (layout.arkPadW / 2);
        const speed      = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * 1.02;
        const clampedSpd = Math.min(speed, layout.w * 1.2);
        const angle      = hitPos * (Math.PI / 3);
        b.vx = Math.sin(angle) * clampedSpd;
        b.vy = -Math.cos(angle) * clampedSpd;
    }

    // Brick collision
    for (let i = 0; i < bricks.length; i++) {
        const brick = bricks[i];
        if (!brick.alive) continue;
        if (b.x + b.size / 2 > brick.x &&
            b.x - b.size / 2 < brick.x + brick.w &&
            b.y + b.size / 2 > brick.y &&
            b.y - b.size / 2 < brick.y + brick.h) {
            brick.alive = false;
            arkanoidScore++;
            document.getElementById('score-arkanoid').innerText = arkanoidScore;
            document.getElementById('ark-total').innerText      = arkanoidScore;
            playSound('beep');

            if (brick.powerup) {
                fallingPowerups.push({
                    x: brick.x + brick.w / 2,
                    y: brick.y + brick.h / 2,
                    vy: layout.h * 0.25,
                    type: brick.powerup
                });
            }

            const oL   = (b.x + b.size / 2) - brick.x;
            const oR   = (brick.x + brick.w) - (b.x - b.size / 2);
            const oT   = (b.y + b.size / 2) - brick.y;
            const oB   = (brick.y + brick.h) - (b.y - b.size / 2);
            const minO = Math.min(oL, oR, oT, oB);
            if (minO === oT || minO === oB) b.vy *= -1;
            else b.vx *= -1;
            break;
        }
    }
}

function drawArkBall(b, now) {
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur  = 15;
    if (b.delay > 0) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.sin(b.delay * Math.PI * 4);
    }
    ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
    ctx.restore();
}

function updateAndDrawArkanoid(dt, layout, now) {
    arkanoidPaddleX = Math.max(layout.arkPadW / 2, Math.min(layout.w - layout.arkPadW / 2, arkanoidPaddleX));

    // Slow power-up timer
    if (slowTimer > 0) {
        slowTimer -= dt;
        slowSpeedFactor = 0.45;
        if (slowTimer <= 0) { slowTimer = 0; slowSpeedFactor = 1; }
    }

    // Update balls
    updateArkBall(ball, dt, layout);
    extraBalls.forEach(eb => updateArkBall(eb, dt, layout));
    extraBalls = extraBalls.filter(eb => eb.y <= layout.h + 50);

    // Main ball lost
    if (ball.y > layout.h + 50) {
        if (extraBalls.length > 0) {
            const promoted = extraBalls.shift();
            ball.x = promoted.x; ball.y = promoted.y;
            ball.prevX = promoted.prevX; ball.prevY = promoted.prevY;
            ball.vx = promoted.vx; ball.vy = promoted.vy;
            ball.delay = promoted.delay;
        } else {
            arkanoidLives--;
            if (arkanoidLives <= 0) {
                triggerGameOver(arkanoidScore);
            } else {
                playSound('score');
                resetArkBall(true);
            }
        }
    }

    // Power-up fall & catch
    const puRadius = 10;
    for (let pi = fallingPowerups.length - 1; pi >= 0; pi--) {
        const pu = fallingPowerups[pi];
        pu.y += pu.vy * dt;
        if (pu.y > layout.h + 30) { fallingPowerups.splice(pi, 1); continue; }

        const padL = arkanoidPaddleX - layout.arkPadW / 2;
        const padR = arkanoidPaddleX + layout.arkPadW / 2;
        if (pu.y + puRadius >= layout.arkPadY &&
            pu.y - puRadius <= layout.arkPadY + layout.arkPadH &&
            pu.x >= padL && pu.x <= padR) {
            fallingPowerups.splice(pi, 1);
            playSound('confirm');
            if (pu.type === 'multiball') {
                const spreadAngles = [-0.45, -0.15, 0.15, 0.45];
                for (let mi = 0; mi < 3; mi++) {
                    const spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    const ang = spreadAngles[mi];
                    extraBalls.push({
                        x: ball.x, y: ball.y,
                        prevX: ball.x, prevY: ball.y,
                        vx: Math.sin(ang) * spd,
                        vy: -Math.cos(ang) * spd,
                        size: ball.size, delay: 0
                    });
                }
            } else if (pu.type === 'slow') {
                slowTimer = 10;
            } else if (pu.type === 'life') {
                arkanoidLives++;
            }
            continue;
        }
    }

    // All bricks cleared — next level
    if (bricks.every(b => !b.alive)) {
        if (arkanoidLevel >= ARK_MAX_LEVEL) {
            triggerGameOver(arkanoidScore);
        } else {
            arkanoidLevel++;
            trackLevelUp('arkanoid', arkanoidLevel);
            document.getElementById('ark-level').innerText = 'LVL ' + arkanoidLevel;
            arkLevelTransition = Date.now();
            playSound('start');
            initBricks();
            extraBalls = []; fallingPowerups = [];
            slowTimer = 0; slowSpeedFactor = 1;
            resetArkBall(true);
        }
    }

    // ─── Drawing ───────────────────────────────────────────────────────────────

    drawPolygon(layout.arkPadLeftPts);
    drawPolygon(layout.arkPadRightPts);

    ctx.save();
    bricks.forEach(brick => {
        if (!brick.alive) return;
        ctx.globalAlpha = brick.alpha || 1;
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    });
    ctx.restore();

    drawArkBall(ball, now);
    extraBalls.forEach(eb => drawArkBall(eb, now));

    // Falling power-ups
    ctx.save();
    fallingPowerups.forEach(pu => {
        ctx.save();
        ctx.globalAlpha  = 0.85 + 0.15 * Math.sin(now / 200);
        ctx.strokeStyle  = '#ffffff';
        ctx.fillStyle    = '#ffffff';
        ctx.lineWidth    = 1.5;
        ctx.shadowColor  = 'rgba(255,255,255,0.6)';
        ctx.shadowBlur   = 8;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, puRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        if (pu.type === 'multiball') {
            ctx.font = '900 ' + (puRadius * 1.2) + 'px Inter';
            ctx.fillText('M', pu.x, pu.y);
        } else if (pu.type === 'slow') {
            ctx.font = '900 ' + (puRadius * 1.2) + 'px Inter';
            ctx.fillText('S', pu.x, pu.y);
        } else if (pu.type === 'life') {
            const hx = pu.x, hy = pu.y - puRadius * 0.15;
            const hs = puRadius * 0.5;
            ctx.beginPath();
            ctx.moveTo(hx, hy + hs * 0.4);
            ctx.bezierCurveTo(hx - hs, hy - hs * 0.6, hx - hs * 0.5, hy - hs, hx, hy - hs * 0.3);
            ctx.bezierCurveTo(hx + hs * 0.5, hy - hs, hx + hs, hy - hs * 0.6, hx, hy + hs * 0.4);
            ctx.fill();
        }
        ctx.restore();
    });
    ctx.restore();

    // Lives as hearts
    ctx.save();
    ctx.fillStyle  = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.55;
    for (let li = 0; li < arkanoidLives; li++) {
        const hx = 22 + li * 30, hy = layout.h - 22, hs = 12;
        ctx.beginPath();
        ctx.moveTo(hx, hy + hs * 0.4);
        ctx.bezierCurveTo(hx - hs, hy - hs * 0.6, hx - hs * 0.5, hy - hs, hx, hy - hs * 0.3);
        ctx.bezierCurveTo(hx + hs * 0.5, hy - hs, hx + hs, hy - hs * 0.6, hx, hy + hs * 0.4);
        ctx.fill();
    }
    ctx.restore();

    // Slow indicator
    if (slowTimer > 0) {
        ctx.save();
        ctx.globalAlpha  = 0.4 + 0.2 * Math.sin(now / 300);
        ctx.fillStyle    = '#ffffff';
        ctx.font         = '700 12px Inter';
        ctx.textAlign    = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('SLOW ' + Math.ceil(slowTimer) + 's', layout.w - 15, layout.h - 15);
        ctx.restore();
    }

    // Level flash
    if (arkLevelTransition > 0) {
        const flashElapsed = now - arkLevelTransition;
        if (flashElapsed < 1500) {
            ctx.save();
            const flashAlpha = Math.max(0, 1 - flashElapsed / 1500);
            ctx.globalAlpha  = flashAlpha * 0.8;
            ctx.fillStyle    = '#ffffff';
            ctx.shadowBlur   = 0;
            ctx.font         = '900 ' + Math.min(layout.w * 0.08, 60) + 'px Inter';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LEVEL ' + arkanoidLevel, layout.w / 2, layout.h / 2);
            ctx.restore();
        }
    }
}
