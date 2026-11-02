import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.ts';
import type { Analisis } from './corregir.ts';
import type { Metricas } from './metricas.ts';

export type Estado = 'procesando' | 'lista' | 'error';

export interface Practica {
  id: number;
  creada: string;
  fecha: string;
  tema: string;
  pregunta: string;
  duracionSeg: number;
  mime: string;
  estado: Estado;
  error: string | null;
  transcripcion: string | null;
  analisis: Analisis | null;
  metricas: Metricas | null;
}

fs.mkdirSync(path.join(config.datos, 'audios'), { recursive: true });
const db = new DatabaseSync(path.join(config.datos, 'ingles.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS practicas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creada TEXT NOT NULL,
    fecha TEXT NOT NULL,
    tema TEXT NOT NULL,
    pregunta TEXT NOT NULL DEFAULT '',
    duracion_seg REAL NOT NULL,
    audio TEXT NOT NULL,
    mime TEXT NOT NULL,
    estado TEXT NOT NULL,
    error TEXT,
    transcripcion TEXT,
    analisis TEXT,
    metricas TEXT
  );
  CREATE INDEX IF NOT EXISTS practicas_fecha ON practicas (fecha);
`);

type Fila = Record<string, string | number | null>;

function aPractica(f: Fila): Practica {
  return {
    id: Number(f['id']),
    creada: String(f['creada']),
    fecha: String(f['fecha']),
    tema: String(f['tema']),
    pregunta: String(f['pregunta'] ?? ''),
    duracionSeg: Number(f['duracion_seg']),
    mime: String(f['mime']),
    estado: f['estado'] as Estado,
    error: (f['error'] as string | null) ?? null,
    transcripcion: (f['transcripcion'] as string | null) ?? null,
    analisis: f['analisis'] ? (JSON.parse(String(f['analisis'])) as Analisis) : null,
    metricas: f['metricas'] ? (JSON.parse(String(f['metricas'])) as Metricas) : null,
  };
}

/** Fecha local (la de quien practica), no UTC: una práctica a las 9 p. m. cuenta para ese día. */
export function hoy(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const practicas = {
  crear(datos: { tema: string; pregunta: string; duracionSeg: number; audio: string; mime: string }): number {
    const r = db
      .prepare(
        `INSERT INTO practicas (creada, fecha, tema, pregunta, duracion_seg, audio, mime, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'procesando')`,
      )
      .run(new Date().toISOString(), hoy(), datos.tema, datos.pregunta, datos.duracionSeg, datos.audio, datos.mime);
    return Number(r.lastInsertRowid);
  },

  guardarTranscripcion(id: number, texto: string): void {
    db.prepare('UPDATE practicas SET transcripcion = ? WHERE id = ?').run(texto, id);
  },

  terminar(id: number, analisis: Analisis, metricas: Metricas): void {
    db.prepare(`UPDATE practicas SET estado = 'lista', error = NULL, analisis = ?, metricas = ? WHERE id = ?`).run(
      JSON.stringify(analisis),
      JSON.stringify(metricas),
      id,
    );
  },

  fallar(id: number, mensaje: string): void {
    db.prepare(`UPDATE practicas SET estado = 'error', error = ? WHERE id = ?`).run(mensaje, id);
  },

  reabrir(id: number): void {
    db.prepare(`UPDATE practicas SET estado = 'procesando', error = NULL WHERE id = ?`).run(id);
  },

  obtener(id: number): Practica | null {
    const f = db.prepare('SELECT * FROM practicas WHERE id = ?').get(id) as Fila | undefined;
    return f ? aPractica(f) : null;
  },

  audio(id: number): { archivo: string; mime: string } | null {
    const f = db.prepare('SELECT audio, mime FROM practicas WHERE id = ?').get(id) as Fila | undefined;
    return f ? { archivo: path.join(config.datos, 'audios', String(f['audio'])), mime: String(f['mime']) } : null;
  },

  todas(): Practica[] {
    return (db.prepare('SELECT * FROM practicas ORDER BY creada DESC').all() as Fila[]).map(aPractica);
  },

  borrar(id: number): void {
    const a = this.audio(id);
    db.prepare('DELETE FROM practicas WHERE id = ?').run(id);
    if (a) fs.rmSync(a.archivo, { force: true });
  },
};
