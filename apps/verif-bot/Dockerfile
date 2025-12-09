FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/rooms-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/rooms-bot/package.json ./apps/rooms-bot/

RUN yarn install

COPY . .

RUN yarn workspace rooms-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/rooms-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/rooms-bot/package.json ./apps/rooms-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/rooms-bot/dist ./apps/rooms-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "rooms-bot", "start"]
