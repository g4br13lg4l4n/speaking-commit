# Inglés v1

App personal de Gabriel para practicar inglés hablado (B1 → B2). Ver README.md para qué hace y cómo correrla.

## Cómo trabajamos

- Gabriel la usa; Claude la construye y la cambia. No le pidas que programe: su hora de inglés no se toca.
- Cada cambio se justifica por su efecto en la práctica (más días, más minutos hablados, menos errores). Si una función no ayuda, se propone quitarla.
- Todo lo que ve Gabriel va en español; las preguntas, correcciones y frases de práctica, en inglés.
- El plan de bloques vive en `app/src/app/plan.ts` y debe coincidir con `C:\develop\ideas\plan-ingles.md`.

## Código

- `servidor/`: Node 24 ejecuta TypeScript directo (solo sintaxis borrable: nada de `enum` ni propiedades en el constructor). Importa con extensión `.ts`.
- La corrección está en `servidor/src/corregir.ts`: esquema Zod + `client.beta.messages.parse` con `fallbacks: "default"`. Si cambias el esquema, actualiza `app/src/app/api.ts` y `resultado.ts`.
- La voz a texto es cualquier endpoint compatible con `/v1/audio/transcriptions` (OpenAI, Groq), configurado en `.env`.
- `npm run demo` corre todo sin llaves. Úsalo para probar la interfaz.
- Antes de dar algo por terminado: `npm run verificar`.

## Ideas en espera

- Publicarla con HTTPS para usarla en el celular (PWA).
- Pasar aquí la racha, los releases y los logros del tracker.
- Evaluación de pronunciación por palabra (un servicio de voz que califique sonidos).
- Simulacros de entrevista con varias preguntas seguidas.
