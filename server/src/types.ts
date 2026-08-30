export type PlayerStatus = 'active' | 'passed' | 'full' | 'bankrupt';

export interface Player {
  id: string;
  name: string;
  balance: number;
  party: number[]; // Pokemon IDs
  status: PlayerStatus;
  isHost: boolean;
  ready: boolean;
  isOnline: boolean;
  wantsToPlayAgain?: boolean;
}

export interface Match {
  id: string;
  roundIndex: number;
  matchIndex: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  nextMatchId: string | null;
}

export type DraftState = 'LOBBY' | 'BIDDING' | 'REVEAL' | 'AUTOFILL_ROULETTE' | 'DRAFT_END';

export interface Room {
  id: string;
  players: Record<string, Player>;
  state: DraftState;
  settings: {
    timerDuration: number;
    dexStart: number;
    dexEnd: number;
  };
  currentDraft: {
    pokemonId: number | null;
    highestBidderId: string | null;
    currentBid: number;
    timerEndTimestamp: number | null;
    roundNumber: number;
    turnRotationIndex: number;
  } | null;
  bracket: Match[][] | null;
}
