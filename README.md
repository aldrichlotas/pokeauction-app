# PokeAuction

A real-time multiplayer draft auction for Pokémon teams. Friends join a room, bid on hidden Pokémon (optionally hinted by a colour palette) with a $25 bankroll each, and leave with a six-Pokémon party they can paste straight into the Pokémon Showdown teambuilder.

## How a draft works

- The host creates a room (four-letter code) and sets the Pokédex range and timer length. Others join with the code, or as spectators.
- Each round puts one Pokémon up for auction. Players raise or pass; the round ends when the timer runs out or everyone else has passed.
- Bids in the last 5 seconds reset the clock to 5 seconds, so nobody wins by sniping.
- The server owns the timer, bids and balances, so a client can't change the clock or overspend.
- At the end, a summary shows every roster with one-click Showdown export and a rematch option.

## Stack

| Part | Tech |
| --- | --- |
| Client | React 19, TypeScript, Vite |
| Server | Node.js, Express 5, Socket.IO, TypeScript |
| Data | [PokéAPI](https://pokeapi.co) for species, sprites and typings |

The original design notes are in `PokeAuction PRD and Implementation Plan.md`.

## Run locally

```bash
cd server && npm install && npm run dev      # http://localhost:3001
cd client && npm install && npm run dev      # http://localhost:5173
```

Set `VITE_BACKEND_URL` in the client and `PORT` on the server to deploy them separately.

Pokémon and its names are trademarks of Nintendo, Game Freak and The Pokémon Company. This is an unofficial fan project, not affiliated with them.
