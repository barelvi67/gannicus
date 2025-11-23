
import { defineSchema, llm, enumField, derived, generate } from '../packages/core/src/index.ts';

// 1. Definimos el esquema
const startupSchema = defineSchema({
  // Generación simple con LLM
  nombre: llm('Un nombre realista de persona hispana'),
  
  // Selección aleatoria ponderada
  rol: enumField([
    { value: 'CTO', weight: 10 },
    { value: 'Senior Dev', weight: 40 },
    { value: 'Junior Dev', weight: 50 }
  ]),

  // 🔥 MAGIA: Coherencia
  // El LLM recibe el nombre y el rol generados previamente para crear algo con sentido
  frase_típica: llm('Una frase corta y divertida que diría esta persona en la oficina', {
    coherence: ['nombre', 'rol'] 
  }),

  // Campo calculado
  email: derived(['nombre'], (ctx) => {
    return `${ctx.nombre.toLowerCase().replace(/\s+/g, '.')}@startup.com`;
  })
});

// 2. Ejecutamos la generación
console.log("🧠 Conectando con Ollama para generar datos...");

const result = await generate(startupSchema, {
  count: 3, // Generamos 3 registros
  provider: {
    name: 'ollama',
    model: 'phi3:mini' // Asegúrate de tener este modelo o cambia a 'llama3', 'mistral', etc.
  }
});

// 3. Mostramos resultado
console.log(JSON.stringify(result.data, null, 2));
console.log(`\n✨ Generado en ${result.stats.duration}ms usando ${result.stats.model}`);

