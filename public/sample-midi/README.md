# Archivos MIDI para La Bandina

## 🎵 ¿Dónde conseguir archivos MIDI?

### Sitios web gratuitos recomendados:

1. **BitMidi** - https://bitmidi.com/
   - Moderna y bien organizada
   - Miles de canciones populares
   - Descarga directa

2. **FreeMIDI** - https://freemidi.org/
   - Clásicos y canciones populares
   - Muy amplio catálogo
   - Gratis sin registro

3. **MIDIWorld** - https://midiworld.com/
   - Archivo muy completo
   - Canciones organizadas por género
   - Algunos archivos premium

4. **Piano MIDI Files** - Buscar en Google "piano midi files free"
   - Específicamente para piano
   - Ideales para tutoriales

### Tipos de archivos recomendados:

- **Canciones simples**: Para principiantes (melodías conocidas, pocas notas)
- **Piano solo**: Evitar archivos con múltiples instrumentos
- **Tempo moderado**: 80-140 BPM para aprendizaje
- **Rango de notas**: C4-C6 (mejor compatibilidad con el piano)

### Consejos para importar:

1. **Nombre descriptivo**: Usa nombres claros para los archivos
2. **Metadata completa**: Agrega título, artista y categoría al importar
3. **Filtrado automático**: El sistema filtra automáticamente notas fuera del rango del piano
4. **Dificultad automática**: Se calcula basándose en la complejidad de la canción

### Estructura de carpetas sugerida:

```
sample-midi/
├── beginner/          # Canciones fáciles
├── intermediate/      # Nivel intermedio
├── advanced/         # Canciones complejas
├── classical/        # Música clásica
└── popular/          # Canciones populares
```

## 🛠 Características del importador:

- ✅ **Validación automática**: Verifica que sea un archivo MIDI válido
- ✅ **Análisis previo**: Muestra información antes de importar
- ✅ **Filtrado inteligente**: Solo importa notas en el rango del piano
- ✅ **Cálculo de dificultad**: Automático basado en múltiples factores
- ✅ **Metadata editable**: Personaliza título, artista y categoría
- ✅ **Almacenamiento local**: Las canciones se guardan en localStorage

## 🎹 Compatibilidad:

- **Rango de octavas**: 4, 5, 6 (C4 a B6)
- **Teclas negras**: Soporte completo para sostenidos y bemoles
- **Duración mínima**: 100ms por nota
- **Formato**: Standard MIDI Files (.mid, .midi)

## 📝 Ejemplo de uso:

1. Descarga un archivo MIDI de cualquier sitio recomendado
2. Ve a "Biblioteca de Canciones" → "Importar MIDI"
3. Selecciona el archivo o arrastra al área de importación
4. Edita la metadata (título, artista, categoría)
5. Haz click en "Importar"
6. ¡La canción estará disponible en tu biblioteca!

## ⚠️ Limitaciones:

- Solo se importa la pista con más notas (generalmente la melodía principal)
- Notas fuera del rango C4-B6 son filtradas automáticamente
- Archivos muy complejos pueden requerir ajuste de metadata manual
