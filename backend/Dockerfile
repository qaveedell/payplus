# Build stage
FROM golang:1.25-alpine AS builder

ENV GOPROXY=https://nexus.pastil.dev/repository/go-proxy/,direct

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server/

# Runtime stage
FROM alpine:3.20

WORKDIR /app

# CA certs are already in alpine base image at /etc/ssl/certs/
# No apk needed — alpine ships with ca-certificates-bundle

COPY --from=builder /server .
COPY --from=builder /app/migrations ./migrations

RUN mkdir -p /app/uploads

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["./server"]
