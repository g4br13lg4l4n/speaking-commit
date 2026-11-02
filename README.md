# Inglés v1

Mi app para pasar de B1 a B2 hablado: grabo de 1 a 3 minutos respondiendo una pregunta del plan, se transcribe mi voz y Claude me corrige. Con el tiempo, las métricas muestran si el método funciona: las palabras por minuto deben subir y los errores por minuto, bajar.

El plan completo está en `C:\develop\ideas\plan-ingles.md`. La racha, los releases y los logros siguen, por ahora, en el [tracker](https://claude.ai/artifact/D6n8zcYPxpVjWPmJaWjkvp).

## Reglas del proyecto

1. **Mi hora de inglés nunca se usa en la app.** Claude la construye y la cambia; yo la uso y digo qué funciona.
2. **El éxito se mide con mi inglés, no con funciones.** Lo que no me hace practicar más o mejor, se quita.
3. **Primero practicar.** La app no reemplaza al tutor ni la conversación en vivo.

## Qué hace

- **Practicar:** la pregunta del día según el bloque del plan, grabar, escuchar y enviar.
- **Corrección:** resumen honesto, lo que hice bien, correcciones con explicación, cómo lo diría un nativo (con botón para escucharlo y repetir), frases útiles, pistas de pronunciación y un solo foco para mañana.
- **Historial:** todas mis prácticas, y mi primera grabación junto a la más reciente para escuchar el avance.
- **Progreso:** palabras por minuto, errores por minuto, vocabulario y minutos por semana, y mis errores más frecuentes.

## Cómo funciona

```
app/        Angular 22 (standalone, signals). Graba con MediaRecorder.
servidor/   Node 24 + Express, sin paso de compilación (Node ejecuta TypeScript).
            SQLite (node:sqlite) y los audios en servidor/datos/.
```

1. La app sube el audio a `POST /api/practicas` y el servidor responde de inmediato.
2. En segundo plano, el servidor manda el audio a un servicio de **voz a texto** (OpenAI o Groq: Claude no recibe audio).
3. Claude (`claude-opus-5-5`) analiza la transcripción y devuelve la corrección en un formato fijo (salida estructurada).
4. La app consulta la práctica cada 2 segundos hasta que está lista.

## Ponerla a andar

Requisitos: Node 24.

```bash
npm run instalar
```

**Sin llaves (modo demo):** la transcripción y la corrección son de ejemplo, para ver la app completa sin gastar.

```bash
npm run demo
```

Abre http://localhost:4320.

**Con llaves:** copia `servidor/.env.example` como `servidor/.env` y llena:

- `ANTHROPIC_API_KEY`: en https://platform.claude.com, sección API Keys.
- `STT_API_KEY`: de OpenAI o de Groq (el archivo de ejemplo trae las dos configuraciones).

```bash
npm run iniciar
```

Las llaves solo viven en `servidor/.env`, que no se sube al repositorio. Nunca las pegues en un chat.

**Para desarrollar** (recarga al guardar), en dos terminales:

```bash
npm run dev --prefix servidor
```

```bash
npm start --prefix app
```

La app queda en http://localhost:4200 y pasa `/api` al servidor.

## Limitaciones de esta versión

- **Solo en la computadora.** El navegador solo deja usar el micrófono en `localhost` o con HTTPS. Para usarla en el celular hay que publicarla (siguiente paso).
- **Pronunciación aproximada.** Claude ve texto, no oye tu acento: las pistas salen de las palabras que la transcripción entendió mal.
- **Una sola persona, sin inicio de sesión.** El servidor solo escucha en `127.0.0.1`.

## Verificar

```bash
npm run verificar
```

Revisa tipos del servidor, corre las pruebas de ambos lados y compila la app.
