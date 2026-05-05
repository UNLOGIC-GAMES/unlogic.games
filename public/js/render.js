// ─── Shared Canvas Rendering Utilities ───────────────────────────────────────

function drawPolygon(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
}

// Pixel-art alien sprite renderer (shared by invaders game + transition)
function drawAlienSprite(alien, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#ffffff';

    const ax = alien.x, ay = alien.y, aw = alien.w, ah = alien.h;
    const px = aw / 8;
    const py = ah / 6;
    const alienType = alien.row % 3;

    let pxMap;
    if (alienType === 0) {
        // Squid
        pxMap = [[3,0],[4,0],[2,1],[3,1],[4,1],[5,1],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[0,3],[1,3],[3,3],[4,3],[6,3],[7,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[1,5],[6,5],[2,5],[5,5]];
    } else if (alienType === 1) {
        // Crab
        pxMap = [[2,0],[5,0],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[0,3],[1,3],[3,3],[4,3],[6,3],[7,3],[0,4],[2,4],[5,4],[7,4],[1,5],[3,5],[4,5],[6,5]];
    } else {
        // Octopus
        pxMap = [[3,0],[4,0],[2,1],[3,1],[4,1],[5,1],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[0,4],[2,4],[3,4],[4,4],[5,4],[7,4],[0,4],[7,4],[1,5],[2,5],[5,5],[6,5]];
    }

    for (let i = 0; i < pxMap.length; i++) {
        ctx.fillRect(ax + pxMap[i][0] * px, ay + pxMap[i][1] * py, px * 0.9, py * 0.9);
    }
    ctx.restore();
}
