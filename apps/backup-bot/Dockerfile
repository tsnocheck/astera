FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/backup-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/backup-bot/package.json ./apps/backup-bot/

RUN yarn install

COPY . .

RUN yarn workspace backup-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/backup-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/backup-bot/package.json ./apps/backup-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/backup-bot/dist ./apps/backup-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "backup-bot", "start"]
