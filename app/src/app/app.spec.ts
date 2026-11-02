import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { bloqueDe, preguntaDelDia } from './plan';

describe('App', () => {
  it('muestra la navegación', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Practicar');
    expect(texto).toContain('Progreso');
  });
});

describe('plan', () => {
  it('antes de empezar toca el bloque 1, y entre bloques el siguiente', () => {
    expect(bloqueDe('2026-11-01').n).toBe(1);
    expect(bloqueDe('2026-11-29').n).toBe(2);
    expect(bloqueDe('2027-03-25').n).toBe(6);
    expect(bloqueDe('2027-06-01').n).toBe(6);
  });

  it('la pregunta cambia de un día a otro y siempre es del bloque', () => {
    const a = preguntaDelDia('2026-11-02');
    const b = preguntaDelDia('2026-11-03');
    expect(a).not.toBe(b);
    expect(bloqueDe('2026-11-02').preguntas).toContain(b);
  });
});
