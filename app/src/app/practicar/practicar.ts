import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Api, type Practica, type Salud } from '../api';
import { Grabadora } from '../grabadora';
import { bloqueDe, duracion, fechaCorta, hoy, preguntaDelDia } from '../plan';
import { Resultado } from '../resultado/resultado';

@Component({
  selector: 'app-practicar',
  imports: [Resultado],
  template: `
    <section class="panel">
      <div class="cabeza">
        <span class="eyebrow">{{ fecha }}</span>
        <span class="chip">Bloque {{ bloque.n }} · {{ bloque.tema }}</span>
      </div>
      <p class="pregunta" lang="en">{{ pregunta() }}</p>
      <div class="acciones">
        <button type="button" class="btn-borde" (click)="otraPregunta()" [disabled]="ocupado()">Otra pregunta</button>
        <span class="pista">Habla de 1 a 3 minutos, sin leer. Si te trabas, sigue: los errores también cuentan.</span>
      </div>
    </section>

    @if (aviso(); as av) {
      <div class="aviso">{{ av }}</div>
    }

    <section class="panel grabadora">
      @switch (grabadora.estado()) {
        @case ('grabando') {
          <div class="tiempo num" aria-live="off">{{ tiempo() }}</div>
          <div class="en-vivo"><span class="punto-rojo"></span>Grabando · máximo {{ maximo }}</div>
          <button type="button" class="btn-grande detener" (click)="grabadora.detener()">Detener</button>
        }
        @case ('lista') {
          <div class="tiempo num">{{ tiempo() }}</div>
          <audio controls [src]="grabadora.url()"></audio>
          <div class="acciones centro">
            <button type="button" class="btn" (click)="enviar()" [disabled]="enviando()">
              {{ enviando() ? 'Enviando…' : 'Enviar para corregir' }}
            </button>
            <button type="button" class="btn-borde" (click)="grabadora.descartar()" [disabled]="enviando()">Grabar de nuevo</button>
          </div>
          @if (grabadora.segundos() < 20) {
            <p class="pista">Es muy corta: con menos de 20 segundos la corrección dice poco.</p>
          }
        }
        @default {
          <button type="button" class="btn-grande" (click)="grabar()" [disabled]="grabadora.estado() === 'pidiendo' || procesando()">
            {{ grabadora.estado() === 'pidiendo' ? 'Pidiendo micrófono…' : 'Grabar' }}
          </button>
          <p class="pista">La primera vez, el navegador te pide permiso para usar el micrófono.</p>
        }
      }
      @if (grabadora.error(); as e) {
        <p class="error">{{ e }}</p>
      }
    </section>

    @if (practica(); as p) {
      <section class="panel">
        @switch (p.estado) {
          @case ('procesando') {
            <div class="procesando">
              <span class="girando" aria-hidden="true"></span>
              <span>{{ p.transcripcion ? 'Claude está revisando tu inglés…' : 'Convirtiendo tu voz en texto…' }}</span>
            </div>
            <p class="pista">Tarda entre 20 segundos y un minuto. Puedes quedarte aquí o volver luego al historial.</p>
          }
          @case ('error') {
            <p class="error">{{ p.error }}</p>
            <div class="acciones">
              <button type="button" class="btn" (click)="reintentar(p.id)">Reintentar</button>
            </div>
          }
          @case ('lista') {
            <h2>Tu corrección</h2>
            <app-resultado [practica]="p" />
            <div class="acciones">
              <button type="button" class="btn" (click)="nuevaPractica()">Hacer otra práctica</button>
            </div>
          }
        }
      </section>
    }
  `,
})
export class Practicar {
  private readonly api = inject(Api);
  protected readonly grabadora = inject(Grabadora);

  protected readonly fecha = fechaCorta(hoy());
  protected readonly bloque = bloqueDe(hoy());
  protected readonly maximo = duracion(this.grabadora.maximoSeg);
  private readonly desplazamiento = signal(0);
  protected readonly pregunta = computed(() => preguntaDelDia(hoy(), this.desplazamiento()));
  protected readonly tiempo = computed(() => duracion(this.grabadora.segundos()));

  protected readonly enviando = signal(false);
  protected readonly practica = signal<Practica | null>(null);
  protected readonly procesando = computed(() => this.practica()?.estado === 'procesando');
  protected readonly ocupado = computed(() => this.grabadora.estado() === 'grabando' || this.enviando() || this.procesando());
  private readonly salud = signal<Salud | null>(null);
  private readonly errorEnvio = signal<string | null>(null);

  protected readonly aviso = computed(() => {
    const err = this.errorEnvio();
    if (err) return err;
    const s = this.salud();
    if (!s) return null;
    if (s.demo) return 'Modo demo: la transcripción y la corrección son de ejemplo, no de tu voz.';
    if (!s.transcripcion || !s.correccion) {
      return 'Faltan llaves en servidor/.env: puedes grabar, pero la corrección fallará hasta configurarlas.';
    }
    return null;
  });

  private sondeo?: number;

  constructor() {
    this.api.salud().subscribe({
      next: (s) => this.salud.set(s),
      error: () => this.errorEnvio.set('No hay conexión con el servidor. ¿Está corriendo `npm run dev` en servidor/?'),
    });
    inject(DestroyRef).onDestroy(() => {
      window.clearInterval(this.sondeo);
      if (this.grabadora.estado() === 'grabando') this.grabadora.descartar();
    });
  }

  protected otraPregunta(): void {
    this.desplazamiento.update((n) => n + 1);
  }

  protected grabar(): void {
    this.practica.set(null);
    this.errorEnvio.set(null);
    void this.grabadora.iniciar();
  }

  protected enviar(): void {
    const audio = this.grabadora.audio();
    if (!audio) return;
    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.api.enviar(audio, this.grabadora.segundos(), this.bloque.tema, this.pregunta()).subscribe({
      next: (p) => {
        this.enviando.set(false);
        this.grabadora.descartar();
        this.seguir(p);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.errorEnvio.set(e.error?.error ?? 'No se pudo enviar la grabación. Revisa que el servidor esté corriendo.');
      },
    });
  }

  protected reintentar(id: number): void {
    this.api.reintentar(id).subscribe({ next: (p) => this.seguir(p) });
  }

  protected nuevaPractica(): void {
    this.practica.set(null);
    this.otraPregunta();
  }

  /** Consulta la práctica cada 2 segundos hasta que termine de procesarse. */
  private seguir(p: Practica): void {
    this.practica.set(p);
    window.clearInterval(this.sondeo);
    if (p.estado !== 'procesando') return;
    this.sondeo = window.setInterval(() => {
      this.api.practica(p.id).subscribe((act) => {
        this.practica.set(act);
        if (act.estado !== 'procesando') window.clearInterval(this.sondeo);
      });
    }, 2000);
  }
}
