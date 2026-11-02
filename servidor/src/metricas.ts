export interface Metricas {
  palabras: number;
  palabrasUnicas: number;
  /** Palabras por minuto: la fluidez en bruto. */
  ppm: number;
  /** Errores que encontró Claude por minuto hablado. */
  erroresMin: number;
  /** Um, uh, eh…: las pausas que se oyen. */
  muletillas: number;
}

const MULETILLAS = new Set(['um', 'umm', 'uh', 'uhh', 'eh', 'ehh', 'em', 'emm', 'hmm', 'mm', 'ah', 'ahh', 'er']);

export function calcularMetricas(transcripcion: string, duracionSeg: number, errores: number): Metricas {
  const tokens = transcripcion.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  const muletillas = tokens.filter((t) => MULETILLAS.has(t)).length;
  const palabras = tokens.filter((t) => !MULETILLAS.has(t));
  const minutos = Math.max(duracionSeg, 1) / 60;
  const redondear = (n: number) => Math.round(n * 10) / 10;
  return {
    palabras: palabras.length,
    palabrasUnicas: new Set(palabras).size,
    ppm: redondear(palabras.length / minutos),
    erroresMin: redondear(errores / minutos),
    muletillas,
  };
}
