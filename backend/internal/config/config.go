package config

import (
	"os"
	"strconv"
)

type Config struct {
	DatabaseURL   string
	JWTSecret     string
	Port          string
	UploadDir     string
	MaxUploadSize int64
	CORSOrigins   string
}

func Load() *Config {
	maxSize, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "5242880"), 10, 64)
	return &Config{
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://payday:payday_secret@localhost:5432/payday?sslmode=disable"),
		JWTSecret:     getEnv("JWT_SECRET", "payday-dev-secret-key-change-in-prod"),
		Port:          getEnv("PORT", "8080"),
		UploadDir:     getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize: maxSize,
		CORSOrigins:   getEnv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
