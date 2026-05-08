// ─── Ending Credits — RPG-style scrolling narrative ──────────────────────────
// Self-contained: renders pixel-art text, inline pixel illustrations, and
// chiptune ending music using Web Audio API onto a full-screen overlay canvas.

let creditsActive = false;
let creditsCanvas, creditsCtx;
let creditsScrollY = 0;
let creditsSpeed = 35;           // px per second, recalculated from song duration
let creditsAnimId = null;
let creditsLastTime = 0;            // last frame timestamp for delta-time
let creditsStartTime = 0;           // timestamp when credits opened
const CREDITS_INITIAL_DELAY = 500;  // ms of black screen before scroll starts
let creditsMusicPlaying = false;
let creditsFadeStart = 0;           // timestamp when fade begins
let creditsImages = {};             // preloaded PNG images

// ─── Preload PNG icons for credits ───────────────────────────────────────────
function preloadCreditsImages() {
    const srcs = {
        globe: 'assets/Icons/globe.png',
        hand: 'assets/Icons/hand.png',
        rocket: 'assets/Icons/rocket.png',
        hearth: 'assets/Icons/hearth.png',
    };
    for (const [name, src] of Object.entries(srcs)) {
        if (!creditsImages[name]) {
            const img = new Image();
            img.src = src;
            creditsImages[name] = img;
        }
    }
}

// ─── Pixel-art 5×7 bitmap font ───────────────────────────────────────────────
// Each glyph is a 5-wide × 7-tall bitmap stored as 7 hex-nibbles (5 bits each).
const PIXEL_FONT = {
    'A': [0x04, 0x0A, 0x11, 0x1F, 0x11, 0x11, 0x11], 'B': [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    'C': [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E], 'D': [0x1E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1E],
    'E': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F], 'F': [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    'G': [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0E], 'H': [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E], 'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], 'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    'M': [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11], 'N': [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
    'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], 'P': [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D], 'R': [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    'S': [0x0E, 0x11, 0x10, 0x0E, 0x01, 0x11, 0x0E], 'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E], 'V': [0x11, 0x11, 0x11, 0x11, 0x0A, 0x0A, 0x04],
    'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11], 'X': [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04], 'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E], '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F], '3': [0x0E, 0x11, 0x01, 0x06, 0x01, 0x11, 0x0E],
    '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02], '5': [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    '6': [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E], '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E], '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x0C, 0x0C], ',': [0x00, 0x00, 0x00, 0x00, 0x04, 0x04, 0x08],
    ':': [0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x0C, 0x00], '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    '\u2014': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00], // em-dash
    '\u2011': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00], // non-breaking hyphen
    '\u2019': [0x06, 0x06, 0x02, 0x04, 0x00, 0x00, 0x00], // right single quote
    '\u201C': [0x0A, 0x0A, 0x14, 0x00, 0x00, 0x00, 0x00], // left double quote
    '\u201D': [0x0A, 0x0A, 0x05, 0x00, 0x00, 0x00, 0x00], // right double quote
    '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02], ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04], '?': [0x0E, 0x11, 0x01, 0x06, 0x04, 0x00, 0x04],
    '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
    '\'': [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
    '&': [0x04, 0x0A, 0x0A, 0x04, 0x15, 0x12, 0x0D],
    ';': [0x00, 0x0C, 0x0C, 0x00, 0x0C, 0x04, 0x08],
};

// ─── Pixel-art illustrations (16×16 grids) ──────────────────────────────────
// Each drawn procedurally on the credits canvas as colored pixel blocks.
const PIXEL_ARTS = {
    // Planet Earth — chunky NES-style globe with bold continents
    globe: {
        w: 20, h: 20,
        color: '#1565c0',
        colors: { '1': '#1565c0', '2': '#1e88e5', '3': '#2e7d32', '4': '#43a047', '5': '#e0e0e0' },
        rows: [
            '00000012222210000000',
            '00001222225222100000',
            '00012225552222210000',
            '00122255522222221000',
            '01222554422222222100',
            '12222544332222222210',
            '12222443332222222210',
            '22222233322222222221',
            '22222223222222222221',
            '22222222222222222221',
            '22222222222233222221',
            '22222222222334422221',
            '12222222223344422210',
            '12222222233443322210',
            '01222222234432222100',
            '00122222233322221000',
            '00012222222222210000',
            '00001225522222100000',
            '00000012222210000000',
            '00000000000000000000',
        ]
    },
    // Handheld console — chunky NES-style with bold shapes
    handheld: {
        w: 20, h: 26,
        color: '#455a64',
        colors: { '1': '#455a64', '2': '#37474f', '3': '#78909c', '4': '#26c6da', '5': '#b2ebf2', '6': '#e0e0e0', '7': '#ef5350', '8': '#42a5f5' },
        rows: [
            '00001111111111110000',
            '00011111111111111000',
            '00111111111111111100',
            '01122222222222222110',
            '01124555555555542110',
            '01124555555555542110',
            '01124555555555542110',
            '01124555555555542110',
            '01124555555555542110',
            '01124555555555542110',
            '01124555555555542110',
            '01122222222222222110',
            '01111111111111111110',
            '01113000660000031110',
            '01110006660000031110',
            '01110066666600031110',
            '01110006660070031110',
            '01113000660000081110',
            '01111000000007011110',
            '01111300000000311110',
            '01111130000003111110',
            '00111111111111111100',
            '00111111111111111100',
            '00011111111111111000',
            '00001111111111110000',
            '00000000000000000000',
        ]
    },
    // Rocket — chunky NES-style with bold fins and flame
    rocket: {
        w: 16, h: 24,
        color: '#eceff1',
        colors: { '1': '#eceff1', '2': '#b0bec5', '3': '#42a5f5', '4': '#1e88e5', '5': '#e53935', '6': '#ff9800', '7': '#ffeb3b' },
        rows: [
            '0000000110000000',
            '0000001111000000',
            '0000011111100000',
            '0000111111110000',
            '0000111111110000',
            '0001111111111000',
            '0001112211111000',
            '0001123321111000',
            '0001123321111000',
            '0001112211111000',
            '0001111111111000',
            '0001111111111000',
            '0001111111111000',
            '0002111111112000',
            '0021111111111200',
            '0211111111111120',
            '5211111111111150',
            '5521111111112550',
            '0552111111125500',
            '0055211111255000',
            '0000211111120000',
            '0000066776600000',
            '0000006776000000',
            '0000000770000000',
        ]
    },
    // Heart — chunky NES-style, bold and bright
    heart: {
        w: 18, h: 16,
        color: '#e53935',
        colors: { '1': '#e53935', '2': '#ef5350', '3': '#f48fb1', '4': '#c62828' },
        rows: [
            '003320000000233000',
            '032221000012222300',
            '322221100112222230',
            '222221111112222220',
            '322111111111112230',
            '221111111111111220',
            '221111111111111120',
            '221111111111111120',
            '022111111111111200',
            '002211111111112200',
            '000221111111122000',
            '000022111111220000',
            '000002211112200000',
            '000000221122000000',
            '000000022120000000',
            '000000002200000000',
        ]
    },
};

// ─── Credits content definition ──────────────────────────────────────────────
// type: 'title' | 'text' | 'image' | 'gap'
const CREDITS_CONTENT = [
    { type: 'gap', lines: 1 },
    { type: 'title', text: 'UNLOGIC GAMES' },
    { type: 'gap', lines: 2 },
    { type: 'text', text: 'AN INDEPENDENT STUDIO' },
    { type: 'text', text: 'HEADQUARTERED IN MIAMI' },
    { type: 'text', text: 'WITH OUR MAIN DEVELOPMENT' },
    { type: 'text', text: 'HUB IN MADRID.' },
    { type: 'gap', lines: 2 },
    { type: 'text', text: 'WE FOCUS ON CREATING ORIGINAL,' },
    { type: 'text', text: 'PREMIUM SINGLE-PLAYER NARRATIVE,' },
    { type: 'text', text: 'RPG, AND STRATEGY GAMES' },
    { type: 'text', text: 'FOR A GLOBAL AUDIENCE.' },
    { type: 'gap', lines: 2 },
    { type: 'png', img: 'globe', size: 80 },
    { type: 'gap', lines: 3 },
    { type: 'text', text: 'DRIVEN BY OUR FOUNDERS DEEP' },
    { type: 'text', text: 'EXPERTISE IN AI TECHNOLOGY' },
    { type: 'text', text: 'AND THE FILM INDUSTRY,' },
    { type: 'text', text: 'WE COMBINE RIGOROUS ENGINEERING' },
    { type: 'text', text: 'WITH CINEMATIC STORYTELLING.' },
    { type: 'gap', lines: 2 },
    { type: 'text', text: 'OUR UPCOMING DEBUT TITLE' },
    { type: 'text', text: 'IS TAILORED FOR PC AND HANDHELDS,' },
    { type: 'text', text: 'WITH FUTURE PLANS TO EXPAND' },
    { type: 'text', text: 'TO THE NINTENDO SWITCH 2.' },
    { type: 'gap', lines: 2 },
    { type: 'png', img: 'hand', size: 80 },
    { type: 'gap', lines: 3 },
    { type: 'text', text: 'WE ARE COMMITTED TO A' },
    { type: 'text', text: 'PLAYER-FIRST APPROACH:' },
    { type: 'text', text: 'WE OFFER COMPLETE GAMES' },
    { type: 'text', text: 'FOR AN UPFRONT PRICE,' },
    { type: 'text', text: 'COMPLETELY AVOIDING LIVE-SERVICE' },
    { type: 'text', text: 'OR FREE-TO-PLAY MECHANICS.' },
    { type: 'gap', lines: 2 },
    { type: 'png', img: 'rocket', size: 80 },
    { type: 'gap', lines: 2 },
    { type: 'text', text: 'AS A LEAN, INNOVATION-DRIVEN TEAM,' },
    { type: 'text', text: 'WE ARE TRANSPARENT ABOUT' },
    { type: 'text', text: 'OUR AI USAGE.' },
    { type: 'text', text: 'WE LEVERAGE IT ONLY WHEN IT' },
    { type: 'text', text: 'MEANINGFULLY ENHANCES' },
    { type: 'text', text: 'GAMEPLAY SYSTEMS,' },
    { type: 'text', text: 'WHILE STRICTLY AVOIDING' },
    { type: 'text', text: 'GENERATIVE AI FOR CORE CREATIVE' },
    { type: 'text', text: 'ASSETS LIKE ART, MUSIC, AND UI.' },
    { type: 'gap', lines: 4 },
    { type: 'png', img: 'hearth', size: 80, final: true },
    { type: 'gap', lines: 2, final: true },
    { type: 'title', text: 'BUILT BY PEOPLE', final: true },
    { type: 'title', text: 'WHO LOVE TO PLAY.', final: true },
    { type: 'gap', lines: 2, final: true },
    { type: 'text', text: 'EXIT_HINT', final: true },
    { type: 'gap', lines: 4, final: true },
];

// ─── Build credits layout (positions in virtual px) ──────────────────────────
function buildCreditsLayout(scale) {
    const glyphW = 5 * scale;
    const glyphH = 7 * scale;
    const charGap = 1 * scale;
    const lineHeight = glyphH + 6 * scale;
    const titleScale = 2;
    const titleLineHeight = (glyphH * titleScale) + 8 * scale;

    let y = 0;
    const items = [];
    let finalStartY = null;

    for (const entry of CREDITS_CONTENT) {
        if (entry.final && finalStartY === null) finalStartY = y;
        if (entry.type === 'gap') {
            y += lineHeight * entry.lines;
        } else if (entry.type === 'title') {
            items.push({ type: 'title', text: entry.text, y, scale: titleScale, final: !!entry.final });
            y += titleLineHeight;
        } else if (entry.type === 'text') {
            items.push({ type: 'text', text: entry.text, y, scale: 1, final: !!entry.final });
            y += lineHeight;
        } else if (entry.type === 'image') {
            const art = PIXEL_ARTS[entry.art];
            if (art) {
                const artPixelSize = 4 * scale;
                const artH = art.h * artPixelSize;
                items.push({ type: 'image', art: entry.art, y, pixelSize: artPixelSize, final: !!entry.final });
                y += artH + 4 * scale;
            }
        } else if (entry.type === 'png') {
            const imgW = entry.size * scale;
            const img = creditsImages[entry.img];
            const aspect = (img && img.complete && img.naturalWidth > 0) ? (img.naturalHeight / img.naturalWidth) : 1;
            const imgH = imgW * aspect;
            items.push({ type: 'png', img: entry.img, y, size: imgW, final: !!entry.final });
            y += imgH + 4 * scale;
        }
    }
    return { items, totalHeight: y, finalStartY: finalStartY || y };
}

// ─── Draw a single pixel-font character ──────────────────────────────────────
function drawPixelChar(ctx, ch, x, y, scale, pixelSize, color) {
    const glyph = PIXEL_FONT[ch] || PIXEL_FONT[' '];
    ctx.fillStyle = color;
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
            if (glyph[row] & (0x10 >> col)) {
                ctx.fillRect(
                    x + col * pixelSize * scale,
                    y + row * pixelSize * scale,
                    pixelSize * scale,
                    pixelSize * scale
                );
            }
        }
    }
}

// ─── Draw a line of pixel text centered ──────────────────────────────────────
function drawPixelTextCentered(ctx, text, cx, y, charScale, pixelSize, color) {
    const charW = 5 * pixelSize * charScale + 1 * pixelSize;
    const totalW = text.length * charW;
    let x = cx - totalW / 2;
    for (const ch of text) {
        drawPixelChar(ctx, ch, x, y, charScale, pixelSize, color);
        x += charW;
    }
}

// ─── Draw a pixel art illustration centered ──────────────────────────────────
function drawPixelArt(ctx, artName, cx, y, pixelSize) {
    const art = PIXEL_ARTS[artName];
    if (!art) return;
    const totalW = art.w * pixelSize;
    const startX = cx - totalW / 2;
    const colorMap = art.colors || {};
    for (let r = 0; r < art.h; r++) {
        const row = art.rows[r];
        for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === '0') continue;
            ctx.fillStyle = colorMap[ch] || art.color;
            ctx.fillRect(startX + c * pixelSize, y + r * pixelSize, pixelSize, pixelSize);
        }
    }
}

// ─── Credits music (MIDI file via JZZ) ───────────────────────────────────────
let creditsMidiPlayer = null;
let creditsMidiData = null;   // cached ArrayBuffer of the .mid file

function playCreditsMusic() {
    if (creditsMusicPlaying) return;
    creditsMusicPlaying = true;
    console.log('[MIDI] playCreditsMusic called');

    // If MIDI data is already cached, start playback immediately
    if (creditsMidiData) {
        console.log('[MIDI] Using cached MIDI data, size:', creditsMidiData.byteLength);
        startMidiPlayer(creditsMidiData);
        return;
    }

    // Fetch the .mid file once and cache it
    console.log('[MIDI] Fetching MIDI file...');
    fetch('assets/Music/STEAM DREAM SOFT general.mid')
        .then(r => {
            console.log('[MIDI] Fetch response:', r.status, r.statusText, 'content-type:', r.headers.get('content-type'));
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.arrayBuffer();
        })
        .then(buf => {
            console.log('[MIDI] MIDI file loaded, size:', buf.byteLength, 'bytes');
            creditsMidiData = buf;
            if (creditsMusicPlaying) startMidiPlayer(buf);
        })
        .catch(e => {
            console.error('[MIDI] Fetch failed:', e);
            creditsMusicPlaying = false;
        });
}

function startMidiPlayer(buf) {
    stopMidiPlayerOnly();
    try {
        console.log('[MIDI] Parsing SMF data...');
        const smf = new JZZ.MIDI.SMF(new Uint8Array(buf));
        console.log('[MIDI] SMF parsed, tracks:', smf.length, 'type:', smf.type);
        creditsMidiPlayer = smf.player();
        console.log('[MIDI] Player created, duration:', creditsMidiPlayer.durationMS(), 'ms');
        const synth = JZZ.synth.Tiny();
        synth.or(function () {
            console.error('[MIDI] Synth failed to open:', this.err());
            creditsMusicPlaying = false;
        });
        synth.and(function () {
            console.log('[MIDI] Synth opened successfully');
        });
        creditsMidiPlayer.connect(synth);
        creditsMidiPlayer.play();
        console.log('[MIDI] Player.play() called');
    } catch (e) {
        console.error('[MIDI] startMidiPlayer error:', e);
        creditsMusicPlaying = false;
    }
}

function stopMidiPlayerOnly() {
    if (creditsMidiPlayer) {
        console.log('[MIDI] Stopping player');
        try { creditsMidiPlayer.stop(); } catch (e) { console.warn('[MIDI] Stop error:', e); }
        creditsMidiPlayer = null;
    }
}

function stopCreditsMusic() {
    creditsMusicPlaying = false;
    stopMidiPlayerOnly();
}

// ─── Open / Close Credits ────────────────────────────────────────────────────
function openCredits() {
    if (creditsActive) return;
    creditsActive = true;
    creditsScrollY = 0;
    creditsLastTime = 0;
    creditsStartTime = 0;
    creditsFadeStart = 0;
    preloadCreditsImages();

    const overlay = document.getElementById('credits-overlay');
    overlay.style.display = 'flex';
    // trigger reflow then fade in
    overlay.offsetHeight;
    overlay.style.opacity = '1';

    creditsCanvas = document.getElementById('credits-canvas');
    creditsCtx = creditsCanvas.getContext('2d');
    resizeCreditsCanvas();

    unlockAudio();
    playCreditsMusic();
    creditsAnimId = requestAnimationFrame(creditsLoop);
}

function closeCredits() {
    if (!creditsActive) return;
    creditsActive = false;
    stopCreditsMusic();
    if (creditsAnimId) {
        cancelAnimationFrame(creditsAnimId);
        creditsAnimId = null;
    }
    const overlay = document.getElementById('credits-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
}

function resizeCreditsCanvas() {
    if (!creditsCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    creditsCanvas.width = window.innerWidth * dpr;
    creditsCanvas.height = window.innerHeight * dpr;
    creditsCanvas.style.width = window.innerWidth + 'px';
    creditsCanvas.style.height = window.innerHeight + 'px';
    creditsCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ─── Credits render loop ─────────────────────────────────────────────────────
function creditsLoop(timestamp) {
    if (!creditsActive) return;

    if (!creditsLastTime) creditsLastTime = timestamp;
    if (!creditsStartTime) creditsStartTime = timestamp;
    const dt = Math.min((timestamp - creditsLastTime) / 1000, 0.1); // seconds, capped
    creditsLastTime = timestamp;

    // Wait for initial delay (black screen)
    const elapsed = timestamp - creditsStartTime;
    const scrollActive = elapsed >= CREDITS_INITIAL_DELAY;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;

    // Responsive pixel size
    const basePixel = w < 500 ? 1.5 : (w < 900 ? 2 : 2.5);
    const layout = buildCreditsLayout(basePixel);

    creditsCtx.clearRect(0, 0, w, h);

    // Draw scanline overlay effect (subtle)
    creditsCtx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let sy = 0; sy < h; sy += 4) {
        creditsCtx.fillRect(0, sy, w, 1);
    }

    // Speed is fixed (no dynamic duration available from MIDI player)

    // Calculate speed so scroll finishes with the song (1:21 = 81s)
    const SONG_DURATION = 81; // seconds
    const finalBlockHeight = layout.totalHeight - layout.finalStartY;
    const maxScroll = layout.finalStartY + finalBlockHeight / 2 - h / 2 + h;
    const scrollTime = SONG_DURATION - CREDITS_INITIAL_DELAY / 1000;
    if (scrollTime > 0 && maxScroll > 0) {
        creditsSpeed = maxScroll / scrollTime;
    }
    const clamped = creditsScrollY >= maxScroll;
    const effectiveScroll = Math.min(creditsScrollY, maxScroll);

    // Start fade timer when clamped
    if (clamped && !creditsFadeStart) creditsFadeStart = Date.now();

    // Draw each item offset by scroll
    const baseY = h; // text starts below screen, scrolls up
    // Non-final items fade out over 2 seconds once clamped
    const fadeFactor = (clamped && creditsFadeStart) ? Math.max(0, 1 - (Date.now() - creditsFadeStart) / 2000) : 1;
    for (const item of layout.items) {
        const drawY = baseY + item.y - effectiveScroll;

        // Skip if off screen
        if (drawY > h + 50 || drawY < -100) continue;

        // Fade at edges
        let alpha = 1;
        if (drawY < 60) alpha = Math.max(0, drawY / 60);
        if (drawY > h - 40) alpha = Math.max(0, (h - drawY) / 40);

        // Non-final items fade out when reaching the end
        if (!item.final) alpha *= fadeFactor;

        if (alpha < 0.01) continue;

        if (item.type === 'title') {
            const color = `rgba(255,255,255,${alpha})`;
            drawPixelTextCentered(creditsCtx, item.text, cx, drawY, item.scale, basePixel, color);
        } else if (item.type === 'text') {
            let displayText = item.text;
            const isExitHint = displayText === 'EXIT_HINT';
            if (isExitHint) {
                displayText = hasUsedTouch ? 'TAP TO EXIT' : 'TAP OR PRESS ESC TO EXIT';
                // Fade in 2 seconds after scroll stops
                if (!creditsFadeStart) { alpha = 0; }
                else {
                    const elapsed = Date.now() - creditsFadeStart;
                    alpha *= (elapsed < 2000) ? 0 : Math.min(1, (elapsed - 2000) / 1000);
                }
            }
            const dimFactor = item.final ? 0.4 : 0.85;
            const textScale = item.final ? 0.7 : item.scale;
            const color = `rgba(200,200,220,${alpha * dimFactor})`;
            drawPixelTextCentered(creditsCtx, displayText, cx, drawY, textScale, basePixel, color);
        } else if (item.type === 'image') {
            creditsCtx.globalAlpha = alpha;
            drawPixelArt(creditsCtx, item.art, cx, drawY, item.pixelSize);
            creditsCtx.globalAlpha = 1;
        } else if (item.type === 'png') {
            const img = creditsImages[item.img];
            if (img && img.complete && img.naturalWidth > 0) {
                const drawW = item.size;
                const aspect = img.naturalHeight / img.naturalWidth;
                const drawH = drawW * aspect;
                const ix = cx - drawW / 2;
                const iy = drawY;

                // Draw to offscreen canvas with radial vignette mask
                const off = document.createElement('canvas');
                off.width = drawW;
                off.height = drawH;
                const octx = off.getContext('2d');
                octx.imageSmoothingEnabled = false;
                octx.drawImage(img, 0, 0, drawW, drawH);

                // Apply radial gradient mask (fade edges to transparent)
                octx.globalCompositeOperation = 'destination-in';
                const grad = octx.createRadialGradient(
                    drawW / 2, drawH / 2, Math.min(drawW, drawH) * 0.2,
                    drawW / 2, drawH / 2, Math.min(drawW, drawH) * 0.5
                );
                grad.addColorStop(0, 'rgba(255,255,255,1)');
                grad.addColorStop(1, 'rgba(255,255,255,0)');
                octx.fillStyle = grad;
                octx.fillRect(0, 0, drawW, drawH);

                creditsCtx.globalAlpha = alpha;
                creditsCtx.drawImage(off, ix, iy);
                creditsCtx.globalAlpha = 1;
            }
        }
    }

    // Auto-scroll (stop when clamped at final section)
    if (!clamped && scrollActive) {
        creditsScrollY += creditsSpeed * dt;
    }

    creditsAnimId = requestAnimationFrame(creditsLoop);
}

// ─── Input for credits overlay ───────────────────────────────────────────────
function initCreditsInput() {
    document.addEventListener('keydown', (e) => {
        if (!creditsActive) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeCredits();
        }
    });

    const overlay = document.getElementById('credits-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (creditsActive) closeCredits();
        });
    }

    window.addEventListener('resize', () => {
        if (creditsActive) resizeCreditsCanvas();
    });
}
