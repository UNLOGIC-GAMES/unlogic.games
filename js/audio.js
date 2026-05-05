// ─── Web Audio API — Synthesized sounds, no audio files ──────────────────────
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let audioUnlocked = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function ensureAudioReady() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    if (audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
    }
}

function unlockAudio() {
    if (audioUnlocked) return;
    initAudio();

    try {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (osc.start) osc.start(0);
        if (osc.stop)  osc.stop(audioCtx.currentTime + 0.001);
    } catch (e) {}

    audioUnlocked = true;
}

function playSound(type) {
    ensureAudioReady();
    if (!audioCtx) return;

    try {
        const osc  = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'beep') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'start') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'hit') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now); osc.stop(now + 0.1);
        } else if (type === 'score') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            osc.start(now); osc.stop(now + 0.8);
        } else if (type === 'confirm') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.setValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now); osc.stop(now + 0.25);
        }
    } catch (e) {
        // Silently fail — don't break gameplay
    }
}

// Re-unlock on every user gesture to handle mobile suspend/resume
['touchstart', 'touchend', 'click', 'keydown', 'wheel', 'mousedown'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (!audioCtx) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (!audioUnlocked) unlockAudio();
    }, true);
});
