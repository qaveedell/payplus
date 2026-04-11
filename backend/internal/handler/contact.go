package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/qaveedel/payday/backend/internal/middleware"
	"github.com/qaveedel/payday/backend/internal/model"
	"github.com/qaveedel/payday/backend/internal/repository"
)

type ContactHandler struct {
	contactRepo *repository.ContactRepo
}

func NewContactHandler(contactRepo *repository.ContactRepo) *ContactHandler {
	return &ContactHandler{contactRepo: contactRepo}
}

func (h *ContactHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreateContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}

	userID := middleware.GetUserID(r.Context())
	contact, err := h.contactRepo.Create(r.Context(), &req, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create contact"})
		return
	}

	writeJSON(w, http.StatusCreated, contact)
}

func (h *ContactHandler) List(w http.ResponseWriter, r *http.Request) {
	contacts, err := h.contactRepo.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list contacts"})
		return
	}

	writeJSON(w, http.StatusOK, contacts)
}

func (h *ContactHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	contact, err := h.contactRepo.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "contact not found"})
		return
	}
	writeJSON(w, http.StatusOK, contact)
}

func (h *ContactHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.CreateContactRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := h.contactRepo.Update(r.Context(), id, &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update contact"})
		return
	}

	contact, _ := h.contactRepo.GetByID(r.Context(), id)
	writeJSON(w, http.StatusOK, contact)
}

func (h *ContactHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := h.contactRepo.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete contact"})
		return
	}

	writeJSON(w, http.StatusNoContent, nil)
}
