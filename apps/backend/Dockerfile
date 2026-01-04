FROM node:18-alpine as base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Development stage
FROM base as dev
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base as build
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine as prod
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data
EXPOSE 3001
CMD ["node", "dist/index.js"]