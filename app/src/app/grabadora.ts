import { Injectable, signal } from '@angular/core';

export type EstadoGrabadora = 'inactiva' | 'pidiendo' | 'grabando' | 'lista';

/** Graba del micrófono con MediaRecorder. Chrome y Edge dan webm/opus; Safari, mp4. */
@Injectable({ providedIn: 'root' })
export class Grabadora {
  /** Tope de una práctica: el plan pide de 1 a 3 minutos. */
  readonly maximoSeg = 300;

  readonly estado = signal<EstadoGrabadora>('inactiva');
  readonly segundos = signal(0);
  readonly audio = signal<Blob | null>(null);
  readonly url = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  private grabador?: MediaRecorder;
  private microfono?: MediaStream;
  private partes: Blob[] = [];
  private inicio = 0;
  private reloj?: number;

  async iniciar(): Promise<void> {
    this.descartar();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.error.set('Este navegador no puede grabar audio. Usa Chrome, Edge o Safari actualizados.');
      return;
    }
    this.estado.set('pidiendo');
    try {
      this.microfono = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      this.estado.set('inactiva');
      this.error.set(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'El navegador bloqueó el micrófono. Permítelo en el candado de la barra de direcciones y vuelve a intentar.'
          : 'No encontré un micrófono. Conecta uno y vuelve a intentar.',
      );
      return;
    }

    const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => MediaRecorder.isTypeSupported(t));
    const grabador = new MediaRecorder(this.microfono, tipo ? { mimeType: tipo } : undefined);
    this.grabador = grabador;
    this.partes = [];
    grabador.ondataavailable = (e) => {
      if (e.data.size) this.partes.push(e.data);
    };
    grabador.onstop = () => {
      const blob = new Blob(this.partes, { type: grabador.mimeType || tipo || 'audio/webm' });
      this.audio.set(blob);
      this.url.set(URL.createObjectURL(blob));
      this.estado.set('lista');
      this.soltarMicrofono();
    };
    grabador.start(1000);
    this.inicio = performance.now();
    this.segundos.set(0);
    this.reloj = window.setInterval(() => {
      const s = (performance.now() - this.inicio) / 1000;
      this.segundos.set(s);
      if (s >= this.maximoSeg) this.detener();
    }, 250);
    this.estado.set('grabando');
  }

  detener(): void {
    window.clearInterval(this.reloj);
    if (this.grabador?.state === 'recording') {
      this.segundos.set((performance.now() - this.inicio) / 1000);
      this.grabador.stop();
    }
  }

  descartar(): void {
    window.clearInterval(this.reloj);
    if (this.grabador?.state === 'recording') {
      this.grabador.onstop = null;
      this.grabador.stop();
    }
    this.soltarMicrofono();
    const url = this.url();
    if (url) URL.revokeObjectURL(url);
    this.audio.set(null);
    this.url.set(null);
    this.segundos.set(0);
    this.error.set(null);
    this.estado.set('inactiva');
  }

  private soltarMicrofono(): void {
    this.microfono?.getTracks().forEach((t) => t.stop());
    this.microfono = undefined;
  }
}
