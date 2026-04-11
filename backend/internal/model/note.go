package model

import "time"

type Note struct {
	ID         string    `json:"id"`
	PaymentID  string    `json:"payment_id"`
	AuthorID   string    `json:"author_id"`
	AuthorName string    `json:"author_name,omitempty"`
	Content    string    `json:"content"`
	CreatedAt  time.Time `json:"created_at"`
}

type CreateNoteRequest struct {
	Content string `json:"content"`
}
