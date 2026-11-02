import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { config, demo } from './config.ts';
import { corregir } from './corregir.ts';
import { practicas, type Practica } from './db.ts';
import { calcularMetricas } from './metricas.ts';
import { ErrorDeConfiguracion, extension, transcribir } from './transcribir.ts';

const app = express();
app.use(express.json());

const esAudio = (req: { headers: Request['headers'] }) => /^(audio\/|video\/webm)/.test(req.headers['content-type'] ?? '');

/** Transcribe y corrige en segundo plano; la app consulta el estado mientras tanto. */
async function procesar(id: number): Promise<void> {
  const p = practicas.obtener(id);
  const a = practicas.audio(id);
  if (!p || !a) return;
  try {
    let texto = p.transcripcion;
    if (!texto) {
      texto = await transcribir(a.archivo, a.mime);
      if ((texto.match(/[a-z]+/gi) ?? []).length < 3) {
        throw new Error('No se entendió nada en la grabación. Revisa que el micrófono sea el correcto y graba de nuevo.');
      }
      practicas.guardarTranscripcion(id, texto);
    }
    const analisis = await corregir({ transcripcion: texto, tema: p.tema, pregunta: p.pregunta, duracionSeg: p.duracionSeg });
    practicas.terminar(id, analisis, calcularMetricas(texto, p.duracionSeg, analisis.errores.length));
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : 'Algo falló al procesar la grabación.';
    if (!(e instanceof ErrorDeConfiguracion)) console.error(`Práctica ${id}:`, e);
    practicas.fallar(id, mensaje);
  }
}

app.get('/api/salud', (_req, res) => {
  res.json({ ok: true, demo, transcripcion: demo || !!config.stt.llave, correccion: demo || config.claude.configurado });
});

app.post('/api/practicas', express.raw({ type: esAudio, limit: '30mb' }), (req: Request, res: Response) => {
  const cuerpo = req.body as Buffer | undefined;
  const duracionSeg = Number(req.query['duracion']);
  const tema = String(req.query['tema'] ?? '').slice(0, 200);
  const pregunta = String(req.query['pregunta'] ?? '').slice(0, 400);
  if (!Buffer.isBuffer(cuerpo) || cuerpo.length < 1000) {
    res.status(400).json({ error: 'La grabación llegó vacía. Graba de nuevo.' });
    return;
  }
  if (!(duracionSeg >= 3 && duracionSeg <= 600)) {
    res.status(400).json({ error: 'La grabación debe durar entre 3 segundos y 10 minutos.' });
    return;
  }
  const mime = String(req.headers['content-type']);
  const audio = `${new Date().toISOString().slice(0, 10)}-${crypto.randomUUID()}.${extension(mime)}`;
  fs.writeFileSync(path.join(config.datos, 'audios', audio), cuerpo);
  const id = practicas.crear({ tema, pregunta, duracionSeg, audio, mime });
  void procesar(id);
  res.status(202).json(practicas.obtener(id));
});

app.get('/api/practicas', (_req, res) => {
  res.json(practicas.todas());
});

app.get('/api/practicas/:id', (req, res) => {
  const p = practicas.obtener(Number(req.params['id']));
  if (!p) res.status(404).json({ error: 'No existe esa práctica.' });
  else res.json(p);
});

app.post('/api/practicas/:id/reintentar', (req, res) => {
  const id = Number(req.params['id']);
  const p = practicas.obtener(id);
  if (!p) {
    res.status(404).json({ error: 'No existe esa práctica.' });
    return;
  }
  if (p.estado === 'procesando') {
    res.status(409).json({ error: 'Esa práctica ya se está procesando.' });
    return;
  }
  practicas.reabrir(id);
  void procesar(id);
  res.status(202).json(practicas.obtener(id));
});

app.get('/api/practicas/:id/audio', (req, res) => {
  const a = practicas.audio(Number(req.params['id']));
  if (!a || !fs.existsSync(a.archivo)) {
    res.status(404).end();
    return;
  }
  res.type(a.mime.split(';')[0]!).sendFile(a.archivo);
});

app.delete('/api/practicas/:id', (req, res) => {
  practicas.borrar(Number(req.params['id']));
  res.status(204).end();
});

/** Lunes de la semana de una fecha YYYY-MM-DD. */
function lunes(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number) as [number, number, number];
  const dia = new Date(y, m - 1, d, 12);
  dia.setDate(dia.getDate() - ((dia.getDay() + 6) % 7));
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
}

const promedio = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);

app.get('/api/progreso', (_req, res) => {
  const listas = practicas.todas().filter((p): p is Practica & { analisis: NonNullable<Practica['analisis']>; metricas: NonNullable<Practica['metricas']> } =>
    p.estado === 'lista' && !!p.analisis && !!p.metricas,
  );
  const porSemana = new Map<string, typeof listas>();
  for (const p of listas) {
    const s = lunes(p.fecha);
    porSemana.set(s, [...(porSemana.get(s) ?? []), p]);
  }
  const semanas = [...porSemana.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([semana, ps]) => ({
      semana,
      practicas: ps.length,
      minutos: Math.round(ps.reduce((t, p) => t + p.duracionSeg, 0) / 6) / 10,
      ppm: promedio(ps.map((p) => p.metricas.ppm)),
      erroresMin: promedio(ps.map((p) => p.metricas.erroresMin)),
      palabrasUnicas: promedio(ps.map((p) => p.metricas.palabrasUnicas)),
      fluidez: promedio(ps.map((p) => p.analisis.puntuacion.fluidez)),
      gramatica: promedio(ps.map((p) => p.analisis.puntuacion.gramatica)),
      vocabulario: promedio(ps.map((p) => p.analisis.puntuacion.vocabulario)),
    }));

  const tipos: Record<string, number> = {};
  for (const p of listas) for (const e of p.analisis.errores) tipos[e.tipo] = (tipos[e.tipo] ?? 0) + 1;

  const ordenadas = [...listas].sort((a, b) => (a.creada < b.creada ? -1 : 1));
  res.json({
    total: {
      practicas: listas.length,
      minutos: Math.round(listas.reduce((t, p) => t + p.duracionSeg, 0) / 6) / 10,
      dias: new Set(listas.map((p) => p.fecha)).size,
    },
    semanas,
    tiposDeError: Object.entries(tipos)
      .sort((a, b) => b[1] - a[1])
      .map(([tipo, veces]) => ({ tipo, veces })),
    primera: ordenadas[0] ?? null,
    ultima: ordenadas.length > 1 ? ordenadas[ordenadas.length - 1] : null,
  });
});

// En producción, el mismo servidor sirve la app ya compilada.
if (fs.existsSync(config.app)) {
  app.use(express.static(config.app));
  app.get('/{*resto}', (_req, res) => res.sendFile(path.join(config.app, 'index.html')));
}

// Si el servidor se reinició a medio procesar, esas prácticas se retoman.
for (const p of practicas.todas()) if (p.estado === 'procesando') void procesar(p.id);

app.listen(config.puerto, '127.0.0.1', () => {
  console.log(`Inglés v1 · servidor en http://127.0.0.1:${config.puerto}${demo ? ' · MODO DEMO (sin llaves)' : ''}`);
});
