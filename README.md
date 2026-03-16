# Nim Game

A web-based implementation of the classic Nim strategy game built with Node.js, Express, and vanilla JavaScript.

## What is Nim?

Nim is a mathematical strategy game where two players take turns removing stones from heaps. On each turn you pick one heap and remove at least one stone from it. The twist — whoever takes the **last stone loses** (misere variant).

## Features

- **Player vs Player** — play locally against a friend
- **Player vs AI** — three difficulty levels (easy, medium, hard)
- **Undo & Hints** — undo your last move or get a strategy hint based on nim-sum
- **Turn Timer** — optional 30-second timer per turn
- **Stats Tracking** — win/loss records saved to SQLite, viewable on the stats page
- **Interactive Tutorial** — learn the rules and XOR strategy step by step
- **Sound & Effects** — chiptune sounds, particle effects, and confetti on victory

## Tech Stack

- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** HTML, CSS, vanilla JavaScript (no frameworks)
- **Testing:** Node.js built-in test runner

## How to Run

```bash
npm install
node server.js
```

Then open http://localhost:3000 in your browser.

## Running Tests

```bash
npm test
```

## Project Structure

```
nim-game/
  server.js          - Express server and API routes
  game-logic.js      - NimGame class (rules, moves, undo)
  ai-engine.js       - AI strategy using nim-sum (XOR)
  database.js        - SQLite schema and queries
  public/
    index.html       - Main menu
    game.html        - Game board
    tutorial.html    - Interactive tutorial
    stats.html       - Statistics page
    css/style.css    - All styling
    js/
      game.js        - Game UI logic
      menu.js        - Menu interactions
      tutorial.js    - Tutorial steps
      stats.js       - Stats display
      sounds.js      - Web Audio sound effects
      particles.js   - Background particles
  test/
    game-logic.test.js
    ai-engine.test.js
```

## AI Strategy

The AI uses the nim-sum (XOR of all heap sizes) to decide moves:

- **Easy** — mostly random moves, occasionally plays smart
- **Medium** — plays the optimal move ~70% of the time
- **Hard** — always plays the mathematically optimal move using nim-sum, with special handling for the misere endgame

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/game/start` | Start a new game |
| POST | `/api/game/:id/move` | Make a move (AI responds automatically in PvE) |
| POST | `/api/game/:id/undo` | Undo last move |
| GET | `/api/game/:id/hint` | Get a strategy hint |
| GET | `/api/game/:id/state` | Get current game state |
| GET | `/api/stats` | Get win/loss statistics |
| POST | `/api/stats/reset` | Clear all stats |
