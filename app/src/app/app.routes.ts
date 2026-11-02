import { Routes } from '@angular/router';
import { Historial } from './historial/historial';
import { Practicar } from './practicar/practicar';
import { Progreso } from './progreso/progreso';

export const routes: Routes = [
  { path: '', component: Practicar, title: 'Practicar · Inglés v1' },
  { path: 'historial', component: Historial, title: 'Historial · Inglés v1' },
  { path: 'progreso', component: Progreso, title: 'Progreso · Inglés v1' },
  { path: '**', redirectTo: '' },
];
