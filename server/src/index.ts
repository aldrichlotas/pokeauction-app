import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './managers/RoomManager';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager(io);
const socketToPlayerId = new Map<string, string>();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create_room', (data, callback) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const { playerName, playerId } = data;
    socketToPlayerId.set(socket.id, playerId);
    const room = roomManager.createRoom(roomId, playerId, playerName);
    socket.join(roomId);
    io.to(roomId).emit('room_update', room);
    callback({ roomId });
  });

  socket.on('join_room', (data, callback) => {
    const { roomId, playerName, playerId } = data;
    socketToPlayerId.set(socket.id, playerId);
    const room = roomManager.joinRoom(roomId, playerId, playerName);
    if (room) {
      socket.join(roomId);
      io.to(roomId).emit('room_update', room);
      callback({ success: true, room });
    } else {
      callback({ success: false, error: 'Room not found' });
    }
  });

  socket.on('disconnect', () => {
    const playerId = socketToPlayerId.get(socket.id);
    if (playerId) {
      roomManager.handleDisconnect(playerId);
      socketToPlayerId.delete(socket.id);
    }
  });
  
  // Game Actions
  socket.on('start_draft', (roomId) => {
    roomManager.startDraft(roomId);
  });
  
  socket.on('place_bid', ({ roomId, amount }) => {
    const playerId = socketToPlayerId.get(socket.id);
    if (playerId) roomManager.placeBid(roomId, playerId, amount);
  });
  
  socket.on('pass_bid', ({ roomId }) => {
    const playerId = socketToPlayerId.get(socket.id);
    if (playerId) roomManager.passBid(roomId, playerId);
  });

  socket.on('play_again', ({ roomId }) => {
    const playerId = socketToPlayerId.get(socket.id);
    if (playerId) roomManager.togglePlayAgain(roomId, playerId);
  });

  socket.on('leave_room', ({ roomId }) => {
    const playerId = socketToPlayerId.get(socket.id);
    if (playerId) {
      const room = roomManager['rooms'].get(roomId);
      if (room) {
        if (room.state === 'LOBBY') {
          delete room.players[playerId];
          socket.leave(roomId);
          
          if (Object.keys(room.players).length === 0) {
            roomManager['rooms'].delete(roomId);
          } else {
            const remainingPlayers = Object.values(room.players);
            if (!remainingPlayers.some((p: any) => p.isHost)) {
              (remainingPlayers[0] as any).isHost = true;
            }
            io.to(roomId).emit('room_update', room);
          }
        } else {
          // Leave the socket room immediately so this player doesn't receive the room_update broadcast
          socket.leave(roomId);
          
          // If they leave during or after the game, mark them permanently bankrupt and offline
          // This avoids deleting the object which could break turn-order loops
          if (room.players[playerId]) {
            room.players[playerId].isOnline = false;
            room.players[playerId].status = 'bankrupt';
            // Also pass them if they were active
            if (room.currentDraft?.highestBidderId !== playerId) {
               // they are not highest bidder, so it's safe to early end if they were the last active
               roomManager['checkEarlyEnd'](roomId);
            }
            
            if (room.state === 'DRAFT_END') {
               roomManager.checkPlayAgainReady(roomId);
            }
            
            io.to(roomId).emit('room_update', room);
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
