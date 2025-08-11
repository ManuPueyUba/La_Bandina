'uimport { useState, useEffect, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { Song } from '@/types/song';

interface TutorialPianoProps {
  highlightedKeys?: Set<string>;
  onKeyPress?: (key: string) => void;
  onKeyRelease?: (key: string) => void;
  currentSong?: Song; // Agregamos la canción actual para analizar su rango
}

/**
 * Función para calcular el rango óptimo del piano basado en las notas de la canción
 */
function calculateOptimalPianoRange(song?: Song): number[] {
  if (!song || !song.notes || song.notes.length === 0) {
    return [4, 5, 6]; // Rango por defecto si no hay canción
  }

  // Función para convertir nota a número MIDI
  const noteToMidi = (noteKey: string): number => {
    const noteNames: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9,
      'A#': 10, 'Bb': 10, 'B': 11
    };
    
    const match = noteKey.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) return 60; // C4 por defecto
    
    const [, noteName, octaveStr] = match;
    const octave = parseInt(octaveStr);
    const noteValue = noteNames[noteName] || 0;
    return (octave * 12) + noteValue + 12;
  };

  // Obtener todas las notas MIDI de la canción
  const midiNotes = song.notes.map(note => noteToMidi(note.key));
  const minMidi = Math.min(...midiNotes);
  const maxMidi = Math.max(...midiNotes);
  
  // Convertir MIDI a octavas
  const minOctave = Math.floor((minMidi - 12) / 12);
  const maxOctave = Math.floor((maxMidi - 12) / 12);
  
  console.log(`🎹 Song range: ${minOctave} to ${maxOctave} (MIDI ${minMidi}-${maxMidi})`);
  
  // Calcular octava central
  const centerOctave = Math.round((minOctave + maxOctave) / 2);
  
  // Crear rango de 3 octavas centrado en la octava media
  let startOctave = centerOctave - 1;
  let endOctave = centerOctave + 1;
  
  // Asegurar que el rango cubra al menos las notas de la canción
  if (startOctave > minOctave) startOctave = minOctave;
  if (endOctave < maxOctave) endOctave = maxOctave;
  
  // Limitar a un máximo de 4 octavas para que no sea demasiado ancho
  if (endOctave - startOctave > 3) {
    const excess = (endOctave - startOctave) - 3;
    startOctave += Math.ceil(excess / 2);
    endOctave -= Math.floor(excess / 2);
  }
  
  // Generar array de octavas
  const octaves = [];
  for (let i = startOctave; i <= endOctave; i++) {
    octaves.push(i);
  }
  
  console.log(`🎹 Optimal piano range: octaves ${octaves.join(', ')}`);
  return octaves;
}

/**
 * Función para ajustar notas que quedan fuera del rango visible del piano
 */
function adjustNotesToPianoRange(highlightedKeys: Set<string>, visibleOctaves: number[]): Set<string> {
  if (highlightedKeys.size === 0) return highlightedKeys;
  
  const minOctave = Math.min(...visibleOctaves);
  const maxOctave = Math.max(...visibleOctaves);
  
  const adjustedKeys = new Set<string>();
  
  highlightedKeys.forEach(key => {
    const match = key.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      adjustedKeys.add(key);
      return;
    }
    
    const [, noteName, octaveStr] = match;
    let octave = parseInt(octaveStr);
    
    // Ajustar octava si está fuera del rango
    if (octave < minOctave) {
      // Subir octavas hasta estar en rango
      while (octave < minOctave) {
        octave += 1;
      }
      console.log(`🎵 Adjusted ${key} → ${noteName}${octave} (moved up)`);
    } else if (octave > maxOctave) {
      // Bajar octavas hasta estar en rango
      while (octave > maxOctave) {
        octave -= 1;
      }
      console.log(`🎵 Adjusted ${key} → ${noteName}${octave} (moved down)`);
    }
    
    adjustedKeys.add(`${noteName}${octave}`);
  });
  
  return adjustedKeys;
}t';

import { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

interface TutorialPianoProps {
  highlightedKeys: Set<string>;
  onKeyPress?: (key: string) => void;
  onKeyRelease?: (key: string) => void;
}

export default function TutorialPiano({ highlightedKeys, onKeyPress, onKeyRelease }: TutorialPianoProps) {
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [keyMapping, setKeyMapping] = useState<{ [key: string]: { note: string; octaveOffset: number } }>({});
  const [currentOctave] = useState(4); // Octava base

  // Debug: log cuando cambian las teclas resaltadas
  useEffect(() => {
    console.log('TutorialPiano - Highlighted keys changed:', Array.from(highlightedKeys));
  }, [highlightedKeys]);

  // Mapeo por defecto de teclas del teclado físico a notas (mismo que la página principal)
  const DEFAULT_KEY_MAPPING: { [key: string]: { note: string; octaveOffset: number } } = {
    // Octava base (octaveOffset: 0)
    a: { note: "C", octaveOffset: 0 },
    w: { note: "C#", octaveOffset: 0 },
    s: { note: "D", octaveOffset: 0 },
    e: { note: "D#", octaveOffset: 0 },
    d: { note: "E", octaveOffset: 0 },
    f: { note: "F", octaveOffset: 0 },
    t: { note: "F#", octaveOffset: 0 },
    g: { note: "G", octaveOffset: 0 },
    y: { note: "G#", octaveOffset: 0 },
    h: { note: "A", octaveOffset: 0 },
    u: { note: "A#", octaveOffset: 0 },
    j: { note: "B", octaveOffset: 0 },
    
    // Primera octava superior (octaveOffset: 1)
    k: { note: "C", octaveOffset: 1 },
    o: { note: "C#", octaveOffset: 1 },
    l: { note: "D", octaveOffset: 1 },
    p: { note: "D#", octaveOffset: 1 },
    ";": { note: "E", octaveOffset: 1 },
    z: { note: "F", octaveOffset: 1 },
    x: { note: "G", octaveOffset: 1 },
    c: { note: "A", octaveOffset: 1 },
    v: { note: "B", octaveOffset: 1 },
    
    // Segunda octava superior (octaveOffset: 2)
    b: { note: "C", octaveOffset: 2 },
    n: { note: "D", octaveOffset: 2 },
    m: { note: "E", octaveOffset: 2 },
    ",": { note: "F", octaveOffset: 2 },
    ".": { note: "G", octaveOffset: 2 },
    "/": { note: "A", octaveOffset: 2 },
  };

  // Cargar configuración de teclas desde localStorage (mismo sistema que la página principal)
  useEffect(() => {
    const savedMapping = localStorage.getItem("pianoKeyMapping");
    if (savedMapping) {
      try {
        setKeyMapping(JSON.parse(savedMapping));
      } catch (error) {
        console.error("Error loading saved key mapping:", error);
        setKeyMapping(DEFAULT_KEY_MAPPING);
      }
    } else {
      setKeyMapping(DEFAULT_KEY_MAPPING);
    }
  }, []);

  // Inicializar el sintetizador
  const initAudio = async () => {
    try {
      if (Tone.context.state === 'suspended') {
        await Tone.start();
      }
      
      const polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle",
        },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();

      polySynth.volume.value = -10;
      setSynth(polySynth);
      setAudioInitialized(true);
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  };

  // Limpiar sintetizador al desmontar
  useEffect(() => {
    return () => {
      if (synth) {
        synth.dispose();
      }
    };
  }, [synth]);

  // Tocar una nota
  const playNote = useCallback(async (noteWithOctave: string) => {
    if (!synth) {
      console.log('Synth not initialized');
      return;
    }

    // Asegurar que el contexto de audio esté activo
    if (Tone.context.state === 'suspended') {
      await Tone.start();
    }

    console.log('TutorialPiano - Playing note:', noteWithOctave);
    synth.triggerAttack(noteWithOctave);
    setPressedKeys(prev => new Set([...prev, noteWithOctave]));
    
    // Notificar al componente padre si hay callback
    if (onKeyPress) {
      console.log('TutorialPiano - Calling onKeyPress with:', noteWithOctave);
      onKeyPress(noteWithOctave);
    }
  }, [synth, onKeyPress]);

  // Soltar una nota
  const releaseNote = useCallback((noteWithOctave: string) => {
    if (!synth) return;

    console.log('TutorialPiano - Releasing note:', noteWithOctave);
    synth.triggerRelease(noteWithOctave);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(noteWithOctave);
      return newSet;
    });
    
    // Notificar al componente padre si hay callback
    if (onKeyRelease) {
      console.log('TutorialPiano - Calling onKeyRelease with:', noteWithOctave);
      onKeyRelease(noteWithOctave);
    }
  }, [synth, onKeyRelease]);

  // Manejo de eventos de teclado (mismo sistema que la página principal)
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // No capturar teclas si hay un input/textarea enfocado o un modal abierto
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('.modal') ||
        document.querySelector('[data-modal-open="true"]')
      );
      
      if (isInputFocused) {
        return; // No hacer nada si hay un input enfocado o modal abierto
      }

      const key = event.key.toLowerCase();
      if (keyMapping[key]) {
        const { note, octaveOffset } = keyMapping[key];
        const targetOctave = currentOctave + octaveOffset;
        const noteWithOctave = `${note}${targetOctave}`;
        
        if (!pressedKeys.has(noteWithOctave)) {
          event.preventDefault();
          if (!audioInitialized) {
            await initAudio();
          }
          playNote(noteWithOctave);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      // No capturar teclas si hay un input/textarea enfocado o un modal abierto
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('.modal') ||
        document.querySelector('[data-modal-open="true"]')
      );
      
      if (isInputFocused) {
        return; // No hacer nada si hay un input enfocado o modal abierto
      }

      const key = event.key.toLowerCase();
      if (keyMapping[key]) {
        const { note, octaveOffset } = keyMapping[key];
        const targetOctave = currentOctave + octaveOffset;
        const noteWithOctave = `${note}${targetOctave}`;
        
        if (pressedKeys.has(noteWithOctave)) {
          event.preventDefault();
          releaseNote(noteWithOctave);
          // Notificar al componente padre sobre el release
          if (onKeyRelease) {
            onKeyRelease(noteWithOctave);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyMapping, pressedKeys, audioInitialized, playNote, releaseNote, currentOctave]);

  // Componente de tecla individual
  const PianoKey = ({ note, octave, isBlack = false }: { note: string; octave: number; isBlack?: boolean }) => {
    const noteWithOctave = `${note}${octave}`;
    const isPressed = pressedKeys.has(noteWithOctave);
    const isHighlighted = highlightedKeys.has(noteWithOctave);
    
    // Buscar la tecla del teclado asignada a esta nota (mismo sistema que la página principal)
    const keyboardKey = Object.keys(keyMapping).find((k) => {
      const mapping = keyMapping[k];
      return mapping.note === note && (currentOctave + mapping.octaveOffset) === octave;
    });

    return (
      <button
        className={`
          relative select-none transition-all duration-200
          ${
            isBlack
              ? `w-8 h-32 hover:bg-gray-800 -mx-4 z-10 rounded-b-md
               ${isHighlighted 
                  ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400" 
                  : "bg-gray-900"
                }
               ${isPressed ? "transform translate-y-1" : ""}`
              : `w-12 h-48 hover:bg-gray-300 border border-gray-400 rounded-b-md
               ${isHighlighted 
                  ? "bg-blue-200 border-blue-400 hover:bg-blue-300 ring-2 ring-blue-400" 
                  : "bg-gray-200"
                }
               ${isPressed ? "bg-gray-300 transform translate-y-1" : ""}`
          }
          ${isPressed ? "shadow-inner" : "shadow-md"}
        `}
        onMouseDown={async () => {
          if (!audioInitialized) {
            await initAudio();
          }
          playNote(noteWithOctave);
        }}
        onMouseUp={() => {
          releaseNote(noteWithOctave);
        }}
        onMouseLeave={() => {
          releaseNote(noteWithOctave);
        }}
        onTouchStart={async (e) => {
          e.preventDefault();
          if (!audioInitialized) {
            await initAudio();
          }
          playNote(noteWithOctave);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          releaseNote(noteWithOctave);
          if (onKeyRelease) {
            onKeyRelease(noteWithOctave);
          }
        }}
      >
        {/* Mostrar información en teclas blancas */}
        {!isBlack && (
          <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs ${
            isHighlighted ? 'text-blue-700 font-semibold' : 'text-gray-500'
          }`}>
            <div className="text-[10px]">{note}{octave}</div>
            {keyboardKey && (
              <div className="text-[8px] mt-0.5 px-1 py-0.5 bg-gray-200 rounded text-gray-700 font-mono">
                {keyboardKey.toUpperCase()}
              </div>
            )}
            {isHighlighted && (
              <div className="text-[8px] text-blue-600">♪</div>
            )}
          </div>
        )}
        
        {/* Mostrar información en teclas negras */}
        {isBlack && (
          <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs ${
            isHighlighted ? 'text-blue-200 font-semibold' : 'text-gray-300'
          }`}>
            <div className="text-[9px]">{note}{octave}</div>
            {keyboardKey && (
              <div className="text-[7px] mt-0.5 px-1 py-0.5 bg-gray-700 rounded text-gray-200 font-mono">
                {keyboardKey.toUpperCase()}
              </div>
            )}
            {isHighlighted && (
              <div className="text-[8px] text-blue-200">♪</div>
            )}
          </div>
        )}
      </button>
    );
  };

  // Renderizar teclado cromático con 3 octavas
  const renderKeyboard = () => {
    const octaves = [4, 5, 6]; // 3 octavas centradas
    const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"];
    const blackKeys = ["C#", "D#", null, "F#", "G#", "A#", null]; // null para espacios

    return (
      <div className="relative flex overflow-x-auto">
        {octaves.map((octave) => (
          <div key={octave} className="relative flex">
            {/* Teclas blancas */}
            <div className="flex">
              {whiteKeys.map((note) => (
                <PianoKey key={`${note}-${octave}`} note={note} octave={octave} />
              ))}
            </div>

            {/* Teclas negras */}
            <div className="absolute top-0 left-6 flex">
              {blackKeys.map((note, index) => (
                <div key={`${note}-${octave}-${index}`} className="w-12 flex justify-center">
                  {note && <PianoKey note={note} octave={octave} isBlack />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-black/50 backdrop-blur-md rounded-xl border border-gray-800 p-6">
      <div className="flex justify-center mb-4">
        <div className="max-w-full overflow-x-auto">
          {renderKeyboard()}
        </div>
      </div>
      
      {highlightedKeys.size > 0 && (
        <div className="text-center text-sm text-blue-400">
          <p>🎹 Las teclas azules indican las notas de la canción</p>
        </div>
      )}
      
      {!audioInitialized && (
        <div className="text-center text-sm text-gray-400 mt-2">
          <p>Haz clic en cualquier tecla para activar el audio</p>
        </div>
      )}

      {/* Guía de teclas del teclado */}
      <div className="mt-4 p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700">
        <div className="text-center text-sm text-gray-200 mb-2">
          <strong>🎼 Guía del Teclado</strong>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-400">
          <div>
            <p className="font-semibold mb-1 text-gray-300">Octava Base (4):</p>
            <p>A=C, W=C#, S=D, E=D#, D=E, F=F</p>
            <p>T=F#, G=G, Y=G#, H=A, U=A#, J=B</p>
          </div>
          <div>
            <p className="font-semibold mb-1 text-gray-300">Octava Superior (5):</p>
            <p>K=C, O=C#, L=D, P=D#, ;=E, Z=F</p>
            <p>X=G, C=A, V=B</p>
          </div>
          <div>
            <p className="font-semibold mb-1 text-gray-300">Octava Alta (6):</p>
            <p>B=C, N=D, M=E, ,=F, .=G, /=A</p>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-2">
          💡 Personaliza el mapeo en "Configurar Teclas" desde la página principal
        </div>
      </div>
    </div>
  );
}
