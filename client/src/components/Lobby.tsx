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
  const [pokemonType, setPokemonType] = useState<string[]>(['Any']);
  const [generationFilter, setGenerationFilter] = useState<string[]>(['All']);
  const [colorPaletteMode, setColorPaletteMode] = useState(false);

  const handleGenToggle = (gen: string) => {
    if (gen === 'All') {
      setGenerationFilter(['All']);
      return;
    }
    let newFilters = generationFilter.filter(g => g !== 'All');
    if (newFilters.includes(gen)) {
      newFilters = newFilters.filter(g => g !== gen);
    } else {
      newFilters.push(gen);
    }
    if (newFilters.length === 0) newFilters = ['All'];
    setGenerationFilter(newFilters);
  };

  const handleTypeToggle = (type: string) => {
    if (type === 'Any') {
      setPokemonType(['Any']);
      return;
    }
    let newTypes = pokemonType.filter(t => t !== 'Any');
    if (newTypes.includes(type)) {
      newTypes = newTypes.filter(t => t !== type);
    } else {
      newTypes.push(type);
    }
    if (newTypes.length === 0) newTypes = ['Any'];
    setPokemonType(newTypes);
  };

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
          pokemonType: pokemonType,
          generationFilter: generationFilter,
          colorPaletteMode
        }
      });
    }
  };

  if (room && room.state === 'LOBBY') {
    return (
      <div className="lobby-layout animate-fade-in">
        <div className="glass-panel lobby-card dashboard">
          <div className="lobby-split-view">
            
            {/* Left Column: Player Roster */}
            <div>
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
            </div>

            {/* Right Column: Settings / Status */}
            <div>
              {room.players[playerId]?.isHost ? (
            <div className="settings-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <h4 style={{ color: 'var(--primary-color)', borderBottom: '1px solid rgba(255, 0, 127, 0.3)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Draft Pool Filters</h4>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="settings-label">Generations</label>
                <div className="pill-scroll-wrapper">
                  <div className="pill-container">
                    <div style={{ width: '100%' }}>
                      <input type="checkbox" id="gen-All" className="pill-checkbox primary" checked={generationFilter.includes('All')} onChange={() => handleGenToggle('All')} />
                      <label htmlFor="gen-All" className="pill-label master-pill" style={{ display: 'block' }}>All (1-1025)</label>
                    </div>
                    {['Gen 1', 'Gen 2', 'Gen 3', 'Gen 4', 'Gen 5', 'Gen 6', 'Gen 7', 'Gen 8', 'Gen 9'].map(gen => (
                      <div key={gen}>
                        <input type="checkbox" id={`gen-${gen}`} className="pill-checkbox primary" checked={generationFilter.includes(gen)} onChange={() => handleGenToggle(gen)} />
                        <label htmlFor={`gen-${gen}`} className="pill-label">{gen}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label className="settings-label">Type Pool</label>
                <div className="pill-scroll-wrapper">
                  <div className="pill-container">
                    <div style={{ width: '100%' }}>
                      <input type="checkbox" id="type-Any" className="pill-checkbox" checked={pokemonType.includes('Any')} onChange={() => handleTypeToggle('Any')} />
                      <label htmlFor="type-Any" className="pill-label master-pill" style={{ display: 'block' }}>Any Type</label>
                    </div>
                    {['Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'].map(t => (
                      <div key={t}>
                        <input type="checkbox" id={`type-${t}`} className="pill-checkbox" checked={pokemonType.includes(t)} onChange={() => handleTypeToggle(t)} />
                        <label htmlFor={`type-${t}`} className="pill-label">{t}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--accent-color)', borderBottom: '1px solid rgba(0, 240, 255, 0.3)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>Game Rules</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="settings-label" style={{ marginBottom: 0 }}>Timer</label>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{timerDuration}s</span>
                </div>
                <input type="range" min="5" max="120" step="5" className="input-field" style={{ padding: 0, height: '4px', background: 'rgba(255,255,255,0.2)' }} value={timerDuration} onChange={e => setTimerDuration(parseInt(e.target.value) || 30)} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                <label className="checkbox-wrapper" style={{ marginTop: '0.5rem' }}>
                  <input type="checkbox" checked={colorPaletteMode} onChange={e => setColorPaletteMode(e.target.checked)} />
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Color Palette Mode</span>
                </label>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '2.2rem', marginTop: '-0.2rem' }}>Draft Pokémon based entirely on their color scheme!</span>
              </div>

                <div style={{ gridColumn: 'span 2', marginTop: '1.5rem' }}>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '2px' }} onClick={handleStart}>
                    Start Draft Engine
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="animate-pulse" style={{ width: '50px', height: '50px', border: '4px solid var(--accent-color)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--accent-color)', fontWeight: 600, fontSize: '1.1rem' }}>Waiting for Host to configure settings and start...</p>
              </div>
            )}
            </div>
          </div>
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
