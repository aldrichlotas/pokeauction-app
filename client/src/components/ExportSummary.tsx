import { useEffect, useState } from 'react';
import { fetchPokemonDetails, generateShowdownText, type PokemonDetails } from '../utils/pokemon';
import { audio } from '../utils/audio';

export const ExportSummary = ({ 
  room,
  socket,
  playerId
}: { 
  room: any;
  socket: any;
  playerId: string;
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

  const handleCopy = (pid: string) => {
    audio.playSuccessChime();
    const text = generateShowdownText(teamData[pid]);
    navigator.clipboard.writeText(text);
    setCopied(pid);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDeclareWinner = (matchId: string, winnerId: string) => {
    if (!room.players[playerId]?.isHost) return;
    audio.playUIClick();
    socket.emit('update_bracket', { roomId: room.id, matchId, winnerId });
  };

  if (loading) {
    return <div className="lobby-container"><h2>Generating Teams...</h2></div>;
  }

  const isHost = room.players[playerId]?.isHost;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', width: '100%' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Tournament Bracket</h1>
      
      {/* Tournament Bracket UI */}
      {room.bracket && (
        <div style={{
          display: 'flex', 
          justifyContent: 'center', 
          gap: '4rem', 
          overflowX: 'auto', 
          padding: '2rem',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '16px',
          marginBottom: '3rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {room.bracket.map((round: any[], rIndex: number) => (
            <div key={rIndex} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '2rem', position: 'relative' }}>
              <div style={{ textAlign: 'center', color: 'var(--accent-color)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '-1rem' }}>
                Round {rIndex + 1}
              </div>
              
              {round.map(match => {
                const p1 = room.players[match.player1Id];
                const p2 = room.players[match.player2Id];
                
                return (
                  <div key={match.id} style={{
                    background: 'var(--card-bg)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    width: '200px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Player 1 Node */}
                    <div 
                      style={{ 
                        padding: '1rem', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: match.winnerId === match.player1Id ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                        cursor: isHost && match.player1Id && match.player2Id ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        opacity: !match.player1Id ? 0.3 : 1
                      }}
                      onClick={() => isHost && match.player1Id && match.player2Id && handleDeclareWinner(match.id, match.player1Id)}
                      className={isHost && match.player1Id && match.player2Id ? 'hover-glow' : ''}
                    >
                      <div style={{ fontWeight: 600 }}>{p1 ? p1.name : (match.roundIndex === 0 ? 'BYE' : 'TBD')}</div>
                    </div>
                    
                    {/* VS Divider */}
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: '2px 0' }}>
                      VS
                    </div>
                    
                    {/* Player 2 Node */}
                    <div 
                      style={{ 
                        padding: '1rem',
                        background: match.winnerId === match.player2Id ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                        cursor: isHost && match.player1Id && match.player2Id ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                        opacity: !match.player2Id ? 0.3 : 1
                      }}
                      onClick={() => isHost && match.player1Id && match.player2Id && handleDeclareWinner(match.id, match.player2Id)}
                      className={isHost && match.player1Id && match.player2Id ? 'hover-glow' : ''}
                    >
                      <div style={{ fontWeight: 600 }}>{p2 ? p2.name : (match.roundIndex === 0 ? 'BYE' : 'TBD')}</div>
                    </div>
                    
                    {/* Crown Icon if match is finished */}
                    {match.winnerId && (
                      <div style={{ position: 'absolute', right: '10px', top: match.winnerId === match.player1Id ? '12px' : 'auto', bottom: match.winnerId === match.player2Id ? '12px' : 'auto' }}>
                        👑
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      
      {/* Exporter Section */}
      <h2 style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Showdown Exporter</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {(Object.values(room.players) as any[]).map(p => {
          if (!teamData[p.id]) return null;
          
          return (
            <div key={p.id} className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  onClick={() => handleCopy(p.id)}
                >
                  {copied === p.id ? 'Copied!' : 'Copy'}
                </button>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {teamData[p.id].map(pokemon => (
                  <img key={pokemon.id} src={pokemon.spriteUrl} alt={pokemon.name} title={pokemon.name} style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Play Again Controls */}
      <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <button 
          className={`btn ${room.players[playerId]?.wantsToPlayAgain ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: '300px', height: '60px', fontSize: '1.25rem', fontWeight: 800 }}
          onClick={() => {
            audio.playUIClick();
            socket.emit('play_again', { roomId: room.id });
          }}
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
