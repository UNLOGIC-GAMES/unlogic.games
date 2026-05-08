// ─── Pong Experience ──────────────────────────────────────────────────────────

function getDifficulty() {
    return pongLevel;
}

function resetBall(direction = 'left', withDelay = true) {
    ball.x = window.innerWidth / 2;
    ball.y = window.innerHeight / 2;
    ball.prevX = ball.x;
    ball.prevY = ball.y;

    const diff   = getDifficulty();
    const t_norm = (diff - 1) / (PONG_MAX_LEVEL - 1);
    const t_curve = t_norm * t_norm;
    const speed  = window.innerWidth * (0.30 + t_curve * 0.60);

    ball.vx = -1 * speed;
    ball.vy = 0;
    ball.delay = withDelay ? 1.0 : 0;
}

function updateAndDrawPong(dt, layout, now) {
    const diff    = getDifficulty();
    const t_norm  = (diff - 1) / (PONG_MAX_LEVEL - 1);
    const t_curve = t_norm * t_norm;

    // Level flash
    if (pongLevelTransition > 0) {
        const flashElapsed = now - pongLevelTransition;
        if (flashElapsed < 1500) {
            ctx.save();
            const flashAlpha = Math.max(0, 1 - flashElapsed / 1500);
            ctx.globalAlpha  = flashAlpha * 0.8;
            ctx.fillStyle    = '#ffffff';
            ctx.shadowBlur   = 0;
            ctx.font         = '900 ' + Math.min(layout.w * 0.08, 60) + 'px Inter';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LEVEL ' + pongLevel, layout.w / 2, layout.h / 2);
            ctx.restore();
        }
    }

    // Ball movement
    if (ball.delay > 0) {
        ball.delay -= dt;
    } else {
        ball.prevX = ball.x;
        ball.prevY = ball.y;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
    }

    // Clamp user paddle
    userPaddleY = Math.max(0, Math.min(layout.h - layout.pH, userPaddleY));

    // AI movement
    const aiCenter    = aiPaddleY + layout.pH / 2;
    const aiSpeedBase = 0.25 + t_curve * 1.05;
    const aiSpeed     = layout.h * aiSpeedBase;

    if (ball.vx < 0) {
        const screenCenter = layout.h / 2;
        if (aiCenter < screenCenter - 10) aiPaddleY += (aiSpeed * 0.3) * dt;
        else if (aiCenter > screenCenter + 10) aiPaddleY -= (aiSpeed * 0.3) * dt;
    } else {
        let aiCanReact = true;
        const reactThreshold = Math.max(0, 0.55 - t_curve * 0.55);
        if (ball.x < layout.w * reactThreshold) aiCanReact = false;

        if (aiCanReact) {
            const aiMargin = Math.max(2, 35 - t_curve * 33);
            if (aiCenter < ball.y - aiMargin) aiPaddleY += aiSpeed * dt;
            else if (aiCenter > ball.y + aiMargin) aiPaddleY -= aiSpeed * dt;
        }
    }

    aiPaddleY = Math.max(0, Math.min(layout.h - layout.pH, aiPaddleY));

    // Wall bounce
    if (ball.y - ball.size / 2 < 0) {
        ball.y = ball.size / 2;
        ball.vy *= -1;
    } else if (ball.y + ball.size / 2 > layout.h) {
        ball.y = layout.h - ball.size / 2;
        ball.vy *= -1;
    }

    const maxBallSpeed = layout.w * 1.5;
    const speedUp      = 1.015 + (t_curve * 0.045);

    // Left paddle collision
    const leftFrontFace = layout.lX + layout.pW;
    if (ball.vx < 0 && ball.prevX - ball.size / 2 >= leftFrontFace && ball.x - ball.size / 2 <= leftFrontFace) {
        const tCollide  = (leftFrontFace - (ball.prevX - ball.size / 2)) / (ball.x - ball.prevX);
        const crossingY = ball.prevY + (ball.y - ball.prevY) * tCollide;
        if (crossingY + ball.size / 2 > userPaddleY && crossingY - ball.size / 2 < userPaddleY + layout.pH) {
            playSound('hit');
            ball.x  = leftFrontFace + ball.size / 2;
            ball.vx *= -speedUp;
            if (Math.abs(ball.vx) > maxBallSpeed) ball.vx = Math.sign(ball.vx) * maxBallSpeed;
            ball.vy = (crossingY - (userPaddleY + layout.pH / 2)) * 6;
        }
    }

    // Right paddle collision
    const rightFrontFace = layout.rX;
    if (ball.vx > 0 && ball.prevX + ball.size / 2 <= rightFrontFace && ball.x + ball.size / 2 >= rightFrontFace) {
        const tCollide  = (rightFrontFace - (ball.prevX + ball.size / 2)) / (ball.x - ball.prevX);
        const crossingY = ball.prevY + (ball.y - ball.prevY) * tCollide;
        if (crossingY + ball.size / 2 > aiPaddleY && crossingY - ball.size / 2 < aiPaddleY + layout.pH) {
            playSound('hit');
            ball.x  = rightFrontFace - ball.size / 2;
            ball.vx *= -speedUp;
            if (Math.abs(ball.vx) > maxBallSpeed) ball.vx = Math.sign(ball.vx) * maxBallSpeed;
            ball.vy = (crossingY - (aiPaddleY + layout.pH / 2)) * 6;
        }
    }

    // Scoring
    if (ball.x < -50) {
        scoreAi++;
        scoreAiEl.innerText = scoreAi;
        if (scoreAi >= PONG_GOALS_PER_LEVEL) {
            triggerGameOver(pongTotalScore);
        } else {
            playSound('score');
            resetBall('left', true);
        }
    } else if (ball.x > layout.w + 50) {
        playSound('score');
        scoreUser++;
        pongTotalScore += 100;
        scoreUserEl.innerText = scoreUser;
        document.getElementById('pong-total').innerText = pongTotalScore;

        if (scoreUser >= PONG_GOALS_PER_LEVEL) {
            if (pongLevel >= PONG_MAX_LEVEL) {
                triggerGameOver(pongTotalScore);
            } else {
                pongLevel++;
                scoreUser = 0;
                scoreAi   = 0;
                scoreUserEl.innerText = '0';
                scoreAiEl.innerText   = '0';
                document.getElementById('pong-level').innerText = 'LVL ' + pongLevel;
                pongLevelTransition = Date.now();
                playSound('start');
                resetBall('left', true);
                aiPaddleY = layout.h / 2 - layout.pH / 2;
            }
        } else {
            resetBall('left', true);
        }
    }

    // Draw paddles
    drawPolygon(layout.padLeftPts);
    drawPolygon(layout.padRightPts);

    // Draw center divider
    ctx.save();
    ctx.globalAlpha  = 0.15;
    ctx.shadowBlur   = 0;
    ctx.strokeStyle  = '#ffffff';
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(layout.w / 2, 0);
    ctx.lineTo(layout.w / 2, layout.h);
    ctx.stroke();
    ctx.restore();

    // Draw ball
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur  = 15;
    if (ball.delay > 0) {
        ctx.globalAlpha = 0.4 + 0.6 * Math.sin(ball.delay * Math.PI * 4);
    }
    ctx.fillRect(ball.x - ball.size / 2, ball.y - ball.size / 2, ball.size, ball.size);
    ctx.restore();
}
