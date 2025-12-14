FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/verif-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/verif-bot/package.json ./apps/verif-bot/

RUN yarn install

COPY . .

RUN yarn workspace verif-bot build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/verif-bot
COPY libs/shared/package.json ./libs/shared/
COPY apps/verif-bot/package.json ./apps/verif-bot/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/verif-bot/dist ./apps/verif-bot/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "verif-bot", "start"]
