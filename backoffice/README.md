# Yupixi Backoffice

Application admin séparée (React + Vite + Tailwind CSS v4) pour piloter le marketplace Yupixi :
utilisateurs, annonces, catégories, signalements, statistiques, et campagnes (Boost / Black Friday).

## Démarrage local

```bash
pnpm install
pnpm dev
```

Consomme l'API GraphQL de `Yupixi/backend` (à brancher au fil des sprints — voir Issues #5 et #6).

## Structure

- `src/App.tsx` — layout + navigation des sections admin
- `src/pages/` — une page par section (actuellement des placeholders)
