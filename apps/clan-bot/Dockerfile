FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/clan-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/clan-bot/package.json ./apps/clan-bot/

RUN yarn install

COPY . .

RUN yarn workspace clan-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/clan-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/clan-bot/package.json ./apps/clan-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/clan-bot/dist ./apps/clan-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "clan-bot", "start"]
