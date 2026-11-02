import type { HttpInterceptorFn } from '@angular/common/http';

/** El servidor rechaza cambios que no traigan este encabezado (ver servidor/src/main.ts). */
export const encabezadoApp: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/api/') ? req.clone({ setHeaders: { 'X-Ingles-App': '1' } }) : req);
