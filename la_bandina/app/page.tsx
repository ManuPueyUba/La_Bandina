"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as Tone from "tone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RotateCcw, Volume2 } from "lucide-react"

// Tipos para las notas y escalas
type Note = string
type Scale = "major" | "minor" | "chromatic"

interface RecordedNote {
  note: string
  time: number
  duration: number
}

// Mapeo de teclas del teclado físico a notas
const KEY_MAPPING: { [key: string]: string } = {
  a: "C",
  w: "C#",
  s: "D",
  e: "D#",
  d: "E",
  f: "F",
  t: "F#",
  g: "G",
  y: "G#",
  h: "A",
  u: "A#",
  j: "B",
  k: "C",
  o: "C#",
  l: "D",
  p: "D#",
  ";": "E",
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
  const [currentScale, setCurrentScale] = useState<Scale>("chromatic")
  const [isRecording, setIsRecording] = useState(false)
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(-10)

  const recordingStartTime = useRef<number>(0)
  const pressedNotesRef = useRef<Map<string, number>>(new Map())

  // Inicializar el sintetizador
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start()
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
    }

    initAudio()

    return () => {
      if (synth) {
        synth.dispose()
      }
    }
  }, [])

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

  // Tocar una nota
  const playNote = useCallback(
    (note: string) => {
      if (!synth) return

      const noteWithOctave = getNoteWithOctave(note)
      synth.triggerAttack(noteWithOctave)

      setPressedKeys((prev) => new Set([...prev, note]))

      // Grabación
      if (isRecording) {
        const currentTime = Tone.now() * 1000 - recordingStartTime.current
        pressedNotesRef.current.set(note, currentTime)
      }
    },
    [synth, getNoteWithOctave, isRecording],
  )

  // Soltar una nota
  const releaseNote = useCallback(
    (note: string) => {
      if (!synth) return

      const noteWithOctave = getNoteWithOctave(note)
      synth.triggerRelease(noteWithOctave)

      setPressedKeys((prev) => {
        const newSet = new Set(prev)
        newSet.delete(note)
        return newSet
      })

      // Grabación - calcular duración
      if (isRecording && pressedNotesRef.current.has(note)) {
        const startTime = pressedNotesRef.current.get(note)!
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

        pressedNotesRef.current.delete(note)
      }
    },
    [synth, getNoteWithOctave, isRecording],
  )

  // Manejar eventos del teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (KEY_MAPPING[key] && !pressedKeys.has(KEY_MAPPING[key])) {
        event.preventDefault()
        playNote(KEY_MAPPING[key])
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (KEY_MAPPING[key]) {
        event.preventDefault()
        releaseNote(KEY_MAPPING[key])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [playNote, releaseNote, pressedKeys])

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
  const PianoKey = ({ note, isBlack = false }: { note: string; isBlack?: boolean }) => {
    const isPressed = pressedKeys.has(note)
    const keyboardKey = Object.keys(KEY_MAPPING).find((k) => KEY_MAPPING[k] === note)

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
        onMouseDown={() => playNote(note)}
        onMouseUp={() => releaseNote(note)}
        onMouseLeave={() => releaseNote(note)}
        onTouchStart={(e) => {
          e.preventDefault()
          playNote(note)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          releaseNote(note)
        }}
      >
        {!isBlack && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
            {keyboardKey?.toUpperCase()}
          </div>
        )}
      </button>
    )
  }

  // Renderizar teclado según la escala
  const renderKeyboard = () => {
    const notes = getScaleNotes()

    if (currentScale === "chromatic") {
      // Teclado completo con teclas negras
      const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"]
      const blackKeys = ["C#", "D#", null, "F#", "G#", "A#", null] // null para espacios

      return (
        <div className="relative flex">
          {/* Teclas blancas */}
          <div className="flex">
            {whiteKeys.map((note) => (
              <PianoKey key={note} note={note} />
            ))}
          </div>

          {/* Teclas negras */}
          <div className="absolute top-0 left-6 flex">
            {blackKeys.map((note, index) => (
              <div key={index} className="w-12 flex justify-center">
                {note && <PianoKey note={note} isBlack />}
              </div>
            ))}
          </div>
        </div>
      )
    } else {
      // Solo teclas de la escala seleccionada
      return (
        <div className="flex">
          {notes.map((note) => (
            <PianoKey key={note} note={note} />
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
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              🎹 Piano Virtual Interactivo
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <label className="block text-sm font-medium mb-2">Octava</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentOctave(Math.max(1, currentOctave - 1))}
                  disabled={currentOctave <= 1}
                >
                  -
                </Button>
                <span className="flex-1 text-center py-1 font-mono">{currentOctave}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentOctave(Math.min(7, currentOctave + 1))}
                  disabled={currentOctave >= 7}
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
            <div className="flex justify-center">{renderKeyboard()}</div>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">🎵 Instrucciones:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p>
                  <strong>Teclado físico:</strong> A, W, S, E, D, F, T, G, Y, H, U, J, K, O, L, P, ;
                </p>
                <p>
                  <strong>Mouse:</strong> Haz clic en las teclas del piano
                </p>
              </div>
              <div>
                <p>
                  <strong>Octavas:</strong> Cambia entre octavas 1-7
                </p>
                <p>
                  <strong>Escalas:</strong> Cromática (todas las notas), Mayor, Menor
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
