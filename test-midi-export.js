// Test script para verificar la funcionalidad de grabación y MIDI
console.log('🎵 Test de Grabación y MIDI Export');
console.log('=====================================');

// Simulación de una grabación real
const testRecording = {
  id: 'test-123',
  title: 'Prueba MIDI',
  artist: 'Usuario Test',
  createdAt: new Date(),
  duration: 5000,
  bpm: 120,
  keySignature: 'C major',
  description: 'Prueba de exportación MIDI',
  notes: [
    { key: 'C4', startTime: 0, duration: 500 },
    { key: 'E4', startTime: 500, duration: 500 },
    { key: 'G4', startTime: 1000, duration: 500 },
    { key: 'C5', startTime: 1500, duration: 1000 }
  ]
};

console.log('✅ Test recording created:', testRecording);
console.log('📊 Number of notes:', testRecording.notes.length);
console.log('⏱️ Total duration:', testRecording.duration, 'ms');
console.log('🎼 Notes details:', testRecording.notes);

// Verificación de la estructura de grabación
console.log('\n🔍 Verificación de estructura:');
console.log('- ID válido:', testRecording.id ? '✅' : '❌');
console.log('- Título válido:', testRecording.title ? '✅' : '❌');  
console.log('- Notas válidas:', testRecording.notes.length > 0 ? '✅' : '❌');
console.log('- Duración válida:', testRecording.duration > 0 ? '✅' : '❌');

// Simulación del proceso de grabación
console.log('\n🎹 Simulación del proceso de grabación:');
console.log('1. Usuario presiona "Iniciar Grabación" -> isRecording: true');
console.log('2. Usuario toca tecla "a" (C4) -> handleKeyPress("C4")');
console.log('3. Usuario suelta tecla "a" -> handleKeyRelease("C4")');
console.log('4. Usuario presiona "Detener" -> stopRecording()');
console.log('5. Sistema verifica notas > 0 -> Mostrar diálogo de guardado');

// Lista de teclas válidas para referencia
console.log('\n⌨️ Mapeo de teclas válidas:');
const keyMapping = {
  'a': 'C4', 's': 'D4', 'd': 'E4', 'f': 'F4', 
  'g': 'G4', 'h': 'A4', 'j': 'B4',
  'w': 'C#4', 'e': 'D#4', 't': 'F#4', 'y': 'G#4', 'u': 'A#4'
};

Object.entries(keyMapping).forEach(([key, note]) => {
  console.log(`${key} -> ${note}`);
});

console.log('\n💡 Para debuggear problemas:');
console.log('1. Abre la consola del navegador (F12)');
console.log('2. Ve a la página /recording');
console.log('3. Presiona "Iniciar Grabación"');
console.log('4. Toca las teclas y verifica estos logs:');
console.log('   - "TutorialPiano - Key press: [nota]"');
console.log('   - "useRecording - Key press: [nota]"');
console.log('   - "useRecording - Nota iniciada: [nota]"');
console.log('5. Suelta las teclas y verifica:');
console.log('   - "TutorialPiano - Releasing note: [nota]"');
console.log('   - "useRecording - Key release: [nota]"');
console.log('   - "useRecording - Nota grabada: [objeto]"');
