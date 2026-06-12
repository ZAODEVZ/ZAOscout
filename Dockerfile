# ZAOscout API - node + the bash/python the keyless fetchers need. Runs anywhere
# that takes a container: Railway, Render, Fly.io, Google Cloud Run, your own VPS.
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN chmod +x bin/* scout/*.js api/*.js mcp/*.js 2>/dev/null || true
ENV PORT=8799 SCOUT_STATE_DIR=/data
VOLUME ["/data"]
EXPOSE 8799
CMD ["node", "api/server.js"]
