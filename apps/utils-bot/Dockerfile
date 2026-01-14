FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/utils-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/utils-bot/package.json ./apps/utils-bot/

RUN yarn install

COPY . .

RUN yarn workspace utils-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/utils-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/utils-bot/package.json ./apps/utils-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/utils-bot/dist ./apps/utils-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "utils-bot", "start"]
