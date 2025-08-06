import { Song } from '@/types/song';

// Sample songs for the tutorial system
export const sampleSongs: Song[] = [
  {
    id: 'happy-birthday',
    title: 'Happy Birthday',
    artist: 'Traditional',
    difficulty: 'beginner',
    category: 'Tradicional',
    bpm: 120,
    duration: 24000, // 24 seconds
    notes: [
      // Happy Birthday melody in C major
      { key: 'C4', duration: 500, startTime: 0 },
      { key: 'C4', duration: 500, startTime: 500 },
      { key: 'D4', duration: 1000, startTime: 1000 },
      { key: 'C4', duration: 1000, startTime: 2000 },
      { key: 'F4', duration: 1000, startTime: 3000 },
      { key: 'E4', duration: 2000, startTime: 4000 },
      
      { key: 'C4', duration: 500, startTime: 6000 },
      { key: 'C4', duration: 500, startTime: 6500 },
      { key: 'D4', duration: 1000, startTime: 7000 },
      { key: 'C4', duration: 1000, startTime: 8000 },
      { key: 'G4', duration: 1000, startTime: 9000 },
      { key: 'F4', duration: 2000, startTime: 10000 },
      
      { key: 'C4', duration: 500, startTime: 12000 },
      { key: 'C4', duration: 500, startTime: 12500 },
      { key: 'C5', duration: 1000, startTime: 13000 },
      { key: 'A4', duration: 1000, startTime: 14000 },
      { key: 'F4', duration: 1000, startTime: 15000 },
      { key: 'E4', duration: 1000, startTime: 16000 },
      { key: 'D4', duration: 2000, startTime: 17000 },
      
      { key: 'A#4', duration: 500, startTime: 19000 },
      { key: 'A#4', duration: 500, startTime: 19500 },
      { key: 'A4', duration: 1000, startTime: 20000 },
      { key: 'F4', duration: 1000, startTime: 21000 },
      { key: 'G4', duration: 1000, startTime: 22000 },
      { key: 'F4', duration: 2000, startTime: 23000 }
    ],
    keySignature: 'C major',
    timeSignature: '3/4',
    description: 'La melodía tradicional de cumpleaños. Perfecta para principiantes.'
  },
  {
    id: 'twinkle-star',
    title: 'Twinkle Twinkle Little Star',
    artist: 'Traditional',
    difficulty: 'beginner',
    category: 'Infantil',
    bpm: 100,
    duration: 20000,
    notes: [
      { key: 'C4', duration: 1000, startTime: 0 },
      { key: 'C4', duration: 1000, startTime: 1000 },
      { key: 'G4', duration: 1000, startTime: 2000 },
      { key: 'G4', duration: 1000, startTime: 3000 },
      { key: 'A4', duration: 1000, startTime: 4000 },
      { key: 'A4', duration: 1000, startTime: 5000 },
      { key: 'G4', duration: 2000, startTime: 6000 },
      
      { key: 'F4', duration: 1000, startTime: 8000 },
      { key: 'F4', duration: 1000, startTime: 9000 },
      { key: 'E4', duration: 1000, startTime: 10000 },
      { key: 'E4', duration: 1000, startTime: 11000 },
      { key: 'D4', duration: 1000, startTime: 12000 },
      { key: 'D4', duration: 1000, startTime: 13000 },
      { key: 'C4', duration: 2000, startTime: 14000 }
    ],
    keySignature: 'C major',
    timeSignature: '4/4',
    description: 'Una canción infantil clásica, ideal para aprender las notas básicas.'
  },
  {
    id: 'mary-had-lamb',
    title: 'Mary Had a Little Lamb',
    artist: 'Traditional',
    difficulty: 'beginner',
    category: 'Infantil',
    bpm: 110,
    duration: 16000,
    notes: [
      { key: 'E4', duration: 1000, startTime: 0 },
      { key: 'D4', duration: 1000, startTime: 1000 },
      { key: 'C4', duration: 1000, startTime: 2000 },
      { key: 'D4', duration: 1000, startTime: 3000 },
      { key: 'E4', duration: 1000, startTime: 4000 },
      { key: 'E4', duration: 1000, startTime: 5000 },
      { key: 'E4', duration: 2000, startTime: 6000 },
      
      { key: 'D4', duration: 1000, startTime: 8000 },
      { key: 'D4', duration: 1000, startTime: 9000 },
      { key: 'D4', duration: 2000, startTime: 10000 },
      { key: 'E4', duration: 1000, startTime: 12000 },
      { key: 'G4', duration: 1000, startTime: 13000 },
      { key: 'G4', duration: 2000, startTime: 14000 }
    ],
    keySignature: 'C major',
    timeSignature: '4/4',
    description: 'Una melodía simple y reconocible para practicar.'
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    difficulty: 'intermediate',
    category: 'Clásica',
    bpm: 120,
    duration: 32000,
    notes: [
      { key: 'E4', duration: 1000, startTime: 0 },
      { key: 'E4', duration: 1000, startTime: 1000 },
      { key: 'F4', duration: 1000, startTime: 2000 },
      { key: 'G4', duration: 1000, startTime: 3000 },
      { key: 'G4', duration: 1000, startTime: 4000 },
      { key: 'F4', duration: 1000, startTime: 5000 },
      { key: 'E4', duration: 1000, startTime: 6000 },
      { key: 'D4', duration: 1000, startTime: 7000 },
      { key: 'C4', duration: 1000, startTime: 8000 },
      { key: 'C4', duration: 1000, startTime: 9000 },
      { key: 'D4', duration: 1000, startTime: 10000 },
      { key: 'E4', duration: 1000, startTime: 11000 },
      { key: 'E4', duration: 1500, startTime: 12000 },
      { key: 'D4', duration: 500, startTime: 13500 },
      { key: 'D4', duration: 2000, startTime: 14000 },
      
      { key: 'E4', duration: 1000, startTime: 16000 },
      { key: 'E4', duration: 1000, startTime: 17000 },
      { key: 'F4', duration: 1000, startTime: 18000 },
      { key: 'G4', duration: 1000, startTime: 19000 },
      { key: 'G4', duration: 1000, startTime: 20000 },
      { key: 'F4', duration: 1000, startTime: 21000 },
      { key: 'E4', duration: 1000, startTime: 22000 },
      { key: 'D4', duration: 1000, startTime: 23000 },
      { key: 'C4', duration: 1000, startTime: 24000 },
      { key: 'C4', duration: 1000, startTime: 25000 },
      { key: 'D4', duration: 1000, startTime: 26000 },
      { key: 'E4', duration: 1000, startTime: 27000 },
      { key: 'D4', duration: 1500, startTime: 28000 },
      { key: 'C4', duration: 500, startTime: 29500 },
      { key: 'C4', duration: 2000, startTime: 30000 }
    ],
    keySignature: 'C major',
    timeSignature: '4/4',
    description: 'El famoso tema de Beethoven, perfecto para practicar escalas.'
  },
  {
    id: 'chopsticks',
    title: 'Chopsticks',
    artist: 'Traditional',
    difficulty: 'intermediate',
    category: 'Popular',
    bpm: 140,
    duration: 24000,
    notes: [
      { key: 'F4', duration: 500, startTime: 0 },
      { key: 'G4', duration: 500, startTime: 500 },
      { key: 'A4', duration: 500, startTime: 1000 },
      { key: 'A#4', duration: 500, startTime: 1500 },
      { key: 'C5', duration: 1000, startTime: 2000 },
      { key: 'A#4', duration: 1000, startTime: 3000 },
      { key: 'A4', duration: 500, startTime: 4000 },
      { key: 'A#4', duration: 500, startTime: 4500 },
      { key: 'C5', duration: 500, startTime: 5000 },
      { key: 'D5', duration: 500, startTime: 5500 },
      { key: 'C5', duration: 500, startTime: 6000 },
      { key: 'A#4', duration: 500, startTime: 6500 },
      { key: 'A4', duration: 1000, startTime: 7000 },
      { key: 'F4', duration: 1000, startTime: 8000 }
    ],
    keySignature: 'F major',
    timeSignature: '4/4',
    description: 'Una pieza divertida y rítmica para practicar coordinación.'
  }
];

export const songCategories = [
  'Todas',
  'Tradicional',
  'Infantil',
  'Clásica',
  'Popular',
  'Jazz',
  'Blues',
  'Rock'
];

export const difficultyLevels = [
  { value: 'beginner', label: 'Principiante', color: 'text-green-600' },
  { value: 'intermediate', label: 'Intermedio', color: 'text-yellow-600' },
  { value: 'advanced', label: 'Avanzado', color: 'text-red-600' }
];
