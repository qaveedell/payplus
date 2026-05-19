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

type PaymentHandler struct {
	paymentRepo *repository.PaymentRepo
	noteRepo    *repository.NoteRepo
	contactRepo *repository.ContactRepo
}

func NewPaymentHandler(paymentRepo *repository.PaymentRepo, noteRepo *repository.NoteRepo, contactRepo *repository.ContactRepo) *PaymentHandler {
	return &PaymentHandler{paymentRepo: paymentRepo, noteRepo: noteRepo, contactRepo: contactRepo}
}

func (h *PaymentHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Name == "" || req.IBANType == "" || req.IBANValue == "" || req.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name, iban_type, iban_value, and amount are required"})
		return
	}
	if req.BankName == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "bank_name is required"})
		return
	}
	// Receipt and tracking code are required for "received" payments (proving you paid),
	// but NOT for "request" payments (asking someone to pay you — no receipt yet)
	if req.Type == "received" {
		if req.ReferenceNumber == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "reference_number (tracking code) is required for received payments"})
			return
		}
		if req.ReceiptURL == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "receipt_url is required — upload a receipt before creating a received payment"})
			return
		}
	}
	if req.Type == "" {
		req.Type = "request"
	}

	userID := middleware.GetUserID(r.Context())
	payment, err := h.paymentRepo.Create(r.Context(), &req, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create payment: " + err.Error()})
		return
	}

	// Auto-save to contacts if not already from a contact and not already existing
	if req.ContactID == nil && req.IBANType != "contact" {
		existing, _ := h.contactRepo.FindByNameAndIBAN(r.Context(), req.Name, req.IBANType, req.IBANValue, userID)
		if existing == nil {
			contactReq := &model.CreateContactRequest{
				Name:       req.Name,
				NationalID: req.NationalID,
				Phone:      req.Phone,
			}
			switch req.IBANType {
			case "sheba":
				contactReq.Sheba = &req.IBANValue
			case "card":
				contactReq.CardNumber = &req.IBANValue
			case "account":
				contactReq.AccountNumber = &req.IBANValue
			}
			h.contactRepo.Create(r.Context(), contactReq, userID) // best-effort, ignore errors
		}
	}

	writeJSON(w, http.StatusCreated, payment)
}

func (h *PaymentHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))

	filter := model.PaymentFilter{
		Type:     q.Get("type"),
		Status:   q.Get("status"),
		Name:     q.Get("name"),
		Search:   q.Get("search"),
		SortBy:   q.Get("sort_by"),
		DateFrom: q.Get("date_from"),
		DateTo:   q.Get("date_to"),
		Page:     page,
		PageSize: pageSize,
	}

	result, err := h.paymentRepo.List(r.Context(), filter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list payments"})
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *PaymentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	payment, err := h.paymentRepo.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "payment not found"})
		return
	}

	// Load sub-payments
	subs, err := h.paymentRepo.GetSubPayments(r.Context(), id)
	if err == nil {
		payment.SubPayments = subs
	}

	// Load notes
	notes, err := h.noteRepo.ListByPayment(r.Context(), id)
	if err == nil {
		payment.Notes = notes
	}

	writeJSON(w, http.StatusOK, payment)
}

func (h *PaymentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.paymentRepo.Delete(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to delete payment"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "payment deleted"})
}

func (h *PaymentHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := h.paymentRepo.Update(r.Context(), id, &req); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update payment"})
		return
	}

	payment, _ := h.paymentRepo.GetByID(r.Context(), id)
	writeJSON(w, http.StatusOK, payment)
}

func (h *PaymentHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req model.StatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	// Only payer or admin can mark as paid
	if req.Status == "paid" {
		role := middleware.GetRole(r.Context())
		if role != "payer" && role != "admin" {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "only payer or admin can mark as paid"})
			return
		}
		// Receipt is REQUIRED to mark as paid
		if req.ReceiptURL == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "receipt is required to mark payment as paid"})
			return
		}
	}

	if err := h.paymentRepo.UpdateStatus(r.Context(), id, req.Status, req.ReceiptURL); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to update status"})
		return
	}

	payment, _ := h.paymentRepo.GetByID(r.Context(), id)
	writeJSON(w, http.StatusOK, payment)
}

func (h *PaymentHandler) Confirm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	role := middleware.GetRole(r.Context())
	if role != "payer" && role != "admin" {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "only payer or admin can confirm payments"})
		return
	}

	if err := h.paymentRepo.Confirm(r.Context(), id); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to confirm payment"})
		return
	}

	payment, _ := h.paymentRepo.GetByID(r.Context(), id)
	writeJSON(w, http.StatusOK, payment)
}

func (h *PaymentHandler) CreateSplit(w http.ResponseWriter, r *http.Request) {
	parentID := chi.URLParam(r, "id")

	var req model.CreatePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	req.ParentID = &parentID

	// Inherit type from parent
	parent, err := h.paymentRepo.GetByID(r.Context(), parentID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "parent payment not found"})
		return
	}
	req.Type = parent.Type

	userID := middleware.GetUserID(r.Context())
	payment, err := h.paymentRepo.Create(r.Context(), &req, userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to create sub-payment"})
		return
	}

	writeJSON(w, http.StatusCreated, payment)
}

func (h *PaymentHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	paymentID := chi.URLParam(r, "id")

	var req model.CreateNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Content == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "content is required"})
		return
	}

	userID := middleware.GetUserID(r.Context())
	note, err := h.noteRepo.Create(r.Context(), paymentID, userID, req.Content)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to add note"})
		return
	}

	writeJSON(w, http.StatusCreated, note)
}

func (h *PaymentHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
	paymentID := chi.URLParam(r, "id")

	notes, err := h.noteRepo.ListByPayment(r.Context(), paymentID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to list notes"})
		return
	}

	writeJSON(w, http.StatusOK, notes)
}
