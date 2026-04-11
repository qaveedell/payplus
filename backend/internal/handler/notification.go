package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/qaveedel/payday/backend/internal/middleware"
	"github.com/qaveedel/payday/backend/internal/model"
	"github.com/qaveedel/payday/backend/internal/repository"
)

type NotificationHandler struct {
	repo *repository.NotificationRepo
}

func NewNotificationHandler(repo *repository.NotificationRepo) *NotificationHandler {
	return &NotificationHandler{repo: repo}
}

// List returns all notifications for the current user.
func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	notifications, err := h.repo.ListForUser(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list notifications"})
		return
	}
	writeJSON(w, http.StatusOK, notifications)
}

// UnreadCount returns the count of unread notifications for the current user.
func (h *NotificationHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	count, err := h.repo.UnreadCount(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to get unread count"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"count": count})
}

// MarkRead marks a notification as read.
func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	if err := h.repo.MarkRead(r.Context(), id, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to mark as read"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "marked as read"})
}

// MarkAllRead marks all notifications as read for the current user.
func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if err := h.repo.MarkAllRead(r.Context(), userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to mark all as read"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "all marked as read"})
}

// AdminCreate creates a notification for one or all users (admin only).
func (h *NotificationHandler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var req model.CreateNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Title == "" || req.Message == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "title and message are required"})
		return
	}

	createdBy := middleware.GetUserID(r.Context())

	// Determine target user IDs
	targetIDs := req.UserIDs
	if len(targetIDs) == 0 {
		// Broadcast to all users
		ids, err := h.repo.GetAllUserIDs(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to get users"})
			return
		}
		targetIDs = ids
	}

	created := 0
	for _, uid := range targetIDs {
		if _, err := h.repo.Create(r.Context(), uid, createdBy, req.Title, req.Message); err == nil {
			created++
		}
	}

	writeJSON(w, http.StatusCreated, map[string]int{"created": created})
}
