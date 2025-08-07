"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RotateCcw, Volume2, Settings, Music, Mic } from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth/AuthButton"

// Tipos para las notas y escalas
type Note = string
type Scale = "major" | "minor" | "chromatic"

// Mapeo por defecto de teclas del teclado físico a notas
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
}

// Escalas musicales
const SCALES = {
  major: ["C", "D", "E", "F", "G", "A", "B"],
  minor: ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
  chromatic: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
}

export default function VirtualPiano() {
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null)
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [currentOctave, setCurrentOctave] = useState(4)
  const numberOfOctaves = 3 // Fijo en 3 octavas
  const [currentScale, setCurrentScale] = useState<Scale>("chromatic")
  const [volume, setVolume] = useState(-10)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [keyMapping, setKeyMapping] = useState(DEFAULT_KEY_MAPPING)
  const [tutorialHighlightedKeys, setTutorialHighlightedKeys] = useState<Set<string>>(new Set())
  const [tutorialUpcomingNotes, setTutorialUpcomingNotes] = useState<string[]>([])
  const [showControls, setShowControls] = useState(false)

  const pressedNotesRef = useRef<Map<string, number>>(new Map())

  // Cargar configuración de teclas desde localStorage
  useEffect(() => {
    const savedMapping = localStorage.getItem("pianoKeyMapping")
    if (savedMapping) {
      try {
        setKeyMapping(JSON.parse(savedMapping))
      } catch (error) {
        console.error("Error loading saved key mapping:", error)
      }
    }
  }, [])

  // Escuchar las teclas resaltadas del tutorial - versión simplificada
  useEffect(() => {
    const checkTutorialKeys = () => {
      if (typeof window !== 'undefined') {
        const highlightedKeys = (window as any).tutorialHighlightedKeys as Set<string> | undefined;
        const upcomingNotes = (window as any).tutorialUpcomingNotes as string[] | undefined;
        
        if (highlightedKeys instanceof Set) {
          setTutorialHighlightedKeys(new Set(highlightedKeys));
        } else {
          setTutorialHighlightedKeys(new Set());
        }
        
        if (Array.isArray(upcomingNotes)) {
          setTutorialUpcomingNotes(upcomingNotes);
        } else {
          setTutorialUpcomingNotes([]);
        }
      }
    };

    // Verificar inmediatamente
    checkTutorialKeys();
    
    // Verificar periódicamente (cada 500ms para reducir carga)
    const interval = setInterval(checkTutorialKeys, 500);
    
    return () => clearInterval(interval);
  }, []); // Sin dependencias para evitar re-renders

  // Inicializar el sintetizador
  const initAudio = async () => {
    try {
      if (Tone.context.state === 'suspended') {
        await Tone.start()
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
      }).toDestination()

      polySynth.volume.value = volume
      setSynth(polySynth)
      setAudioInitialized(true)
    } catch (error) {
      console.error('Error initializing audio:', error)
    }
  }

  // Limpiar sintetizador al desmontar
  useEffect(() => {
    return () => {
      if (synth) {
        synth.dispose()
      }
    }
  }, [synth])

  // Actualizar volumen
  useEffect(() => {
    if (synth) {
      synth.volume.value = volume
    }
  }, [synth, volume])

  // Obtener notas de la escala actual
  const getScaleNotes = useCallback(() => {
    return SCALES[currentScale]
  }, [currentScale])

  // Convertir nota a frecuencia con octava
  const getNoteWithOctave = useCallback(
    (note: string) => {
      return `${note}${currentOctave}`
    },
    [currentOctave],
  )

  // Tocar una nota con octava específica
  const playNoteWithOctave = useCallback(
    async (note: string, octave: number) => {
      if (!synth) {
        console.log('Synth not initialized')
        return
      }

      // Asegurar que el contexto de audio esté activo
      if (Tone.context.state === 'suspended') {
        await Tone.start()
      }

      const noteWithOctave = `${note}${octave}`
      console.log('Playing note:', noteWithOctave)
      synth.triggerAttack(noteWithOctave)

      const noteKey = `${note}-${octave}`
      setPressedKeys((prev) => new Set([...prev, noteKey]))
    },
    [synth],
  )

  // Tocar una nota (mantener compatibilidad con octava actual)
  const playNote = useCallback(
    (note: string) => {
      playNoteWithOctave(note, currentOctave)
    },
    [playNoteWithOctave, currentOctave],
  )

  // Soltar una nota con octava específica
  const releaseNoteWithOctave = useCallback(
    (note: string, octave: number) => {
      if (!synth) return

      const noteWithOctave = `${note}${octave}`
      console.log('Releasing note:', noteWithOctave)
      synth.triggerRelease(noteWithOctave)

      const noteKey = `${note}-${octave}`
      setPressedKeys((prev) => {
        const newSet = new Set(prev)
        newSet.delete(noteKey)
        return newSet
      })
    },
    [synth],
  )

  // Soltar una nota (mantener compatibilidad con octava actual)
  const releaseNote = useCallback(
    (note: string) => {
      releaseNoteWithOctave(note, currentOctave)
    },
    [releaseNoteWithOctave, currentOctave],
  )

  // Manejar eventos del teclado
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // No capturar teclas si hay un input/textarea enfocado o un modal abierto
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('.modal') ||
        document.querySelector('[data-modal-open="true"]')
      )
      
      if (isInputFocused) {
        return // No hacer nada si hay un input enfocado o modal abierto
      }

      const key = event.key.toLowerCase()
      if (keyMapping[key]) {
        const { note, octaveOffset } = keyMapping[key]
        const targetOctave = currentOctave + octaveOffset
        const noteKey = `${note}-${targetOctave}`
        
        if (!pressedKeys.has(noteKey)) {
          event.preventDefault()
          if (!audioInitialized) {
            await initAudio()
          }
          playNoteWithOctave(note, targetOctave)
        }
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      // No capturar teclas si hay un input/textarea enfocado o un modal abierto
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.closest('[role="dialog"]') ||
        activeElement.closest('.modal') ||
        document.querySelector('[data-modal-open="true"]')
      )
      
      if (isInputFocused) {
        return // No hacer nada si hay un input enfocado o modal abierto
      }

      const key = event.key.toLowerCase()
      if (keyMapping[key]) {
        const { note, octaveOffset } = keyMapping[key]
        const targetOctave = currentOctave + octaveOffset
        event.preventDefault()
        releaseNoteWithOctave(note, targetOctave)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [playNoteWithOctave, releaseNoteWithOctave, pressedKeys, currentOctave, audioInitialized, initAudio, keyMapping])



  // Componente de tecla individual
  const PianoKey = ({ 
    note, 
    octave, 
    isBlack = false 
  }: { 
    note: string; 
    octave: number; 
    isBlack?: boolean 
  }) => {
    const noteKey = `${note}-${octave}`
    const noteWithOctave = `${note}${octave}`
    const isPressed = pressedKeys.has(noteKey)
    const isTutorialHighlighted = tutorialHighlightedKeys.has(noteWithOctave)
    const isTutorialUpcoming = tutorialUpcomingNotes.includes(noteWithOctave)
    
    const keyboardKey = Object.keys(keyMapping).find((k) => {
      const mapping = keyMapping[k]
      return mapping.note === note && (currentOctave + mapping.octaveOffset) === octave
    })

    return (
      <button
        className={`
          relative select-none transition-all duration-100
          ${
            isBlack
              ? `w-8 h-32 -mx-4 z-10 rounded-b-md border-b-2 border-gray-800
               ${isTutorialHighlighted 
                  ? "bg-blue-500 hover:bg-blue-600 shadow-lg" 
                  : isTutorialUpcoming
                    ? "bg-blue-400 hover:bg-blue-500"
                    : "bg-gray-900 hover:bg-gray-800"
                }
               ${isPressed ? "transform translate-y-1 shadow-inner" : "shadow-md"}`
              : `w-12 h-48 border border-gray-300 rounded-b-md
               ${isTutorialHighlighted 
                  ? "bg-blue-100 border-blue-300 hover:bg-blue-200" 
                  : isTutorialUpcoming
                    ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                    : "bg-white hover:bg-gray-50"
                }
               ${isPressed ? "bg-gray-100 transform translate-y-1 shadow-inner" : "shadow-sm"}`
          }
          ${isTutorialHighlighted ? "ring-2 ring-blue-400" : ""}
        `}
        onMouseDown={async () => {
          if (!audioInitialized) {
            await initAudio()
          }
          playNoteWithOctave(note, octave)
        }}
        onMouseUp={() => releaseNoteWithOctave(note, octave)}
        onMouseLeave={() => releaseNoteWithOctave(note, octave)}
        onTouchStart={async (e) => {
          e.preventDefault()
          if (!audioInitialized) {
            await initAudio()
          }
          playNoteWithOctave(note, octave)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          releaseNoteWithOctave(note, octave)
        }}
      >
        {/* Mostrar información en teclas blancas */}
        {!isBlack && (
          <div className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 text-center ${
            isTutorialHighlighted || isTutorialUpcoming ? 'text-blue-700' : 'text-gray-500'
          }`}>
            <div className="text-xs font-medium">{keyboardKey?.toUpperCase()}</div>
            <div className={`text-[10px] font-mono ${
              isTutorialHighlighted || isTutorialUpcoming ? 'text-blue-600' : 'text-gray-400'
            }`}>{note}{octave}</div>
          </div>
        )}
        
        {/* Mostrar información en teclas negras */}
        {isBlack && keyboardKey && (
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 text-center text-white">
            <div className="text-xs font-medium">{keyboardKey.toUpperCase()}</div>
            <div className="text-[10px] font-mono text-gray-300">{note}{octave}</div>
          </div>
        )}
      </button>
    )
  }

  // Renderizar teclado según la escala y número de octavas
  const renderKeyboard = () => {
    const notes = getScaleNotes()
    const octaves = Array.from({ length: numberOfOctaves }, (_, i) => currentOctave + i)

    if (currentScale === "chromatic") {
      // Teclado completo con teclas negras para múltiples octavas
      const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"]
      const blackKeys = ["C#", "D#", null, "F#", "G#", "A#", null] // null para espacios

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
      )
    } else {
      // Solo teclas de la escala seleccionada para múltiples octavas
      return (
        <div className="flex overflow-x-auto">
          {octaves.map((octave) => (
            <div key={octave} className="flex border-r border-gray-200 pr-2 mr-2 last:border-r-0 last:pr-0 last:mr-0">
              {notes.map((note) => (
                <PianoKey key={`${note}-${octave}`} note={note} octave={octave} />
              ))}
            </div>
          ))}
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header minimalista */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light text-white">Piano</h1>
            
            {/* Botón de menú (hamburguer) */}
            <button
              onClick={() => setShowControls(!showControls)}
              className="p-2 rounded hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Menú desplegable oculto */}
        {showControls && (
          <div className="mb-8 bg-gray-900 border border-gray-700 rounded-lg p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Navegación */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Navegación</h3>
                <div className="space-y-2">
                  <Link href="/songs">
                    <button className="w-full text-left p-2 rounded hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                      Canciones
                    </button>
                  </Link>
                  <Link href="/config">
                    <button className="w-full text-left p-2 rounded hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                      Configurar Teclas
                    </button>
                  </Link>
                </div>
              </div>

              {/* Octava */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Octava</h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setCurrentOctave(Math.max(1, currentOctave - 1))}
                    disabled={currentOctave <= 1}
                    className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono text-lg text-white min-w-[3rem] text-center">
                    {currentOctave}
                  </span>
                  <button
                    onClick={() => setCurrentOctave(Math.min(8 - numberOfOctaves, currentOctave + 1))}
                    disabled={currentOctave + numberOfOctaves > 7}
                    className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Escala */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Escala</h3>
                <Select value={currentScale} onValueChange={(value: Scale) => setCurrentScale(value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="chromatic">Cromática</SelectItem>
                    <SelectItem value="major">Mayor</SelectItem>
                    <SelectItem value="minor">Menor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Volumen */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Volumen</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="-30"
                    max="0"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none slider"
                  />
                  <div className="text-xs text-gray-400 text-center">{volume}dB</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inicialización de Audio */}
        {!audioInitialized && (
          <div className="mb-8 bg-gray-900 border border-gray-700 rounded-lg p-8 text-center">
            <p className="mb-4 text-gray-300">
              Presiona para inicializar el audio del piano
            </p>
            <button 
              onClick={initAudio}
              className="px-6 py-3 bg-white text-black rounded hover:bg-gray-200 transition-colors font-medium"
            >
              Inicializar Piano
            </button>
          </div>
        )}

        {/* Piano */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
          <div className="flex justify-center overflow-x-auto">
            {renderKeyboard()}
          </div>
        </div>

        {/* Instrucciones minimalistas */}
        <div className="text-center text-gray-400 text-sm space-y-2">
          <p>Usa tu teclado físico o haz clic en las teclas del piano</p>
          {tutorialHighlightedKeys.size > 0 && (
            <p className="text-blue-400">Las teclas azules indican las notas a tocar</p>
          )}
        </div>
      </div>
    </div>
  )
}
