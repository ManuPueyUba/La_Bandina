'use client';

import { useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

interface TutorialPianoProps {
  highlightedKeys: Set<string>;
  onKeyPress?: (key: string) => void;
}

export default function TutorialPiano({ highlightedKeys, onKeyPress }: TutorialPianoProps) {
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

    console.log('Releasing note:', noteWithOctave);
    synth.triggerRelease(noteWithOctave);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(noteWithOctave);
      return newSet;
    });
  }, [synth]);

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
              : `w-12 h-48 hover:bg-gray-50 border border-gray-300 rounded-b-md
               ${isHighlighted 
                  ? "bg-blue-100 border-blue-300 hover:bg-blue-200 ring-2 ring-blue-400" 
                  : "bg-white"
                }
               ${isPressed ? "bg-gray-200 transform translate-y-1" : ""}`
          }
          ${isPressed ? "shadow-inner" : "shadow-md"}
        `}
        onMouseDown={async () => {
          if (!audioInitialized) {
            await initAudio();
          }
          playNote(noteWithOctave);
        }}
        onMouseUp={() => releaseNote(noteWithOctave)}
        onMouseLeave={() => releaseNote(noteWithOctave)}
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
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-center mb-4">
        <div className="max-w-full overflow-x-auto">
          {renderKeyboard()}
        </div>
      </div>
      
      {highlightedKeys.size > 0 && (
        <div className="text-center text-sm text-blue-600">
          <p>🎹 Las teclas azules indican las notas de la canción</p>
        </div>
      )}
      
      {!audioInitialized && (
        <div className="text-center text-sm text-gray-500 mt-2">
          <p>Haz clic en cualquier tecla para activar el audio</p>
        </div>
      )}

      {/* Guía de teclas del teclado */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center text-sm text-gray-700 mb-2">
          <strong>🎼 Guía del Teclado</strong>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-semibold mb-1">Octava Base (4):</p>
            <p>A=C, W=C#, S=D, E=D#, D=E, F=F</p>
            <p>T=F#, G=G, Y=G#, H=A, U=A#, J=B</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Octava Superior (5):</p>
            <p>K=C, O=C#, L=D, P=D#, ;=E, Z=F</p>
            <p>X=G, C=A, V=B</p>
          </div>
          <div>
            <p className="font-semibold mb-1">Octava Alta (6):</p>
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
