declare module 'midi-writer-js' {
  export class Track {
    addTrackName(name: string): void;
    addText(text: string): void;
    setTempo(bpm: number): void;
    setTimeSignature(numerator: number, denominator: number, metronome: number, thirtySeconds: number): void;
    addEvent(event: any): void;
  }

  export class NoteEvent {
    constructor(options: {
      pitch: string | string[];
      duration: string;
      velocity?: number;
      channel?: number;
      wait?: string;
    });
  }

  export class Writer {
    constructor(tracks: Track | Track[]);
    buildFile(): number[];
  }
}
