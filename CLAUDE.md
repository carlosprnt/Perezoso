# CLAUDE.md

Guía operativa para Claude Code en este repo.

## Deploy a producción (Vercel)

La **Production Branch** del proyecto Vercel es `main`. Cada push a `main` dispara automáticamente un deployment de producción — no hace falta promover nada manualmente.

### ⚡ Default: siempre mergear a `main`

**Preferencia explícita del usuario (2026-04-09):** por defecto, todo cambio hecho en una feature branch se mergea a `main` y se pushea a producción inmediatamente. NO esperes a que el usuario confirme el preview — salvo que el usuario diga lo contrario para una tarea concreta, el flujo completo es:

1. Commit en la feature branch `claude/fix-*` asignada
2. `npm run build` local para verificar que no rompe el build de producción
3. `git checkout main && git merge <feature-branch> --no-ff`
4. `git push origin main` — esto dispara el deploy de producción en Vercel
5. Opcionalmente pushear también la feature branch para mantener su preview

Esto aplica aunque el cambio sea grande. Si tienes dudas razonables sobre si algo debería esperar (p. ej. un refactor que toca muchas rutas), pregúntale al usuario antes; si no, mergea directamente.

### Workflow técnico

1. Desarrollar en la rama asignada (ej. `claude/fix-*`)
2. Commit + push a esa rama → Vercel crea un **Preview** de esa rama
3. Merge de la rama a `main` (resolver conflictos si los hay) + verificar `npm run build` localmente
4. Push de `main` a origin → Vercel crea un **Production Deployment** automáticamente

### Cosas a tener en cuenta

- Si hay que rollback, revertir el commit en `main` y push — Vercel re-desplegará a producción el estado revertido
- Los previews de las feature branches siguen creándose si se pushea la rama además del merge

### Historial: por qué NO se usa Vercel CLI con token

Se intentó antes, pero Vercel tiene **secret scanning automático**: cuando detecta un token con prefijo `vcp_` en un lugar público/monitorizado (commits, comentarios de PR, chats sincronizados a GitHub), lo **revoca en segundos**. Las sesiones de Claude Code en web pueden sincronizar contenido a GitHub, así que los tokens pegados en el chat se invalidan antes de poder usarlos. Por eso la Production Branch = `main` con auto-deploy es la vía correcta.

### Notas adicionales

- El **GitHub Default Branch** también debería ser `main` (Repo Settings → Branches). Hasta hace poco era `claude/perezoso-mvp-build-5PDHS`.
- Redeploy sobre un deployment antiguo en Vercel hereda su target (Preview/Production) — para disparar producción hay que hacer un push nuevo a main, no un Redeploy.
