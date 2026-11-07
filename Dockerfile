FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY connect-host.sh ./
COPY hub ./hub

RUN mkdir -p /data \
  && chmod +x /app/connect-host.sh \
  && chown -R node:node /app /data

ENV NODE_ENV=production
ENV PORT=8080
ENV HUB_STATE_FILE=/data/dsh-hub-state.json

VOLUME ["/data"]
EXPOSE 8080

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "hub/server.js"]
