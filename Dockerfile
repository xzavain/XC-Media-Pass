FROM node:20-alpine

WORKDIR /app

# Build tools for better-sqlite3 (prebuilds cover most platforms; this is a fallback)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "server.js"]
