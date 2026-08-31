import { useState } from 'react';
import { Socket } from 'socket.io-client';

export const Lobby = ({ 
  room, 
  socket,
  playerId,
  onJoin,
}: { 
  room: any; 
  socket: Socket;
  playerId: string;
  onJoin: (roomId: string, name: string) => void;
  onLeave: () => void;
}) => {
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');

  // Host Settings
  const [timerDuration, setTimerDuration] = useState(30);
  const [pokemonType, setPokemonType] = useState('Any');
  const [generationFilter, setGenerationFilter] = useState('All');
  const [colorPaletteMode, setColorPaletteMode] = useState(false);

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
      socket.emit('start_draft', {
        roomId: room.id,
        settings: {
          timerDuration,
          pokemonType: pokemonType === 'Any' ? null : pokemonType,
          generationFilter,
          colorPaletteMode
        }
      });
    }
  };

  if (room && room.state === 'LOBBY') {
    return (
      <div className="lobby-layout animate-fade-in">
        <div className="glass-panel lobby-card">
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: 'var(--accent-color)', letterSpacing: '2px', textTransform: 'uppercase' }}>Waiting for Players</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Room Code: <strong style={{ color: 'white', fontSize: '1.2rem' }}>{room.id}</strong></p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
            {Object.values(room.players).map((p: any) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.isOnline ? 'var(--success-color)' : 'var(--danger-color)', boxShadow: `0 0 10px ${p.isOnline ? 'var(--success-color)' : 'var(--danger-color)'}` }} />
                <span style={{ fontWeight: 600, flex: 1, fontSize: '1.1rem' }}>{p.name} {p.isHost && <span style={{ color: 'var(--warning-color)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>(HOST)</span>}</span>
              </div>
            ))}
          </div>

          {room.players[playerId]?.isHost ? (
            <div className="settings-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ color: 'var(--primary-color)', borderBottom: '1px solid rgba(255, 0, 127, 0.3)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Host Settings</h4>
              </div>
              
              <div>
                <label className="settings-label">Generation</label>
                <select className="input-field" value={generationFilter} onChange={e => setGenerationFilter(e.target.value)}>
                  <option value="All">All (1-1025)</option>
                  <option value="Gen 1">Gen 1 (Kanto)</option>
                  <option value="Gen 2">Gen 2 (Johto)</option>
                  <option value="Gen 3">Gen 3 (Hoenn)</option>
                  <option value="Gen 4">Gen 4 (Sinnoh)</option>
                  <option value="Gen 5">Gen 5 (Unova)</option>
                  <option value="Gen 6">Gen 6 (Kalos)</option>
                  <option value="Gen 7">Gen 7 (Alola)</option>
                  <option value="Gen 8">Gen 8 (Galar)</option>
                  <option value="Gen 9">Gen 9 (Paldea)</option>
                </select>
              </div>
              
              <div>
                <label className="settings-label">Type Pool</label>
                <select className="input-field" value={pokemonType} onChange={e => setPokemonType(e.target.value)}>
                  <option value="Any">Any Type</option>
                  {['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="settings-label">Timer (sec)</label>
                <input type="number" min="5" max="120" className="input-field" value={timerDuration} onChange={e => setTimerDuration(parseInt(e.target.value) || 30)} />
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label className="checkbox-wrapper">
                  <input type="checkbox" checked={colorPaletteMode} onChange={e => setColorPaletteMode(e.target.checked)} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Color Palette Mode</span>
                </label>
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={handleStart}>
                  Start Draft Engine
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="animate-pulse" style={{ width: '50px', height: '50px', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--accent-color)', fontWeight: 600, fontSize: '1.1rem' }}>Waiting for Host to configure settings and start...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-layout animate-fade-in">
      <div className="glass-panel lobby-card" style={{ maxWidth: '450px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '0.5rem' }}>PokéDraft</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>The Ultimate Auction Experience</p>
        
        <input 
          type="text" 
          className="input-field" 
          placeholder="Enter your Trainer Name" 
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: '1rem', fontSize: '1.1rem', textAlign: 'center' }}
        />
        
        <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', marginTop: '1rem' }} onClick={handleCreate}>
          Create New Room
        </button>

        <div style={{ margin: '1.5rem 0', position: 'relative', textAlign: 'center' }}>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />
          <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-color)', padding: '0 15px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>OR JOIN EXISTING</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Room Code" 
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            style={{ flex: 1, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }}
          />
          <button className="btn btn-outline" style={{ padding: '0 2rem' }} onClick={handleJoin}>
            Join
          </button>
        </div>
      </div>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
