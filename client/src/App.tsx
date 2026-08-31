import React, { useEffect, useState } from 'react';
import { socket } from './socket';
import { Lobby } from './components/Lobby';
import { BiddingArena } from './components/BiddingArena';
import { RosterDrawer } from './components/RosterDrawer';
import { RevealModal } from './components/RevealModal';
import { RouletteModal } from './components/RouletteModal';
import { ChatBox } from './components/ChatBox';
import { ExportSummary } from './components/ExportSummary';
import { audio } from './utils/audio';

function App() {
  const [room, setRoom] = useState<any>(null);
  
  const [playerId] = useState<string>(() => {
    let pid = localStorage.getItem('poke_auction_player_id');
    if (!pid) {
      pid = Math.random().toString(36).substring(2, 12);
      localStorage.setItem('poke_auction_player_id', pid);
    }
    return pid;
  });

  const [revealData, setRevealData] = useState<any>(null);
  const [autofillData, setAutofillData] = useState<{ targetPlayerId: string, wonPokemonIds: number[] } | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  
  // Slider values are linear (0 to 1), but actual volume is squared for natural hearing perception
  const [bgmVol, setBgmVol] = useState(() => {
    const saved = localStorage.getItem('poke_auction_bgm_vol');
    return saved !== null ? parseFloat(saved) : 0.55; // sqrt(0.3)
  });
  const [sfxVol, setSfxVol] = useState(() => {
    const saved = localStorage.getItem('poke_auction_sfx_vol');
    return saved !== null ? parseFloat(saved) : 0.71; // sqrt(0.5)
  });

  // Sync initial volume state to audio controller on mount
  useEffect(() => {
    import('./utils/audio').then(m => {
      m.audio.setBGMVolume(Math.pow(bgmVol, 2));
      m.audio.setSFXVolume(Math.pow(sfxVol, 2));
    });
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      
      const savedRoom = localStorage.getItem('poke_auction_room_id');
      const savedName = localStorage.getItem('poke_auction_name');
      if (savedRoom && savedName) {
        socket.emit('join_room', { roomId: savedRoom, playerName: savedName, playerId }, (res: any) => {
           if (res.success) {
             setRoom(res.room);
           }
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room_update', (updatedRoom: any) => {
      if (!updatedRoom.players[playerId]) {
        // Player was removed/kicked
        setRoom(null);
        localStorage.removeItem('poke_auction_room_id');
        return;
      }
      setRoom(updatedRoom);
      
      // If we are no longer in REVEAL state, clear reveal data
      if (updatedRoom.state !== 'REVEAL') {
        setRevealData(null);
      }
    });

    socket.on('round_resolved', (data: any) => {
      // Get the winner's name from current room state
      setRevealData(data);
    });

    socket.on('autofill_start', (data: any) => {
      setAutofillData(data);
    });

    socket.on('draft_complete', () => {
      audio.stopBGM();
      audio.playGameOverSound();
    });

    const handleGlobalClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.btn')) {
        audio.playUIClick();
      }
    };
    window.addEventListener('click', handleGlobalClick);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room_update');
      socket.off('round_resolved');
      socket.off('autofill_start');
      socket.off('draft_complete');
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [playerId]);

  // Restart music dynamically based on game state loops (e.g. Play Again returning to Lobby)
  // We cover all active states so that if a user accidentally refreshes the page mid-game,
  // the music will seamlessly resume on their very first click anywhere on the screen!
  useEffect(() => {
    const activeStates = ['LOBBY', 'BIDDING', 'REVEAL', 'AUTOFILL_ROULETTE'];
    if (room?.state && activeStates.includes(room.state)) {
       audio.playBGM();
    }
  }, [room?.state]);

  const handleJoin = (roomId: string, name: string) => {
    audio.playBGM(); // Start music on user interaction
    socket.emit('join_room', { roomId, playerName: name, playerId }, (res: any) => {
      if (res.success) {
        setRoom(res.room);
      }
    });
  };

  const handleLeave = () => {
    localStorage.removeItem('poke_auction_room_id');
    socket.emit('leave_room', { roomId: room?.id });
    setRoom(null);
    audio.stopBGM();
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setBgmVol(val);
    localStorage.setItem('poke_auction_bgm_vol', val.toString());
    // Quadratic scaling for volume perception
    audio.setBGMVolume(Math.pow(val, 2));
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVol(val);
    localStorage.setItem('poke_auction_sfx_vol', val.toString());
    // Quadratic scaling for volume perception
    audio.setSFXVolume(Math.pow(val, 2));
  };

  if (!isConnected) {
    return (
      <div className="lobby-container animate-pulse">
        <h2>Connecting to server...</h2>
      </div>
    );
  }

  const volumeControls = (
    <div className="volume-controls">
      <div className="volume-slider-group">
        <label>Music</label>
        <input type="range" min="0" max="1" step="0.01" value={bgmVol} onChange={handleBgmChange} />
      </div>
      <div className="volume-slider-group">
        <label>SFX</label>
        <input type="range" min="0" max="1" step="0.01" value={sfxVol} onChange={handleSfxChange} />
      </div>
    </div>
  );

  const profileBadge = room && room.players[playerId] ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: 'white' }}>
        {room.players[playerId].name.charAt(0).toUpperCase()}
      </div>
      <span style={{ fontWeight: 600, color: 'white' }}>{room.players[playerId].name}</span>
    </div>
  ) : null;

  // Lobby State
  if (!room || room.state === 'LOBBY') {
    return <Lobby room={room} socket={socket} playerId={playerId} onJoin={handleJoin} onLeave={handleLeave} volumeNode={volumeControls} profileBadge={profileBadge} />;
  }

  // Draft End State
  if (room.state === 'DRAFT_END') {
    return (
      <div className="container" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {profileBadge}
          <button className="btn btn-secondary" onClick={handleLeave}>
            Leave Room
          </button>
        </div>
        <ExportSummary room={room} socket={socket} playerId={playerId} />
      </div>
    );
  }

  // Active Game State (BIDDING or REVEAL)
  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1>PokéDraft Auction</h1>
          <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={handleLeave}>
            Leave Room
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {volumeControls}
          {profileBadge}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ color: 'var(--accent-color)' }}>Room: {room.id}</h2>
        {room.currentDraft && (
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            Round {room.currentDraft.roundNumber}
          </div>
        )}
      </div>

      <div className="arena-layout">
        <div>
          <BiddingArena room={room} playerId={playerId} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          <RosterDrawer room={room} />
          <ChatBox room={room} socket={socket} playerId={playerId} />
        </div>
      </div>

      {revealData && room.state === 'REVEAL' && (
        <RevealModal 
          winnerName={room.players[revealData.winnerId]?.name || 'Someone'} 
          pokemonId={revealData.pokemonId}
          winningBid={revealData.winningBid}
          isWinner={revealData.winnerId === playerId}
        />
      )}

      {autofillData && room.state === 'AUTOFILL_ROULETTE' && (
        <RouletteModal 
          targetPlayerName={room.players[autofillData.targetPlayerId]?.name || 'Someone'}
          wonPokemonIds={autofillData.wonPokemonIds}
          isWinner={autofillData.targetPlayerId === playerId}
        />
      )}
    </div>
  );
}

export default App;
