// ─── High Score System (localStorage) ────────────────────────────────────────
// Format per mode: [{ name: "ABC", score: 1500 }, ...]  max 5 entries

function loadHighScores(mode) {
    try {
        const data = localStorage.getItem('highScores_' + mode);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
}

function saveHighScores(mode, scores) {
    try {
        localStorage.setItem('highScores_' + mode, JSON.stringify(scores));
    } catch (e) {}
}

function qualifiesForHighScore(mode, score) {
    if (score <= 0) return false;
    const scores = loadHighScores(mode);
    return scores.length < 5 || score > scores[scores.length - 1].score;
}

function insertHighScore(mode, name, score) {
    const scores = loadHighScores(mode);
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    if (scores.length > 5) scores.length = 5;
    saveHighScores(mode, scores);
}
