# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org/
COPY package.json package-lock.json ./
RUN npm ci --registry=${NPM_REGISTRY}

COPY . .

RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine

# nginx:1.27-alpine already has everything needed — no apk required
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
