import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

/** Lo que devuelve el servidor (servidor/src/corregir.ts y metricas.ts). */
export interface Analisis {
  resumen: string;
  logro: string;
  errores: { original: string; correccion: string; tipo: string; explicacion: string }[];
  version_natural: string;
  frases_utiles: { frase: string; cuando_usarla: string }[];
  pronunciacion: { transcrito: string; probable: string; nota: string }[];
  foco_manana: string;
  puntuacion: { fluidez: number; gramatica: number; vocabulario: number };
  nivel_estimado: string;
}

export interface Metricas {
  palabras: number;
  palabrasUnicas: number;
  ppm: number;
  erroresMin: number;
  muletillas: number;
}

export interface Practica {
  id: number;
  creada: string;
  fecha: string;
  tema: string;
  pregunta: string;
  duracionSeg: number;
  mime: string;
  estado: 'procesando' | 'lista' | 'error';
  error: string | null;
  transcripcion: string | null;
  analisis: Analisis | null;
  metricas: Metricas | null;
}

export interface Semana {
  semana: string;
  practicas: number;
  minutos: number;
  ppm: number;
  erroresMin: number;
  palabrasUnicas: number;
  fluidez: number;
  gramatica: number;
  vocabulario: number;
}

export interface Progreso {
  total: { practicas: number; minutos: number; dias: number };
  semanas: Semana[];
  tiposDeError: { tipo: string; veces: number }[];
  primera: Practica | null;
  ultima: Practica | null;
}

export interface Salud {
  ok: boolean;
  demo: boolean;
  transcripcion: boolean;
  correccion: boolean;
}

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  salud() {
    return this.http.get<Salud>('/api/salud');
  }

  enviar(audio: Blob, duracionSeg: number, tema: string, pregunta: string) {
    const params = new HttpParams({ fromObject: { duracion: String(Math.round(duracionSeg)), tema, pregunta } });
    return this.http.post<Practica>('/api/practicas', audio, { params });
  }

  practica(id: number) {
    return this.http.get<Practica>(`/api/practicas/${id}`);
  }

  practicas() {
    return this.http.get<Practica[]>('/api/practicas');
  }

  reintentar(id: number) {
    return this.http.post<Practica>(`/api/practicas/${id}/reintentar`, null);
  }

  borrar(id: number) {
    return this.http.delete<void>(`/api/practicas/${id}`);
  }

  progreso() {
    return this.http.get<Progreso>('/api/progreso');
  }

  audioUrl(id: number): string {
    return `/api/practicas/${id}/audio`;
  }
}
