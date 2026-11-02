FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY hub ./hub

ENV NODE_ENV=production
ENV PORT=8080
ENV HUB_STATE_FILE=/tmp/dsh-hub-state.json

EXPOSE 8080

CMD ["node", "hub/server.js"]
