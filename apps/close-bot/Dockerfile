FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/close-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/close-bot/package.json ./apps/close-bot/

RUN yarn install

COPY . .

RUN yarn workspace close-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/close-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/close-bot/package.json ./apps/close-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/close-bot/dist ./apps/close-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "close-bot", "start"]
