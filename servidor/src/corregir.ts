import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { config, demo } from './config.ts';
import { ErrorDeConfiguracion } from './transcribir.ts';

const Esquema = z.object({
  resumen: z.string().describe('Dos frases en español: cómo le fue en esta práctica, con honestidad.'),
  logro: z.string().describe('En español: una cosa concreta que hizo bien, citando lo que dijo.'),
  errores: z
    .array(
      z.object({
        original: z.string().describe('El fragmento exacto de la transcripción.'),
        correccion: z.string().describe('El mismo fragmento corregido, en inglés natural.'),
        tipo: z.enum(['tiempo verbal', 'gramática', 'preposición', 'artículo', 'vocabulario', 'orden', 'falso amigo', 'otro']),
        explicacion: z.string().describe('En español, una sola frase: la regla o por qué suena mal.'),
      }),
    )
    .describe('Los errores más importantes, como máximo 8, empezando por los que cambian el sentido o se repiten.'),
  version_natural: z.string().describe('Todo lo que dijo, como lo diría un desarrollador nativo, con sus mismas ideas.'),
  frases_utiles: z
    .array(z.object({ frase: z.string(), cuando_usarla: z.string().describe('En español, breve.') }))
    .describe('De 3 a 5 frases en inglés que le habrían servido para este tema.'),
  pronunciacion: z
    .array(
      z.object({
        transcrito: z.string().describe('La palabra rara que aparece en la transcripción.'),
        probable: z.string().describe('La palabra que seguramente quiso decir.'),
        nota: z.string().describe('En español: qué sonido practicar.'),
      }),
    )
    .describe('Palabras que la transcripción entendió mal y delatan un problema de pronunciación. Vacío si no hay pistas claras.'),
  foco_manana: z.string().describe('En español: una sola cosa concreta para practicar mañana.'),
  puntuacion: z.object({
    fluidez: z.number().int().describe('De 1 a 10.'),
    gramatica: z.number().int().describe('De 1 a 10.'),
    vocabulario: z.number().int().describe('De 1 a 10.'),
  }),
  nivel_estimado: z.enum(['A2', 'B1', 'B1+', 'B2', 'B2+', 'C1']),
});

export type Analisis = z.infer<typeof Esquema>;

const SISTEMA = `Eres el coach de inglés hablado de Gabriel: desarrollador mexicano, 12 años de experiencia (Angular, Node, NestJS), nivel B1. Su meta es hablar B2 para trabajar con clientes de Estados Unidos y pasar entrevistas técnicas en inglés.

Recibes la transcripción automática de una grabación suya de 1 a 3 minutos. Ten en cuenta:
- La transcripción viene de un servicio de voz a texto. Puede ocultar errores pequeños o inventar palabras. Si una palabra no encaja, probablemente la pronunció de forma que el servicio no la reconoció: ponla en "pronunciacion", no en "errores".
- Las muletillas (um, uh, eh) no son errores; ya se cuentan aparte.
- Corrige lo que un hablante nativo notaría, sobre todo los errores típicos de hispanohablantes: tiempos verbales (present perfect, "since/for"), preposiciones, artículos, "make/do", falsos amigos y orden de adjetivos.
- No corrijas estilo cuando la frase ya es natural.
- Sé honesto y concreto. Nada de elogios genéricos: el "logro" tiene que citar algo que de verdad dijo bien.
- Las explicaciones van en español y son cortas. Las correcciones, la versión natural y las frases útiles van en inglés.`;

let cliente: Anthropic | null = null;

/** Le pide a Claude la corrección de una práctica, en el formato que la app muestra. */
export async function corregir(datos: { transcripcion: string; tema: string; pregunta: string; duracionSeg: number }): Promise<Analisis> {
  if (demo) return ANALISIS_DEMO;
  if (!config.claude.configurado) {
    throw new ErrorDeConfiguracion('Falta ANTHROPIC_API_KEY en servidor/.env: es la llave para que Claude corrija tus prácticas.');
  }
  cliente ??= new Anthropic();

  const contenido = [
    `Tema del bloque: ${datos.tema}`,
    datos.pregunta ? `Pregunta que respondió: ${datos.pregunta}` : '',
    `Duración: ${Math.round(datos.duracionSeg)} segundos`,
    '',
    'Transcripción:',
    datos.transcripcion,
  ]
    .filter((l) => l !== '')
    .join('\n');

  try {
    const r = await cliente.beta.messages.parse({
      model: config.claude.modelo,
      max_tokens: 16000,
      // Si los filtros de seguridad rechazan la petición, la API la reintenta sola con el modelo de respaldo.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(Esquema) },
      system: SISTEMA,
      messages: [{ role: 'user', content: contenido }],
    });
    if (r.stop_reason === 'refusal') throw new Error('Claude no pudo corregir esta práctica. Intenta grabarla de nuevo.');
    if (r.stop_reason === 'max_tokens') throw new Error('La corrección quedó incompleta. Intenta con una grabación más corta.');
    if (!r.parsed_output) throw new Error('La corrección llegó en un formato inesperado. Reintenta.');
    return r.parsed_output;
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new ErrorDeConfiguracion('Claude rechazó la llave (ANTHROPIC_API_KEY). Revísala en servidor/.env.');
    }
    if (e instanceof Anthropic.RateLimitError) throw new Error('Claude está saturado en este momento. Reintenta en un minuto.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('No hay conexión con Claude. Revisa tu internet y reintenta.');
    throw e;
  }
}

const ANALISIS_DEMO: Analisis = {
  resumen:
    'Te diste a entender de principio a fin y mantuviste el hilo de tres ideas. Lo que más se nota son los tiempos verbales: usas presente donde va present perfect.',
  logro: '"It helps them to control the sales and the appointments" explica bien para qué sirve tu producto, con vocabulario preciso.',
  errores: [
    {
      original: 'I am working as a frontend developer since twelve years',
      correccion: "I've been working as a frontend developer for twelve years",
      tipo: 'tiempo verbal',
      explicacion: 'Para algo que empezó en el pasado y sigue, va present perfect continuous; con una duración se usa "for", no "since".',
    },
    {
      original: 'I make the migration of components',
      correccion: "I'm migrating components",
      tipo: 'vocabulario',
      explicacion: '"Make the migration" es calco del español; en inglés el verbo directo suena natural.',
    },
    {
      original: 'is called Corte Parejo',
      correccion: "it's called Corte Parejo",
      tipo: 'gramática',
      explicacion: 'En inglés el sujeto nunca se omite: hace falta "it".',
    },
    {
      original: 'I can to think',
      correccion: 'I can think',
      tipo: 'gramática',
      explicacion: 'Después de "can" va el verbo sin "to".',
    },
    {
      original: 'what the client really need',
      correccion: 'what the client really needs',
      tipo: 'gramática',
      explicacion: 'Tercera persona del singular en presente: el verbo lleva -s.',
    },
  ],
  version_natural:
    "So, my name is Gabriel, and I've been working as a frontend developer for twelve years. Right now I'm on a banking project, migrating components to the latest version of Angular. " +
    "In my free time I'm building an app for barbershops called Corte Parejo. It helps them keep track of sales and appointments. I enjoy it because I get to think about what the client really needs.",
  frases_utiles: [
    { frase: "Right now I'm on a project for…", cuando_usarla: 'Para presentar tu proyecto actual en una daily o entrevista.' },
    { frase: "I've been working with Angular since version 1.", cuando_usarla: 'Para hablar de tu experiencia con una fecha de inicio.' },
    { frase: 'On the side, I’m building…', cuando_usarla: 'Para mencionar tu proyecto personal sin sonar informal.' },
    { frase: 'What I enjoy most is figuring out what the client actually needs.', cuando_usarla: 'Para cerrar tu presentación con lo que te motiva.' },
  ],
  pronunciacion: [],
  foco_manana: 'Practica "I\'ve been + verbo-ing + for / since" con cinco frases sobre tu experiencia.',
  puntuacion: { fluidez: 6, gramatica: 5, vocabulario: 6 },
  nivel_estimado: 'B1',
};
