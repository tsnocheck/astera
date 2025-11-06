FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/economy-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/economy-bot/package.json ./apps/economy-bot/

RUN yarn install

COPY . .

RUN yarn workspace economy-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/economy-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/economy-bot/package.json ./apps/economy-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/economy-bot/dist ./apps/economy-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "economy-bot", "start"]
