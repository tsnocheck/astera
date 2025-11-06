FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/ticket-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/ticket-bot/package.json ./apps/ticket-bot/

RUN yarn install

COPY . .

RUN yarn workspace ticket-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/ticket-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/ticket-bot/package.json ./apps/ticket-bot/

RUN yarn workspaces focus --all --production

COPY --from=builder /app/apps/ticket-bot/dist ./apps/ticket-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "ticket-bot", "start"]
