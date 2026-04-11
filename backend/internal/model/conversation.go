package model

import "time"

type Conversation struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "dm" or "group"
	Name      *string   `json:"name"` // NULL for DMs
	CreatedBy string    `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Joined fields
	Members     []ConversationMember `json:"members"`
	LastMessage *Message             `json:"last_message"`
	UnreadCount int                  `json:"unread_count"`
}

type ConversationMember struct {
	UserID      string    `json:"user_id"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url"`
	Role        string    `json:"role"`
	JoinedAt    time.Time `json:"joined_at"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversation_id"`
	SenderID       string    `json:"sender_id"`
	SenderName     string    `json:"sender_name,omitempty"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateDMRequest struct {
	RecipientID string `json:"recipient_id"`
}

type CreateGroupRequest struct {
	Name      string   `json:"name"`
	MemberIDs []string `json:"member_ids"`
}

type UpdateGroupRequest struct {
	Name      *string  `json:"name,omitempty"`
	MemberIDs []string `json:"member_ids,omitempty"`
}

type SendMessageRequest struct {
	Content string `json:"content"`
}
