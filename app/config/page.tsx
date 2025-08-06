"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Keyboard, RotateCcw, Save, Check, X } from "lucide-react"
import Link from "next/link"

// Tipos para la configuración de teclas
interface KeyMapping {
  [key: string]: { note: string; octaveOffset: number }
}

// Mapeo por defecto
const DEFAULT_KEY_MAPPING: KeyMapping = {
  // Primera octava (octava base)
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
  
  // Segunda octava (octava base + 1)
  k: { note: "C", octaveOffset: 1 },
  o: { note: "C#", octaveOffset: 1 },
  l: { note: "D", octaveOffset: 1 },
  p: { note: "D#", octaveOffset: 1 },
  ";": { note: "E", octaveOffset: 1 },
  "'": { note: "F", octaveOffset: 1 },
}

// Todas las notas cromáticas
const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

export default function ConfigPage() {
  const [keyMapping, setKeyMapping] = useState<KeyMapping>(DEFAULT_KEY_MAPPING)
  const [selectedPianoKey, setSelectedPianoKey] = useState<{note: string, octaveOffset: number} | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [currentOctave, setCurrentOctave] = useState(4)
  const [numberOfOctaves, setNumberOfOctaves] = useState(2)

  // Cargar configuración guardada al montar el componente
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

  // Guardar configuración
  const saveConfiguration = () => {
    localStorage.setItem("pianoKeyMapping", JSON.stringify(keyMapping))
    alert("¡Configuración guardada exitosamente!")
  }

  // Resetear a configuración por defecto
  const resetToDefault = () => {
    setKeyMapping(DEFAULT_KEY_MAPPING)
    localStorage.removeItem("pianoKeyMapping")
    setSelectedPianoKey(null)
    setIsListening(false)
  }

  // Manejar click en tecla del piano
  const handlePianoKeyClick = (note: string, octaveOffset: number) => {
    setSelectedPianoKey({ note, octaveOffset })
    setIsListening(true)
  }

  // Escuchar eventos de teclado para capturar nuevas teclas
  useEffect(() => {
    if (!isListening || !selectedPianoKey) return

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault()
      const key = event.key.toLowerCase()
      
      // Evitar teclas especiales
      if (key.length === 1 && key.match(/[a-z0-9;',./\\[\]`~!@#$%^&*()_+\-={}|:"<>?]/)) {
        // Verificar si la tecla ya está asignada y removerla
        const existingKey = Object.keys(keyMapping).find(k => k === key)
        if (existingKey) {
          const newMapping = { ...keyMapping }
          delete newMapping[existingKey]
          setKeyMapping(newMapping)
        }

        // Asignar nueva tecla
        setKeyMapping(prev => ({
          ...prev,
          [key]: {
            note: selectedPianoKey.note,
            octaveOffset: selectedPianoKey.octaveOffset
          }
        }))

        // Limpiar selección
        setSelectedPianoKey(null)
        setIsListening(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPianoKey(null)
        setIsListening(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleEscape)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleEscape)
    }
  }, [isListening, selectedPianoKey, keyMapping])

  // Obtener la tecla asignada a una nota específica
  const getAssignedKey = (note: string, octaveOffset: number) => {
    const entry = Object.entries(keyMapping).find(([_, mapping]) => 
      mapping.note === note && mapping.octaveOffset === octaveOffset
    )
    return entry ? entry[0] : null
  }

  // Remover asignación
  const removeAssignment = (note: string, octaveOffset: number) => {
    const keyToRemove = Object.keys(keyMapping).find(k => 
      keyMapping[k].note === note && keyMapping[k].octaveOffset === octaveOffset
    )
    if (keyToRemove) {
      const newMapping = { ...keyMapping }
      delete newMapping[keyToRemove]
      setKeyMapping(newMapping)
    }
  }

  // Componente de tecla de piano para configuración
  const ConfigPianoKey = ({ 
    note, 
    octaveOffset,
    isBlack = false 
  }: { 
    note: string; 
    octaveOffset: number; 
    isBlack?: boolean 
  }) => {
    const assignedKey = getAssignedKey(note, octaveOffset)
    const isSelected = selectedPianoKey?.note === note && selectedPianoKey?.octaveOffset === octaveOffset
    const isHighlighted = isSelected && isListening

    return (
      <div
        className={`
          relative select-none transition-all duration-200 cursor-pointer group
          ${
            isBlack
              ? `w-8 h-32 bg-gray-900 hover:bg-gray-800 -mx-4 z-10 rounded-b-md border border-gray-700
               ${isHighlighted ? "bg-blue-600 border-blue-400" : ""}`
              : `w-12 h-48 bg-white hover:bg-gray-50 border border-gray-300 rounded-b-md
               ${isHighlighted ? "bg-blue-100 border-blue-400" : ""}`
          }
          ${assignedKey ? (isBlack ? "ring-2 ring-green-400" : "ring-2 ring-green-500") : ""}
        `}
        onClick={() => handlePianoKeyClick(note, octaveOffset)}
      >
        {/* Indicador de tecla asignada */}
        {assignedKey && (
          <div className={`
            absolute top-2 left-1/2 transform -translate-x-1/2 
            ${isBlack ? "text-white" : "text-gray-700"}
            text-xs font-mono font-bold bg-green-500 text-white px-1 rounded
          `}>
            {assignedKey.toUpperCase()}
          </div>
        )}

        {/* Botón para remover asignación */}
        {assignedKey && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              removeAssignment(note, octaveOffset)
            }}
            className={`
              absolute top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity
              w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center
              hover:bg-red-600 z-20
            `}
          >
            <X className="w-2 h-2" />
          </button>
        )}

        {/* Información de la nota */}
        {!isBlack && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 text-center">
            <div className="font-medium">{note}</div>
            <div className="text-[10px]">Oct +{octaveOffset}</div>
          </div>
        )}

        {/* Indicador de selección */}
        {isHighlighted && (
          <div className="absolute inset-0 bg-blue-400 bg-opacity-30 rounded-b-md flex items-center justify-center">
            <div className="text-white font-bold text-xs bg-blue-600 px-2 py-1 rounded">
              Presiona una tecla
            </div>
          </div>
        )}
      </div>
    )
  }

  // Renderizar teclado de configuración
  const renderConfigKeyboard = () => {
    const octaves = Array.from({ length: numberOfOctaves }, (_, i) => i)
    const whiteKeys = ["C", "D", "E", "F", "G", "A", "B"]
    const blackKeys = ["C#", "D#", null, "F#", "G#", "A#", null] // null para espacios

    return (
      <div className="relative flex overflow-x-auto bg-gray-100 p-4 rounded-lg">
        {octaves.map((octaveOffset) => (
          <div key={octaveOffset} className="relative flex">
            {/* Teclas blancas */}
            <div className="flex">
              {whiteKeys.map((note) => (
                <ConfigPianoKey 
                  key={`${note}-${octaveOffset}`} 
                  note={note} 
                  octaveOffset={octaveOffset} 
                />
              ))}
            </div>

            {/* Teclas negras */}
            <div className="absolute top-0 left-6 flex">
              {blackKeys.map((note, index) => (
                <div key={`${note}-${octaveOffset}-${index}`} className="w-12 flex justify-center">
                  {note && (
                    <ConfigPianoKey 
                      note={note} 
                      octaveOffset={octaveOffset} 
                      isBlack 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Piano
                </Button>
              </Link>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                <Keyboard className="inline w-8 h-8 mr-2" />
                Configuración de Teclas
              </CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Instrucciones */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">🎹 Instrucciones:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong>Haz clic en una tecla del piano</strong> para asignarle una tecla del teclado físico</li>
              <li>• <strong>Presiona cualquier tecla</strong> de tu teclado para asignarla</li>
              <li>• <strong>Teclas verdes</strong> ya tienen asignación - haz clic en la "×" para eliminar</li>
              <li>• <strong>Presiona Escape</strong> para cancelar la asignación</li>
              <li>• <strong>Guarda tu configuración</strong> cuando termines</li>
            </ul>
          </CardContent>
        </Card>

        {/* Controles principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <label className="block text-sm font-medium mb-2">Octavas a Mostrar</label>
              <Select 
                value={numberOfOctaves.toString()} 
                onValueChange={(value) => setNumberOfOctaves(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Octava</SelectItem>
                  <SelectItem value="2">2 Octavas</SelectItem>
                  <SelectItem value="3">3 Octavas</SelectItem>
                  <SelectItem value="4">4 Octavas</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Button onClick={saveConfiguration} className="h-full">
            <Save className="w-4 h-4 mr-2" />
            Guardar Configuración
          </Button>

          <Button onClick={resetToDefault} variant="outline" className="h-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetear a Defecto
          </Button>
        </div>

        {/* Estado actual */}
        {isListening && selectedPianoKey && (
          <Card className="border-2 border-blue-500 bg-blue-50">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">
                🎯 Presiona una tecla para asignar a: <strong>{selectedPianoKey.note}</strong> (Octava +{selectedPianoKey.octaveOffset})
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Presiona <kbd className="bg-gray-200 px-2 py-1 rounded">Escape</kbd> para cancelar
              </p>
            </CardContent>
          </Card>
        )}

        {/* Piano de configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎹 Piano de Configuración
              <span className="text-sm font-normal text-gray-500">
                - Haz clic en las teclas para asignar
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderConfigKeyboard()}
          </CardContent>
        </Card>

        {/* Resumen de asignaciones */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Resumen de Asignaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
              {Object.entries(keyMapping)
                .sort((a, b) => {
                  const aOffset = a[1].octaveOffset
                  const bOffset = b[1].octaveOffset
                  if (aOffset !== bOffset) return aOffset - bOffset
                  return CHROMATIC_NOTES.indexOf(a[1].note) - CHROMATIC_NOTES.indexOf(b[1].note)
                })
                .map(([key, mapping]) => (
                  <div 
                    key={key} 
                    className="flex items-center justify-between bg-gray-100 rounded px-2 py-1"
                  >
                    <span className="font-mono font-bold">{key.toUpperCase()}</span>
                    <span className="text-gray-600">
                      {mapping.note} <span className="text-xs">+{mapping.octaveOffset}</span>
                    </span>
                  </div>
                ))}
            </div>
            {Object.keys(keyMapping).length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No hay teclas asignadas. Haz clic en las teclas del piano para comenzar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
