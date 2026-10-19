# ---- Build stage: compile the Vite/React frontend ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_* build-time keys must be present here (see .env.example)
RUN npm run build

# ---- Runtime stage: lean production image ----
FROM node:20-alpine
WORKDIR /app

# Build tools for better-sqlite3 (prebuilds cover most platforms; fallback)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# App runtime files only — no src/, no dev tooling
COPY server.js ./
COPY lib ./lib
COPY routes ./routes
COPY base44 ./base44
COPY --from=build /app/dist ./dist

# SQLite database + uploads live here; mount a persistent volume
VOLUME /app/data

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
