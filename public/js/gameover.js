// ─── Game Over Logic ──────────────────────────────────────────────────────────

function triggerGameOver(score) {
    var level = gameMode === 'pong' ? pongLevel : gameMode === 'arkanoid' ? arkanoidLevel : gameMode === 'invaders' ? siLevel : snakeLevel;
    trackGameOver(gameMode, score, level);

    finalScore   = score;
    currentState = STATES.GAME_OVER;
    gameOverTime = Date.now();
    nameLetters  = [0, 0, 0];
    nameSlot     = 0;

    scoreLayer.style.opacity = '0';
    document.getElementById('pong-info').style.display     = 'none';
    document.getElementById('arkanoid-info').style.display = 'none';
    document.getElementById('invaders-info').style.display = 'none';
    document.getElementById('snake-info').style.display    = 'none';

    playSound('gameover');

    gameOverPhase = qualifiesForHighScore(gameMode, score) ? 'enter_name' : 'show_scores';
}

function confirmName() {
    const name = nameLetters.map(i => ALPHABET[i]).join('');
    insertHighScore(gameMode, name, finalScore);
    trackHighScore(gameMode, finalScore, name);
    playSound('confirm');
    gameOverPhase = 'show_scores';
    gameOverTime  = Date.now();
}

function handleGameOverClick(clientX, clientY, isTouchEvent) {
    if (gameOverPhase === 'show_scores') {
        if (isTouchEvent) return;
        const elapsed = Date.now() - gameOverTime;
        if (elapsed > 800) stopGameTransition();
        return;
    }

    const gl = getGameOverLayout();

    for (let i = 0; i < 3; i++) {
        const slot = gl.slots[i];
        const ua   = slot.upArrow;
        if (clientX >= ua.x && clientX <= ua.x + ua.w && clientY >= ua.y && clientY <= ua.y + ua.h) {
            nameLetters[i] = (nameLetters[i] + 1) % 26;
            nameSlot = i;
            playSound('beep');
            return;
        }
        const da = slot.downArrow;
        if (clientX >= da.x && clientX <= da.x + da.w && clientY >= da.y && clientY <= da.y + da.h) {
            nameLetters[i] = (nameLetters[i] - 1 + 26) % 26;
            nameSlot = i;
            playSound('beep');
            return;
        }
    }

    const ok = gl.okBtn;
    if (clientX >= ok.x && clientX <= ok.x + ok.w && clientY >= ok.y && clientY <= ok.y + ok.h) {
        confirmName();
    }
}

function drawGameOver(layout, now) {
    const gl      = getGameOverLayout();
    const elapsed = now - gameOverTime;
    const fadeIn  = Math.min(1, elapsed / 600);

    ctx.save();
    ctx.globalAlpha  = fadeIn;
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    // Title
    ctx.save();
    ctx.font        = '900 ' + gl.titleFontSize + 'px Inter';
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur  = 20;
    ctx.fillText('GAME OVER', gl.cx, gl.titleY);
    ctx.restore();

    // Score
    ctx.save();
    ctx.font        = '700 ' + gl.scoreFontSize + 'px Inter';
    ctx.shadowColor = 'rgba(255,255,255,0.4)';
    ctx.shadowBlur  = 10;
    const modeLabel = gameMode === 'pong' ? 'PONG'
                    : gameMode === 'arkanoid' ? 'ARKANOID'
                    : gameMode === 'snake'    ? 'SNAKE'
                    : 'INVADERS';
    ctx.fillText(modeLabel + ' SCORE: ' + finalScore, gl.cx, gl.scoreTextY);
    ctx.restore();

    if (gameOverPhase === 'enter_name') {
        // Prompt
        ctx.save();
        ctx.font        = '700 ' + gl.promptFontSize + 'px Inter';
        ctx.globalAlpha = fadeIn * 0.7;
        ctx.fillText('ENTER YOUR NAME', gl.cx, gl.promptY);
        ctx.restore();

        // Letter slots
        for (let i = 0; i < 3; i++) {
            const slot     = gl.slots[i];
            const isActive = i === nameSlot;
            const letter   = ALPHABET[nameLetters[i]];

            // Up arrow
            ctx.save();
            ctx.globalAlpha = fadeIn * (isActive ? 0.9 : 0.4);
            ctx.fillStyle   = '#ffffff';
            ctx.beginPath();
            const ua = slot.upArrow;
            ctx.moveTo(ua.x + ua.w / 2, ua.y);
            ctx.lineTo(ua.x + ua.w, ua.y + ua.h);
            ctx.lineTo(ua.x, ua.y + ua.h);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Letter
            ctx.save();
            ctx.font        = '900 ' + gl.letterSize + 'px Inter';
            ctx.shadowColor = 'rgba(255,255,255,0.6)';
            ctx.shadowBlur  = isActive ? 20 : 5;
            ctx.globalAlpha = fadeIn * (isActive ? 1 : 0.5);
            ctx.fillText(letter, slot.x, slot.letterY);
            ctx.restore();

            // Down arrow
            ctx.save();
            ctx.globalAlpha = fadeIn * (isActive ? 0.9 : 0.4);
            ctx.fillStyle   = '#ffffff';
            ctx.beginPath();
            const da = slot.downArrow;
            ctx.moveTo(da.x + da.w / 2, da.y + da.h);
            ctx.lineTo(da.x + da.w, da.y);
            ctx.lineTo(da.x, da.y);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // OK button
        ctx.save();
        const ok = gl.okBtn;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.shadowColor = 'rgba(255,255,255,0.4)';
        ctx.shadowBlur  = 10;
        ctx.globalAlpha = fadeIn * (0.7 + 0.3 * Math.sin(now / 300));
        ctx.strokeRect(ok.x, ok.y, ok.w, ok.h);
        ctx.font = '700 ' + gl.okFontSize + 'px Inter';
        ctx.fillText('OK', ok.x + ok.w / 2, ok.y + ok.h / 2);
        ctx.restore();

    } else {
        // High scores table
        const scores = loadHighScores(gameMode);

        ctx.save();
        ctx.font        = '700 ' + gl.tableHeaderFontSize + 'px Inter';
        ctx.shadowColor = 'rgba(255,255,255,0.4)';
        ctx.shadowBlur  = 10;
        ctx.fillText('HIGH SCORES', gl.cx, gl.tableHeaderY);
        ctx.restore();

        ctx.save();
        ctx.font       = '700 ' + gl.tableFontSize + 'px Inter';
        ctx.shadowBlur = 0;
        if (scores.length === 0) {
            ctx.globalAlpha = fadeIn * 0.4;
            ctx.fillText('NO SCORES YET', gl.cx, gl.tableHeaderY + gl.tableRowH * 1.5);
        } else {
            for (let i = 0; i < scores.length; i++) {
                const sy    = gl.tableHeaderY + gl.tableRowH * (i + 1);
                const entry = scores[i];
                const isNew = (gameOverPhase === 'show_scores' && entry.score === finalScore);
                ctx.globalAlpha = fadeIn * (isNew ? 0.6 + 0.4 * Math.sin(now / 200) : 0.7);
                ctx.textAlign = 'right';
                ctx.fillText((i + 1) + '.', gl.cx - gl.w * 0.12, sy);
                ctx.textAlign = 'center';
                ctx.fillText(entry.name, gl.cx, sy);
                ctx.textAlign = 'left';
                ctx.fillText(entry.score, gl.cx + gl.w * 0.08, sy);
            }
        }
        ctx.restore();

        // Return prompt (desktop only)
        if (!hasUsedTouch) {
            const promptAlpha = Math.min(1, Math.max(0, (elapsed - 1200) / 600));
            if (promptAlpha > 0) {
                ctx.save();
                ctx.globalAlpha  = promptAlpha * (0.3 + 0.3 * Math.sin(now / 500));
                ctx.font         = '400 ' + Math.min(gl.w * 0.025, 14) + 'px Inter';
                ctx.textAlign    = 'center';
                ctx.fillText('SCROLL UP TO CONTINUE', gl.cx, gl.h * 0.88);
                ctx.restore();
            }
        }
    }

    ctx.restore();
}
