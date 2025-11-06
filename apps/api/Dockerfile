FROM node:23-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/api
COPY libs/shared/package.json ./libs/shared/
COPY apps/api/package.json ./apps/api/

RUN yarn install

COPY . .

RUN yarn workspace api build

FROM node:23-slim AS runner

WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./

RUN mkdir -p libs/shared && mkdir -p apps/api
COPY libs/shared/package.json ./libs/shared/
COPY apps/api/package.json ./apps/api/

RUN yarn workspaces focus --all --production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/libs/shared/dist ./libs/shared/dist

CMD ["yarn", "workspace", "api", "start"]
