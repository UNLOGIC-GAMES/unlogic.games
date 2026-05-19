// ─── Analytics Helper ──────────────────────────────────────────────────────────
// Wraps gtag() calls safely — does nothing if analytics isn't loaded (consent rejected).

function trackEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    }
}

var _gameStartTime = 0;

function trackGameStart(game) {
    _gameStartTime = Date.now();
    trackEvent('game_start', { game_name: game });
}

function trackGameOver(game, score, level) {
    var playTimeSec = _gameStartTime ? Math.round((Date.now() - _gameStartTime) / 1000) : 0;
    trackEvent('game_over', { game_name: game, score: score, level: level, play_time_seconds: playTimeSec });
    _gameStartTime = 0;
}

function trackLevelUp(game, level) {
    trackEvent('level_up', { game_name: game, level: level });
}

function trackHighScore(game, score, playerName) {
    trackEvent('high_score', { game_name: game, score: score, player_name: playerName });
}
