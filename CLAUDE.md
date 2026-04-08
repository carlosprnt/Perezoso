# CLAUDE.md

Guía operativa para Claude Code en este repo.

## Deploy a producción (Vercel)

**Importante:** en este proyecto de Vercel, `main` **no** es la Production Branch — pushear a main solo crea un Preview. Para llevar cambios a producción hay que promover manualmente el preview de main.

### Workflow estándar

1. Desarrollar en la rama asignada (ej. `claude/fix-*`)
2. Commit + push a esa rama (crea un preview)
3. Merge de la rama a `main` (resolver conflictos si los hay)
4. Push de `main` a origin → crea un nuevo preview de `main`
5. **Pedir al usuario que promueva el preview a producción**: abrir el deployment en la UI de Vercel → `···` → "Promote to Production"

### Por qué no se automatiza vía Vercel CLI

Se intentó usar `vercel --prod` con un Personal Access Token, pero Vercel tiene **secret scanning automático**: cuando detecta un token con prefijo `vcp_` en un lugar público/monitorizado (commits, comentarios de PR, chats sincronizados a GitHub), lo **revoca en segundos**. Como las sesiones de Claude Code en web pueden sincronizar contenido a GitHub, los tokens pegados en el chat se invalidan antes de poder usarlos.

**Alternativas si se quiere automatizar en el futuro:**
- Cambiar la Production Branch de Vercel a `main` en Settings → Git (auto-deploy)
- Usar un Deploy Hook (URL, no token) guardado en `.env.local` (no en git)
- Vercel CLI con token leído desde un fichero local que nunca se printea en output ni se commitea
