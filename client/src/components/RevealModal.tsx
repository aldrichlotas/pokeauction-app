import React, { useEffect, useState } from 'react';
import { fetchPokemonDetails, type PokemonDetails, getTypeColor } from '../utils/pokemon';

export const RevealModal = ({
  winnerName,
  pokemonId,
  winningBid,
  isWinner
}: {
  winnerName: string;
  pokemonId: number;
  winningBid: number;
  isWinner: boolean;
}) => {
  const [details, setDetails] = useState<PokemonDetails | null>(null);

  useEffect(() => {
    fetchPokemonDetails(pokemonId).then(setDetails).catch(console.error);
    
    // Play dopamine sound cues when modal appears
    if (isWinner) {
      import('../utils/audio').then(m => m.audio.playWinSound());
    } else {
      import('../utils/audio').then(m => m.audio.playRevealSound());
    }
  }, [pokemonId, isWinner]);

  if (!details) return null;

  return (
    <div className="reveal-modal-overlay">
      <div className="glass-panel reveal-content">
        <h2 className="winner-text">{winnerName} won the bid for ${winningBid}!</h2>
        
        <img src={details.spriteUrl} alt={details.name} className="reveal-sprite" />
        
        <div className="pokemon-name">{details.name}</div>
        
        <div className="typing-container">
          {details.types.map(t => (
            <span key={t} className="type-badge" style={{ background: getTypeColor(t) }}>
              {t}
            </span>
          ))}
        </div>
        
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginTop: '1rem' }}>
          Ability: <span style={{ color: 'white', fontWeight: 600 }}>{details.ability}</span>
        </div>
      </div>
    </div>
  );
};
