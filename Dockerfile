FROM node:22-alpine

WORKDIR /app

RUN npm install --global pnpm@11.7.0 && npm cache clean --force

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY src ./src

ENV NODE_ENV=production
ENV DATA_FILE=/app/data/state.json

RUN mkdir -p /app/data && chown -R node:node /app
VOLUME ["/app/data"]

USER node
CMD ["node", "src/index.js"]
