FROM --platform=linux/amd64 node:22-bookworm-slim

USER root
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY README.md ./

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/mnt/disks/userdata

EXPOSE 3000
CMD ["node", "src/server.js"]
