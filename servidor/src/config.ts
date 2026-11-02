import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Sin llaves de APIs: transcripción y corrección de ejemplo, para probar la app completa. */
export const demo = process.argv.includes('--demo') || process.env['MODO_DEMO'] === '1';

export const config = {
  puerto: Number(process.env['PUERTO'] ?? 4320),
  datos: path.resolve(raiz, process.env['DATOS'] ?? 'datos'),
  app: path.resolve(raiz, '..', 'app', 'dist', 'app', 'browser'),
  stt: {
    url: process.env['STT_URL'] ?? 'https://api.openai.com/v1/audio/transcriptions',
    llave: process.env['STT_API_KEY'] ?? '',
    modelo: process.env['STT_MODELO'] ?? 'whisper-1',
  },
  claude: {
    modelo: process.env['CLAUDE_MODELO'] ?? 'claude-opus-5-5',
    // La llave la lee el SDK de ANTHROPIC_API_KEY (o de un perfil de `ant auth login`).
    configurado: !!(process.env['ANTHROPIC_API_KEY'] || process.env['ANTHROPIC_AUTH_TOKEN']),
  },
};
