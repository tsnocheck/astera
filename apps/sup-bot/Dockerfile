FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/sup-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/sup-bot/package.json ./apps/sup-bot/

RUN yarn install

COPY . .

RUN yarn workspace sup-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/sup-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/sup-bot/package.json ./apps/sup-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/sup-bot/dist ./apps/sup-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "sup-bot", "start"]
