import { Component, computed, input } from '@angular/core';

/** Línea semanal pequeña en SVG: suficiente para ver si una métrica sube o baja. */
@Component({
  selector: 'app-grafica',
  template: `
    <figure class="grafica">
      <figcaption>
        <span class="t">{{ titulo() }}</span>
        @if (ultimo() !== null) {
          <span class="v num">{{ ultimo() }}<small> {{ unidad() }}</small></span>
        }
        <span class="nota">{{ meta() }}</span>
      </figcaption>
      @if (puntos().length) {
        <svg [attr.viewBox]="'0 0 ' + ancho + ' ' + alto" preserveAspectRatio="none" role="img" [attr.aria-label]="titulo() + ' por semana'">
          <line class="eje" x1="0" [attr.y1]="alto - 18" [attr.x2]="ancho" [attr.y2]="alto - 18" />
          <polyline class="linea" [attr.points]="linea()" />
          @for (p of puntos(); track p.x) {
            <circle class="pt" [class.final]="$last" [attr.cx]="p.x" [attr.cy]="p.y" r="3.5" />
            <text class="etq" [attr.x]="p.x" [attr.y]="alto - 4" text-anchor="middle">{{ p.etiqueta }}</text>
          }
        </svg>
      } @else {
        <p class="pista">Aparece con tu primera semana de prácticas.</p>
      }
    </figure>
  `,
})
export class Grafica {
  readonly titulo = input.required<string>();
  readonly unidad = input('');
  readonly meta = input('');
  readonly valores = input.required<{ etiqueta: string; v: number }[]>();

  protected readonly ancho = 320;
  protected readonly alto = 120;

  protected readonly ultimo = computed(() => {
    const v = this.valores();
    return v.length ? v[v.length - 1]!.v : null;
  });

  protected readonly puntos = computed(() => {
    const v = this.valores();
    if (!v.length) return [];
    const max = Math.max(...v.map((x) => x.v), 1);
    const min = Math.min(...v.map((x) => x.v), 0);
    const rango = max - min || 1;
    const margen = 16;
    const paso = v.length > 1 ? (this.ancho - margen * 2) / (v.length - 1) : 0;
    return v.map((x, i) => ({
      x: v.length > 1 ? margen + i * paso : this.ancho / 2,
      y: 8 + (1 - (x.v - min) / rango) * (this.alto - 34),
      etiqueta: x.etiqueta,
    }));
  });

  protected readonly linea = computed(() => this.puntos().map((p) => `${p.x},${p.y}`).join(' '));
}
