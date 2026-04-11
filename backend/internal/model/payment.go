package model

import "time"

type Payment struct {
	ID              string     `json:"id"`
	ParentID        *string    `json:"parent_id"`
	Type            string     `json:"type"` // "received" or "request"
	Name            string     `json:"name"`
	IBANType        string     `json:"iban_type"` // "sheba", "card", "account", "contact"
	IBANValue       string     `json:"iban_value"`
	Amount          int64      `json:"amount"`
	ReferenceNumber *string    `json:"reference_number"`
	BankName        *string    `json:"bank_name"`
	NationalID      *string    `json:"national_id"`
	Phone           *string    `json:"phone"`
	Status          string     `json:"status"` // "unpaid", "paid", "unknown", "problematic"
	IsConfirmed     bool       `json:"is_confirmed"`
	ConfirmedAt     *time.Time `json:"confirmed_at"`
	ReceiptURL      *string    `json:"receipt_url"`
	ContactID       *string    `json:"contact_id"`
	CreatedBy       string     `json:"created_by"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Joined fields
	CreatorName string `json:"creator_name,omitempty"`
	Notes       []Note `json:"notes,omitempty"`
	SubPayments []Payment `json:"sub_payments,omitempty"`
}

type PaymentFilter struct {
	Type     string `json:"type"`
	Status   string `json:"status"`
	Name     string `json:"name"`
	Search   string `json:"search"`
	SortBy   string `json:"sort_by"`
	DateFrom string `json:"date_from"`
	DateTo   string `json:"date_to"`
	Page     int    `json:"page"`
	PageSize int    `json:"page_size"`
}

type PaymentListResponse struct {
	Payments []Payment `json:"payments"`
	Total    int       `json:"total"`
	Page     int       `json:"page"`
	PageSize int       `json:"page_size"`
}

type StatusUpdateRequest struct {
	Status     string `json:"status"`
	ReceiptURL string `json:"receipt_url,omitempty"`
}

type CreatePaymentRequest struct {
	ParentID        *string `json:"parent_id"`
	Type            string  `json:"type"`
	Name            string  `json:"name"`
	IBANType        string  `json:"iban_type"`
	IBANValue       string  `json:"iban_value"`
	Amount          int64   `json:"amount"`
	ReferenceNumber string  `json:"reference_number"`
	BankName        string  `json:"bank_name"`
	ReceiptURL      string  `json:"receipt_url"`
	NationalID      *string `json:"national_id"`
	Phone           *string `json:"phone"`
	ContactID       *string `json:"contact_id"`
}
