FROM node:18-alpine as base

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Development stage
FROM base as dev
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Production stage
FROM base as prod
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]