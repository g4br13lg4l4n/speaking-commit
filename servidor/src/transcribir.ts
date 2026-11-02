import fs from 'node:fs/promises';
import { config, demo } from './config.ts';

/** Un error que se arregla en `.env`, no reintentando. */
export class ErrorDeConfiguracion extends Error {}

const EXTENSIONES: Record<string, string> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

export function extension(mime: string): string {
  return EXTENSIONES[mime.split(';')[0]!.trim().toLowerCase()] ?? 'webm';
}

// Un ejemplo con muletillas le pide al modelo que las transcriba tal cual en lugar de limpiar el texto:
// los errores de quien aprende son justo lo que hay que conservar.
const PISTA = 'Umm, so, uh... I have been working, eh, with Angular for like twelve years. Yesterday I go to the office.';

const TEXTO_DEMO =
  "Um, so, my name is Gabriel and I am working as a frontend developer since twelve years. Uh, actually I am in a project for a bank, " +
  "and I make the migration of components to the new version of Angular. In my free time I am creating an app for barber shops, " +
  "is called Corte Parejo, eh, and it helps them to control the sales and the appointments. I like it because I can to think what the client really need.";

/** Manda el audio a un servicio de voz a texto compatible con el endpoint de OpenAI (OpenAI, Groq…). */
export async function transcribir(archivo: string, mime: string): Promise<string> {
  if (demo) return TEXTO_DEMO;
  if (!config.stt.llave) {
    throw new ErrorDeConfiguracion('Falta STT_API_KEY en servidor/.env: es la llave del servicio que convierte tu voz en texto.');
  }

  const form = new FormData();
  form.append('file', new Blob([await fs.readFile(archivo)], { type: mime }), `practica.${extension(mime)}`);
  form.append('model', config.stt.modelo);
  form.append('language', 'en');
  form.append('response_format', 'json');
  form.append('prompt', PISTA);

  const r = await fetch(config.stt.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.stt.llave}` },
    body: form,
  });
  if (r.status === 401 || r.status === 403) {
    throw new ErrorDeConfiguracion('El servicio de transcripción rechazó la llave (STT_API_KEY). Revísala en servidor/.env.');
  }
  if (!r.ok) throw new Error(`La transcripción falló (${r.status}): ${(await r.text()).slice(0, 300)}`);
  const json = (await r.json()) as { text?: string };
  return (json.text ?? '').trim();
}
