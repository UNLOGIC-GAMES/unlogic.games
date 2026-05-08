// ─── DOM References (assigned in main.js after DOM ready) ────────────────────
let canvas, ctx, uiLayer, scoreLayer, scoreUserEl, scoreAiEl;

// ─── State Machine ────────────────────────────────────────────────────────────
let currentState = STATES.MENU;
let isLandscape  = window.innerWidth > window.innerHeight;

// ─── Timing ───────────────────────────────────────────────────────────────────
let transitionStartTime = 0;
let lastCount = -1;
let lastTime  = Date.now();

// ─── Input Detection ──────────────────────────────────────────────────────────
let hasUsedTouch = false;

// ─── Game Mode ────────────────────────────────────────────────────────────────
let gameMode = 'pong';

// ─── Pong State ───────────────────────────────────────────────────────────────
let userPaddleY = 0;
let aiPaddleY   = 0;
let scoreUser   = 0;
let scoreAi     = 0;

const ball = { x: 0, y: 0, prevX: 0, prevY: 0, vx: 0, vy: 0, size: 12, delay: 0 };

let pongLevel           = 1;
let pongTotalScore      = 0;
let pongLevelTransition = 0;
let pongTouchStartY        = null;
let pongPaddleAtTouchStart = 0;

// ─── Arkanoid State ───────────────────────────────────────────────────────────
let arkanoidPaddleX   = 0;
let arkanoidScore     = 0;
let bricks            = [];
let arkanoidLives     = 3;
let arkanoidLevel     = 1;
let arkLevelTransition = 0;
let fallingPowerups   = [];
let extraBalls        = [];
let slowTimer         = 0;
let slowSpeedFactor   = 1;

// ─── Space Invaders State ─────────────────────────────────────────────────────
let siShipX           = 0;
let siScore           = 0;
let siLives           = 3;
let siLevel           = 1;
let siLevelTransition = 0;
let siAliens          = [];
let siBullets         = [];
let siAlienBullets    = [];
let siAlienDir        = 1;
let siAlienSpeed      = 0;
let siAlienDropTimer  = 0;
let siShootCooldown   = 0;
let siAlienShootTimer = 0;
let siInputLeft       = false;
let siInputRight      = false;
let siInputShoot      = false;
let siTouchControls   = { left: false, right: false, fire: false };
let siTouchActive     = false;

// ─── Snake State ──────────────────────────────────────────────────────────────
let snakeBody           = [];
let snakeDir            = { x: 1, y: 0 };
let snakeNextDir        = { x: 1, y: 0 };
let snakeFood           = { col: 0, row: 0 };
let snakeScore          = 0;
let snakeLevel          = 1;
let snakeLevelTransition = 0;
let snakeMoveTimer      = 0;
let snakeAlive          = true;
let snakeTouchStartX    = 0;
let snakeTouchStartY    = 0;
let snakeKeyHeld        = null;        // key currently held for boost (desktop)
let snakeBoostFactor    = 1;           // 1 = normal, up to SNAKE_BOOST_MAX

// ─── Particles ────────────────────────────────────────────────────────────────
let particles = [];

// ─── Game Over State ──────────────────────────────────────────────────────────
let finalScore    = 0;
let gameOverPhase = 'enter_name';
let nameLetters   = [0, 0, 0];
let nameSlot      = 0;
let gameOverTime  = 0;
