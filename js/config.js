// ─── State Machine ───────────────────────────────────────────────────────────
const STATES = {
    MENU:               'MENU',
    TRANSITION_TO_GAME: 'TRANSITION_TO_GAME',
    PLAYING:            'PLAYING',
    TRANSITION_TO_MENU: 'TRANSITION_TO_MENU',
    GAME_OVER:          'GAME_OVER'
};

// ─── Timing ───────────────────────────────────────────────────────────────────
const TRANSITION_DURATION = 1000;
const PRE_GAME_DELAY      = 3000;

// ─── Game Limits ──────────────────────────────────────────────────────────────
const PONG_GOALS_PER_LEVEL = 5;
const PONG_MAX_LEVEL       = 5;
const ARK_MAX_LEVEL        = 10;
const SI_MAX_LEVEL         = 10;
const SNAKE_MAX_LEVEL      = 10;
const SNAKE_BOOST_MAX      = 3;           // max speed multiplier when holding a key
const SNAKE_BOOST_ACCEL    = 3;           // how fast boost ramps up (per second)

// ─── Misc ─────────────────────────────────────────────────────────────────────
const ALPHABET      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const POWERUP_TYPES = ['multiball', 'slow', 'life'];
