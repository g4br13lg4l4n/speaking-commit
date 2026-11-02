/** El plan de C:\develop\ideas\plan-ingles.md: bloques de 4 semanas, cada uno con su release. */
export interface Bloque {
  n: number;
  ini: string;
  fin: string;
  version: string;
  tema: string;
  entregable: string;
  preguntas: string[];
}

export const BLOQUES: Bloque[] = [
  {
    n: 1, ini: '2026-11-02', fin: '2026-11-28', version: 'v0.2', tema: 'Yo y mi trabajo',
    entregable: 'Presentarme 2 minutos sin leer',
    preguntas: [
      'Tell me about yourself and your career so far.',
      'What does a normal workday look like for you?',
      "Describe the project you're working on right now.",
      'What do you like most about being a developer?',
      'Tell me about a technology you learned recently and why.',
    ],
  },
  {
    n: 2, ini: '2026-11-30', fin: '2026-12-26', version: 'v0.4', tema: 'Corte Parejo técnico',
    entregable: 'Explicar 3 ADRs en inglés, 3 minutos cada uno',
    preguntas: [
      "Explain what Corte Parejo does and who it's for.",
      'Why did you choose NestJS and PostgreSQL for the backend?',
      "How do you keep each business's data separate from the others?",
      'Walk me through the payment flow. What can go wrong?',
      'Explain one architecture decision you documented in an ADR.',
    ],
  },
  {
    n: 3, ini: '2026-12-28', fin: '2027-01-23', version: 'v0.6', tema: 'Reuniones',
    entregable: 'Simular una daily y un refinamiento con el tutor',
    preguntas: [
      "Give your status update for today's daily stand-up.",
      'A ticket is unclear. Ask the product owner the questions you need.',
      'Estimate a new feature and explain your reasoning.',
      'You disagree with a technical decision. Explain why, politely.',
      'Explain a production bug to a non-technical stakeholder.',
    ],
  },
  {
    n: 4, ini: '2027-01-25', fin: '2027-02-20', version: 'v0.8', tema: 'Entrevistas: historias STAR',
    entregable: '6 historias STAR listas',
    preguntas: [
      'Tell me about a time you had a conflict with a teammate.',
      'Tell me about a mistake you made and what you learned from it.',
      'What is your biggest professional achievement?',
      "Tell me about a time you led something without being the boss.",
      'Tell me about a time you had to deliver under pressure.',
    ],
  },
  {
    n: 5, ini: '2027-02-22', fin: '2027-03-20', version: 'v0.9', tema: 'Entrevistas: técnica y diseño',
    entregable: '2 simulacros de entrevista de 30 minutos',
    preguntas: [
      'How would you design an appointment booking system for barbershops?',
      'Explain change detection in Angular to a junior developer.',
      'How would you speed up a slow Angular application?',
      'Micro-frontends or a monolith: when would you choose each?',
      'How do you protect a frontend against XSS attacks?',
    ],
  },
  {
    n: 6, ini: '2027-03-22', fin: '2027-03-27', version: 'v1.0', tema: 'Evaluación',
    entregable: 'Evaluación externa: B2 hablado',
    preguntas: [
      'Introduce yourself as if this were a real interview.',
      'Why do you want to work with a US company?',
      'Tell me about the hardest technical problem you have solved.',
      'Where do you see yourself in three years?',
      'Do you have any questions for us?',
    ],
  },
];

export function hoy(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** El bloque que toca en una fecha; entre bloques o antes de empezar, el siguiente; después, el último. */
export function bloqueDe(fecha: string): Bloque {
  return BLOQUES.find((b) => fecha >= b.ini && fecha <= b.fin) ?? BLOQUES.find((b) => b.ini > fecha) ?? BLOQUES[BLOQUES.length - 1]!;
}

/** Cambia cada día, para no repetir la misma pregunta toda la semana. */
export function preguntaDelDia(fecha: string, desplazamiento = 0): string {
  const b = bloqueDe(fecha);
  const dia = Math.floor(new Date(`${fecha}T12:00:00`).getTime() / 864e5);
  return b.preguntas[(((dia + desplazamiento) % b.preguntas.length) + b.preguntas.length) % b.preguntas.length]!;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function fechaCorta(fecha: string): string {
  const d = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function duracion(seg: number): string {
  const s = Math.round(seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const TRACKER = 'https://claude.ai/artifact/D6n8zcYPxpVjWPmJaWjkvp';
