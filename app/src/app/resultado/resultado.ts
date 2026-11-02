import { Component, computed, inject, input, signal } from '@angular/core';
import { Api, type Practica } from '../api';

/** La corrección completa de una práctica: lo que se ve al terminar y en el historial. */
@Component({
  selector: 'app-resultado',
  template: `
    @let p = practica();
    @if (p.analisis && p.metricas) {
      @let a = p.analisis;
      @let m = p.metricas;
      <div class="resultado">
        <div class="metricas">
          <div class="metrica"><span class="v num">{{ m.ppm }}</span><span class="k">palabras/min</span></div>
          <div class="metrica"><span class="v num">{{ m.erroresMin }}</span><span class="k">errores/min</span></div>
          <div class="metrica"><span class="v num">{{ m.palabrasUnicas }}</span><span class="k">palabras distintas</span></div>
          <div class="metrica"><span class="v num">{{ m.muletillas }}</span><span class="k">muletillas</span></div>
          <div class="metrica destacada"><span class="v num">{{ a.nivel_estimado }}</span><span class="k">nivel en esta práctica</span></div>
        </div>

        <div class="puntos">
          @for (pt of puntos(); track pt.k) {
            <div class="punto">
              <span class="k">{{ pt.k }}</span>
              <span class="barra"><span [style.width.%]="pt.v * 10"></span></span>
              <span class="num">{{ pt.v }}/10</span>
            </div>
          }
        </div>

        <p class="resumen">{{ a.resumen }}</p>
        <div class="bien"><span class="eyebrow">Lo que hiciste bien</span><p>{{ a.logro }}</p></div>

        @if (a.errores.length) {
          <section>
            <h3>Correcciones <span class="num cuenta">{{ a.errores.length }}</span></h3>
            <ul class="errores">
              @for (e of a.errores; track $index) {
                <li>
                  <span class="chip">{{ e.tipo }}</span>
                  <div class="par">
                    <span class="mal">{{ e.original }}</span>
                    <span class="flecha" aria-hidden="true">→</span>
                    <span class="bien-dicho">{{ e.correccion }}</span>
                  </div>
                  <p class="nota">{{ e.explicacion }}</p>
                </li>
              }
            </ul>
          </section>
        }

        <section>
          <div class="cabeza">
            <h3>Cómo lo diría un nativo</h3>
            @if (puedeLeer) {
              <button type="button" class="btn-borde" (click)="leer(a.version_natural)">{{ leyendo() ? 'Detener' : 'Escuchar' }}</button>
            }
          </div>
          <p class="natural" lang="en">{{ a.version_natural }}</p>
          <p class="pista">Escúchala y repítela en voz alta justo detrás (shadowing).</p>
        </section>

        <section>
          <h3>Frases para tu repertorio</h3>
          <ul class="frases">
            @for (f of a.frases_utiles; track $index) {
              <li><span lang="en">{{ f.frase }}</span><span class="nota">{{ f.cuando_usarla }}</span></li>
            }
          </ul>
        </section>

        @if (a.pronunciacion.length) {
          <section>
            <h3>Pistas de pronunciación</h3>
            <p class="pista">La transcripción escuchó otra palabra: probablemente ahí hay un sonido que practicar.</p>
            <ul class="frases">
              @for (x of a.pronunciacion; track $index) {
                <li><span><span class="mal">{{ x.transcrito }}</span> → <strong lang="en">{{ x.probable }}</strong></span><span class="nota">{{ x.nota }}</span></li>
              }
            </ul>
          </section>
        }

        <div class="foco"><span class="eyebrow">Mañana, enfócate en</span><p>{{ a.foco_manana }}</p></div>

        <details>
          <summary>Tu grabación y lo que se transcribió</summary>
          <audio controls preload="none" [src]="audio()"></audio>
          <p class="transcripcion" lang="en">{{ p.transcripcion }}</p>
        </details>
      </div>
    }
  `,
})
export class Resultado {
  private readonly api = inject(Api);
  readonly practica = input.required<Practica>();

  protected readonly audio = computed(() => this.api.audioUrl(this.practica().id));
  protected readonly puntos = computed(() => {
    const s = this.practica().analisis?.puntuacion;
    return s ? [{ k: 'Fluidez', v: s.fluidez }, { k: 'Gramática', v: s.gramatica }, { k: 'Vocabulario', v: s.vocabulario }] : [];
  });

  protected readonly puedeLeer = typeof speechSynthesis !== 'undefined';
  protected readonly leyendo = signal(false);

  /** Lee la versión natural con la voz en inglés del navegador, para practicar shadowing. */
  protected leer(texto: string): void {
    if (this.leyendo()) {
      speechSynthesis.cancel();
      this.leyendo.set(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'en-US';
    u.rate = 0.95;
    u.voice = speechSynthesis.getVoices().find((v) => v.lang === 'en-US') ?? null;
    u.onend = u.onerror = () => this.leyendo.set(false);
    this.leyendo.set(true);
    speechSynthesis.speak(u);
  }
}
