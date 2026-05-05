// ─── Snake Experience ─────────────────────────────────────────────────────────

function initSnake() {
    const w        = window.innerWidth;
    const h        = window.innerHeight;
    const cellSize = getSnakeCellSize();
    const gridCols = Math.floor(w / cellSize);
    const gridRows = Math.floor(h / cellSize);
    const midCol   = Math.floor(gridCols / 2);
    const midRow   = Math.floor(gridRows / 2);

    snakeBody    = [
        { col: midCol,     row: midRow },
        { col: midCol - 1, row: midRow },
        { col: midCol - 2, row: midRow }
    ];
    snakeDir     = { x: 1, y: 0 };
    snakeNextDir = { x: 1, y: 0 };
    snakeAlive   = true;
    snakeMoveTimer = 0;
    snakeKeyHeld     = null;
    snakeBoostFactor = 1;
    placeSnakeFood();
}

function placeSnakeFood() {
    const w        = window.innerWidth;
    const h        = window.innerHeight;
    const cellSize = getSnakeCellSize();
    const gridCols = Math.floor(w / cellSize);
    const gridRows = Math.floor(h / cellSize);
    let col, row, onSnake;
    do {
        col    = Math.floor(Math.random() * (gridCols - 2)) + 1;
        row    = Math.floor(Math.random() * (gridRows - 2)) + 1;
        onSnake = snakeBody.some(s => s.col === col && s.row === row);
    } while (onSnake);
    snakeFood = { col, row };
}

function updateAndDrawSnake(dt, layout, now) {
    const cs       = getSnakeCellSize();
    const gridCols = Math.floor(layout.w / cs);
    const gridRows = Math.floor(layout.h / cs);

    // Speed increases as snake grows
    const snakeSpeed  = 0.12 - (snakeBody.length - 3) * 0.002;
    const baseInterval = Math.max(0.04, snakeSpeed);

    // Desktop boost: accelerate while holding a direction key
    if (snakeKeyHeld) {
        snakeBoostFactor = Math.min(SNAKE_BOOST_MAX, snakeBoostFactor + SNAKE_BOOST_ACCEL * dt);
    }
    const moveInterval = baseInterval / snakeBoostFactor;

    snakeMoveTimer += dt;
    if (snakeMoveTimer >= moveInterval && snakeAlive) {
        snakeMoveTimer -= moveInterval;
        snakeDir = { ...snakeNextDir };

        const head    = snakeBody[0];
        const newHead = {
            col: (head.col + snakeDir.x + gridCols) % gridCols,
            row: (head.row + snakeDir.y + gridRows) % gridRows
        };

        const hitSelf = snakeBody.some(s => s.col === newHead.col && s.row === newHead.row);
        if (hitSelf) {
            snakeAlive = false;
            triggerGameOver(snakeScore);
        } else {
            snakeBody.unshift(newHead);
            if (newHead.col === snakeFood.col && newHead.row === snakeFood.row) {
                snakeScore += 10;
                playSound('hit');
                document.getElementById('score-snake').innerText = snakeScore;
                document.getElementById('snake-total').innerText = snakeScore;
                placeSnakeFood();
            } else {
                snakeBody.pop();
            }
        }
    }

    // ─── Drawing ───────────────────────────────────────────────────────────────

    // Grid
    ctx.save();
    ctx.globalAlpha = 0.06;
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

    // Food
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur  = 10;
    const foodPulse = 0.7 + 0.3 * Math.sin(now / 200);
    ctx.globalAlpha = foodPulse;
    const fx    = snakeFood.col * cs + cs / 2;
    const fy    = snakeFood.row * cs + cs / 2;
    const foodR = cs * 0.35;
    ctx.beginPath();
    ctx.arc(fx, fy, foodR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snake body
    ctx.save();
    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur  = 15;

    snakeBody.forEach((seg, i) => {
        const alpha = i === 0 ? 1.0 : Math.max(0.25, 1.0 - i * 0.02);
        ctx.globalAlpha = alpha;
        const gap = 1;
        const sx = seg.col * cs + gap;
        const sy = seg.row * cs + gap;
        const sw = cs - gap * 2;
        const sh = cs - gap * 2;

        if (i === 0) {
            // Head: slightly rounded
            const hr = cs * 0.2;
            ctx.beginPath();
            ctx.moveTo(sx + hr, sy);
            ctx.lineTo(sx + sw - hr, sy);
            ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + hr);
            ctx.lineTo(sx + sw, sy + sh - hr);
            ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - hr, sy + sh);
            ctx.lineTo(sx + hr, sy + sh);
            ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - hr);
            ctx.lineTo(sx, sy + hr);
            ctx.quadraticCurveTo(sx, sy, sx + hr, sy);
            ctx.closePath();
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#000000';
            ctx.shadowBlur = 0;
            const eyeSize = cs * 0.12;
            if (snakeDir.x === 1) {
                ctx.fillRect(sx + sw * 0.65, sy + sh * 0.2,  eyeSize, eyeSize);
                ctx.fillRect(sx + sw * 0.65, sy + sh * 0.65, eyeSize, eyeSize);
            } else if (snakeDir.x === -1) {
                ctx.fillRect(sx + sw * 0.2,  sy + sh * 0.2,  eyeSize, eyeSize);
                ctx.fillRect(sx + sw * 0.2,  sy + sh * 0.65, eyeSize, eyeSize);
            } else if (snakeDir.y === -1) {
                ctx.fillRect(sx + sw * 0.2,  sy + sh * 0.2,  eyeSize, eyeSize);
                ctx.fillRect(sx + sw * 0.65, sy + sh * 0.2,  eyeSize, eyeSize);
            } else {
                ctx.fillRect(sx + sw * 0.2,  sy + sh * 0.65, eyeSize, eyeSize);
                ctx.fillRect(sx + sw * 0.65, sy + sh * 0.65, eyeSize, eyeSize);
            }
            ctx.fillStyle  = '#ffffff';
            ctx.shadowBlur = 15;
        } else {
            ctx.fillRect(sx, sy, sw, sh);
        }
    });
    ctx.restore();
}
