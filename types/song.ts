export interface Note {
  key: string;
  duration: number; // in milliseconds
  startTime: number; // when to play this note relative to song start
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  bpm: number;
  duration: number; // total song duration in milliseconds
  notes: Note[];
  keySignature?: string;
  timeSignature?: string;
  description?: string;
}

export interface SongProgress {
  songId: string;
  completedNotes: number;
  totalNotes: number;
  accuracy: number; // percentage
  bestScore: number;
  lastPlayedAt: Date;
}

export interface TutorialState {
  isPlaying: boolean;
  isPaused: boolean;
  currentPosition: number; // current time in milliseconds
  playbackSpeed: number; // 0.5, 1.0, 1.5, 2.0
  showUpcomingNotes: boolean;
  highlightColor: string;
}
