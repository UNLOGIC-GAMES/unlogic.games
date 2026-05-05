// ─── Responsive Layout — all positions computed from viewport ─────────────────
// INVARIANTE: getLayout() es la única fuente de verdad para posiciones y tamaños.
// Cualquier elemento visual nuevo debe obtener sus dimensiones de aquí.

function getSnakeCellSize() {
    const w = window.innerWidth;
    return Math.max(12, Math.min(w * 0.025, 22));
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getLayout() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    let logoW = Math.min(w * 0.63, 270);
    let logoH = logoW * 0.5;

    const maxSafeHeight = h * 0.315;
    if (logoH > maxSafeHeight) {
        logoH = maxSafeHeight;
        logoW = logoH * 2;
    }

    const logoOffsetX = (w - logoW) / 2;
    const logoOffsetY = (h - logoH) / 2;

    // INVARIANTE: logoLeftPts y logoRightPts definen la forma del logo en canvas.
    // No modificar estos puntos salvo indicación expresa.
    const logoLeftPts = [
        {x: 0, y: 0}, {x: 0.25, y: 0}, {x: 0.55, y: 1}, {x: 0.35, y: 1}, {x: 0.13, y: 0.25}, {x: 0, y: 0.25}
    ].map(p => ({ x: logoOffsetX + p.x * logoW, y: logoOffsetY + p.y * logoH }));

    const logoRightPts = [
        {x: 0.45, y: 0}, {x: 0.65, y: 0}, {x: 0.87, y: 0.75}, {x: 1, y: 0.75}, {x: 1, y: 1}, {x: 0.75, y: 1}
    ].map(p => ({ x: logoOffsetX + p.x * logoW, y: logoOffsetY + p.y * logoH }));

    // ─── Pong paddles ─────────────────────────────────────────────────────────
    const pW = w > 768 ? 20 : 14;
    const pH = Math.min(h * 0.25, 100);
    const margin = w * 0.05;
    const lX = margin;
    const rX = w - margin - pW;

    const padLeftPts = [
        {x: lX,      y: userPaddleY},
        {x: lX + pW, y: userPaddleY},
        {x: lX + pW, y: userPaddleY + pH},
        {x: lX,      y: userPaddleY + pH},
        {x: lX,      y: userPaddleY + pH / 2},
        {x: lX,      y: userPaddleY + pH / 2}
    ];

    const padRightPts = [
        {x: rX,      y: aiPaddleY},
        {x: rX + pW, y: aiPaddleY},
        {x: rX + pW, y: aiPaddleY + pH / 2},
        {x: rX + pW, y: aiPaddleY + pH / 2},
        {x: rX + pW, y: aiPaddleY + pH},
        {x: rX,      y: aiPaddleY + pH}
    ];

    // ─── Arkanoid paddle ──────────────────────────────────────────────────────
    const arkPadW = Math.min(w * 0.22, 180);
    const arkPadH = w > 768 ? 18 : 14;
    const arkPadY = h - 60;
    const apx = Math.max(arkPadW / 2, Math.min(w - arkPadW / 2, arkanoidPaddleX));

    const arkPadLeftPts = [
        {x: apx - arkPadW / 2, y: arkPadY},
        {x: apx,               y: arkPadY},
        {x: apx,               y: arkPadY + arkPadH},
        {x: apx - arkPadW / 2, y: arkPadY + arkPadH},
        {x: apx - arkPadW / 2, y: arkPadY + arkPadH / 2},
        {x: apx - arkPadW / 2, y: arkPadY + arkPadH / 2}
    ];

    const arkPadRightPts = [
        {x: apx,               y: arkPadY},
        {x: apx + arkPadW / 2, y: arkPadY},
        {x: apx + arkPadW / 2, y: arkPadY + arkPadH / 2},
        {x: apx + arkPadW / 2, y: arkPadY + arkPadH / 2},
        {x: apx + arkPadW / 2, y: arkPadY + arkPadH},
        {x: apx,               y: arkPadY + arkPadH}
    ];

    // ─── Space Invaders ship ──────────────────────────────────────────────────
    const siShipW = Math.min(w * 0.08, 52);
    const siShipH = siShipW * 0.8;
    const siShipY = h - 60;
    const spx = Math.max(siShipW / 2, Math.min(w - siShipW / 2, siShipX));

    const siShipLeftPts = [
        {x: spx,                             y: siShipY},
        {x: spx - siShipW * 0.1,            y: siShipY + siShipH * 0.25},
        {x: spx - siShipW * 0.1,            y: siShipY + siShipH * 0.4},
        {x: spx - siShipW * 0.5,            y: siShipY + siShipH * 0.65},
        {x: spx - siShipW * 0.5,            y: siShipY + siShipH},
        {x: spx,                             y: siShipY + siShipH * 0.85}
    ];
    const siShipRightPts = [
        {x: spx,                             y: siShipY},
        {x: spx + siShipW * 0.1,            y: siShipY + siShipH * 0.25},
        {x: spx + siShipW * 0.1,            y: siShipY + siShipH * 0.4},
        {x: spx + siShipW * 0.5,            y: siShipY + siShipH * 0.65},
        {x: spx + siShipW * 0.5,            y: siShipY + siShipH},
        {x: spx,                             y: siShipY + siShipH * 0.85}
    ];

    // ─── Snake shape (3-segment starting form) ────────────────────────────────
    const snkCS    = getSnakeCellSize();
    const snkLen   = 3;
    const snkTotalW = snkLen * snkCS;
    const snkX0    = (w - snkTotalW) / 2;
    const snkY0    = (h - snkCS) / 2;
    const sg       = 1;

    const snakeHeadLeftPts = [
        {x: snkX0 + sg,              y: snkY0 + sg},
        {x: snkX0 + 2 * snkCS - sg, y: snkY0 + sg},
        {x: snkX0 + 2 * snkCS - sg, y: snkY0 + snkCS - sg},
        {x: snkX0 + sg,              y: snkY0 + snkCS - sg},
        {x: snkX0 + sg,              y: snkY0 + snkCS / 2},
        {x: snkX0 + sg,              y: snkY0 + snkCS / 2}
    ];
    const snakeHeadRightPts = [
        {x: snkX0 + 2 * snkCS + sg, y: snkY0 + sg},
        {x: snkX0 + 3 * snkCS - sg, y: snkY0 + sg},
        {x: snkX0 + 3 * snkCS - sg, y: snkY0 + snkCS / 2},
        {x: snkX0 + 3 * snkCS - sg, y: snkY0 + snkCS / 2},
        {x: snkX0 + 3 * snkCS - sg, y: snkY0 + snkCS - sg},
        {x: snkX0 + 2 * snkCS + sg, y: snkY0 + snkCS - sg}
    ];

    return {
        w, h,
        logoLeftPts, logoRightPts,
        padLeftPts, padRightPts, pW, pH, lX, rX,
        arkPadLeftPts, arkPadRightPts, arkPadW, arkPadH, arkPadY,
        siShipLeftPts, siShipRightPts, siShipW, siShipH, siShipY,
        snakeHeadLeftPts, snakeHeadRightPts
    };
}

function getInterpolatedPoints(ptsA, ptsB, t) {
    return ptsA.map((p, i) => ({
        x: p.x + (ptsB[i].x - p.x) * t,
        y: p.y + (ptsB[i].y - p.y) * t
    }));
}

function getGameOverLayout() {
    const w  = window.innerWidth;
    const h  = window.innerHeight;
    const cx = w / 2;

    const titleFontSize  = Math.max(20, Math.min(w * 0.065, h * 0.12, 52));
    const scoreFontSize  = Math.max(12, Math.min(w * 0.035, h * 0.065, 26));
    const promptFontSize = Math.max(10, Math.min(w * 0.028, h * 0.04, 16));
    const letterSize     = Math.max(18, Math.min(w * 0.05, h * 0.095, 38));
    const letterGap      = letterSize * 1.8;
    const arrowH         = letterSize * 0.45;

    const titleY     = h * 0.13;
    const scoreTextY = h * 0.24;
    const letterY    = h * 0.48;
    const promptY    = letterY - letterSize * 0.7 - arrowH - promptFontSize * 1.2;

    const okGap      = Math.min(28, h * 0.06);
    const okY        = letterY + letterSize * 0.7 + arrowH + okGap;
    const okW        = Math.max(letterGap * 2, 100);
    const okH        = Math.max(24, Math.min(32, h * 0.05));
    const okFontSize = Math.max(10, Math.min(w * 0.028, h * 0.04, 16));

    const slots = [];
    for (let i = 0; i < 3; i++) {
        const sx = cx + (i - 1) * letterGap;
        slots.push({
            x: sx,
            letterY,
            upArrow:   { x: sx - letterSize * 0.5, y: letterY - letterSize * 0.55 - arrowH, w: letterSize, h: arrowH },
            downArrow: { x: sx - letterSize * 0.5, y: letterY + letterSize * 0.55,           w: letterSize, h: arrowH }
        });
    }

    const tableHeaderFontSize = Math.max(12, Math.min(w * 0.035, h * 0.055, 20));
    const tableHeaderY        = h * 0.36;
    const tableRowH           = Math.max(20, Math.min(h * 0.065, 34));
    const tableFontSize       = Math.max(11, Math.min(w * 0.028, h * 0.05, 18));

    return {
        w, h, cx,
        titleY, titleFontSize,
        scoreTextY, scoreFontSize,
        promptY, promptFontSize,
        letterSize, letterGap, letterY, arrowH,
        okBtn: { x: cx - okW / 2, y: okY, w: okW, h: okH },
        okFontSize,
        slots,
        tableHeaderY, tableHeaderFontSize, tableRowH, tableFontSize
    };
}
