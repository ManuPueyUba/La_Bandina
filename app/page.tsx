"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import * as Tone from "tone"
import { Midi } from "@tonejs/midi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, RotateCcw, Volume2, Settings, Music, Mic, Download, Save, Pause, Trash2 } from "lucide-react"
import Link from "next/link"
import { AuthButton } from "@/components/auth/AuthButton"
import { ApiClient, CreateRecordingRequest, RecordingResponse, KeyMappingApiClient } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { WelcomeModal } from "@/components/ui/WelcomeModal"
import { SaveRecordingModal } from "@/components/ui/SaveRecordingModal"
import { 
  saveRecording, 
  getUserRecordings,
  deleteRecording,
  isUserLoggedIn, 
  getUserToken, 
  RecordedNote as APIRecordedNote 
} from "@/lib/api/recordings"

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
  const { user, isAuthenticated } = useAuth()
  const [synth, setSynth] = useState<Tone.PolySynth | null>(null)
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
  const [currentOctave, setCurrentOctave] = useState(4)
  const [numberOfOctaves, setNumberOfOctaves] = useState(3) // Ahora es configurable
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [pendingRecording, setPendingRecording] = useState<{
    notes: RecordedNote[]
    duration: number
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Estados para reproducción
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentlyPlayingRecording, setCurrentlyPlayingRecording] = useState<Recording | null>(null)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playbackTimeouts, setPlaybackTimeouts] = useState<NodeJS.Timeout[]>([])

  const pressedNotesRef = useRef<Map<string, number>>(new Map())

  // Cargar configuración de teclas desde el servidor o localStorage
  useEffect(() => {
    const loadKeyMapping = async () => {
      // Si el usuario está autenticado, intentar cargar desde la base de datos
      if (isAuthenticated && user) {
        try {
          const serverConfig = await KeyMappingApiClient.getDefaultKeyMapping()
          if (serverConfig?.mapping_data) {
            setKeyMapping(serverConfig.mapping_data)
            return // Si se carga del servidor, no cargar del localStorage
          }
        } catch (error) {
          console.log("No server configuration found, using localStorage fallback")
        }
      }

      // Fallback a localStorage
      const savedMapping = localStorage.getItem("pianoKeyMapping")
      if (savedMapping) {
        try {
          setKeyMapping(JSON.parse(savedMapping))
        } catch (error) {
          console.error("Error loading saved key mapping:", error)
        }
      }
    }

    loadKeyMapping()
  }, [isAuthenticated, user])

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

  // Limpiar teclas destacadas al montar el componente (navegación desde tutoriales)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Limpiar las variables globales del tutorial
      delete (window as any).tutorialHighlightedKeys;
      delete (window as any).tutorialUpcomingNotes;
      
      // Asegurar que los estados locales estén limpios
      setTutorialHighlightedKeys(new Set());
      setTutorialUpcomingNotes([]);
    }
  }, []); // Solo ejecutar al montar

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

  // Manejar el inicio desde el modal de bienvenida
  const handleWelcomeStart = async () => {
    await initAudio()
    setShowWelcomeModal(false)
    // Marcar que el modal ya fue mostrado en esta sesión
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pianoWelcomeShown', 'true')
    }
  }

  // Gestionar la visibilidad del modal de bienvenida
  useEffect(() => {
    // Si el audio ya está inicializado, ocultar el modal
    if (audioInitialized) {
      setShowWelcomeModal(false)
    }
  }, [audioInitialized])

  // Verificar si es la primera visita en esta sesión
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasVisited = sessionStorage.getItem('pianoWelcomeShown')
      if (!hasVisited && !audioInitialized) {
        setShowWelcomeModal(true)
      }
    }
  }, [])

  // Limpiar sintetizador al desmontar
  useEffect(() => {
    return () => {
      if (synth) {
        synth.dispose()
      }
    }
  }, [synth])

  // Limpiar timeouts de reproducción al desmontar
  useEffect(() => {
    return () => {
      playbackTimeouts.forEach(timeout => {
        clearTimeout(timeout)
      })
    }
  }, [playbackTimeouts])

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
    console.log('=== STOP RECORDING DEBUG ===')
    console.log('1. stopRecording called')
    setIsRecording(false)
    
    console.log('2. Current recording length:', currentRecording.length)
    console.log('3. Recording start time:', recordingStartTime)
    
    if (currentRecording.length > 0 && recordingStartTime) {
      const duration = Date.now() - recordingStartTime
      console.log('4. Duration calculated:', duration)
      
      // Si el usuario tiene sesión iniciada, mostrar modal para guardar
      const userLoggedIn = isUserLoggedIn()
      const token = getUserToken()
      console.log('5. User logged in:', userLoggedIn)
      console.log('5.1. Token exists:', !!token)
      console.log('5.2. Token value:', token ? 'EXISTS' : 'NULL')
      console.log('5.3. Window object:', typeof window)
      console.log('5.4. LocalStorage test:', localStorage.getItem('token') ? 'HAS_TOKEN' : 'NO_TOKEN')
      
      if (userLoggedIn || true) { // TEMP: Siempre mostrar modal para debugging
        console.log('6. Setting pending recording and showing modal')
        setPendingRecording({
          notes: currentRecording,
          duration
        })
        setShowSaveModal(true)
        console.log('7. Modal should be visible now')
      } else {
        // Si no tiene sesión, guardar localmente como antes
        console.log('6. User not logged in, saving locally')
        const newRecording: Recording = {
          id: `recording-${Date.now()}`,
          name: `Grabación ${recordings.length + 1}`,
          notes: currentRecording,
          duration,
          createdAt: new Date()
        }
        setRecordings(prev => [...prev, newRecording])
        console.log('7. Recording saved locally:', newRecording)
      }
    } else {
      console.log('4. No recording data or missing start time')
      console.log('   - currentRecording.length:', currentRecording.length)
      console.log('   - recordingStartTime:', recordingStartTime)
    }
    
    setCurrentRecording([])
    setRecordingStartTime(null)
    console.log('8. Cleanup completed')
    console.log('=== END DEBUG ===')
  }, [currentRecording, recordingStartTime, recordings.length])

  const handleSaveRecording = useCallback(async (recordingData: {
    title: string
    description: string
    tempo: number
    category: string
  }) => {
    if (!pendingRecording) return

    setIsSaving(true)
    
    try {
      const token = getUserToken()
      console.log('=== SAVE RECORDING DEBUG ===')
      console.log('1. Getting token...')
      console.log('2. Token result:', token ? 'EXISTS' : 'NULL/UNDEFINED')
      console.log('3. Token length:', token ? token.length : 'N/A')
      console.log('4. Direct localStorage check:', localStorage.getItem('token') ? 'EXISTS' : 'NULL')
      console.log('5. Window type:', typeof window)
      
      if (!token) {
        console.log('6. ERROR: No token found')
        console.log('7. TEMPORARY: Proceeding without backend save...')
        
        // TEMPORAL: Crear grabación local si no hay token
        const newRecording: Recording = {
          id: `recording-${Date.now()}`,
          name: recordingData.title,
          notes: pendingRecording.notes,
          duration: pendingRecording.duration,
          createdAt: new Date()
        }
        setRecordings(prev => [...prev, newRecording])
        setPendingRecording(null)
        console.log('8. Recording saved locally instead:', newRecording)
        return
        
        // throw new Error('No se encontró token de autenticación')
      }

      // Preparar datos para el API
      const apiRecordingData = {
        title: recordingData.title,
        description: recordingData.description,
        notes: pendingRecording.notes.map(note => ({
          note: note.note,
          octave: note.octave,
          start_time: note.startTime,  // Convertir camelCase a snake_case
          end_time: note.endTime,      // Convertir camelCase a snake_case
          velocity: note.velocity
        })),
        duration: pendingRecording.duration,
        tempo: recordingData.tempo,
        category: recordingData.category
      }

      console.log('7. API data prepared:', apiRecordingData)

      // Guardar en el backend
      const savedRecording = await saveRecording(apiRecordingData, token)
      
      // Crear recording local para la UI
      const newRecording: Recording = {
        id: savedRecording.id.toString(),
        name: savedRecording.title,
        notes: pendingRecording.notes,
        duration: pendingRecording.duration,
        createdAt: new Date(savedRecording.created_at)
      }
      
      setRecordings(prev => [...prev, newRecording])
      setPendingRecording(null)
      console.log('Grabación guardada exitosamente:', savedRecording)
      
      // Opcionalmente, recargar todas las grabaciones para asegurar sincronización
      // loadRecordings()
      
    } catch (error) {
      console.error('Error al guardar la grabación:', error)
      // Fallback: guardar localmente si falla el backend
      const newRecording: Recording = {
        id: `recording-${Date.now()}`,
        name: recordingData.title,
        notes: pendingRecording.notes,
        duration: pendingRecording.duration,
        createdAt: new Date()
      }
      setRecordings(prev => [...prev, newRecording])
      setPendingRecording(null)
      alert('Error al conectar con el servidor. La grabación se guardó localmente.')
    } finally {
      setIsSaving(false)
    }
  }, [pendingRecording, recordings.length])

  // Función para cargar grabaciones del backend
  const loadRecordings = useCallback(async () => {
    if (!isUserLoggedIn()) return

    try {
      const token = getUserToken()
      if (!token) return

      console.log('Loading recordings from backend...')
      const response = await getUserRecordings(token)
      
      // Convertir las grabaciones del backend al formato local
      const backendRecordings: Recording[] = response.recordings.map((recording: any) => ({
        id: recording.id.toString(),
        name: recording.title,
        notes: recording.notes.map((note: any) => ({
          note: note.note,
          octave: note.octave,
          startTime: note.start_time, // Convertir snake_case a camelCase
          endTime: note.end_time,     // Convertir snake_case a camelCase
          velocity: note.velocity
        })),
        duration: recording.duration,
        createdAt: new Date(recording.created_at)
      }))
      
      setRecordings(backendRecordings)
      console.log('Loaded recordings from backend:', backendRecordings.length)
      
    } catch (error) {
      console.error('Error loading recordings:', error)
      // No mostrar error al usuario ya que puede no estar loggeado
    }
  }, [])

  // Cargar grabaciones al iniciar la aplicación
  useEffect(() => {
    loadRecordings()
  }, [loadRecordings])

  // Recargar grabaciones cuando cambia el estado de autenticación
  useEffect(() => {
    if (isAuthenticated) {
      loadRecordings()
    } else {
      // Si el usuario cierra sesión, limpiar las grabaciones
      setRecordings([])
    }
  }, [isAuthenticated, loadRecordings])

  // Función para eliminar grabación
  const handleDeleteRecording = useCallback(async (recordingId: string) => {
    if (!isUserLoggedIn()) {
      // Si no está loggeado, eliminar localmente
      setRecordings(prev => prev.filter(r => r.id !== recordingId))
      return
    }

    try {
      const token = getUserToken()
      if (!token) {
        throw new Error('No se encontró token de autenticación')
      }

      // Confirmar eliminación
      if (!confirm('¿Estás seguro de que quieres eliminar esta grabación?')) {
        return
      }

      console.log('Deleting recording from backend:', recordingId)
      await deleteRecording(parseInt(recordingId), token)
      
      // Eliminar de la lista local
      setRecordings(prev => prev.filter(r => r.id !== recordingId))
      console.log('Recording deleted successfully')
      
    } catch (error) {
      console.error('Error deleting recording:', error)
      alert('Error al eliminar la grabación. Inténtalo de nuevo.')
    }
  }, [])

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

    // Funciones de reproducción
  const playRecording = useCallback(async (recording: Recording) => {
    if (!synth) {
      console.log('Synth not initialized')
      return
    }
    
    console.log('Starting playback of recording:', recording.name, 'Notes:', recording.notes.length)
    
    // Si ya se está reproduciendo esta grabación, no hacer nada
    if (isPlaying && currentlyPlayingRecording?.id === recording.id) {
      console.log('Already playing this recording')
      return
    }
    
    // Parar cualquier reproducción anterior
    if (isPlaying) {
      stopPlayback()
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Asegurar que el contexto de audio esté activo
    if (Tone.context.state === 'suspended') {
      console.log('Starting Tone.js context')
      await Tone.start()
    }

    setCurrentlyPlayingRecording(recording)
    setIsPlaying(true)
    setPlaybackPosition(0)

    const sortedNotes = [...recording.notes].sort((a, b) => a.startTime - b.startTime)
    
    if (sortedNotes.length === 0) {
      console.log('No notes to play')
      setIsPlaying(false)
      return
    }
    
    console.log('Playing notes:', sortedNotes)
    
    // Normalizar tiempos (empezar desde 0)
    const startTime = sortedNotes[0].startTime
    const normalizedNotes = sortedNotes.map(note => ({
      ...note,
      startTime: note.startTime - startTime,
      endTime: note.endTime ? note.endTime - startTime : note.startTime + 200
    }))
    
    console.log('Normalized notes:', normalizedNotes)
    
    let playbackTimeouts: NodeJS.Timeout[] = []
    
    // Función para reproducir las notas
    const playNotes = () => {
      normalizedNotes.forEach((note, index) => {
        const timeoutId = setTimeout(async () => {
          console.log(`Playing note ${index + 1}/${normalizedNotes.length}: ${note.note}${note.octave}`)
          
          const noteWithOctave = `${note.note}${note.octave}`
          
          try {
            // Tocar la nota
            synth.triggerAttack(noteWithOctave, undefined, (note.velocity || 0.7))
            
            // Programar el release de la nota
            const noteDuration = note.endTime ? note.endTime - note.startTime : 200
            const releaseTimeout = setTimeout(() => {
              synth.triggerRelease(noteWithOctave)
            }, Math.max(50, noteDuration))
            
            playbackTimeouts.push(releaseTimeout)
            
            setPlaybackPosition(index + 1)
            
            // Si es la última nota, programar el loop
            if (index === normalizedNotes.length - 1) {
              console.log('Last note played, scheduling loop restart')
              const loopTimeout = setTimeout(() => {
                console.log('Looping: restarting playback')
                playRecording(recording)
              }, Math.max(50, noteDuration) + 500) // 500ms de pausa entre loops
              
              playbackTimeouts.push(loopTimeout)
            }
          } catch (error) {
            console.error('Error playing note:', error)
          }
        }, note.startTime)
        
        playbackTimeouts.push(timeoutId)
      })
    }
    
    // Ejecutar la reproducción
    playNotes()
    
    // Guardar todos los timeouts para poder cancelarlos
    setPlaybackTimeouts(playbackTimeouts)
  }, [synth, isPlaying, currentlyPlayingRecording])

  const pausePlayback = useCallback(() => {
    console.log('Pausing playback')
    setIsPlaying(false)
    
    // Limpiar todos los timeouts activos
    playbackTimeouts.forEach(timeout => {
      clearTimeout(timeout)
    })
    setPlaybackTimeouts([])
    
    // Detener todas las notas que puedan estar sonando
    if (synth) {
      synth.releaseAll()
    }
  }, [synth, playbackTimeouts])

  const resumePlayback = useCallback(() => {
    console.log('Resuming playback')
    if (currentlyPlayingRecording && !isPlaying) {
      setIsPlaying(true)
      // Reanudar desde donde se pausó (simplificado: reiniciar)
      playRecording(currentlyPlayingRecording)
    }
  }, [currentlyPlayingRecording, isPlaying, playRecording])

  const stopPlayback = useCallback(() => {
    console.log('Stopping playback')
    setIsPlaying(false)
    setCurrentlyPlayingRecording(null)
    setPlaybackPosition(0)
    
    // Limpiar todos los timeouts activos
    playbackTimeouts.forEach(timeout => {
      clearTimeout(timeout)
    })
    setPlaybackTimeouts([])
    
    // Detener todas las notas que puedan estar sonando
    if (synth) {
      synth.releaseAll()
    }
  }, [synth, playbackTimeouts])

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
              : `w-full h-72 border border-gray-300 rounded-b-md
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
      
      // Calcular ancho total necesario (cada octava tiene 7 teclas blancas de 60px)
      const totalWidth = numberOfOctaves * 7 * 60

      return (
        <div className="w-full overflow-x-auto overflow-y-visible">
          <div className="relative flex" style={{ width: `${totalWidth}px`, minWidth: '100%' }}>
            {octaves.map((octave) => (
              <div key={octave} className="relative flex" style={{ width: '420px' }}>
                {/* Teclas blancas */}
                <div className="flex">
                  {whiteKeys.map((note) => (
                    <div key={`${note}-${octave}`} style={{ width: '60px' }}>
                      <PianoKey note={note} octave={octave} />
                    </div>
                  ))}
                </div>

                {/* Teclas negras - posicionadas correctamente entre las blancas */}
                <div className="absolute top-0 left-0 pointer-events-none" style={{ width: '420px' }}>
                  {/* C# - entre C y D (posición 60px - 14px = 46px desde el borde izquierdo) */}
                  <div 
                    className="absolute pointer-events-auto" 
                    style={{ left: '46px' }}
                  >
                    <PianoKey note="C#" octave={octave} isBlack />
                  </div>
                  
                  {/* D# - entre D y E (posición 120px - 14px = 106px desde el borde izquierdo) */}
                  <div 
                    className="absolute pointer-events-auto" 
                    style={{ left: '106px' }}
                  >
                    <PianoKey note="D#" octave={octave} isBlack />
                  </div>
                  
                  {/* F# - entre F y G (posición 240px - 14px = 226px desde el borde izquierdo) */}
                  <div 
                    className="absolute pointer-events-auto" 
                    style={{ left: '226px' }}
                  >
                    <PianoKey note="F#" octave={octave} isBlack />
                  </div>
                  
                  {/* G# - entre G y A (posición 300px - 14px = 286px desde el borde izquierdo) */}
                  <div 
                    className="absolute pointer-events-auto" 
                    style={{ left: '286px' }}
                  >
                    <PianoKey note="G#" octave={octave} isBlack />
                  </div>
                  
                  {/* A# - entre A y B (posición 360px - 14px = 346px desde el borde izquierdo) */}
                  <div 
                    className="absolute pointer-events-auto" 
                    style={{ left: '346px' }}
                  >
                    <PianoKey note="A#" octave={octave} isBlack />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    } else {
      // Solo teclas de la escala seleccionada para múltiples octavas
      return (
        <div className="w-full overflow-x-auto">
          <div className="flex" style={{ minWidth: 'fit-content' }}>
            {octaves.map((octave) => (
              <div key={octave} className="flex border-r border-gray-200 pr-2 mr-2 last:border-r-0 last:pr-0 last:mr-0">
                {notes.map((note) => (
                  <div key={`${note}-${octave}`} style={{ width: '60px', flexShrink: 0 }}>
                    <PianoKey note={note} octave={octave} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header con navegación directa */}
      <div className="border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-light text-white">Piano</h1>
            
            {/* Navegación principal */}
            <div className="flex items-center space-x-6">
              <Link href="/songs">
                <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                  <Music className="w-4 h-4" />
                  <span>Tutoriales</span>
                </button>
              </Link>
              
              <Link href="/config">
                <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
                  <Settings className="w-4 h-4" />
                  <span>Configurar Teclas</span>
                </button>
              </Link>

              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal que se expande */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-6 py-6 w-full flex-1 flex flex-col">

          {/* Piano con controles integrados */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 flex flex-col">
            {/* Controles superiores */}
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
              {/* Panel izquierdo - Grabación y Escala */}
              <div className="flex items-center space-x-6">
                {/* Grabación */}
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

                {/* Configuración de Escala */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400">Escala:</span>
                  <Select value={currentScale} onValueChange={(value: Scale) => setCurrentScale(value)}>
                    <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white text-sm">
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

              {/* Panel central - Rango */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-400">Rango:</span>
                <button
                  onClick={() => setNumberOfOctaves(Math.max(1, numberOfOctaves - 1))}
                  disabled={numberOfOctaves <= 1}
                  className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white"
                >
                  -
                </button>
                <span className="font-mono text-lg text-white min-w-[2rem] text-center">
                  {numberOfOctaves}
                </span>
                <button
                  onClick={() => {
                    const newOctaves = Math.min(7, numberOfOctaves + 1)
                    setNumberOfOctaves(newOctaves)
                    // Ajustar octava base si es necesario
                    if (currentOctave + newOctaves > 7) {
                      setCurrentOctave(Math.max(1, 8 - newOctaves))
                    }
                  }}
                  disabled={numberOfOctaves >= 7}
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
              <div className="w-full max-w-7xl piano-container">
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
                    <div className="flex gap-2 flex-wrap">
                      {/* Botones originales */}
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
                      <Button
                        onClick={() => handleDeleteRecording(recording.id)}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Eliminar
                      </Button>
                      
                      {/* Control de reproducción dinámico */}
                      {currentlyPlayingRecording?.id === recording.id ? (
                        <div className="flex gap-1">
                          <Button
                            onClick={isPlaying ? pausePlayback : resumePlayback}
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white min-w-[60px]"
                          >
                            {isPlaying ? (
                              <>
                                <Square className="w-3 h-3 mr-1" />
                                Pausa
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                Play
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={stopPlayback}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => playRecording(recording)}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          disabled={isPlaying && currentlyPlayingRecording?.id !== recording.id}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                      )}
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

      {/* Modal de bienvenida */}
      {showWelcomeModal && (
        <WelcomeModal onStart={handleWelcomeStart} />
      )}

      {/* Modal de guardado de grabación */}
      <SaveRecordingModal
        isOpen={showSaveModal}
        onClose={() => {
          console.log('Modal closed by user')
          setShowSaveModal(false)
          setPendingRecording(null)
        }}
        onSave={handleSaveRecording}
        recording={pendingRecording}
        isSaving={isSaving}
      />
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 text-xs">
          Modal: {showSaveModal ? 'OPEN' : 'CLOSED'} | 
          Pending: {pendingRecording ? 'YES' : 'NO'} |
          Recording: {isRecording ? 'YES' : 'NO'}
        </div>
      )}
    </div>
  )
}
