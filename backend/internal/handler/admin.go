package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/qaveedel/payday/backend/internal/repository"
)

type AdminHandler struct {
	userRepo *repository.UserRepo
}

func NewAdminHandler(userRepo *repository.UserRepo) *AdminHandler {
	return &AdminHandler{userRepo: userRepo}
}

type CreateUserRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
}

func (h *AdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list users"})
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (h *AdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Username == "" || req.Password == "" || req.DisplayName == "" || req.Role == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "all fields are required: username, password, display_name, role"})
		return
	}

	validRoles := map[string]bool{"requester": true, "payer": true, "admin": true}
	if !validRoles[req.Role] {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "role must be one of: requester, payer, admin"})
		return
	}

	if len(req.Password) < 4 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password must be at least 4 characters"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}

	user, err := h.userRepo.Create(r.Context(), req.Username, string(hash), req.DisplayName, req.Role)
	if err != nil {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "username already exists or invalid data"})
		return
	}

	writeJSON(w, http.StatusCreated, user)
}

type ResetPasswordRequest struct {
	Password string `json:"password"`
}

func (h *AdminHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if len(req.Password) < 4 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "password must be at least 4 characters"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
		return
	}

	if err := h.userRepo.UpdatePassword(r.Context(), id, string(hash)); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to reset password"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "password reset successfully"})
}

func (h *AdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Prevent deleting the last admin
	user, err := h.userRepo.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "user not found"})
		return
	}

	if user.Role == "admin" {
		count, err := h.userRepo.CountByRole(r.Context(), "admin")
		if err != nil || count <= 1 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "cannot delete the last admin user"})
			return
		}
	}

	if err := h.userRepo.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete user"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
}
