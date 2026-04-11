package model

import "time"

type Notification struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Title         string    `json:"title"`
	Message       string    `json:"message"`
	IsRead        bool      `json:"is_read"`
	CreatedBy     string    `json:"created_by"`
	CreatedByName string    `json:"created_by_name,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type CreateNotificationRequest struct {
	// UserIDs: list of user UUIDs to notify; empty means notify ALL users
	UserIDs []string `json:"user_ids"`
	Title   string   `json:"title"`
	Message string   `json:"message"`
}
