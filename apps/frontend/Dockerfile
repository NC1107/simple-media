FROM node:18-alpine AS base

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Development stage
FROM base AS dev
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production stage  
FROM base AS prod
RUN npm run build

FROM nginx:alpine AS production
COPY --from=prod /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]