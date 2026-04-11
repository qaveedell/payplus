package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"strings"

	"github.com/go-chi/cors"
	"github.com/go-chi/jwtauth/v5"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/qaveedel/payday/backend/internal/config"
	"github.com/qaveedel/payday/backend/internal/handler"
	"github.com/qaveedel/payday/backend/internal/middleware"
	"github.com/qaveedel/payday/backend/internal/repository"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := config.Load()

	// Connect to database
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(context.Background()); err != nil {
		slog.Error("failed to ping database", "error", err)
		os.Exit(1)
	}
	slog.Info("connected to database")

	// Run migrations
	runMigrations(cfg.DatabaseURL)

	// JWT auth
	tokenAuth := jwtauth.New("HS256", []byte(cfg.JWTSecret), nil)

	// Repositories
	userRepo := repository.NewUserRepo(pool)
	paymentRepo := repository.NewPaymentRepo(pool)
	contactRepo := repository.NewContactRepo(pool)
	noteRepo := repository.NewNoteRepo(pool)
	reportRepo := repository.NewReportRepo(pool)
	notificationRepo := repository.NewNotificationRepo(pool)
	conversationRepo := repository.NewConversationRepo(pool)

	// Handlers
	authHandler := handler.NewAuthHandler(userRepo, tokenAuth)
	paymentHandler := handler.NewPaymentHandler(paymentRepo, noteRepo, contactRepo)
	contactHandler := handler.NewContactHandler(contactRepo)
	uploadHandler := handler.NewUploadHandler(cfg)
	reportHandler := handler.NewReportHandler(reportRepo)
	ibanHandler := handler.NewIBANHandler()
	adminHandler := handler.NewAdminHandler(userRepo)
	notificationHandler := handler.NewNotificationHandler(notificationRepo)
	messagingHandler := handler.NewMessagingHandler(conversationRepo, userRepo)

	// Router
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(chimw.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   strings.Split(cfg.CORSOrigins, ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"unhealthy","db":"disconnected"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy","db":"connected"}`))
	})

	// Public routes
	r.Post("/api/auth/login", authHandler.Login)
	r.Get("/api/uploads/{filename}", uploadHandler.ServeFile) // Public — browser img tags can't send JWT

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(jwtauth.Verifier(tokenAuth))
		r.Use(middleware.Authenticator(tokenAuth))

		// Auth
		r.Get("/api/auth/me", authHandler.Me)
		r.Patch("/api/auth/password", authHandler.ChangePassword)

		// Payments
		r.Get("/api/payments", paymentHandler.List)
		r.Post("/api/payments", paymentHandler.Create)
		r.Get("/api/payments/{id}", paymentHandler.GetByID)
		r.Put("/api/payments/{id}", paymentHandler.Update)
		r.Patch("/api/payments/{id}/status", paymentHandler.UpdateStatus)
		r.Patch("/api/payments/{id}/confirm", paymentHandler.Confirm)
		r.Post("/api/payments/{id}/split", paymentHandler.CreateSplit)
		r.Post("/api/payments/{id}/notes", paymentHandler.AddNote)
		r.Get("/api/payments/{id}/notes", paymentHandler.ListNotes)

		// Contacts
		r.Get("/api/contacts", contactHandler.List)
		r.Post("/api/contacts", contactHandler.Create)
		r.Get("/api/contacts/{id}", contactHandler.GetByID)
		r.Put("/api/contacts/{id}", contactHandler.Update)
		r.Delete("/api/contacts/{id}", contactHandler.Delete)

		// Uploads
		r.Post("/api/upload/receipt", uploadHandler.UploadReceipt)

		// Reports
		r.Get("/api/reports/summary", reportHandler.Summary)
		r.Get("/api/reports/by-contact", reportHandler.ByContact)
		r.Get("/api/reports/timeline", reportHandler.Timeline)

		// IBAN
		r.Post("/api/iban/check", ibanHandler.Check)

		// Notifications (current user)
		r.Get("/api/notifications", notificationHandler.List)
		r.Get("/api/notifications/unread-count", notificationHandler.UnreadCount)
		r.Patch("/api/notifications/{id}/read", notificationHandler.MarkRead)
		r.Patch("/api/notifications/read-all", notificationHandler.MarkAllRead)

		// Messaging
		r.Route("/api/messages", func(r chi.Router) {
			r.Get("/conversations", messagingHandler.ListConversations)
			r.Get("/conversations/{id}/messages", messagingHandler.GetMessages)
			r.Post("/conversations/{id}/messages", messagingHandler.SendMessage)
			r.Post("/conversations/{id}/read", messagingHandler.MarkRead)
			r.Post("/dm", messagingHandler.CreateDM)
			r.Get("/unread-count", messagingHandler.UnreadTotal)
			r.Get("/users", messagingHandler.ListUsers)

			// Admin-only group management
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequireAdmin())
				r.Post("/groups", messagingHandler.CreateGroup)
				r.Put("/groups/{id}", messagingHandler.UpdateGroup)
			})
		})

		// Admin (requires admin role)
		r.Route("/api/admin", func(r chi.Router) {
			r.Use(middleware.RequireAdmin())
			r.Get("/users", adminHandler.ListUsers)
			r.Post("/users", adminHandler.CreateUser)
			r.Patch("/users/{id}/password", adminHandler.ResetPassword)
			r.Delete("/users/{id}", adminHandler.DeleteUser)
			r.Post("/notifications", notificationHandler.AdminCreate)
		})
	})

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		slog.Info("server starting", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.Info("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
	slog.Info("server stopped")
}

func runMigrations(dbURL string) {
	// Find migrations directory
	migDir := "./migrations"
	if _, err := os.Stat(migDir); os.IsNotExist(err) {
		migDir = filepath.Join("..", "..", "migrations")
	}

	absPath, err := filepath.Abs(migDir)
	if err != nil {
		slog.Warn("could not resolve migrations path", "error", err)
		return
	}

	m, err := migrate.New(fmt.Sprintf("file://%s", absPath), dbURL)
	if err != nil {
		slog.Warn("failed to create migrator", "error", err)
		return
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}
	slog.Info("migrations applied successfully")
}
