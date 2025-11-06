FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/moderation-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/moderation-bot/package.json ./apps/moderation-bot/

RUN yarn install

COPY . .

RUN yarn workspace moderation-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/moderation-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/moderation-bot/package.json ./apps/moderation-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/moderation-bot/dist ./apps/moderation-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "moderation-bot", "start"]
