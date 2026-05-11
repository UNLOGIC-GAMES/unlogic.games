// ─── State Transitions ────────────────────────────────────────────────────────
// INVARIANTE: startGameTransition / stopGameTransition son los únicos puntos
// de entrada para cambiar entre MENU y PLAYING. No llamar a currentState
// directamente desde otros módulos para iniciar/detener el juego.

function startGameTransition() {
    if (currentState !== STATES.MENU) return;
    if (creditsActive) return;
    // Block game start until cookie consent is resolved
    if (!localStorage.getItem('cookie-consent')) return;
    initAudio();

    // Cycle: pong → arkanoid → invaders → snake → pong
    if      (gameMode === 'pong')     gameMode = 'arkanoid';
    else if (gameMode === 'arkanoid') gameMode = 'invaders';
    else if (gameMode === 'invaders') gameMode = 'snake';
    else                              gameMode = 'pong';

    currentState        = STATES.TRANSITION_TO_GAME;
    transitionStartTime = Date.now();
    lastCount           = -1;

    uiLayer.style.opacity    = '0';
    uiLayer.style.visibility = 'hidden';
    scoreLayer.style.opacity = '1';

    if (gameMode === 'arkanoid') {
        document.getElementById('pong-scores').style.display     = 'none';
        document.getElementById('arkanoid-scores').style.display = 'flex';
        document.getElementById('invaders-scores').style.display = 'none';
        document.getElementById('snake-scores').style.display    = 'none';
        document.getElementById('arkanoid-info').style.display   = 'block';
        arkanoidPaddleX  = window.innerWidth / 2;
        arkanoidScore    = 0;
        arkanoidLives    = 3;
        arkanoidLevel    = 1;
        arkLevelTransition = 0;
        fallingPowerups  = [];
        extraBalls       = [];
        slowTimer        = 0;
        slowSpeedFactor  = 1;
        document.getElementById('score-arkanoid').innerText = '0';
        document.getElementById('ark-level').innerText      = 'LVL 1';
        document.getElementById('ark-total').innerText      = '0';
        initBricks();
    } else if (gameMode === 'invaders') {
        document.getElementById('pong-scores').style.display     = 'none';
        document.getElementById('arkanoid-scores').style.display = 'none';
        document.getElementById('invaders-scores').style.display = 'flex';
        document.getElementById('snake-scores').style.display    = 'none';
        document.getElementById('invaders-info').style.display   = 'block';
        siShipX          = window.innerWidth / 2;
        siScore          = 0;
        siLives          = 3;
        siLevel          = 1;
        siLevelTransition = 0;
        siShootCooldown  = 0;
        document.getElementById('score-invaders').innerText = '0';
        document.getElementById('inv-level').innerText      = 'LVL 1';
        document.getElementById('inv-total').innerText      = '0';
        initAliens();
    } else if (gameMode === 'snake') {
        document.getElementById('pong-scores').style.display     = 'none';
        document.getElementById('arkanoid-scores').style.display = 'none';
        document.getElementById('invaders-scores').style.display = 'none';
        document.getElementById('snake-scores').style.display    = 'flex';
        document.getElementById('snake-info').style.display      = 'block';
        snakeScore       = 0;
        snakeLevelTransition = 0;
        document.getElementById('score-snake').innerText  = '0';
        document.getElementById('snake-total').innerText  = '0';
        initSnake();
    } else {
        // pong
        document.getElementById('pong-scores').style.display     = 'flex';
        document.getElementById('arkanoid-scores').style.display = 'none';
        document.getElementById('invaders-scores').style.display = 'none';
        document.getElementById('snake-scores').style.display    = 'none';
        document.getElementById('pong-info').style.display       = 'block';
        pongLevel           = 1;
        pongTotalScore      = 0;
        pongLevelTransition = 0;
        document.getElementById('pong-level').innerText = 'LVL 1';
        document.getElementById('pong-total').innerText = '0';
        userPaddleY = window.innerHeight / 2 - getLayout().pH / 2;
        aiPaddleY   = window.innerHeight / 2 - getLayout().pH / 2;
    }
}

function stopGameTransition() {
    if (currentState === STATES.MENU) return;
    currentState        = STATES.TRANSITION_TO_MENU;
    transitionStartTime = Date.now();

    uiLayer.style.opacity    = '1';
    uiLayer.style.visibility = 'visible';
    scoreLayer.style.opacity = '0';

    document.getElementById('pong-info').style.display     = 'none';
    document.getElementById('arkanoid-info').style.display = 'none';
    document.getElementById('invaders-info').style.display = 'none';
    document.getElementById('snake-info').style.display    = 'none';
}

// ─── Transition Drawing ───────────────────────────────────────────────────────
// INVARIANTE: el morphing cúbico logo↔juego se produce en estas dos funciones.
// No alterar easeInOutCubic, TRANSITION_DURATION ni PRE_GAME_DELAY sin motivo.

function drawTransitionToGame(layout, now) {
    const elapsed = now - transitionStartTime;
    let t = Math.min(elapsed / TRANSITION_DURATION, 1);
    t = easeInOutCubic(t);

    const floatOffset = Math.sin(now / 800) * 8 * (1 - t);

    const targetLeft  = gameMode === 'arkanoid' ? layout.arkPadLeftPts
                      : gameMode === 'invaders'  ? layout.siShipLeftPts
                      : gameMode === 'snake'     ? layout.snakeHeadLeftPts
                      : layout.padLeftPts;
    const targetRight = gameMode === 'arkanoid' ? layout.arkPadRightPts
                      : gameMode === 'invaders'  ? layout.siShipRightPts
                      : gameMode === 'snake'     ? layout.snakeHeadRightPts
                      : layout.padRightPts;

    ctx.save();
    ctx.translate(0, floatOffset);
    drawPolygon(getInterpolatedPoints(layout.logoLeftPts,  targetLeft,  t));
    drawPolygon(getInterpolatedPoints(layout.logoRightPts, targetRight, t));
    ctx.restore();

    // Fade in game elements during transition
    if (gameMode === 'arkanoid') {
        ctx.save();
        bricks.forEach(brick => {
            if (!brick.alive) return;
            ctx.globalAlpha = t * 0.9 * (brick.alpha || 1);
            ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        });
        ctx.restore();
    } else if (gameMode === 'invaders') {
        siAliens.forEach(alien => {
            if (!alien.alive) return;
            drawAlienSprite(alien, t * 0.8);
        });
    } else {
        ctx.save();
        ctx.globalAlpha = t * 0.2;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur  = 0;
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.moveTo(layout.w / 2, 0);
        ctx.lineTo(layout.w / 2, layout.h);
        ctx.stroke();
        ctx.restore();
    }

    // Countdown
    if (elapsed >= TRANSITION_DURATION && elapsed < PRE_GAME_DELAY) {
        const count = Math.ceil((PRE_GAME_DELAY - elapsed) / 1000);
        if (count !== lastCount && count > 0 && count <= 3) {
            playSound('beep');
            lastCount = count;
        }
        ctx.save();
        ctx.fillStyle    = `rgba(255,255,255, ${1 - ((elapsed % 1000) / 1000)})`;
        ctx.shadowBlur   = 20;
        ctx.shadowColor  = 'rgba(255,255,255,0.8)';
        ctx.font         = '900 120px Inter';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(count, layout.w / 2, layout.h / 2);
        ctx.restore();
    }

    // Start playing
    if (elapsed >= PRE_GAME_DELAY) {
        currentState = STATES.PLAYING;
        playSound('start');
        if      (gameMode === 'arkanoid') resetArkBall(false);
        else if (gameMode === 'invaders') { /* ready */ }
        else if (gameMode === 'snake')    { /* ready */ }
        else                              resetBall('left', false);
    }
}

function drawTransitionToMenu(layout, now) {
    const elapsed = now - transitionStartTime;
    let t = Math.min(elapsed / TRANSITION_DURATION, 1);
    t = easeInOutCubic(t);

    const floatOffset = Math.sin(now / 800) * 8 * t;

    const sourceLeft  = gameMode === 'arkanoid' ? layout.arkPadLeftPts
                      : gameMode === 'invaders'  ? layout.siShipLeftPts
                      : gameMode === 'snake'     ? layout.snakeHeadLeftPts
                      : layout.padLeftPts;
    const sourceRight = gameMode === 'arkanoid' ? layout.arkPadRightPts
                      : gameMode === 'invaders'  ? layout.siShipRightPts
                      : gameMode === 'snake'     ? layout.snakeHeadRightPts
                      : layout.padRightPts;

    ctx.save();
    ctx.translate(0, floatOffset);
    drawPolygon(getInterpolatedPoints(sourceLeft,  layout.logoLeftPts,  t));
    drawPolygon(getInterpolatedPoints(sourceRight, layout.logoRightPts, t));
    ctx.restore();

    // Fade out game elements
    if (gameMode === 'arkanoid') {
        ctx.save();
        bricks.forEach(brick => {
            if (!brick.alive) return;
            ctx.globalAlpha = (1 - t) * 0.9 * (brick.alpha || 1);
            ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
        });
        ctx.restore();
    } else if (gameMode === 'invaders') {
        siAliens.forEach(alien => {
            if (!alien.alive) return;
            drawAlienSprite(alien, (1 - t) * 0.8);
        });
    } else if (gameMode === 'snake') {
        const cs       = getSnakeCellSize();
        const gridCols = Math.floor(layout.w / cs);
        const gridRows = Math.floor(layout.h / cs);
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.06;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur  = 0;
        ctx.lineWidth   = 0.5;
        for (let c = 0; c <= gridCols; c++) {
            ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, layout.h); ctx.stroke();
        }
        for (let r = 0; r <= gridRows; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(layout.w, r * cs); ctx.stroke();
        }
        ctx.restore();
    }

    if (elapsed >= TRANSITION_DURATION) {
        currentState = STATES.MENU;
    }
}
