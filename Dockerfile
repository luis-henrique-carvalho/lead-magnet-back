# syntax=docker/dockerfile:1.7

# Dockerfile - Backend NestJS + Playwright

ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.53.0-noble

FROM ${PLAYWRIGHT_IMAGE} AS base

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN npm install -g pnpm@10.18.3 --quiet

FROM base AS deps

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM base AS dev

ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN addgroup --system app && adduser --system --ingroup app app \
  && chown -R app:app /app

USER app

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]
