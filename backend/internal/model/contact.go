package model

import "time"

type Contact struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Sheba         *string   `json:"sheba"`
	CardNumber    *string   `json:"card_number"`
	AccountNumber *string   `json:"account_number"`
	NationalID    *string   `json:"national_id"`
	Phone         *string   `json:"phone"`
	CreatedBy     string    `json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateContactRequest struct {
	Name          string  `json:"name"`
	Sheba         *string `json:"sheba"`
	CardNumber    *string `json:"card_number"`
	AccountNumber *string `json:"account_number"`
	NationalID    *string `json:"national_id"`
	Phone         *string `json:"phone"`
}
