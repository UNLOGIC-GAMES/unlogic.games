// ─── Input Handling — keyboard, mouse, touch, wheel ──────────────────────────

function initInput() {

    // Touch detection (once)
    window.addEventListener('touchstart', () => { hasUsedTouch = true; }, { once: true, passive: true });

    // ─── Canvas: touchstart ───────────────────────────────────────────────────

    // Pong — track left-side touch for paddle drag
    canvas.addEventListener('touchstart', (e) => {
        if (currentState === STATES.PLAYING && gameMode === 'pong') {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.clientX < window.innerWidth / 2) {
                    pongTouchStartY        = touch.clientY;
                    pongPaddleAtTouchStart = userPaddleY;
                    break;
                }
            }
        }
    }, { passive: true });

    // Game Over — tap to interact
    canvas.addEventListener('touchstart', (e) => {
        if (currentState !== STATES.GAME_OVER) return;
        e.preventDefault();
        const touch = e.touches[0];
        handleGameOverClick(touch.clientX, touch.clientY, true);
    }, { passive: false });

    // Snake — record swipe start
    canvas.addEventListener('touchstart', (e) => {
        if (gameMode === 'snake' && currentState === STATES.PLAYING) {
            snakeTouchStartX = e.touches[0].clientX;
            snakeTouchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    // Space Invaders — follow finger + enable auto-shoot
    canvas.addEventListener('touchstart', (e) => {
        if (gameMode !== 'invaders' || (currentState !== STATES.PLAYING && currentState !== STATES.TRANSITION_TO_GAME)) return;
        siTouchActive = true;
        siShipX = e.touches[0].clientX;
    }, { passive: true });

    // ─── Canvas: touchmove ────────────────────────────────────────────────────

    canvas.addEventListener('touchmove', (e) => {
        if (currentState !== STATES.PLAYING) return;
        if (gameMode === 'invaders') {
            e.preventDefault();
            siShipX = e.touches[0].clientX;
            return;
        }
        e.preventDefault();
        if (gameMode === 'arkanoid') {
            arkanoidPaddleX = e.touches[0].clientX;
        } else if (gameMode === 'pong') {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.clientX < window.innerWidth / 2) {
                    if (pongTouchStartY !== null) {
                        const delta = touch.clientY - pongTouchStartY;
                        userPaddleY = pongPaddleAtTouchStart + delta;
                    }
                    break;
                }
            }
        }
    }, { passive: false });

    // Snake — swipe to change direction
    canvas.addEventListener('touchmove', (e) => {
        if (gameMode !== 'snake' || currentState !== STATES.PLAYING) return;
        e.preventDefault();
        const dx        = e.touches[0].clientX - snakeTouchStartX;
        const dy        = e.touches[0].clientY - snakeTouchStartY;
        const threshold = 20;
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0 && snakeDir.x !== -1)      snakeNextDir = { x: 1,  y: 0 };
            else if (dx < 0 && snakeDir.x !== 1)  snakeNextDir = { x: -1, y: 0 };
        } else {
            if (dy > 0 && snakeDir.y !== -1)       snakeNextDir = { x: 0, y: 1  };
            else if (dy < 0 && snakeDir.y !== 1)   snakeNextDir = { x: 0, y: -1 };
        }
        snakeTouchStartX = e.touches[0].clientX;
        snakeTouchStartY = e.touches[0].clientY;
    }, { passive: false });

    // ─── Canvas: touchend / touchcancel ──────────────────────────────────────

    canvas.addEventListener('touchend', (e) => {
        if (gameMode === 'pong') {
            let leftStillDown = false;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].clientX < window.innerWidth / 2) { leftStillDown = true; break; }
            }
            if (!leftStillDown) pongTouchStartY = null;
        }
        if (gameMode !== 'invaders') return;
        siTouchActive = e.touches.length > 0;
        if (siTouchActive) siShipX = e.touches[0].clientX;
    }, { passive: true });

    canvas.addEventListener('touchcancel', () => {
        siTouchActive  = false;
        pongTouchStartY = null;
    }, { passive: true });

    // ─── Canvas: mousemove ────────────────────────────────────────────────────

    canvas.addEventListener('mousemove', (e) => {
        if (currentState !== STATES.PLAYING && currentState !== STATES.TRANSITION_TO_GAME) return;
        if (gameMode === 'arkanoid') {
            arkanoidPaddleX = e.clientX;
        } else if (gameMode === 'invaders') {
            siShipX = e.clientX;
        } else if (currentState === STATES.PLAYING) {
            userPaddleY = e.clientY - getLayout().pH / 2;
        }
    });

    // ─── Canvas: click ────────────────────────────────────────────────────────

    canvas.addEventListener('click', (e) => {
        if (gameMode === 'invaders' && currentState === STATES.PLAYING) {
            if (siShootCooldown <= 0) {
                const layout = getLayout();
                siBullets.push({ x: siShipX, y: layout.siShipY - 4, vy: -layout.h * 0.8 });
                siShootCooldown = 0.25;
                playSound('beep');
            }
            return;
        }
        if (currentState !== STATES.GAME_OVER) return;
        handleGameOverClick(e.clientX, e.clientY, false);
    });

    // ─── Keyboard ─────────────────────────────────────────────────────────────

    // Game Over name entry
    window.addEventListener('keydown', (e) => {
        if (currentState !== STATES.GAME_OVER) return;
        if (gameOverPhase === 'show_scores') {
            const elapsed = Date.now() - gameOverTime;
            if (elapsed > 800 && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) {
                stopGameTransition();
            }
            return;
        }
        if (e.key === 'ArrowUp')    { nameLetters[nameSlot] = (nameLetters[nameSlot] + 1) % 26; playSound('beep'); }
        else if (e.key === 'ArrowDown')  { nameLetters[nameSlot] = (nameLetters[nameSlot] - 1 + 26) % 26; playSound('beep'); }
        else if (e.key === 'ArrowRight') { nameSlot = Math.min(2, nameSlot + 1); playSound('beep'); }
        else if (e.key === 'ArrowLeft')  { nameSlot = Math.max(0, nameSlot - 1); playSound('beep'); }
        else if (e.key === 'Enter')      { confirmName(); }
    });

    // Space Invaders controls
    window.addEventListener('keydown', (e) => {
        if (gameMode !== 'invaders' || currentState !== STATES.PLAYING) return;
        if (e.key === 'ArrowLeft'  || e.key === 'a') siInputLeft  = true;
        if (e.key === 'ArrowRight' || e.key === 'd') siInputRight = true;
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { siInputShoot = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft'  || e.key === 'a') siInputLeft  = false;
        if (e.key === 'ArrowRight' || e.key === 'd') siInputRight = false;
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') siInputShoot = false;
    });

    // Snake controls
    window.addEventListener('keydown', (e) => {
        if (gameMode !== 'snake' || currentState !== STATES.PLAYING) return;
        let newDir = null;
        if      ((e.key === 'ArrowUp'    || e.key === 'w') && snakeDir.y !== 1)  { newDir = { x: 0,  y: -1 }; e.preventDefault(); }
        else if ((e.key === 'ArrowDown'  || e.key === 's') && snakeDir.y !== -1) { newDir = { x: 0,  y: 1  }; e.preventDefault(); }
        else if ((e.key === 'ArrowLeft'  || e.key === 'a') && snakeDir.x !== 1)  { newDir = { x: -1, y: 0  }; e.preventDefault(); }
        else if ((e.key === 'ArrowRight' || e.key === 'd') && snakeDir.x !== -1) { newDir = { x: 1,  y: 0  }; e.preventDefault(); }
        if (!newDir) return;
        const dirChanged = newDir.x !== snakeNextDir.x || newDir.y !== snakeNextDir.y;
        snakeNextDir = newDir;
        if (dirChanged) { snakeBoostFactor = 1; }
        snakeKeyHeld = e.key;
    });
    window.addEventListener('keyup', (e) => {
        if (gameMode !== 'snake') return;
        if (e.key === snakeKeyHeld) {
            snakeKeyHeld = null;
            snakeBoostFactor = 1;
        }
    });

    // ─── Scroll ───────────────────────────────────────────────────────────────

    window.addEventListener('wheel', (e) => {
        if (e.deltaY > 10 && currentState === STATES.MENU && isLandscape) {
            unlockAudio();
            startGameTransition();
        } else if (e.deltaY < -10 && currentState === STATES.PLAYING && isLandscape) {
            playSound('hit');
            stopGameTransition();
        } else if (e.deltaY < -10 && currentState === STATES.GAME_OVER && gameOverPhase === 'show_scores' && isLandscape) {
            const elapsed = Date.now() - gameOverTime;
            if (elapsed > 800) stopGameTransition();
        }
    }, { passive: true });

    // ─── UI Buttons ───────────────────────────────────────────────────────────

    document.getElementById('desktop-start-btn').addEventListener('click', () => {
        unlockAudio();
        startGameTransition();
    });

    document.getElementById('back-btn').addEventListener('click', () => {
        playSound('hit');
        stopGameTransition();
    });

    // ─── Resize / orientation ─────────────────────────────────────────────────

    window.addEventListener('resize', resizeCanvas);
}
