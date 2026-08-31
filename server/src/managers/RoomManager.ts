import { Server } from 'socket.io';
import { Room, Player, DraftState, Match } from '../types';
import { getFilteredPokemonIds, getPokemonColorPalette } from '../utils/pokemonData';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private playerCooldowns: Map<string, number> = new Map();

  constructor(io: Server) {
    this.io = io;
  }

  private broadcastRoomUpdate(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const safeRoom: Room = JSON.parse(JSON.stringify(room));
    if (safeRoom.settings.colorPaletteMode && safeRoom.state === 'BIDDING' && safeRoom.currentDraft) {
      safeRoom.currentDraft.pokemonId = null;
    }
    
    this.io.to(roomId).emit('room_update', safeRoom);
  }

  createRoom(roomId: string, hostId: string, hostName: string): Room {
    const newRoom: Room = {
      id: roomId,
      players: {
        [hostId]: {
          id: hostId,
          name: hostName,
          balance: 25,
          party: [],
          status: 'active',
          isHost: true,
          ready: true,
          isOnline: true,
        },
      },
      state: 'LOBBY',
      settings: {
        timerDuration: 30,
        dexStart: 1,
        dexEnd: 1025,
        pokemonType: null,
        colorPaletteMode: false,
        generationFilter: 'All',
      },
      currentDraft: null,
      bracket: null,
      activeVote: null,
      chatMessages: [],
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  joinRoom(roomId: string, playerId: string, playerName: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players[playerId]) {
       room.players[playerId].isOnline = true;
       return room;
    }

    if (room.state !== 'LOBBY') return null;

    let finalName = playerName.trim();
    let counter = 1;
    const existingNames = Object.values(room.players).map(p => p.name.toLowerCase());
    
    while (existingNames.includes(finalName.toLowerCase())) {
      finalName = `${playerName.trim()} (${counter})`;
      counter++;
    }

    room.players[playerId] = {
      id: playerId,
      name: finalName,
      balance: 25,
      party: [],
      status: 'active',
      isHost: false,
      ready: true,
      isOnline: true,
    };
    return room;
  }

  handleDisconnect(playerId: string) {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players[playerId]) {
        room.players[playerId].isOnline = false;
        
        if (room.state === 'LOBBY') {
          // Keep them in lobby but mark offline, or remove if host? 
          // Let's just leave them offline.
        } else if (room.state === 'DRAFT_END') {
          // If someone disconnects at the end screen, check if the remaining players are ready to play again
          this.checkPlayAgainReady(roomId);
        } else {
          // If in game, auto pass them unless they are the highest bidder
          if (room.currentDraft?.highestBidderId !== playerId && room.players[playerId].status === 'active') {
            room.players[playerId].status = 'passed';
            this.checkEarlyEnd(roomId);
          }
        }
        
        this.broadcastRoomUpdate(roomId);
      }
    }
  }

  async startDraft(roomId: string, settings?: Partial<Room['settings']>) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'LOBBY') return;
    
    if (settings) {
      room.settings = { ...room.settings, ...settings };
    }
    
    room.state = 'BIDDING';
    await this.startNewRound(roomId);
  }

  private async startNewRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if draft is over (all players full or bankrupt)
    const activePlayers = Object.values(room.players).filter(
      (p) => p.party.length < 6 && p.balance > 0
    );

    if (activePlayers.length === 0) {
      room.state = 'DRAFT_END';
      this.generateBracket(roomId);
      this.broadcastRoomUpdate(roomId);
      this.io.to(roomId).emit('draft_complete');
      return;
    }

    if (activePlayers.length === 1) {
      const p = activePlayers[0];
      const emptySlots = 6 - p.party.length;
      const fillCount = Math.min(emptySlots, p.balance); // $1 per pokemon
      
      const wonPokemonIds: number[] = [];
      const pool = await getFilteredPokemonIds(room.settings.pokemonType, room.settings.generationFilter);
      
      for (let i = 0; i < fillCount; i++) {
        const randomPokemonId = pool[Math.floor(Math.random() * pool.length)];
        wonPokemonIds.push(randomPokemonId);
      }
      
      if (fillCount > 0) {
        room.state = 'AUTOFILL_ROULETTE';
        this.broadcastRoomUpdate(roomId);
        this.io.to(roomId).emit('autofill_start', { targetPlayerId: p.id, wonPokemonIds });
        
        // Wait for roulette animation to finish on client before concluding.
        // The client casino slots spin simultaneously but lock sequentially:
        // Slot i locks at 1.5s + (i * 1.0s).
        // Total client animation time = 1.5s + (fillCount - 1) * 1.0s.
        // We add an extra 3 seconds of padding at the end so players can enjoy the jackpot chime!
        const animationTime = 1500 + ((fillCount - 1) * 1000) + 3000;
        
        setTimeout(() => {
           wonPokemonIds.forEach(id => {
             p.party.push(id);
             p.balance -= 1;
           });
           const r = this.rooms.get(roomId);
           if (r) {
             r.state = 'DRAFT_END';
             this.generateBracket(roomId);
             this.broadcastRoomUpdate(roomId);
             this.io.to(roomId).emit('draft_complete');
           }
        }, animationTime);
        return;
      } else {
        room.state = 'DRAFT_END';
        this.generateBracket(roomId);
        this.broadcastRoomUpdate(roomId);
        this.io.to(roomId).emit('draft_complete');
        return;
      }
    }

    // Reset statuses for active players
    Object.values(room.players).forEach(p => {
      if (p.party.length >= 6) p.status = 'full';
      else if (p.balance <= 0) p.status = 'bankrupt';
      else p.status = 'active';
    });

    const pool = await getFilteredPokemonIds(room.settings.pokemonType, room.settings.generationFilter);
    const randomPokemonId = pool[Math.floor(Math.random() * pool.length)];

    const roundNumber = room.currentDraft ? room.currentDraft.roundNumber + 1 : 1;
    let turnRotationIndex = room.currentDraft ? room.currentDraft.turnRotationIndex + 1 : 0;
    
    // Find the next eligible opener
    const playerIds = Object.keys(room.players);
    let openerId = null;
    for (let i = 0; i < playerIds.length; i++) {
      const idx = (turnRotationIndex + i) % playerIds.length;
      const p = room.players[playerIds[idx]];
      if (p.status === 'active' && p.balance >= 1) {
        openerId = p.id;
        turnRotationIndex = idx;
        break;
      }
    }

    if (!openerId) {
       room.state = 'DRAFT_END';
       this.generateBracket(roomId);
       this.broadcastRoomUpdate(roomId);
       this.io.to(roomId).emit('draft_complete');
       return;
    }

    let colorPalette: string[] | undefined;
    if (room.settings.colorPaletteMode) {
      colorPalette = await getPokemonColorPalette(randomPokemonId);
    }

    room.currentDraft = {
      pokemonId: randomPokemonId,
      highestBidderId: openerId,
      currentBid: 1, // Forced $1 opening bid
      timerEndTimestamp: Date.now() + room.settings.timerDuration * 1000,
      roundNumber,
      turnRotationIndex,
      colorPalette,
    };

    room.state = 'BIDDING';
    this.broadcastRoomUpdate(roomId);
    this.startTimer(roomId);
  }

  private startTimer(roomId: string) {
    if (this.timers.has(roomId)) {
      clearTimeout(this.timers.get(roomId)!);
    }
    const room = this.rooms.get(roomId);
    if (!room) return;

    const timeout = setTimeout(() => {
      this.resolveRound(roomId);
    }, room.settings.timerDuration * 1000);

    this.timers.set(roomId, timeout);
  }

  placeBid(roomId: string, playerId: string, amount: number, socketId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'BIDDING' || !room.currentDraft) return;

    const player = room.players[playerId];
    if (!player || player.status !== 'active') return;

    // 1. Bid Cooldown
    const now = Date.now();
    const lastBidTime = this.playerCooldowns.get(playerId) || 0;
    if (now - lastBidTime < 1000) {
      this.io.to(socketId).emit('bid_rejected', { reason: 'Bidding too fast! Please wait a moment.' });
      return;
    }

    // 2. Simultaneous Bid Resolution / Validation
    if (amount <= room.currentDraft.currentBid) {
      this.io.to(socketId).emit('bid_rejected', { reason: 'Bid rejected: Someone already bid higher!' });
      return;
    }

    if (amount > player.balance) {
      this.io.to(socketId).emit('bid_rejected', { reason: 'Bid rejected: Insufficient funds!' });
      return;
    }

    this.playerCooldowns.set(playerId, now);

    room.currentDraft.currentBid = amount;
    room.currentDraft.highestBidderId = playerId;
    
    // 3. Soft Reset Timer (Anti-snipe)
    if (room.currentDraft.timerEndTimestamp) {
      const timeRemaining = room.currentDraft.timerEndTimestamp - now;
      if (timeRemaining > 0 && timeRemaining < 5000) {
        room.currentDraft.timerEndTimestamp = now + 5000; // Reset to 5 seconds
        
        if (this.timers.has(roomId)) {
          clearTimeout(this.timers.get(roomId)!);
        }
        const timeout = setTimeout(() => {
          this.resolveRound(roomId);
        }, 5000);
        this.timers.set(roomId, timeout);
      }
    }
    
    // Auto-fold players who cannot afford to outbid the new current bid
    let playersPassed = false;
    Object.values(room.players).forEach(p => {
      if (p.status === 'active' && p.id !== playerId) {
        if (p.balance <= amount) {
          p.status = 'passed';
          playersPassed = true;
        }
      }
    });

    this.broadcastRoomUpdate(roomId);
    
    if (playersPassed) {
      this.checkEarlyEnd(roomId);
    }
  }

  passBid(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'BIDDING' || !room.currentDraft) return;

    const player = room.players[playerId];
    if (!player || player.status !== 'active') return;

    // You cannot pass if you are the current highest bidder
    if (room.currentDraft.highestBidderId === playerId) return;

    player.status = 'passed';
    this.broadcastRoomUpdate(roomId);
    
    this.checkEarlyEnd(roomId);
  }

  private checkEarlyEnd(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'BIDDING') return;

    const activePlayers = Object.values(room.players).filter(p => p.status === 'active');
    
    // If only one active player remains (the highest bidder), end early
    if (activePlayers.length <= 1) {
      if (this.timers.has(roomId)) {
        clearTimeout(this.timers.get(roomId)!);
      }
      this.resolveRound(roomId);
    }
  }

  private resolveRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'BIDDING' || !room.currentDraft) return;

    const winnerId = room.currentDraft.highestBidderId;
    if (winnerId && room.players[winnerId] && room.currentDraft.pokemonId) {
       room.players[winnerId].balance -= room.currentDraft.currentBid;
       room.players[winnerId].party.push(room.currentDraft.pokemonId);
    }

    room.state = 'REVEAL';
    this.broadcastRoomUpdate(roomId);
    
    // Send full pokemon details for reveal payload
    this.io.to(roomId).emit('round_resolved', {
       winnerId,
       pokemonId: room.currentDraft.pokemonId,
       winningBid: room.currentDraft.currentBid
    });

    // 5-second transition pause
    setTimeout(async () => {
       await this.startNewRound(roomId);
    }, 5000);
  }

  togglePlayAgain(roomId: string, playerId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'DRAFT_END') return;

    const player = room.players[playerId];
    if (!player) return;

    player.wantsToPlayAgain = !player.wantsToPlayAgain;
    this.checkPlayAgainReady(roomId);
  }

  checkPlayAgainReady(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'DRAFT_END') return;

    const onlinePlayers = Object.values(room.players).filter(p => p.isOnline);
    if (onlinePlayers.length === 0) return;

    const allReady = onlinePlayers.every(p => p.wantsToPlayAgain);

    if (allReady) {
      // Reset room back to lobby state
      room.state = 'LOBBY';
      room.currentDraft = null;
      room.bracket = null;
      
      let needsNewHost = false;

      Object.keys(room.players).forEach(pid => {
        const p = room.players[pid];
        if (!p.isOnline) {
          if (p.isHost) needsNewHost = true;
          delete room.players[pid];
        } else {
          p.balance = 25;
          p.party = [];
          p.status = 'active';
          p.wantsToPlayAgain = false;
          p.ready = false; // Force them to explicitly ready up again in the lobby
        }
      });

      if (needsNewHost) {
        const firstOnline = Object.values(room.players).find(p => p.isOnline);
        if (firstOnline) {
           firstOnline.isHost = true;
        }
      }
      
      this.broadcastRoomUpdate(roomId);
    } else {
      // Broadcast updated play again statuses
      this.broadcastRoomUpdate(roomId);
    }
  }

  private generateBracket(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const players = Object.values(room.players).filter(p => p.party.length > 0);
    if (players.length < 2) {
      room.bracket = null;
      return;
    }

    // Shuffle players
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const N = shuffled.length;
    const numRounds = Math.ceil(Math.log2(N));
    const bracketSize = Math.pow(2, numRounds);
    
    // Create the full perfect tree first (from finals down to round 1)
    const rounds: Match[][] = [];
    
    for (let r = 0; r < numRounds; r++) {
      rounds.push([]);
      const matchesInRound = Math.pow(2, numRounds - 1 - r);
      for (let m = 0; m < matchesInRound; m++) {
        rounds[r].push({
          id: `r${r}-m${m}`,
          roundIndex: r,
          matchIndex: m,
          player1Id: null,
          player2Id: null,
          winnerId: null,
          nextMatchId: r < numRounds - 1 ? `r${r + 1}-m${Math.floor(m / 2)}` : null
        });
      }
    }

    // Helper function to generate standard tournament seeding
    // Example: size 8 -> [1, 8, 4, 5, 2, 7, 3, 6]
    const getStandardSeeding = (size: number): number[] => {
      if (size === 1) return [1];
      let seeds = [1, 2];
      while (seeds.length < size) {
        const nextSeeds = [];
        const sum = seeds.length * 2 + 1;
        for (let i = 0; i < seeds.length; i++) {
          nextSeeds.push(seeds[i]);
          nextSeeds.push(sum - seeds[i]);
        }
        seeds = nextSeeds;
      }
      return seeds;
    };

    const seeds = getStandardSeeding(bracketSize);
    
    // Distribute players to first round matches based on seeding
    // seeds array determines the index of the player in the shuffled array (seed 1 = index 0)
    for (let m = 0; m < rounds[0].length; m++) {
      const p1SeedIndex = seeds[m * 2] - 1;
      const p2SeedIndex = seeds[m * 2 + 1] - 1;
      
      rounds[0][m].player1Id = p1SeedIndex < N ? shuffled[p1SeedIndex].id : null;
      rounds[0][m].player2Id = p2SeedIndex < N ? shuffled[p2SeedIndex].id : null;
    }

    // Process Byes
    for (let i = 0; i < rounds[0].length; i++) {
      const match = rounds[0][i];
      if (match.player1Id && !match.player2Id) {
        match.winnerId = match.player1Id; 
        const nextMatch = rounds[1].find(m => m.id === match.nextMatchId);
        if (nextMatch) {
          if (match.matchIndex % 2 === 0) nextMatch.player1Id = match.winnerId;
          else nextMatch.player2Id = match.winnerId;
        }
      } else if (!match.player1Id && match.player2Id) {
         match.winnerId = match.player2Id;
         const nextMatch = rounds[1].find(m => m.id === match.nextMatchId);
         if (nextMatch) {
           if (match.matchIndex % 2 === 0) nextMatch.player1Id = match.winnerId;
           else nextMatch.player2Id = match.winnerId;
         }
      }
    }

    room.bracket = rounds;
  }

  updateBracket(roomId: string, playerId: string, matchId: string, winnerId: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.bracket) return;
    
    const player = room.players[playerId];
    if (!player || !player.isHost) return; 
    
    // Find the match
    let targetMatch = null;
    let targetR = -1;
    for (let r = 0; r < room.bracket.length; r++) {
      for (let m = 0; m < room.bracket[r].length; m++) {
        if (room.bracket[r][m].id === matchId) {
          targetMatch = room.bracket[r][m];
          targetR = r;
          break;
        }
      }
    }
    
    if (!targetMatch) return;
    
    // Don't allow advancing if both players aren't set
    if (!targetMatch.player1Id || !targetMatch.player2Id) return;

    // If changing the winner, we must clear this player from future rounds
    targetMatch.winnerId = winnerId;
    
    // Propagate forward using Cascade Undo system
    let currentMatch = targetMatch;
    let r = targetR;
    while (currentMatch.nextMatchId) {
       const nextRound = room.bracket[r + 1];
       const nextMatch = nextRound.find(x => x.id === currentMatch.nextMatchId);
       if (!nextMatch) break;
       
       if (currentMatch.matchIndex % 2 === 0) {
         nextMatch.player1Id = currentMatch.winnerId;
       } else {
         nextMatch.player2Id = currentMatch.winnerId;
       }
       
       // If the next match ALREADY had a winner, and we just changed one of the participants,
       // we invalidate the winner of the next match to be safe.
       nextMatch.winnerId = null; 
       
       currentMatch = nextMatch;
       r++;
    }
    
     this.broadcastRoomUpdate(roomId);
  }

  sendChat(roomId: string, senderId: string, text: string) {
    const room = this.rooms.get(roomId);
    if (!room || !room.players[senderId]) return;

    if (text.trim().toLowerCase().startsWith('/votekick ')) {
      const targetName = text.trim().substring(10).trim().toLowerCase();
      
      if (room.activeVote) {
        this.sendSystemMessage(roomId, `A vote is already in progress against ${room.players[room.activeVote.targetId]?.name}.`);
        return;
      }
      
      const targetPlayer = Object.values(room.players).find(p => p.name.toLowerCase() === targetName);
      if (!targetPlayer) {
        this.sendSystemMessage(roomId, `Could not find a player named "${targetName}".`);
        return;
      }

      if (targetPlayer.id === senderId) {
        this.sendSystemMessage(roomId, `You cannot vote to kick yourself!`);
        return;
      }

      // Start the vote
      room.activeVote = {
        targetId: targetPlayer.id,
        callerId: senderId,
        yesVotes: [senderId], // Caller automatically votes yes
        noVotes: [],
        expiresAt: Date.now() + 30000,
      };

      this.sendSystemMessage(roomId, `${room.players[senderId].name} initiated a vote to kick ${targetPlayer.name}. Type /yes or /no in chat to vote.`);
      
      // Auto-fail vote if time expires
      setTimeout(() => {
        const r = this.rooms.get(roomId);
        if (r && r.activeVote && r.activeVote.targetId === targetPlayer.id) {
          r.activeVote = null;
          this.sendSystemMessage(roomId, `Vote to kick ${targetPlayer.name} failed (Timeout).`);
          this.broadcastRoomUpdate(roomId);
        }
      }, 30000);

      this.broadcastRoomUpdate(roomId);
      return; // Do not emit the command text as a chat message
    }

    const normalizedText = text.trim().toLowerCase();
    if (normalizedText === '/yes' || normalizedText === '/no') {
      if (room.activeVote) {
        this.castVote(roomId, senderId, normalizedText.replace('/', '') as 'yes' | 'no');
        return;
      }
    }

    const message = {
      id: Math.random().toString(36).substring(2, 9),
      senderId,
      senderName: room.players[senderId].name,
      text,
      timestamp: Date.now(),
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 50) {
      room.chatMessages.shift(); // Keep only last 50
    }

    this.broadcastRoomUpdate(roomId);
  }

  sendSystemMessage(roomId: string, text: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.chatMessages.push({
      id: Math.random().toString(36).substring(2, 9),
      senderId: 'SYSTEM',
      senderName: 'SYSTEM',
      text,
      timestamp: Date.now(),
    });
    this.broadcastRoomUpdate(roomId);
  }

  castVote(roomId: string, voterId: string, vote: 'yes' | 'no') {
    const room = this.rooms.get(roomId);
    if (!room || !room.activeVote || !room.players[voterId]) return;
    
    const active = room.activeVote;
    if (active.targetId === voterId) {
      this.sendSystemMessage(roomId, `The target of the vote cannot vote.`);
      return;
    }
    if (active.yesVotes.includes(voterId) || active.noVotes.includes(voterId)) return; // Already voted

    if (vote === 'yes') active.yesVotes.push(voterId);
    else active.noVotes.push(voterId);

    const onlinePlayers = Object.values(room.players).filter(p => p.isOnline).length;
    const votesNeeded = Math.max(1, Math.floor(onlinePlayers / 2) + 1); // Strict majority
    
    this.sendSystemMessage(roomId, `${room.players[voterId]?.name} voted ${vote}. (${active.yesVotes.length}/${votesNeeded} needed to pass)`);

    if (active.yesVotes.length >= votesNeeded) {
      // Kick them!
      const targetName = room.players[active.targetId]?.name || 'Player';
      this.handleDisconnect(active.targetId); // Clean up if mid-game or pass them
      delete room.players[active.targetId];
      room.activeVote = null;
      this.sendSystemMessage(roomId, `Vote passed! ${targetName} was kicked.`);
    } else if (active.noVotes.length >= votesNeeded) {
      // Failed!
      room.activeVote = null;
      this.sendSystemMessage(roomId, `Vote failed. Not enough players voted yes.`);
    }

    this.broadcastRoomUpdate(roomId);
  }
}
