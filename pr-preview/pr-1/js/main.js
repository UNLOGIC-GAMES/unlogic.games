// ─── Entry Point ─────────────────────────────────────────────────────────────

// Assign DOM references (declared as let in state.js)
canvas      = document.getElementById('gameCanvas');
ctx         = canvas.getContext('2d');
uiLayer     = document.getElementById('ui-layer');
scoreLayer  = document.getElementById('score-layer');
scoreUserEl = document.getElementById('score-user');
scoreAiEl   = document.getElementById('score-ai');

// ─── Canvas Resize ────────────────────────────────────────────────────────────

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    initParticles();

    const newIsLandscape = window.innerWidth > window.innerHeight;

    if (newIsLandscape && isLandscape === false) {
        startGameTransition();
    } else if (!newIsLandscape && isLandscape === true) {
        stopGameTransition();
    }

    isLandscape = newIsLandscape;
}

// ─── Menu Drawing ─────────────────────────────────────────────────────────────

function drawMenu(layout, now) {
    // INVARIANTE: logo flota con seno (periodo 800ms, amplitud ±8px).
    // No modificar esta fórmula salvo indicación expresa.
    const floatOffset = Math.sin(now / 800) * 8;
    ctx.save();
    ctx.translate(0, floatOffset);
    drawPolygon(layout.logoLeftPts);
    drawPolygon(layout.logoRightPts);
    ctx.restore();

    // Reset scores while in menu
    scoreUser = 0; scoreAi = 0;
    scoreUserEl.innerText = '0'; scoreAiEl.innerText = '0';
}

// ─── Main Game Loop ───────────────────────────────────────────────────────────

function loop() {
    const now = Date.now();
    const dt  = (now - lastTime) / 1000;
    lastTime  = now;

    const layout = getLayout();

    ctx.clearRect(0, 0, layout.w, layout.h);

    drawParticles(layout);

    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur  = 15;

    if (currentState === STATES.MENU) {
        drawMenu(layout, now);
    } else if (currentState === STATES.TRANSITION_TO_GAME) {
        drawTransitionToGame(layout, now);
    } else if (currentState === STATES.TRANSITION_TO_MENU) {
        drawTransitionToMenu(layout, now);
    } else if (currentState === STATES.PLAYING) {
        if      (gameMode === 'arkanoid') updateAndDrawArkanoid(dt, layout, now);
        else if (gameMode === 'invaders') updateAndDrawInvaders(dt, layout, now);
        else if (gameMode === 'snake')    updateAndDrawSnake(dt, layout, now);
        else                              updateAndDrawPong(dt, layout, now);
    } else if (currentState === STATES.GAME_OVER) {
        drawGameOver(layout, now);
    }

    requestAnimationFrame(loop);
}

// ─── Initialize ───────────────────────────────────────────────────────────────

resizeCanvas();
initInput();
initCreditsInput();
requestAnimationFrame(loop);
