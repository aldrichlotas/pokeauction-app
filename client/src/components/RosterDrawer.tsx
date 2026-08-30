export const RosterDrawer = ({ room }: { room: any }) => {
  
  // Use Object.values directly to maintain the stable join/turn order
  const players = Object.values(room.players) as any[];

  return (
    <div className="roster-drawer">
      {players.map((p: any, index: number) => {
        const isOpener = room.currentDraft && room.currentDraft.turnRotationIndex === index;
        
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
