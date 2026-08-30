## **Product Requirements Document (PRD)**

**Product Name:** PokéDraft Auction (Working Title)  
**Objective:** Provide a synchronized, real-time blind-bidding web application for drafting Pokémon teams, with direct export support for Pokémon Showdown.

### **Core Mechanics & Rules Engine**

* **Starting Bankroll:** $25 per player.  
* **Party Limit:** Max 6 Pokémon per player.  
* **Draft Format:** Sequential English auction with blind identification numbers (e.g., National Pokédex ID or custom ID pool).  
* **Forced Opening Bid:** The assigned turn-player in the rotation automatically posts an opening bid of $1. If a player is broke or already has 6 Pokémon, the opening turn skips to the next eligible player.  
* **Bidding Rules:**  
  * Minimum increment: \+$1 above current highest bid.  
  * Players can only bid up to their remaining balance.  
  * Players with 6 Pokémon cannot bid.  
  * Active players can explicitly **Pass/Fold** for the current round.  
* **Round Resolution:**  
  * **Timer Expiration:** 30-second countdown runs down. The highest bidder wins.  
  * **All-Pass Early End:** If all other active players fold, the current highest bidder wins immediately without waiting for the timer.  
  * The winning Pokémon is revealed with sprite and typing, deducted from the winner's balance, and added to their party.  
* **Draft Completion:** The draft ends when all players have filled their 6-slot party or all remaining players lack sufficient funds to open/continue bidding.  
* **Export:** One-click generation of the standard Pokémon Showdown export text format (Species / Ability / Moves...) for each player.

### **Key User Flows & States**

**1\. Lobby & Setup**

* Host creates a room (generates a 4–6 character room code).  
* Players join, enter display names, and mark "Ready".  
* Host configures rules: Pokémon pool (e.g., Gen 1–9, National Dex, or Smogon Tier subset) and timer duration (default: 30s).  
* Host clicks **Start Draft**.

**2\. Live Bidding Stage**

* Server selects a random Pokémon ID, keeps the species name/sprite hidden from client payloads, and displays only the roll number (e.g., \#39).  
* Current rotation leader automatically posts the $1 opener.  
* Real-time timer counts down.  
* Dynamic actions available to players:  
  * \+1 / \+2 / Custom Bid (disabled if balance is insufficient).  
  * Pass / Fold (removes the player from bidding for the active Pokémon).  
* Real-time sidebar displays every player's current balance, active party count (0/6), and status (Active, Passed, Full, Bankrupt).

**3\. Reveal & Summary Stage**

* Winning player receives the Pokémon.  
* Full-screen reveal modal displays the sprite, typing, and standard abilities.  
* Transition pause (5 seconds) before the next roll opens automatically.

**4\. Export Stage**

* Displays a grid of all finalized rosters.  
* Includes a **Copy Showdown Format** button per player and a **Download All Teams** button.

## **Implementation Plan**

### **Recommended Tech Stack**

| Layer | Technology | Rationale |
| :---- | :---- | :---- |
| **Frontend** | React / Next.js (TypeScript) \+ Tailwind CSS | Rapid UI building, responsive state handling, clean desktop/mobile views. |
| **Backend** | Node.js \+ Express / Fastify | Fast, lightweight event loops ideal for room coordination. |
| **Real-Time Sync** | Socket.io / WebSockets | Low-latency state synchronization, server-authoritative timer, disconnect handling. |
| **Data Source** | PokéAPI / @pkmn/data package | Direct access to sprites, species names, typings, and Showdown text serialization. |
| **Hosting** | Vercel (Frontend) \+ Render / Fly.io (WebSockets backend) | Free/low-cost tiers with WebSocket support. |

### **Step-by-Step Execution Phases**

**Phase 1: Game State Engine & WebSocket Architecture (Backend)**

* Implement an authoritative in-memory room manager (Room, Player, DraftState).  
* Build state machine transitions: LOBBY $\\rightarrow$ BIDDING $\\rightarrow$ REVEAL $\\rightarrow$ DRAFT\_END.  
* Implement server-side timer synchronization (server broadcasts tick or target end-timestamp so clients cannot manipulate time).  
* Enforce anti-cheat/blind integrity: Ensure the backend sends only { rollId: 39 } to clients during bidding, holding { name: "Jigglypuff", spriteUrl: "..." } until the round concludes.

**Phase 2: UI & Real-Time Client Integration (Frontend)**

* Build the responsive arena layout:  
  * **Center Stage:** Big mystery card with number \#X, current highest bidder name, current high bid, and circular timer bar.  
  * **Action Bar:** Fold button, quick-bid increment buttons (+$1, \+$2, \+$5, Max), custom numeric input.  
  * **Roster Drawer:** Grid showing each player's 6 party slots (filled with miniature sprites or empty outline circles) and bankroll balance.  
* Bind Socket.io events: room:update, bid:placed, player:passed, round:resolved, draft:complete.

**Phase 3: Data Pipeline & Pokémon Showdown Formatter**

* Integrate PokéAPI / Showdown data to map numeric IDs to legal species.  
* Implement Showdown format generator:

Plaintext  
SpeciesName  
Ability: (Default Ability)  
EVs: 252 HP / 252 Atk / 4 SpD  
Serious Nature  
\- Tackle

*(Provides standard placeholders ready to import directly into the Showdown Teambuilder).*  
**Phase 4: Edge Cases, Testing & Polishing**

* **Reconnection Handling:** Allow dropped players to reconnect and rejoin active drafts via local storage session tokens.  
* **Auto-Pass when Bankrupt:** Automatically flag broke players as folded.  
* **Sound & Visual Feedback:** Add audio chimes for bids, ticking clock cues at \<5 seconds, and a card-flip animation upon reveal.

Would you like to start with the **Node.js/Socket.io state machine boilerplate** or the **frontend drafting interface layout** first?