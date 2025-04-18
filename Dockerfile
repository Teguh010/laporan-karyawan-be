# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client
RUN apk add --no-cache postgresql-client

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
COPY .env.production ./.env

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
