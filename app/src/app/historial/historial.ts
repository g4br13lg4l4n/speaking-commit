import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, type Practica, type Progreso } from '../api';
import { duracion, fechaCorta } from '../plan';
import { Resultado } from '../resultado/resultado';

@Component({
  selector: 'app-historial',
  imports: [Resultado, RouterLink],
  template: `
    @if (progreso(); as pr) {
      @if (pr.primera && pr.ultima) {
        <section class="panel">
          <div class="cabeza"><h2>Tu changelog</h2><span class="eyebrow">primera vs. más reciente</span></div>
          <p class="pista">Escúchalas seguidas. Así se oye el avance que día a día no notas.</p>
          <div class="comparar">
            @for (x of [pr.primera, pr.ultima]; track x.id; let i = $index) {
              <div class="lado">
                <span class="eyebrow">{{ i === 0 ? 'Primera' : 'Más reciente' }} · {{ corta(x.fecha) }}</span>
                <audio controls preload="none" [src]="api.audioUrl(x.id)"></audio>
                <div class="mini num">
                  <span>{{ x.metricas?.ppm }} ppm</span>
                  <span>{{ x.metricas?.erroresMin }} err/min</span>
                  <span>{{ x.analisis?.nivel_estimado }}</span>
                </div>
              </div>
            }
          </div>
        </section>
      }
    }

    <section class="panel">
      <div class="cabeza"><h2>Historial</h2><span class="eyebrow num">{{ lista().length }} prácticas</span></div>
      @if (cargando()) {
        <p class="pista">Cargando…</p>
      } @else if (!lista().length) {
        <p class="vacio">Todavía no hay prácticas. <a routerLink="/">Graba la primera</a>: tarda 2 minutos.</p>
      } @else {
        <ul class="historial">
          @for (p of lista(); track p.id) {
            <li [class.abierta]="abierta() === p.id">
              <button type="button" class="fila" (click)="alternar(p.id)" [attr.aria-expanded]="abierta() === p.id">
                <span class="cuando num">{{ corta(p.fecha) }}</span>
                <span class="que">
                  <span class="t" lang="en">{{ p.pregunta || p.tema }}</span>
                  <span class="nota">{{ p.tema }} · {{ dur(p.duracionSeg) }}</span>
                </span>
                <span class="estado num">
                  @switch (p.estado) {
                    @case ('lista') { {{ p.metricas?.ppm }} ppm · {{ p.analisis?.nivel_estimado }} }
                    @case ('procesando') { procesando… }
                    @case ('error') { <span class="error-txt">falló</span> }
                  }
                </span>
              </button>
              @if (abierta() === p.id) {
                <div class="detalle">
                  @if (p.estado === 'lista') {
                    <app-resultado [practica]="p" />
                  } @else if (p.estado === 'error') {
                    <p class="error">{{ p.error }}</p>
                    <button type="button" class="btn" (click)="reintentar(p.id)">Reintentar</button>
                  }
                  <div class="acciones">
                    <button type="button" class="btn-borde peligro" (click)="borrar(p.id)">
                      {{ confirmarBorrado() === p.id ? 'Toca otra vez para borrarla' : 'Borrar práctica' }}
                    </button>
                  </div>
                </div>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class Historial {
  protected readonly api = inject(Api);
  protected readonly lista = signal<Practica[]>([]);
  protected readonly progreso = signal<Progreso | null>(null);
  protected readonly cargando = signal(true);
  protected readonly abierta = signal<number | null>(null);
  protected readonly confirmarBorrado = signal<number | null>(null);
  protected readonly corta = fechaCorta;
  protected readonly dur = duracion;

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.api.practicas().subscribe({
      next: (l) => {
        this.lista.set(l);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.api.progreso().subscribe((p) => this.progreso.set(p));
  }

  protected alternar(id: number): void {
    this.abierta.update((a) => (a === id ? null : id));
    this.confirmarBorrado.set(null);
  }

  protected reintentar(id: number): void {
    this.api.reintentar(id).subscribe(() => this.cargar());
  }

  protected borrar(id: number): void {
    if (this.confirmarBorrado() !== id) {
      this.confirmarBorrado.set(id);
      return;
    }
    this.api.borrar(id).subscribe(() => {
      this.abierta.set(null);
      this.confirmarBorrado.set(null);
      this.cargar();
    });
  }
}
