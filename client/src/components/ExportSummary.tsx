import React, { useEffect, useState } from 'react';
import { fetchPokemonDetails, generateShowdownText, type PokemonDetails } from '../utils/pokemon';

export const ExportSummary = ({ 
  room,
  socket,
  playerId,
  onLeave
}: { 
  room: any;
  socket: any;
  playerId: string;
  onLeave?: () => void;
}) => {
  const [teamData, setTeamData] = useState<Record<string, PokemonDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const loadTeams = async () => {
      const data: Record<string, PokemonDetails[]> = {};
      
      for (const player of Object.values(room.players) as any[]) {
        if (player.party.length === 0) continue;
        
        try {
          const details = await Promise.all(player.party.map((id: number) => fetchPokemonDetails(id)));
          data[player.id] = details;
        } catch (e) {
          console.error(`Failed to fetch details for player ${player.name}`, e);
        }
      }
      
      setTeamData(data);
      setLoading(false);
    };
    
    loadTeams();
  }, [room.players]);

  const handleCopy = (playerId: string) => {
    import('../utils/audio').then(m => m.audio.playSuccessChime());
    const text = generateShowdownText(teamData[playerId]);
    navigator.clipboard.writeText(text);
    setCopied(playerId);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) {
    return <div className="lobby-container"><h2>Generating Teams...</h2></div>;
  }

  return (
    <div className="container animate-fade-in">
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Draft Complete!</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {(Object.values(room.players) as any[]).map(p => {
          if (!teamData[p.id]) return null;
          
          return (
            <div key={p.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <h2 style={{ display: 'flex', justifyContent: 'space-between' }}>
                {p.name} 
                <span style={{ color: 'var(--success-color)' }}>${p.balance} left</span>
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', margin: '1.5rem 0' }}>
                {teamData[p.id].map(pokemon => (
                  <div key={pokemon.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                    <img src={pokemon.spriteUrl} alt={pokemon.name} style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{pokemon.name}</span>
                  </div>
                ))}
              </div>
              
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => handleCopy(p.id)}
              >
                {copied === p.id ? 'Copied!' : 'Copy Showdown Format'}
              </button>
            </div>
          );
        })}
      </div>
      
      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <button 
          className={`btn ${room.players[playerId]?.wantsToPlayAgain ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: '300px', height: '60px', fontSize: '1.25rem', fontWeight: 800 }}
          onClick={() => socket.emit('play_again', { roomId: room.id })}
        >
          {room.players[playerId]?.wantsToPlayAgain ? 'Ready (Waiting...)' : 'Play Again'}
        </button>
        
        <div style={{ color: 'var(--text-secondary)' }}>
          {Object.values(room.players).filter((p: any) => p.isOnline && p.wantsToPlayAgain).length} / {Object.values(room.players).filter((p: any) => p.isOnline).length} Players Ready
        </div>
      </div>
    </div>
  );
};
