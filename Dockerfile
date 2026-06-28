FROM node:22-bookworm-slim

WORKDIR /app

RUN sed -i 's/Components: main/Components: main contrib/g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    python3 \
    open-jtalk \
    open-jtalk-mecab-naist-jdic \
    hts-voice-nitech-jp-atr503-m001 \
  && rm -rf /var/lib/apt/lists/*
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp
RUN npm install --global pnpm@11.7.0 && npm cache clean --force

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY src ./src

ENV NODE_ENV=production
ENV DATA_FILE=/app/data/state.json

RUN mkdir -p /app/data && chown -R node:node /app

USER node
CMD ["node", "src/index.js"]
