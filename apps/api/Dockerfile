FROM oven/bun:1-alpine

WORKDIR /app

# Minimal workspace package.json to isolate API build from mobile/Expo deps
RUN echo '{"private":true,"workspaces":["packages/shared","apps/api"]}' > package.json

COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json

RUN bun install --production

COPY tsconfig.base.json tsconfig.base.json
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/src apps/api/src

RUN mkdir -p /data && chown -R bun:bun /app /data

USER bun

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/neoschola.sqlite

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "apps/api/src/index.ts"]
