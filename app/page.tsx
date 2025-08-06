"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RotateCcw, Volume2, Settings } from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth/AuthButton"

// Tipos para las notas y escalas
type Note = string
type Scale = "major" | "minor" | "chromatic"

interface RecordedNote {
  note: string
  time: number
  duration: number
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
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(-10)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [keyMapping, setKeyMapping] = useState(DEFAULT_KEY_MAPPING)

  const recordingStartTime = useRef<number>(0)
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

      // Grabación
      if (isRecording) {
        const currentTime = Tone.now() * 1000 - recordingStartTime.current
        pressedNotesRef.current.set(noteKey, currentTime)
      }
    },
    [synth, isRecording],
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

      // Grabación - calcular duración
      if (isRecording && pressedNotesRef.current.has(noteKey)) {
        const startTime = pressedNotesRef.current.get(noteKey)!
        const currentTime = Tone.now() * 1000 - recordingStartTime.current
        const duration = currentTime - startTime

        setRecordedNotes((prev) => [
          ...prev,
          {
            note: noteWithOctave,
            time: startTime,
            duration: duration,
          },
        ])

        pressedNotesRef.current.delete(noteKey)
      }
    },
    [synth, isRecording],
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

  // Iniciar grabación
  const startRecording = () => {
    setRecordedNotes([])
    setIsRecording(true)
    recordingStartTime.current = Tone.now() * 1000
    pressedNotesRef.current.clear()
  }

  // Detener grabación
  const stopRecording = () => {
    setIsRecording(false)
    // Finalizar notas que aún están presionadas
    pressedNotesRef.current.forEach((startTime, note) => {
      const currentTime = Tone.now() * 1000 - recordingStartTime.current
      const duration = currentTime - startTime
      setRecordedNotes((prev) => [
        ...prev,
        {
          note: getNoteWithOctave(note),
          time: startTime,
          duration: duration,
        },
      ])
    })
    pressedNotesRef.current.clear()
  }

  // Reproducir grabación
  const playRecording = async () => {
    if (!synth || recordedNotes.length === 0) return

    setIsPlaying(true)

    // Ordenar notas por tiempo
    const sortedNotes = [...recordedNotes].sort((a, b) => a.time - b.time)

    sortedNotes.forEach(({ note, time, duration }) => {
      Tone.Transport.schedule(
        () => {
          synth.triggerAttackRelease(note, duration / 1000)
        },
        `+${time / 1000}`,
      )
    })

    Tone.Transport.start()

    // Detener después de la última nota
    const lastNote = sortedNotes[sortedNotes.length - 1]
    const totalDuration = lastNote.time + lastNote.duration

    setTimeout(() => {
      Tone.Transport.stop()
      Tone.Transport.cancel()
      setIsPlaying(false)
    }, totalDuration + 1000)
  }

  // Limpiar grabación
  const clearRecording = () => {
    setRecordedNotes([])
    setIsRecording(false)
    setIsPlaying(false)
    Tone.Transport.stop()
    Tone.Transport.cancel()
  }

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
    const isPressed = pressedKeys.has(noteKey)
    const keyboardKey = Object.keys(keyMapping).find((k) => {
      const mapping = keyMapping[k]
      return mapping.note === note && (currentOctave + mapping.octaveOffset) === octave
    })

    return (
      <button
        className={`
          relative select-none transition-all duration-75
          ${
            isBlack
              ? `w-8 h-32 bg-gray-900 hover:bg-gray-800 -mx-4 z-10 rounded-b-md
               ${isPressed ? "bg-gray-700 transform translate-y-1" : ""}`
              : `w-12 h-48 bg-white hover:bg-gray-50 border border-gray-300 rounded-b-md
               ${isPressed ? "bg-gray-200 transform translate-y-1" : ""}`
          }
          ${isPressed ? "shadow-inner" : "shadow-md"}
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
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
            <div>{keyboardKey?.toUpperCase()}</div>
            <div className="text-[10px] text-gray-400">{note}{octave}</div>
          </div>
        )}
        
        {/* Mostrar información en teclas negras */}
        {isBlack && keyboardKey && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white">
            <div className="font-semibold">{keyboardKey.toUpperCase()}</div>
            <div className="text-[10px] text-gray-300">{note}{octave}</div>
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Piano Virtual Interactivo
              </CardTitle>
              <div className="flex items-center gap-3">
                <AuthButton />
                <Link href="/config">
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Teclas
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Inicialización de Audio */}
        {!audioInitialized && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="mb-4 text-gray-600">
                Para comenzar a usar el piano, necesitas inicializar el audio.
              </p>
              <Button 
                onClick={initAudio}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                🎵 Inicializar Audio
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <label className="block text-sm font-medium mb-2">Octava Base</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentOctave(Math.max(1, currentOctave - 1))}
                  disabled={currentOctave <= 1}
                >
                  -
                </Button>
                <span className="flex-1 text-center py-1 font-mono">
                  {currentOctave}
                  <span className="text-xs text-gray-500">
                    -{currentOctave + numberOfOctaves - 1}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentOctave(Math.min(8 - numberOfOctaves, currentOctave + 1))}
                  disabled={currentOctave + numberOfOctaves > 7}
                >
                  +
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <label className="block text-sm font-medium mb-2">Escala</label>
              <Select value={currentScale} onValueChange={(value: Scale) => setCurrentScale(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromatic">Cromática</SelectItem>
                  <SelectItem value="major">Mayor</SelectItem>
                  <SelectItem value="minor">Menor</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <label className="block text-sm font-medium mb-2">
                <Volume2 className="inline w-4 h-4 mr-1" />
                Volumen
              </label>
              <input
                type="range"
                min="-30"
                max="0"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <label className="block text-sm font-medium mb-2">Grabación</label>
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button size="sm" onClick={startRecording} className="flex-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    Grabar
                  </Button>
                ) : (
                  <Button size="sm" onClick={stopRecording} variant="destructive" className="flex-1">
                    <Square className="w-3 h-3 mr-1" />
                    Parar
                  </Button>
                )}
              </div>
              {recordedNotes.length > 0 && (
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={playRecording}
                    disabled={isPlaying}
                    className="flex-1 bg-transparent"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {isPlaying ? "Reproduciendo..." : "Reproducir"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearRecording}>
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Piano */}
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="max-w-full overflow-x-auto">
                {renderKeyboard()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">🎵 Instrucciones:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p>
                  <strong>Teclado físico:</strong> Usa las teclas configuradas (A-J primera octava, K-V segunda octava, B-/ tercera octava)
                </p>
                <p>
                  <strong>Mouse/Touch:</strong> Haz clic en las teclas del piano
                </p>
              </div>
              <div>
                <p>
                  <strong>3 Octavas:</strong> Piano con 3 octavas fijas para mayor rango
                </p>
                <p>
                  <strong>Configuración:</strong> Personaliza el mapeo de teclas en el botón "Configurar Teclas"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estado de grabación */}
        {(isRecording || recordedNotes.length > 0) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {isRecording && (
                    <div className="flex items-center text-red-600">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      Grabando...
                    </div>
                  )}
                  {recordedNotes.length > 0 && !isRecording && (
                    <div className="text-green-600">✓ {recordedNotes.length} notas grabadas</div>
                  )}
                </div>
                {isPlaying && <div className="text-blue-600">🎵 Reproduciendo...</div>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
