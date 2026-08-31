import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { ChatBox } from './ChatBox';

export const Lobby = ({ 
  room, 
  socket,
  playerId,
  onJoin,
  onLeave,
  volumeNode,
  profileBadge
}: { 
  room: any; 
  socket: Socket;
  playerId: string;
  onJoin: (roomId: string, name: string) => void;
  onLeave: () => void;
  volumeNode?: React.ReactNode;
  profileBadge?: React.ReactNode;
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');

  const handleCreate = () => {
    if (!playerName) return;
    localStorage.setItem('poke_auction_name', playerName);
    socket.emit('create_room', { playerName, playerId }, (response: any) => {
      localStorage.setItem('poke_auction_room_id', response.roomId);
      onJoin(response.roomId, playerName);
    });
  };

  const handleJoin = () => {
    if (!playerName || !roomIdInput) return;
    localStorage.setItem('poke_auction_name', playerName);
    socket.emit('join_room', { roomId: roomIdInput.toUpperCase(), playerName, playerId }, (response: any) => {
      if (response.success) {
        localStorage.setItem('poke_auction_room_id', roomIdInput.toUpperCase());
        onJoin(roomIdInput.toUpperCase(), playerName);
      } else {
        alert(response.error);
      }
    });
  };

  const handleStart = () => {
    if (room && room.players[playerId]?.isHost) {
      import('../utils/audio').then(m => m.audio.playStartGameSound());
      socket.emit('start_draft', room.id);
    }
  };

  if (room) {
    return (
      <div className="lobby-container animate-fade-in" style={{ display: 'flex', gap: '2rem', maxWidth: '1200px', margin: '0 auto', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="glass-panel lobby-card" style={{ width: '100%' }}>
            <h1>Room: {room.id}</h1>
            <div style={{ textAlign: 'left', width: '100%' }}>
              <h3>Players ({Object.keys(room.players).length})</h3>
              <ul style={{ listStyle: 'none', padding: '1rem 0' }}>
                {Object.values(room.players).map((p: any) => {
                  return (
                    <li key={p.id} style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{p.name} {p.isHost ? '(Host)' : ''}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
            {room.players[playerId]?.isHost ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={handleStart}>
                  Start Draft
                </button>
                <button className="btn btn-outline" onClick={onLeave}>
                  Leave Room
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p>Waiting for host to start...</p>
                <button className="btn btn-outline" onClick={onLeave}>
                  Leave Room
                </button>
              </div>
            )}
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-start' }}>
            {volumeNode}
            {profileBadge}
          </div>
        </div>
        
        <div style={{ width: '350px' }}>
          <ChatBox room={room} socket={socket} playerId={playerId} />
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container animate-fade-in">
      <div className="glass-panel lobby-card">
        <h1>PokéDraft</h1>
        
        <input 
          type="text" 
          className="input-field" 
          placeholder="Enter your name" 
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate}>
            Create Room
          </button>
        </div>

        <div style={{ margin: '1rem 0', position: 'relative' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.2)' }} />
          <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--card-bg)', padding: '0 10px', color: 'var(--text-secondary)' }}>OR</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Room Code" 
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            style={{ flex: 2 }}
          />
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={handleJoin}>
            Join
          </button>
        </div>
      </div>
      <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'center' }}>
        {volumeNode}
        {profileBadge}
      </div>
    </div>
  );
};
