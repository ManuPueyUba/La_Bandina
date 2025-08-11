'use client';

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
  const [currentOctave] = useState(0); // Ya no se usa como base, cada tecla tiene su octava absoluta

  // Debug: log cuando cambian las teclas resaltadas
  useEffect(() => {
    console.log('TutorialPiano - Highlighted keys changed:', Array.from(highlightedKeys));
  }, [highlightedKeys]);

  // Mapeo expandido con mayúsculas y minúsculas para piano completo (88 teclas)
  const DEFAULT_KEY_MAPPING: { [key: string]: { note: string; octaveOffset: number } } = {
    // ===== OCTAVAS GRAVES =====
    // Octava 0 (A0-B0) - Teclas de números
    "1": { note: "A", octaveOffset: 0 },
    "!": { note: "A#", octaveOffset: 0 },
    "2": { note: "B", octaveOffset: 0 },

    // Octava 1 (C1-B1) - Teclas de números superiores
    "3": { note: "C", octaveOffset: 1 },
    "#": { note: "C#", octaveOffset: 1 },
    "4": { note: "D", octaveOffset: 1 },
    "$": { note: "D#", octaveOffset: 1 },
    "5": { note: "E", octaveOffset: 1 },
    "6": { note: "F", octaveOffset: 1 },
    "^": { note: "F#", octaveOffset: 1 },
    "7": { note: "G", octaveOffset: 1 },
    "&": { note: "G#", octaveOffset: 1 },
    "8": { note: "A", octaveOffset: 1 },
    "*": { note: "A#", octaveOffset: 1 },
    "9": { note: "B", octaveOffset: 1 },

    // Octava 2 (C2-B2) - Primera fila del teclado QWERTY (minúsculas)
    "q": { note: "C", octaveOffset: 2 },
    "w": { note: "C#", octaveOffset: 2 },
    "e": { note: "D", octaveOffset: 2 },
    "r": { note: "D#", octaveOffset: 2 },
    "t": { note: "E", octaveOffset: 2 },
    "y": { note: "F", octaveOffset: 2 },
    "u": { note: "F#", octaveOffset: 2 },
    "i": { note: "G", octaveOffset: 2 },
    "o": { note: "G#", octaveOffset: 2 },
    "p": { note: "A", octaveOffset: 2 },
    "[": { note: "A#", octaveOffset: 2 },
    "]": { note: "B", octaveOffset: 2 },

    // Octava 3 (C3-B3) - Primera fila del teclado QWERTY (mayúsculas)
    "Q": { note: "C", octaveOffset: 3 },
    "W": { note: "C#", octaveOffset: 3 },
    "E": { note: "D", octaveOffset: 3 },
    "R": { note: "D#", octaveOffset: 3 },
    "T": { note: "E", octaveOffset: 3 },
    "Y": { note: "F", octaveOffset: 3 },
    "U": { note: "F#", octaveOffset: 3 },
    "I": { note: "G", octaveOffset: 3 },
    "O": { note: "G#", octaveOffset: 3 },
    "P": { note: "A", octaveOffset: 3 },
    "{": { note: "A#", octaveOffset: 3 },
    "}": { note: "B", octaveOffset: 3 },

    // ===== OCTAVAS MEDIAS ===== 
    // Octava 4 (C4-B4) - Segunda fila del teclado ASDF (minúsculas)
    "a": { note: "C", octaveOffset: 4 },
    "s": { note: "C#", octaveOffset: 4 },
    "d": { note: "D", octaveOffset: 4 },
    "f": { note: "D#", octaveOffset: 4 },
    "g": { note: "E", octaveOffset: 4 },
    "h": { note: "F", octaveOffset: 4 },
    "j": { note: "F#", octaveOffset: 4 },
    "k": { note: "G", octaveOffset: 4 },
    "l": { note: "G#", octaveOffset: 4 },
    ";": { note: "A", octaveOffset: 4 },
    "'": { note: "A#", octaveOffset: 4 },
    "Enter": { note: "B", octaveOffset: 4 },

    // Octava 5 (C5-B5) - Segunda fila del teclado ASDF (mayúsculas)
    "A": { note: "C", octaveOffset: 5 },
    "S": { note: "C#", octaveOffset: 5 },
    "D": { note: "D", octaveOffset: 5 },
    "F": { note: "D#", octaveOffset: 5 },
    "G": { note: "E", octaveOffset: 5 },
    "H": { note: "F", octaveOffset: 5 },
    "J": { note: "F#", octaveOffset: 5 },
    "K": { note: "G", octaveOffset: 5 },
    "L": { note: "G#", octaveOffset: 5 },
    ":": { note: "A", octaveOffset: 5 },
    "\"": { note: "A#", octaveOffset: 5 },

    // Octava 6 (C6-B6) - Tercera fila del teclado ZXCV (minúsculas)
    "z": { note: "C", octaveOffset: 6 },
    "x": { note: "C#", octaveOffset: 6 },
    "c": { note: "D", octaveOffset: 6 },
    "v": { note: "D#", octaveOffset: 6 },
    "b": { note: "E", octaveOffset: 6 },
    "n": { note: "F", octaveOffset: 6 },
    "m": { note: "F#", octaveOffset: 6 },
    ",": { note: "G", octaveOffset: 6 },
    ".": { note: "G#", octaveOffset: 6 },
    "/": { note: "A", octaveOffset: 6 },
    "?": { note: "A#", octaveOffset: 6 },
    " ": { note: "B", octaveOffset: 6 }, // Barra espaciadora

    // ===== OCTAVAS AGUDAS =====
    // Octava 7 (C7-B7) - Tercera fila del teclado ZXCV (mayúsculas)
    "Z": { note: "C", octaveOffset: 7 },
    "X": { note: "C#", octaveOffset: 7 },
    "C": { note: "D", octaveOffset: 7 },
    "V": { note: "D#", octaveOffset: 7 },
    "B": { note: "E", octaveOffset: 7 },
    "N": { note: "F", octaveOffset: 7 },
    "M": { note: "F#", octaveOffset: 7 },
    "<": { note: "G", octaveOffset: 7 },
    ">": { note: "G#", octaveOffset: 7 },
    "\\": { note: "A", octaveOffset: 7 },
    "|": { note: "A#", octaveOffset: 7 },
    "Tab": { note: "B", octaveOffset: 7 },

    // Octava 8 (C8) - Teclas especiales
    "0": { note: "C", octaveOffset: 8 },
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

      // Mantener case-sensitive para diferenciar A de a
      const key = event.key;
      if (keyMapping[key]) {
        const { note, octaveOffset } = keyMapping[key];
        const targetOctave = octaveOffset; // Ahora octaveOffset ES la octava absoluta
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

      // Mantener case-sensitive para diferenciar A de a  
      const key = event.key;
      if (keyMapping[key]) {
        const { note, octaveOffset } = keyMapping[key];
        const targetOctave = octaveOffset; // Ahora octaveOffset ES la octava absoluta
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
      return mapping.note === note && mapping.octaveOffset === octave;
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

  // Renderizar teclado cromático completo (88 teclas: A0 a C8)
  const renderKeyboard = () => {
    // Piano completo de 88 teclas: A0 hasta C8
    const fullPianoRange = [
      // Octava 0: Solo A0, A#0, B0 (primeras 3 teclas)
      { octave: 0, keys: ["A", "A#", "B"] },
      // Octavas 1-7: Todas las notas (12 teclas cada una)
      { octave: 1, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      { octave: 2, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      { octave: 3, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      { octave: 4, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      { octave: 5, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      { octave: 6, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      { octave: 7, keys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] },
      // Octava 8: Solo C8 (última tecla)
      { octave: 8, keys: ["C"] }
    ];

    return (
      <div className="relative flex overflow-x-auto pb-4">
        <div className="flex min-w-max">
          {fullPianoRange.map(({ octave, keys }) => {
            // Para octavas parciales, necesitamos ajustar el layout
            const whiteKeys = keys.filter(note => !note.includes("#"));
            const hasBlackKeys = keys.some(note => note.includes("#"));

            return (
              <div key={octave} className="relative flex">
                {/* Teclas blancas */}
                <div className="flex">
                  {whiteKeys.map((note) => (
                    <PianoKey key={`${note}-${octave}`} note={note} octave={octave} />
                  ))}
                </div>

                {/* Teclas negras - solo si hay teclas negras en esta octava */}
                {hasBlackKeys && (
                  <div className="absolute top-0 left-6 flex">
                    {["C#", "D#", null, "F#", "G#", "A#", null].map((note, index) => (
                      <div key={`${note}-${octave}-${index}`} className="w-12 flex justify-center">
                        {note && keys.includes(note) && (
                          <PianoKey note={note} octave={octave} isBlack />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
