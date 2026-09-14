FROM node:22-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@10 --activate && pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm prisma:generate && pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main"]
