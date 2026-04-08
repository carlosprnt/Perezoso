# CLAUDE.md

Guía operativa para Claude Code en este repo.

## Deploy a producción (Vercel)

La **Production Branch** del proyecto Vercel es `main`. Cada push a `main` dispara automáticamente un deployment de producción — no hace falta promover nada manualmente.

### Workflow estándar

1. Desarrollar en la rama asignada (ej. `claude/fix-*`)
2. Commit + push a esa rama → Vercel crea un **Preview** de esa rama
3. Merge de la rama a `main` (resolver conflictos si los hay) + verificar `npm run build` localmente
4. Push de `main` a origin → Vercel crea un **Production Deployment** automáticamente

### Cosas a tener en cuenta

- No pushear a `main` hasta que los cambios estén listos para producción
- Si hay que rollback, revertir el commit en `main` y push — Vercel re-desplegará a producción el estado revertido
- Los previews de las feature branches siguen creándose y son la vía para QA antes del merge

### Historial: por qué NO se usa Vercel CLI con token

Se intentó antes, pero Vercel tiene **secret scanning automático**: cuando detecta un token con prefijo `vcp_` en un lugar público/monitorizado (commits, comentarios de PR, chats sincronizados a GitHub), lo **revoca en segundos**. Las sesiones de Claude Code en web pueden sincronizar contenido a GitHub, así que los tokens pegados en el chat se invalidan antes de poder usarlos. Por eso la Production Branch = `main` con auto-deploy es la vía correcta.

### Notas adicionales

- El **GitHub Default Branch** también debería ser `main` (Repo Settings → Branches). Hasta hace poco era `claude/perezoso-mvp-build-5PDHS`.
- Redeploy sobre un deployment antiguo en Vercel hereda su target (Preview/Production) — para disparar producción hay que hacer un push nuevo a main, no un Redeploy.
