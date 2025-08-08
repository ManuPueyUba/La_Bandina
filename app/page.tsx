"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as Tone from "tone"
import { Midi } from "@tonejs/midi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RotateCcw, Volume2, Settings, Music, Mic, Download, Save } from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth/AuthButton"
import { ApiClient, CreateRecordingRequest, RecordingResponse } from "@/lib/api"

// Tipos para las notas y escalas
type Note = string
type Scale = "major" | "minor" | "chromatic"

// Interfaces para grabación
interface RecordedNote {
  note: string
  octave: number
  startTime: number
  endTime?: number
  velocity: number
}

interface Recording {
  id: string
  name: string
  notes: RecordedNote[]
  duration: number
  createdAt: Date
}

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

  // Estados para grabación
  const [isRecording, setIsRecording] = useState(false)
  const [currentRecording, setCurrentRecording] = useState<RecordedNote[]>([])
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)

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

  // Funciones de grabación
  const recordNote = useCallback((note: string, octave: number, isNoteOn: boolean) => {
    if (!isRecording || !recordingStartTime) return

    const currentTime = Date.now() - recordingStartTime

    if (isNoteOn) {
      // Nota presionada
      const recordedNote: RecordedNote = {
        note,
        octave,
        startTime: currentTime,
        velocity: 0.7 // Velocidad fija por ahora
      }
      setCurrentRecording(prev => [...prev, recordedNote])
    } else {
      // Nota liberada - actualizar endTime
      setCurrentRecording(prev => 
        prev.map(recordedNote => {
          if (recordedNote.note === note && 
              recordedNote.octave === octave && 
              !recordedNote.endTime) {
            return { ...recordedNote, endTime: currentTime }
          }
          return recordedNote
        })
      )
    }
  }, [isRecording, recordingStartTime])

  const startRecording = useCallback(() => {
    setIsRecording(true)
    setCurrentRecording([])
    setRecordingStartTime(Date.now())
  }, [])

  const stopRecording = useCallback(async () => {
    setIsRecording(false)
    if (currentRecording.length > 0 && recordingStartTime) {
      const duration = Date.now() - recordingStartTime
      
      try {
        // Preparar datos para el backend
        const recordingData: CreateRecordingRequest = {
          title: `Grabación ${recordings.length + 1}`,
          artist: "Usuario",
          bpm: 120, // BPM por defecto
          key_signature: "C major",
          description: `Grabación realizada el ${new Date().toLocaleString()}`,
          notes: currentRecording.map(note => ({
            note: note.note,
            octave: note.octave,
            start_time: note.startTime,
            end_time: note.endTime || note.startTime + 500, // Si no hay endTime, usar 500ms por defecto
            velocity: note.velocity
          }))
        }

        // Enviar al backend
        const backendRecording = await ApiClient.createRecording(recordingData)
        
        // Crear recording local para la UI
        const newRecording: Recording = {
          id: backendRecording.id,
          name: backendRecording.title,
          notes: currentRecording,
          duration,
          createdAt: new Date()
        }
        
        setRecordings(prev => [...prev, newRecording])
        console.log('Grabación guardada en el backend:', backendRecording)
      } catch (error) {
        console.error('Error al guardar la grabación:', error)
        // Fallback: guardar localmente si falla el backend
        const newRecording: Recording = {
          id: `recording-${Date.now()}`,
          name: `Grabación ${recordings.length + 1}`,
          notes: currentRecording,
          duration,
          createdAt: new Date()
        }
        setRecordings(prev => [...prev, newRecording])
        alert('No se pudo conectar con el servidor. La grabación se guardó localmente.')
      }
    }
    setCurrentRecording([])
    setRecordingStartTime(null)
  }, [currentRecording, recordingStartTime, recordings.length])

  const exportToMidi = useCallback(async (recording: Recording) => {
    try {
      // Intentar usar el backend primero
      const midiBlob = await ApiClient.exportRecordingAsMidi(recording.id)
      
      // Crear y descargar el archivo desde el backend
      const url = URL.createObjectURL(midiBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recording.name}.mid`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
    } catch (error) {
      console.error('Error exporting from backend, falling back to local:', error)
      
      // Fallback: generar MIDI localmente
      try {
        const midi = new Midi()
        const track = midi.addTrack()

        // Convertir las notas grabadas a eventos MIDI
        recording.notes.forEach(recordedNote => {
          const { note, octave, startTime, endTime, velocity } = recordedNote
          const startTimeSeconds = startTime / 1000
          const duration = endTime ? (endTime - startTime) / 1000 : 0.5

          // Convertir nota a número MIDI manualmente
          const noteToMidi = (note: string, octave: number): number => {
            const noteMap: { [key: string]: number } = {
              'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
              'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
            }
            return (octave + 1) * 12 + (noteMap[note] || 0)
          }

          track.addNote({
            midi: noteToMidi(note, octave),
            time: startTimeSeconds,
            duration: duration,
            velocity: velocity
          })
        })

        // Crear y descargar el archivo
        const midiData = midi.toArray()
        const blob = new Blob([new Uint8Array(midiData)], { type: 'audio/midi' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${recording.name}.mid`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
      } catch (localError) {
        console.error('Error exporting MIDI locally:', localError)
        alert('Error al exportar el archivo MIDI')
      }
    }
  }, [])

  const saveRecordingForTutorial = useCallback(async (recording: Recording) => {
    try {
      // Convert recording to song format using backend
      await ApiClient.convertRecordingToSong(recording.id, { 
        title: recording.name,
        difficulty: 'beginner',
        category: 'manual_recording'
      })
      
      alert(`Tutorial "${recording.name}" convertido y guardado correctamente`)
    } catch (error) {
      console.error('Error converting recording to tutorial:', error)
      alert('Error al convertir la grabación a tutorial')
    }
  }, [])

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

      // Grabar la nota si está grabando
      recordNote(note, octave, true)

      const noteKey = `${note}-${octave}`
      setPressedKeys((prev) => new Set([...prev, noteKey]))
    },
    [synth, recordNote],
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

      // Grabar la nota si está grabando
      recordNote(note, octave, false)

      const noteKey = `${note}-${octave}`
      setPressedKeys((prev) => {
        const newSet = new Set(prev)
        newSet.delete(noteKey)
        return newSet
      })
    },
    [synth, recordNote],
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
          relative select-none transition-all duration-100 flex-shrink-0
          ${
            isBlack
              ? `w-7 h-48 z-10 rounded-b-md border-b-2 border-gray-800
               ${isTutorialHighlighted 
                  ? "bg-blue-500 hover:bg-blue-600 shadow-lg" 
                  : isTutorialUpcoming
                    ? "bg-blue-400 hover:bg-blue-500"
                    : "bg-gray-900 hover:bg-gray-800"
                }
               ${isPressed ? "transform translate-y-1 shadow-inner" : "shadow-md"}`
              : `flex-1 min-w-0 h-72 border border-gray-300 rounded-b-md
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
          <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center ${
            isTutorialHighlighted || isTutorialUpcoming ? 'text-blue-700' : 'text-gray-500'
          }`}>
            <div className="text-sm font-bold">{keyboardKey?.toUpperCase()}</div>
            <div className={`text-xs font-mono ${
              isTutorialHighlighted || isTutorialUpcoming ? 'text-blue-600' : 'text-gray-400'
            }`}>{note}{octave}</div>
          </div>
        )}
        
        {/* Mostrar información en teclas negras */}
        {isBlack && keyboardKey && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-white">
            <div className="text-sm font-bold">{keyboardKey.toUpperCase()}</div>
            <div className="text-xs font-mono text-gray-300">{note}{octave}</div>
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
        <div className="w-full flex">
          {octaves.map((octave) => (
            <div key={octave} className="relative flex flex-1">
              {/* Teclas blancas */}
              <div className="flex flex-1">
                {whiteKeys.map((note) => (
                  <PianoKey key={`${note}-${octave}`} note={note} octave={octave} />
                ))}
              </div>

              {/* Teclas negras - posicionadas correctamente entre las blancas */}
              <div className="absolute top-0 left-0 w-full flex pointer-events-none">
                {/* C# - entre C y D */}
                <div className="flex-1 flex justify-center pl-4">
                  <div className="pointer-events-auto">
                    <PianoKey note="C#" octave={octave} isBlack />
                  </div>
                </div>
                {/* D# - entre D y E */}
                <div className="flex-1 flex justify-center pl-4">
                  <div className="pointer-events-auto">
                    <PianoKey note="D#" octave={octave} isBlack />
                  </div>
                </div>
                {/* Espacio para E (sin sostenido) */}
                <div className="flex-1"></div>
                {/* F# - entre F y G */}
                <div className="flex-1 flex justify-center pl-4">
                  <div className="pointer-events-auto">
                    <PianoKey note="F#" octave={octave} isBlack />
                  </div>
                </div>
                {/* G# - entre G y A */}
                <div className="flex-1 flex justify-center pl-4">
                  <div className="pointer-events-auto">
                    <PianoKey note="G#" octave={octave} isBlack />
                  </div>
                </div>
                {/* A# - entre A y B */}
                <div className="flex-1 flex justify-center pl-4">
                  <div className="pointer-events-auto">
                    <PianoKey note="A#" octave={octave} isBlack />
                  </div>
                </div>
                {/* Espacio para B (sin sostenido) */}
                <div className="flex-1"></div>
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header minimalista */}
      <div className="border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
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

      {/* Contenido principal que se expande */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">
          {/* Menú desplegable simplificado */}
          {showControls && (
            <div className="mb-6 bg-gray-900 border border-gray-700 rounded-lg p-6 flex-shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {/* Configuración de Escala */}
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
              </div>
            </div>
          )}

          {/* Piano con controles integrados */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col">
            {/* Controles superiores */}
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
              {/* Panel izquierdo - Grabación */}
              <div className="flex items-center space-x-4">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  } transition-colors`}
                  size="sm"
                >
                  {isRecording ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Parar
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-2" />
                      Grabar
                    </>
                  )}
                </Button>
                {recordings.length > 0 && (
                  <div className="text-xs text-gray-400">
                    {recordings.length} grabación{recordings.length !== 1 ? 'es' : ''}
                  </div>
                )}
              </div>

              {/* Panel central - Octava */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-400">Octava:</span>
                <button
                  onClick={() => setCurrentOctave(Math.max(1, currentOctave - 1))}
                  disabled={currentOctave <= 1}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                >
                  -
                </button>
                <span className="font-mono text-lg text-white min-w-[2rem] text-center">
                  {currentOctave}
                </span>
                <button
                  onClick={() => setCurrentOctave(Math.min(8 - numberOfOctaves, currentOctave + 1))}
                  disabled={currentOctave + numberOfOctaves > 7}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                >
                  +
                </button>
              </div>

              {/* Panel derecho - Volumen */}
              <div className="flex items-center space-x-3">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <div className="relative w-20">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(((volume + 30) / 30) * 100)}
                    onChange={(e) => {
                      const normalizedValue = (Number(e.target.value) / 100) * 30 - 30
                      setVolume(normalizedValue)
                    }}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-custom"
                  />
                  <style jsx>{`
                    .slider-custom::-webkit-slider-thumb {
                      appearance: none;
                      height: 16px;
                      width: 16px;
                      border-radius: 50%;
                      background: white;
                      cursor: pointer;
                      box-shadow: 0 0 2px rgba(0,0,0,0.3);
                    }
                    .slider-custom::-moz-range-thumb {
                      height: 16px;
                      width: 16px;
                      border-radius: 50%;
                      background: white;
                      cursor: pointer;
                      border: none;
                      box-shadow: 0 0 2px rgba(0,0,0,0.3);
                    }
                  `}</style>
                </div>
                <span className="text-xs text-gray-400 min-w-[3rem]">{Math.round(((volume + 30) / 30) * 100)}%</span>
              </div>
            </div>

            {/* Piano */}
            <div className="flex justify-center items-center">
              <div className="w-full max-w-7xl">
                {renderKeyboard()}
              </div>
            </div>
          </div>

          {/* Lista de grabaciones */}
          {recordings.length > 0 && (
            <div className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-6 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white mb-4">Grabaciones</h3>
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <div key={recording.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-medium">{recording.name}</h4>
                      <div className="text-xs text-gray-400">
                        {(recording.duration / 1000).toFixed(1)}s • {recording.notes.length} notas
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => exportToMidi(recording)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        MIDI
                      </Button>
                      <Button
                        onClick={() => saveRecordingForTutorial(recording)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Tutorial
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instrucciones minimalistas */}
          <div className="text-center text-gray-400 text-sm space-y-1 mt-4 flex-shrink-0">
            <p>Usa tu teclado físico o haz clic en las teclas del piano</p>
            {tutorialHighlightedKeys.size > 0 && (
              <p className="text-blue-400">Las teclas azules indican las notas a tocar</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
