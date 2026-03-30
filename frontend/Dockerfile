# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Nginx serves static files
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx config is provided via docker-compose volume mount (nginx.poc.conf)
EXPOSE 80
