

interface RosterDrawerProps {
  room: any;
}

export const RosterDrawer = ({ room }: RosterDrawerProps) => {
  
  // Use Object.values directly to maintain the stable join/turn order
  const players = Object.values(room.players) as any[];

  return (
    <div className="roster-drawer">
      {players.map((p: any, index: number) => {
        const isOpener = room.currentDraft && room.currentDraft.turnRotationIndex === index;
        
        if (p.isSpectator) {
          return (
            <div key={p.id} className="glass-panel player-card" style={{ opacity: 0.7, border: '1px solid var(--accent-color)', background: 'linear-gradient(135deg, rgba(0,240,255,0.1), transparent)' }}>
              <div className="player-card-header" style={{ marginBottom: 0 }}>
                <span className="player-name">
                  {p.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, background: 'rgba(0, 240, 255, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  Spectating
                </span>
              </div>
            </div>
          );
        }
        
        return (
          <div key={p.id} className={`glass-panel player-card ${isOpener ? 'opener-highlight' : ''}`}>
            <div className="player-card-header">
              <span className="player-name">
                {p.name}
                {isOpener && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800 }}>Opener</span>}
              </span>
            <span className="player-balance">${p.balance}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className={`player-status-badge status-${p.status}`}>
              {p.status}
            </span>
            <div className="party-slots">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="party-slot">
                  {p.party[i] ? (
                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.party[i]}.png`} alt="sprite" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};
