# syntax=docker/dockerfile:1
FROM node:25-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY patches/ patches/
COPY packages/core/package.json packages/core/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY packages/web/package.json packages/web/package.json
RUN npm ci

COPY . .
RUN npm run build

FROM node:25-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app ./
RUN npm prune --omit=dev

RUN mkdir -p /home/node/.config/remarkable-maze-generator \
	&& chown -R node:node /home/node/.config /app

USER node
EXPOSE 4367
CMD ["node", "packages/web/dist/server.js"]
