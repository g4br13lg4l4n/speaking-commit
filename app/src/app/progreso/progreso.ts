import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api, type Progreso as DatosProgreso } from '../api';
import { fechaCorta } from '../plan';
import { Grafica } from './grafica';

@Component({
  selector: 'app-progreso',
  imports: [Grafica, RouterLink],
  template: `
    @if (datos(); as d) {
      <section class="totales">
        <div class="metrica"><span class="v num">{{ d.total.practicas }}</span><span class="k">prácticas</span></div>
        <div class="metrica"><span class="v num">{{ d.total.minutos }}</span><span class="k">minutos hablados</span></div>
        <div class="metrica"><span class="v num">{{ d.total.dias }}</span><span class="k">días con práctica</span></div>
      </section>

      @if (!d.total.practicas) {
        <section class="panel">
          <p class="vacio">Tus métricas aparecen después de la primera práctica. <a routerLink="/">Graba una ahora</a>.</p>
        </section>
      } @else {
        <section class="panel">
          <div class="cabeza"><h2>¿Está funcionando?</h2><span class="eyebrow">promedio por semana</span></div>
          <p class="pista">Si el método funciona, las palabras por minuto suben y los errores por minuto bajan.</p>
          <div class="graficas">
            <app-grafica titulo="Fluidez" unidad="ppm" meta="Más es mejor. Un nativo conversando: ~130–150." [valores]="serie('ppm')" />
            <app-grafica titulo="Errores" unidad="por min" meta="Menos es mejor." [valores]="serie('erroresMin')" />
            <app-grafica titulo="Vocabulario" unidad="palabras distintas" meta="Más es mejor." [valores]="serie('palabrasUnicas')" />
            <app-grafica titulo="Minutos grabados" unidad="min" meta="Constancia semanal." [valores]="serie('minutos')" />
          </div>
        </section>

        @if (d.tiposDeError.length) {
          <section class="panel">
            <div class="cabeza"><h2>Tus errores frecuentes</h2><span class="eyebrow">desde el inicio</span></div>
            <p class="pista">El de arriba es tu tema de estudio de la semana.</p>
            <ul class="tipos">
              @for (t of d.tiposDeError; track t.tipo) {
                <li>
                  <span class="k">{{ t.tipo }}</span>
                  <span class="barra"><span [style.width.%]="(t.veces / maxTipo()) * 100"></span></span>
                  <span class="num">{{ t.veces }}</span>
                </li>
              }
            </ul>
          </section>
        }
      }
    } @else if (error()) {
      <div class="aviso">No hay conexión con el servidor.</div>
    } @else {
      <p class="pista">Cargando…</p>
    }
  `,
})
export class Progreso {
  private readonly api = inject(Api);
  protected readonly datos = signal<DatosProgreso | null>(null);
  protected readonly error = signal(false);
  protected readonly maxTipo = computed(() => Math.max(1, ...(this.datos()?.tiposDeError.map((t) => t.veces) ?? [])));

  constructor() {
    this.api.progreso().subscribe({ next: (d) => this.datos.set(d), error: () => this.error.set(true) });
  }

  protected serie(campo: 'ppm' | 'erroresMin' | 'palabrasUnicas' | 'minutos') {
    return (this.datos()?.semanas ?? []).map((s) => ({ etiqueta: fechaCorta(s.semana).slice(4), v: s[campo] }));
  }
}
