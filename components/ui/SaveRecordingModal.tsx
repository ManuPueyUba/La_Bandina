"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, Music, X } from "lucide-react"

interface RecordedNote {
  note: string
  octave: number
  startTime: number
  endTime?: number
  velocity: number
}

interface SaveRecordingModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (recordingData: {
    title: string
    description: string
    tempo: number
    category: string
  }) => Promise<void>
  recording: {
    notes: RecordedNote[]
    duration: number
  } | null
  isSaving: boolean
}

export function SaveRecordingModal({ isOpen, onClose, onSave, recording, isSaving }: SaveRecordingModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [tempo, setTempo] = useState(120)
  const [category, setCategory] = useState("personal")

  console.log('SaveRecordingModal render:', { isOpen, hasRecording: !!recording, isSaving })

  if (!isOpen) {
    console.log('Modal not open, returning null')
    return null
  }
  
  if (!recording) {
    console.log('No recording data, returning null')
    return null
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Por favor ingresa un nombre para la grabación")
      return
    }

    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        tempo,
        category
      })
      
      // Resetear el formulario
      setTitle("")
      setDescription("")
      setTempo(120)
      setCategory("personal")
      onClose()
    } catch (error) {
      console.error('Error saving recording:', error)
      alert('Error al guardar la grabación. Inténtalo de nuevo.')
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    return `${seconds}s`
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-gray-900 border-gray-700 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              Guardar Grabación
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-blue-300">Notas grabadas:</span>
              <span className="text-blue-200 font-mono">{recording.notes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-300">Duración:</span>
              <span className="text-blue-200 font-mono">{formatDuration(recording.duration)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre de la grabación *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Mi primera melodía"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Descripción (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe tu grabación..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(Math.max(60, Math.min(200, parseInt(e.target.value) || 120)))}
                  min="60"
                  max="200"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="personal">Personal</option>
                  <option value="practice">Práctica</option>
                  <option value="composition">Composición</option>
                  <option value="cover">Cover</option>
                  <option value="improvisation">Improvisación</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 text-gray-300 hover:text-white hover:bg-gray-800"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>Guardar</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
