# Yupixi API

Backend NestJS + GraphQL (Apollo, code-first) + Prisma + PostgreSQL pour le marketplace Yupixi.

## Démarrage local

```bash
cp .env.example .env
docker compose -f ../docker-compose.yml up -d postgres
pnpm install
pnpm prisma:migrate
pnpm start:dev
```

- API GraphQL : http://localhost:4000/graphql
- Health check REST : http://localhost:4000/health

## Scripts

- `pnpm start:dev` — serveur en watch mode
- `pnpm build` — build production
- `pnpm test` / `pnpm test:e2e` — tests unitaires / e2e
- `pnpm prisma:migrate` — applique les migrations en dev
- `pnpm prisma:deploy` — applique les migrations en production

## Structure

- `src/app.module.ts` — module racine (GraphQL, Prisma, Config)
- `src/prisma/` — client Prisma partagé (`PrismaService`)
- `src/health/` — health check REST + GraphQL
- `prisma/schema.prisma` — modèles de données (User, Category, Listing pour l'instant)

Chaque sprint (voir Issues GitHub) ajoute un module par domaine métier (auth, listings, search, messaging, admin, campaigns).
