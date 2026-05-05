---
name: unlogic-site
description: Guía de coherencia visual y arquitectura técnica para el proyecto unlogic.games. Actívate automáticamente cuando el usuario mencione "unlogic", trabaje en ficheros de este repositorio (reconocible por la presencia de .claude/skills/unlogic-site/ o /public/js/games/), pida cambios en index.html del proyecto, o hable de los juegos/experiencias del sitio (Pong, Arkanoid, Space Invaders, Snake). Esta skill es la memoria institucional del proyecto — contiene las reglas que garantizan que cada cambio mantiene la coherencia visual y la arquitectura técnica correcta. Úsala siempre que vayas a modificar cualquier fichero de este proyecto.
---

# unlogic.games — Skill de Coherencia del Proyecto

## Qué es este proyecto

Sitio web que representa la marca de la compañia Unlogic Games y que muestra juegos arcade como parte de la experiencia de navegación. Contiene 4 experiencias/juegos clásicos (Pong, Arkanoid, Space Invaders, Snake) con transiciones animadas entre el logo de la marca y cada juego. Se publica en **GitHub Pages desde el directorio `/public/`** del repositorio `https://github.com/UnlogicGames/unlogic.games/`.

---

## INVARIANTES VISUALES — No modificar sin indicación expresa

Estas reglas son absolutas. Antes de cualquier cambio, verifica que no las rompes.

### 1. El Logo

El logo tiene **dos representaciones** que deben mantenerse sincronizadas y sin alteraciones:

**A) Imagen estática en HTML:**
```html
<img src="horizontal.png">  <!-- 224px max-width, centrado -->
```
- Fichero: `horizontal.png` (PNG RGBA, 9838×2424px, 164 KB)
- CSS aplicado: `filter: brightness(0) invert(1) drop-shadow(...)` (efecto glow blanco)
- **No reescalar, no recortar, no sustituir sin instrucción expresa.**

**B) Vectores canvas para animación:**
```javascript
logoLeftPts[]   // 6 vértices — mitad izquierda del logo
logoRightPts[]  // 6 vértices — mitad derecha del logo
```
- El logo flota en el menú con: `Math.sin(now / 800) * 8` (periodo 800ms, desplazamiento vertical ±8px)
- Glow aplicado en canvas: `ctx.shadowBlur = 20`
- **No cambiar los puntos del polígono, la fórmula de flotación ni el glow sin indicación expresa.**

### 2. La Transición Logo ↔ Juego

La transición es lo que hace único al sitio: el logo se **morphea** hacia la entidad del juego (paddle de Pong, paddle de Arkanoid, nave de Space Invaders, cabeza de Snake) y viceversa al volver.

Parámetros que no deben tocarse sin motivo:
```javascript
TRANSITION_DURATION = 1000   // ms — duración del morphing
PRE_GAME_DELAY = 3000        // ms — cuenta atrás antes de empezar
```

El morphing usa **interpolación cúbica ease-in-out** entre `logoLeftPts`/`logoRightPts` y los puntos del juego correspondiente. Cualquier cambio en los puntos del logo o en los shapes de los juegos romperá la fluidez de la transición.

**Flujo de estados** (no alterar):
```
MENU → TRANSITION_TO_GAME → PLAYING → TRANSITION_TO_MENU → MENU
                                    ↓
                                GAME_OVER
```

### 3. Responsive

El sitio es **mobile-first** y debe funcionar en cualquier dispositivo. Las técnicas actuales son:

- **DPR scaling:** Canvas escalado con `window.devicePixelRatio` — **siempre mantener**
- **`getLayout()`:** Función central que calcula TODAS las posiciones y tamaños dinámicamente según `window.innerWidth` y `window.innerHeight`. Cualquier nuevo elemento visual debe obtener sus dimensiones de aquí
- **Orientación:** Media queries CSS para portrait/landscape; el juego se activa al pasar a landscape en móvil
- **Touch:** Cada juego tiene controles táctiles propios — no mezclar lógica de touch entre juegos
- **Tailwind CSS** (CDN): Usado para las clases de HTML del menú y score layer

Ante cualquier cambio: **probar mentalmente en portrait (móvil) y landscape (desktop)** antes de confirmar.

---

## ARQUITECTURA OBJETIVO

### Estructura de ficheros en `/public/`

```
public/
├── index.html                  ← HTML mínimo, carga módulos vía <script type="module">
├── css/
│   ├── base.css                ← variables CSS, animaciones (@keyframes tilt), reset
│   └── ui.css                  ← menú, score layer, responsive, media queries orientación
├── js/
│   ├── main.js                 ← state machine, loop(), init, resizeCanvas
│   ├── logo.js                 ← logoLeftPts, logoRightPts, drawLogo(), float animation
│   ├── layout.js               ← getLayout(), getInterpolatedPoints()
│   ├── particles.js            ← initParticles(), updateParticles(), drawParticles()
│   ├── audio.js                ← playSound(), unlockAudio(), todos los tipos de sonido
│   ├── input.js                ← listeners de keyboard/mouse/touch/wheel unificados
│   ├── highscores.js           ← getHighScores(), saveHighScore(), renderHighScores()
│   └── games/
│       ├── pong.js             ← estado Pong, initPong(), updatePong(), drawPong()
│       ├── arkanoid.js         ← estado Arkanoid, initArkanoid(), updateArkanoid(), drawArkanoid()
│       ├── invaders.js         ← estado Space Invaders, initInvaders(), updateInvaders(), drawInvaders()
│       └── snake.js            ← estado Snake, initSnake(), updateSnake(), drawSnake()
└── assets/
    └── horizontal.png          ← logo original, NO modificar
```

### Responsabilidades de cada módulo

| Módulo | Contiene | NO contiene |
|--------|----------|-------------|
| `main.js` | State machine, game loop, inicialización | Lógica de juegos, rendering específico |
| `logo.js` | Puntos del logo, dibujo en canvas, flotación | Lógica de transición (eso es main.js) |
| `layout.js` | getLayout(), cálculos responsivos | Estado de los juegos |
| `audio.js` | Síntesis Web Audio API | Lógica de juego |
| `input.js` | Event listeners globales | Acciones del juego (las delega vía callbacks) |
| `games/pong.js` | Todo lo de Pong: estado, física, colisiones, render | Estado de otros juegos |
| `games/arkanoid.js` | Todo lo de Arkanoid: ladrillos, power-ups, vidas | Estado de otros juegos |
| `games/invaders.js` | Todo lo de Space Invaders: aliens, sprites, balas | Estado de otros juegos |
| `games/snake.js` | Todo lo de Snake: grid, movimiento, comida | Estado de otros juegos |

### Convenciones de código

- **Variables de estado de juego** con prefijo: `pong*`, `ark*` / `arkanoid*`, `si*`, `snake*`
- **LocalStorage keys:** `highScores_pong`, `highScores_arkanoid`, `highScores_invaders`, `highScores_snake`
- **IDs HTML existentes** (no renombrar): `gameCanvas`, `ui-layer`, `score-layer`, `pong-scores`, `arkanoid-scores`, `invaders-scores`, `snake-scores`, `back-btn`
- Canvas context: siempre `const ctx = canvas.getContext('2d')`
- No usar frameworks ni bundlers — vanilla JS con ES modules nativos (`<script type="module">`)
- No añadir dependencias nuevas sin discutirlo primero

---

## PLAN DE MIGRACIÓN (monolito → modular)

Orden de extracción recomendado para minimizar errores:

**Fase 1 — Infraestructura**
1. Crear `/public/` y mover `horizontal.png` a `/public/assets/`
2. Crear `base.css` y `ui.css` extrayendo los `<style>` de `index.html`
3. Crear `audio.js` (sin dependencias externas, fácil de extraer)
4. Crear `highscores.js` (puro localStorage, sin dependencias)
5. Crear `layout.js` con `getLayout()` y `getInterpolatedPoints()`

**Fase 2 — Core visual**
6. Crear `particles.js`
7. Crear `logo.js` con los puntos del logo y `drawLogo()`
8. Crear `input.js` con todos los event listeners

**Fase 3 — Juegos (uno a uno)**
9. Extraer `games/snake.js` (más simple, buen punto de partida)
10. Extraer `games/pong.js`
11. Extraer `games/arkanoid.js`
12. Extraer `games/invaders.js`

**Fase 4 — Integración**
13. Crear `main.js` con la state machine y el loop principal
14. Actualizar `index.html` para cargar módulos con `<script type="module" src="js/main.js">`
15. Verificar que GitHub Pages sirve correctamente desde `/public/`

**En cada fase:** Verificar que el sitio funciona igual antes de pasar a la siguiente. No mezclar fases.

---

## PROTOCOLO DE CAMBIOS

Antes de aplicar cualquier modificación al proyecto, verifica estas preguntas:

1. **¿Afecta al logo?**
   - ¿Se modifican `logoLeftPts`, `logoRightPts`, o `horizontal.png`?
   - → Si no hay instrucción expresa del usuario, rechazar el cambio y explicar por qué

2. **¿Afecta a la transición?**
   - ¿Se toca `TRANSITION_DURATION`, `PRE_GAME_DELAY`, o la lógica de interpolación?
   - → Sólo proceder si hay una razón clara y verificar que el morphing sigue siendo suave

3. **¿Afecta al responsive?**
   - ¿El nuevo código usa dimensiones hardcoded en lugar de `getLayout()`?
   - ¿Se añaden elementos visuales fuera del canvas sin media queries?
   - → Corregir antes de proponer el cambio

4. **¿El código va en el módulo correcto?**
   - ¿Es lógica de landing page o de una experiencia/juego específico?
   - ¿Debería estar en `main.js`, en `games/X.js`, o en un módulo de infraestructura?
   - → Asignar al módulo correcto según la tabla de responsabilidades

5. **¿Rompería GitHub Pages?**
   - ¿El código resultante está dentro de `/public/`?
   - ¿Las rutas de assets son relativas y correctas?
   - → Verificar antes de confirmar

---

## DETALLES TÉCNICOS DE REFERENCIA

### Rendering pipeline (orden por frame)
1. `ctx.clearRect()` — borrar canvas
2. Dibujar partículas de fondo
3. Según `currentState`: MENU / TRANSITION / PLAYING / GAME_OVER

### Audio (Web Audio API — sin ficheros de audio)
Tipos disponibles: `'beep'`, `'start'`, `'hit'`, `'score'`, `'gameover'`, `'confirm'`
```javascript
playSound('beep')  // Llama a esta función, nunca crear AudioContext inline
```

### High Scores (localStorage)
```javascript
// Formato guardado:
[{ name: "ABC", score: 1500 }, ...]  // máx 5 entradas por modo
```

### Ciclo de juegos
Los juegos se ciclan automáticamente en orden: `pong → arkanoid → invaders → snake → pong → ...`
La variable `gameMode` controla cuál está activo.

### Niveles por juego
- Pong: 1-5 niveles (5 goles por nivel)
- Arkanoid: 1-10 niveles (10 patrones de ladrillos únicos)
- Space Invaders: 1-10 niveles (más filas y más velocidad)
- Snake: sin niveles formales (velocidad escala con longitud)
