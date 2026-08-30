import { useEffect, useState } from 'react';
import { fetchPokemonDetails, type PokemonDetails, getTypeColor } from '../utils/pokemon';
import { audio } from '../utils/audio';

export const RouletteModal = ({
  targetPlayerName,
  wonPokemonIds,
  isWinner
}: {
  targetPlayerName: string;
  wonPokemonIds: number[];
  isWinner: boolean;
}) => {
  const [reels, setReels] = useState<number[][]>([]);
  const [spinActive, setSpinActive] = useState(false);
  const [lockedIndex, setLockedIndex] = useState(-1);
  const [lockedDetails, setLockedDetails] = useState<(PokemonDetails | null)[]>([]);

  useEffect(() => {
    if (wonPokemonIds.length === 0) return;
    
    setLockedDetails(wonPokemonIds.map(() => null));

    // Generate reels
    const newReels = wonPokemonIds.map(targetId => {
      const reel = [];
      for (let i = 0; i < 20; i++) { // Increased to 20 items for a longer visual spin
        reel.push(Math.floor(Math.random() * 1025) + 1);
      }
      reel.push(targetId);
      return reel;
    });
    setReels(newReels);

    setTimeout(() => {
      setSpinActive(true);
    }, 50);

    let activeSpins = wonPokemonIds.length;
    const tickInterval = setInterval(() => {
      if (activeSpins > 0) audio.playRouletteSpinSound();
    }, 150);

    wonPokemonIds.forEach((id, index) => {
      // Exact duration to match CSS transition
      const durationMs = 1500 + (index * 1000);
      
      setTimeout(() => {
        setLockedIndex(index);
        activeSpins--;
        audio.playRouletteLockSound();
        
        fetchPokemonDetails(id).then(details => {
          setLockedDetails(prev => {
            const arr = [...prev];
            arr[index] = details;
            return arr;
          });
        });

        if (index === wonPokemonIds.length - 1) {
          setTimeout(() => {
            audio.playJackpotSound();
            clearInterval(tickInterval);
          }, 500);
        }
      }, durationMs);
    });

    return () => clearInterval(tickInterval);
  }, [wonPokemonIds, isWinner]);

  if (reels.length === 0) return null;

  return (
    <div className="reveal-modal-overlay animate-fade-in" style={{ 
      zIndex: 100, 
      backgroundColor: 'rgba(5, 10, 20, 0.95)', // Deep dark blue
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 style={{ 
          fontSize: '4rem', 
          fontWeight: 900,
          textTransform: 'uppercase',
          background: 'linear-gradient(to right, #00f2fe, #4facfe)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 4px 30px rgba(0, 242, 254, 0.4)',
          letterSpacing: '2px',
          margin: 0
        }}>
          PC Transfer Complete
        </h2>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.5rem', marginTop: '0.5rem', letterSpacing: '2px' }}>
          PROCESSING {wonPokemonIds.length} POKÉMON FOR {targetPlayerName.toUpperCase()}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '2rem', 
        justifyContent: 'center', 
        flexWrap: 'wrap', 
        padding: '2rem',
        background: 'linear-gradient(180deg, rgba(0, 150, 255, 0.05) 0%, rgba(0, 150, 255, 0.1) 100%)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        border: '1px solid rgba(0, 242, 254, 0.3)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 2px 20px rgba(0, 242, 254, 0.1)'
      }}>
        {reels.map((reel, i) => {
          const isSpinning = lockedIndex < i;
          const duration = 1.5 + (i * 1.0); // Exact match with the timeout

          return (
            <div key={i} className={!isSpinning ? 'flash-bang' : ''} style={{ 
              width: '220px', 
              height: '360px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              background: 'rgba(10, 20, 40, 0.8)',
              borderRadius: '16px',
              border: isSpinning ? '2px solid rgba(0,242,254,0.2)' : '2px solid #00f2fe',
              boxShadow: isSpinning ? 'inset 0 0 30px rgba(0,0,0,0.5)' : '0 0 30px rgba(0, 242, 254, 0.4), inset 0 0 20px rgba(0, 242, 254, 0.2)',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              position: 'relative'
            }}>
               
               {/* PC transfer inner window */}
               <div style={{ 
                 height: '180px', 
                 width: '100%', 
                 overflow: 'hidden',
                 position: 'relative',
                 background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(10,30,50,1) 50%, rgba(0,0,0,0.9) 100%)',
                 borderBottom: isSpinning ? '2px solid rgba(0,242,254,0.1)' : '2px solid rgba(0,242,254,0.5)',
                 boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.8), inset 0 -10px 20px rgba(0,0,0,0.8)'
               }}>
                 {/* The Reel Track */}
                 <div style={{
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'center',
                   // Make the physical CSS animation finish 250ms BEFORE the JS timeout fires.
                   // This guarantees the reel has completely stopped before the name appears.
                   transition: spinActive ? `transform ${Math.max(0.1, duration - 0.25)}s cubic-bezier(0.1, 0.7, 0.1, 1)` : 'none',
                   transform: spinActive ? `translateY(-${20 * 180}px)` : 'translateY(0px)'
                 }}>
                   {reel.map((id, idx) => (
                      <div key={idx} style={{ 
                        height: '180px', 
                        width: '100%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`} 
                          alt="Slot Item" 
                          style={{ 
                            width: '140px', 
                            height: '140px', 
                            objectFit: 'contain',
                            filter: isSpinning && idx !== 20 ? 'blur(5px) drop-shadow(0 10px 5px rgba(0,0,0,0.8))' : 'drop-shadow(0 0 15px rgba(0,242,254,0.4))',
                            transform: isSpinning && idx !== 20 ? 'scale(1.1)' : 'scale(1)',
                            transition: 'filter 0.2s, transform 0.2s'
                          }}
                        />
                      </div>
                   ))}
                 </div>
                 
                 {/* Glass overlay reflection */}
                 <div style={{
                   position: 'absolute',
                   top: 0, left: 0, right: 0, height: '40%',
                   background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
                   pointerEvents: 'none'
                 }}/>
               </div>
               
              <div style={{ 
                flex: 1, 
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '1rem',
                position: 'relative'
              }}>
                {!isSpinning && lockedDetails[i] ? (
                  <div className="animate-fade-in" style={{ width: '100%', textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '1.4rem', 
                      fontWeight: 800, 
                      marginBottom: '0.75rem', 
                      color: 'white',
                      textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                      letterSpacing: '1px'
                    }}>
                      {lockedDetails[i]!.name.toUpperCase()}
                    </div>
                    <div className="typing-container" style={{ justifyContent: 'center', gap: '0.5rem' }}>
                      {lockedDetails[i]!.types.map(t => (
                        <span key={t} className="type-badge" style={{ 
                          padding: '0.3rem 0.6rem', 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          background: getTypeColor(t),
                          boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ 
                    color: 'var(--primary-color)', 
                    fontSize: '1.2rem', 
                    fontWeight: 700,
                    letterSpacing: '2px',
                    animation: 'pulse 1s infinite' 
                  }}>
                    PROCESSING...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
