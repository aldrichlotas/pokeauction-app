import { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import { audio } from '../utils/audio';

export const BiddingArena = ({ room, playerId }: { room: any, playerId: string }) => {
  const [timeLeft, setTimeLeft] = useState(room.settings.timerDuration);
  const [customBid, setCustomBid] = useState('');

  const draft = room.currentDraft;
  const player = room.players[playerId];
  const highestBidder = draft ? room.players[draft.highestBidderId]?.name : 'None';

  const previousBidRef = useRef(room.currentDraft?.currentBid || 0);
  const prevStatusRef = useRef(player.status);

  useEffect(() => {
    if (draft && draft.currentBid > previousBidRef.current) {
      audio.playBidSound();
    }
    previousBidRef.current = draft ? draft.currentBid : 0;
  }, [draft?.currentBid]);

  useEffect(() => {
    if (prevStatusRef.current === 'active' && player.status === 'passed') {
      audio.playPassSound();
    }
    prevStatusRef.current = player.status;
  }, [player.status]);

  useEffect(() => {
    if (!draft) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((draft.timerEndTimestamp - Date.now()) / 1000));
      setTimeLeft((prev: number) => {
        if (prev !== remaining && remaining <= 5 && remaining > 0) {
          audio.playTickSound();
        }
        return remaining;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [draft]);

  const placeBid = (amount: number) => {
    socket.emit('place_bid', { roomId: room.id, amount });
  };

  const handleCustomBid = () => {
    const val = parseInt(customBid);
    if (!isNaN(val)) placeBid(val);
    setCustomBid('');
  };

  const passBid = () => {
    socket.emit('pass_bid', { roomId: room.id });
  };

  if (!draft) return <div className="glass-panel mystery-card animate-pulse"><h2>Waiting for next round...</h2></div>;

  const currentBid = draft.currentBid;
  const isActive = player.status === 'active';
  const isHighestBidder = draft.highestBidderId === playerId;
  
  const minBid = currentBid + 1;
  const maxBid = player.balance;

  // Calculate timer circle dashoffset (200 is total dasharray)
  const timerPercentage = timeLeft / room.settings.timerDuration;
  const strokeDashoffset = 200 - (200 * timerPercentage);

  return (
    <div className="glass-panel mystery-card">
      <div className="timer-container">
        <svg className="timer-svg" viewBox="0 0 80 80">
          <circle className="timer-circle-bg" cx="40" cy="40" r="32" />
          <circle 
            className="timer-circle-progress" 
            cx="40" cy="40" r="32" 
            style={{ strokeDashoffset, stroke: timeLeft <= 5 ? 'var(--danger-color)' : 'var(--primary-color)' }}
          />
        </svg>
        <div className="timer-text" style={{ color: timeLeft <= 5 ? 'var(--danger-color)' : 'var(--text-primary)' }}>
          {timeLeft}
        </div>
      </div>

      <div className="mystery-number">#{draft.pokemonId}</div>
      
      <div className="current-bid-display">
        <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Current Highest Bid</div>
        <div className="bid-amount">${currentBid}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>by {highestBidder}</div>
      </div>

      <div className="action-bar">
        {isActive ? (
          <>
            <button 
              className="btn btn-primary" 
              onClick={() => placeBid(minBid)} 
              disabled={minBid > maxBid}
            >
              Bid ${minBid}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => placeBid(currentBid + 2)} 
              disabled={currentBid + 2 > maxBid}
            >
              + $2
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                audio.playAllInSound();
                placeBid(maxBid);
              }} 
              disabled={maxBid <= currentBid}
            >
              All In (${maxBid})
            </button>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="number" 
                className="input-field" 
                placeholder="Custom" 
                style={{ width: '100px' }}
                value={customBid}
                onChange={e => setCustomBid(e.target.value)}
                min={minBid}
                max={maxBid}
              />
              <button 
                className="btn btn-outline" 
                onClick={handleCustomBid}
                disabled={!customBid || parseInt(customBid) < minBid || parseInt(customBid) > maxBid}
              >
                Bid
              </button>
            </div>
            
            {!isHighestBidder && (
              <button className="btn btn-danger" onClick={passBid}>Pass / Fold</button>
            )}
            
            {isHighestBidder && (
              <div style={{ padding: '0.75rem', color: 'var(--success-color)', fontWeight: 600 }}>
                You hold the highest bid!
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.2rem' }}>
            You have passed this round.
          </div>
        )}
      </div>
    </div>
  );
};
