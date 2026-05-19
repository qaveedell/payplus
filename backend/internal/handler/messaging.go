package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/qaveedel/payday/backend/internal/middleware"
	"github.com/qaveedel/payday/backend/internal/model"
	"github.com/qaveedel/payday/backend/internal/repository"
)

type MessagingHandler struct {
	convRepo *repository.ConversationRepo
	userRepo *repository.UserRepo
}

func NewMessagingHandler(convRepo *repository.ConversationRepo, userRepo *repository.UserRepo) *MessagingHandler {
	return &MessagingHandler{convRepo: convRepo, userRepo: userRepo}
}

// ListConversations returns all conversations for the current user.
func (h *MessagingHandler) ListConversations(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	convs, err := h.convRepo.ListForUser(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list conversations"})
		return
	}
	writeJSON(w, http.StatusOK, convs)
}

// GetMessages returns messages in a conversation.
func (h *MessagingHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	convID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	ok, _ := h.convRepo.IsMember(r.Context(), convID, userID)
	if !ok {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not a member of this conversation"})
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	msgs, err := h.convRepo.GetMessages(r.Context(), convID, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to get messages"})
		return
	}
	writeJSON(w, http.StatusOK, msgs)
}

// CreateDM creates or returns an existing DM with another user.
func (h *MessagingHandler) CreateDM(w http.ResponseWriter, r *http.Request) {
	var req model.CreateDMRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.RecipientID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "recipient_id is required"})
		return
	}

	userID := middleware.GetUserID(r.Context())

	if req.RecipientID == userID {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot create a DM with yourself"})
		return
	}

	// Check recipient exists
	if _, err := h.userRepo.GetByID(r.Context(), req.RecipientID); err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "recipient user not found"})
		return
	}

	// Find existing DM
	existing, err := h.convRepo.FindDM(r.Context(), userID, req.RecipientID)
	if err == nil && existing != nil {
		writeJSON(w, http.StatusOK, existing)
		return
	}

	// Create new DM
	conv, err := h.convRepo.CreateDM(r.Context(), userID, req.RecipientID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create DM"})
		return
	}
	writeJSON(w, http.StatusCreated, conv)
}

// CreateGroup creates a group conversation (admin only).
func (h *MessagingHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	var req model.CreateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "group name is required"})
		return
	}
	if len(req.MemberIDs) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "at least one member is required"})
		return
	}

	userID := middleware.GetUserID(r.Context())
	conv, err := h.convRepo.CreateGroup(r.Context(), userID, req.Name, req.MemberIDs)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create group"})
		return
	}
	writeJSON(w, http.StatusCreated, conv)
}

// UpdateGroup updates a group's name/members (admin only).
func (h *MessagingHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	convID := chi.URLParam(r, "id")

	var req model.UpdateGroupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	// Verify it's a group
	conv, err := h.convRepo.GetByID(r.Context(), convID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "conversation not found"})
		return
	}
	if conv.Type != "group" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "can only update group conversations"})
		return
	}

	if err := h.convRepo.UpdateGroup(r.Context(), convID, req.Name, req.MemberIDs); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update group"})
		return
	}

	updated, _ := h.convRepo.GetByID(r.Context(), convID)
	writeJSON(w, http.StatusOK, updated)
}

// SendMessage sends a message to a conversation.
func (h *MessagingHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	convID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	ok, _ := h.convRepo.IsMember(r.Context(), convID, userID)
	if !ok {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not a member of this conversation"})
		return
	}

	var req model.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Content == "" && req.FileURL == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "message content or file is required"})
		return
	}

	msg, err := h.convRepo.SendMessage(r.Context(), convID, userID, req.Content, req.FileURL, req.FileType)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to send message"})
		return
	}
	writeJSON(w, http.StatusCreated, msg)
}

// MarkRead marks a conversation as read for the current user.
func (h *MessagingHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	convID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	ok, _ := h.convRepo.IsMember(r.Context(), convID, userID)
	if !ok {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "not a member of this conversation"})
		return
	}

	if err := h.convRepo.MarkRead(r.Context(), convID, userID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to mark as read"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "marked as read"})
}

// UnreadTotal returns total unread message count across all conversations.
func (h *MessagingHandler) UnreadTotal(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	count, err := h.convRepo.TotalUnreadCount(r.Context(), userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to count unread"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]int{"count": count})
}

// ListUsers returns all users (for the DM picker).
func (h *MessagingHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list users"})
		return
	}
	writeJSON(w, http.StatusOK, users)
}
