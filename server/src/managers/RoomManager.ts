import { Server } from 'socket.io';
import { Room, Player, DraftState } from '../types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: Server) {
    this.io = io;
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
      },
      currentDraft: null,
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

    room.players[playerId] = {
      id: playerId,
      name: playerName,
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
        
        this.io.to(roomId).emit('room_update', room);
      }
    }
  }

  startDraft(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'LOBBY') return;
    
    room.state = 'BIDDING';
    this.startNewRound(roomId);
  }

  private startNewRound(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if draft is over (all players full or bankrupt)
    const activePlayers = Object.values(room.players).filter(
      (p) => p.party.length < 6 && p.balance > 0
    );

    if (activePlayers.length === 0) {
      room.state = 'DRAFT_END';
      this.io.to(roomId).emit('room_update', room);
      this.io.to(roomId).emit('draft_complete');
      return;
    }

    if (activePlayers.length === 1) {
      const p = activePlayers[0];
      const emptySlots = 6 - p.party.length;
      const fillCount = Math.min(emptySlots, p.balance); // $1 per pokemon
      
      const wonPokemonIds: number[] = [];
      for (let i = 0; i < fillCount; i++) {
        const randomPokemonId = Math.floor(Math.random() * (room.settings.dexEnd - room.settings.dexStart + 1)) + room.settings.dexStart;
        wonPokemonIds.push(randomPokemonId);
      }
      
      if (fillCount > 0) {
        room.state = 'AUTOFILL_ROULETTE';
        this.io.to(roomId).emit('room_update', room);
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
             this.io.to(roomId).emit('room_update', r);
             this.io.to(roomId).emit('draft_complete');
           }
        }, animationTime);
        return;
      } else {
        room.state = 'DRAFT_END';
        this.io.to(roomId).emit('room_update', room);
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

    const randomPokemonId = Math.floor(Math.random() * (room.settings.dexEnd - room.settings.dexStart + 1)) + room.settings.dexStart;

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
       this.io.to(roomId).emit('room_update', room);
       this.io.to(roomId).emit('draft_complete');
       return;
    }

    room.currentDraft = {
      pokemonId: randomPokemonId,
      highestBidderId: openerId,
      currentBid: 1, // Forced $1 opening bid
      timerEndTimestamp: Date.now() + room.settings.timerDuration * 1000,
      roundNumber,
      turnRotationIndex
    };

    room.state = 'BIDDING';
    this.io.to(roomId).emit('room_update', room);
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

  placeBid(roomId: string, playerId: string, amount: number) {
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'BIDDING' || !room.currentDraft) return;

    const player = room.players[playerId];
    if (!player || player.status !== 'active') return;

    if (amount <= room.currentDraft.currentBid) return;
    if (amount > player.balance) return;

    room.currentDraft.currentBid = amount;
    room.currentDraft.highestBidderId = playerId;
    
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
    
    // Reset timer
    room.currentDraft.timerEndTimestamp = Date.now() + room.settings.timerDuration * 1000;
    this.startTimer(roomId);

    this.io.to(roomId).emit('room_update', room);
    
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
    this.io.to(roomId).emit('room_update', room);
    
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
    this.io.to(roomId).emit('room_update', room);
    
    // Send full pokemon details for reveal payload
    this.io.to(roomId).emit('round_resolved', {
       winnerId,
       pokemonId: room.currentDraft.pokemonId,
       winningBid: room.currentDraft.currentBid
    });

    // 5-second transition pause
    setTimeout(() => {
       this.startNewRound(roomId);
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
      
      Object.values(room.players).forEach(p => {
        p.balance = 25;
        p.party = [];
        p.status = 'active';
        p.wantsToPlayAgain = false;
        p.ready = false; // Force them to explicitly ready up again in the lobby
      });
      
      this.io.to(roomId).emit('room_update', room);
    } else {
      // Broadcast updated play again statuses
      this.io.to(roomId).emit('room_update', room);
    }
  }
}
