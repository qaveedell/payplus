package handler

import (
	"encoding/json"
	"net/http"
)

type IBANHandler struct{}

func NewIBANHandler() *IBANHandler {
	return &IBANHandler{}
}

type IBANCheckRequest struct {
	Sheba string `json:"sheba"`
}

type IBANCheckResponse struct {
	Valid      bool   `json:"valid"`
	Name       string `json:"name"`
	CardNumber string `json:"card_number,omitempty"`
	BankName   string `json:"bank_name,omitempty"`
}

func (h *IBANHandler) Check(w http.ResponseWriter, r *http.Request) {
	var req IBANCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if req.Sheba == "" || len(req.Sheba) < 24 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "valid sheba number is required (24+ characters)"})
		return
	}

	// Stub: In production, this would call a real bank API
	// For now, return a mock response based on the sheba prefix
	bankName := "Unknown Bank"
	if len(req.Sheba) >= 6 {
		switch req.Sheba[2:6] {
		case "0170":
			bankName = "Melli Iran"
		case "0120":
			bankName = "Mellat"
		case "0140":
			bankName = "Saderat"
		case "0190":
			bankName = "Sepah"
		case "0180":
			bankName = "Tejarat"
		case "0570":
			bankName = "Pasargad"
		case "0560":
			bankName = "Saman"
		case "0540":
			bankName = "Parsian"
		}
	}

	writeJSON(w, http.StatusOK, IBANCheckResponse{
		Valid:    true,
		Name:     "Account Holder", // Stub
		BankName: bankName,
	})
}
