FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/reports-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/reports-bot/package.json ./apps/reports-bot/

RUN yarn install

COPY . .

RUN yarn workspace reports-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/reports-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/reports-bot/package.json ./apps/reports-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/reports-bot/dist ./apps/reports-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "reports-bot", "start"]
