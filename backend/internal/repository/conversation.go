package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/qaveedel/payday/backend/internal/model"
)

type ConversationRepo struct {
	db *pgxpool.Pool
}

func NewConversationRepo(db *pgxpool.Pool) *ConversationRepo {
	return &ConversationRepo{db: db}
}

// FindDM finds an existing DM conversation between two users.
func (r *ConversationRepo) FindDM(ctx context.Context, userA, userB string) (*model.Conversation, error) {
	var conv model.Conversation
	err := r.db.QueryRow(ctx,
		`SELECT c.id, c.type, c.name, c.created_by, c.created_at, c.updated_at
		 FROM conversations c
		 WHERE c.type = 'dm'
		   AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = $1)
		   AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = c.id AND user_id = $2)`,
		userA, userB,
	).Scan(&conv.ID, &conv.Type, &conv.Name, &conv.CreatedBy, &conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &conv, nil
}

// CreateDM creates a new DM conversation between two users.
func (r *ConversationRepo) CreateDM(ctx context.Context, creatorID, recipientID string) (*model.Conversation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var conv model.Conversation
	err = tx.QueryRow(ctx,
		`INSERT INTO conversations (type, created_by) VALUES ('dm', $1)
		 RETURNING id, type, name, created_by, created_at, updated_at`,
		creatorID,
	).Scan(&conv.ID, &conv.Type, &conv.Name, &conv.CreatedBy, &conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)`,
		conv.ID, creatorID, recipientID,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Load members
	conv.Members, _ = r.getMembers(ctx, conv.ID)
	return &conv, nil
}

// CreateGroup creates a new group conversation.
func (r *ConversationRepo) CreateGroup(ctx context.Context, creatorID, name string, memberIDs []string) (*model.Conversation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var conv model.Conversation
	err = tx.QueryRow(ctx,
		`INSERT INTO conversations (type, name, created_by) VALUES ('group', $1, $2)
		 RETURNING id, type, name, created_by, created_at, updated_at`,
		name, creatorID,
	).Scan(&conv.ID, &conv.Type, &conv.Name, &conv.CreatedBy, &conv.CreatedAt, &conv.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Ensure creator is a member
	allMembers := make(map[string]bool)
	allMembers[creatorID] = true
	for _, id := range memberIDs {
		allMembers[id] = true
	}

	for uid := range allMembers {
		_, err = tx.Exec(ctx,
			`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)`,
			conv.ID, uid,
		)
		if err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	conv.Members, _ = r.getMembers(ctx, conv.ID)
	return &conv, nil
}

// UpdateGroup updates group name and/or members.
func (r *ConversationRepo) UpdateGroup(ctx context.Context, convID string, name *string, memberIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if name != nil {
		_, err = tx.Exec(ctx, `UPDATE conversations SET name = $1, updated_at = NOW() WHERE id = $2`, *name, convID)
		if err != nil {
			return err
		}
	}

	if len(memberIDs) > 0 {
		_, err = tx.Exec(ctx, `DELETE FROM conversation_members WHERE conversation_id = $1`, convID)
		if err != nil {
			return err
		}
		for _, uid := range memberIDs {
			_, err = tx.Exec(ctx,
				`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)`,
				convID, uid,
			)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit(ctx)
}

// ListForUser returns all conversations for a user, with members, last message, and unread count.
func (r *ConversationRepo) ListForUser(ctx context.Context, userID string) ([]model.Conversation, error) {
	rows, err := r.db.Query(ctx,
		`SELECT c.id, c.type, c.name, c.created_by, c.created_at, c.updated_at
		 FROM conversations c
		 JOIN conversation_members cm ON cm.conversation_id = c.id
		 WHERE cm.user_id = $1
		 ORDER BY c.updated_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var convs []model.Conversation
	for rows.Next() {
		var c model.Conversation
		if err := rows.Scan(&c.ID, &c.Type, &c.Name, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		convs = append(convs, c)
	}

	// Enrich each conversation
	for i := range convs {
		convs[i].Members, _ = r.getMembers(ctx, convs[i].ID)
		convs[i].LastMessage, _ = r.getLastMessage(ctx, convs[i].ID)
		convs[i].UnreadCount, _ = r.getUnreadCount(ctx, convs[i].ID, userID)
	}

	if convs == nil {
		convs = []model.Conversation{}
	}
	return convs, nil
}

// GetByID returns a conversation with its members.
func (r *ConversationRepo) GetByID(ctx context.Context, convID string) (*model.Conversation, error) {
	var c model.Conversation
	err := r.db.QueryRow(ctx,
		`SELECT id, type, name, created_by, created_at, updated_at FROM conversations WHERE id = $1`, convID,
	).Scan(&c.ID, &c.Type, &c.Name, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.Members, _ = r.getMembers(ctx, c.ID)
	return &c, nil
}

// IsMember checks if a user is a member of a conversation.
func (r *ConversationRepo) IsMember(ctx context.Context, convID, userID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2)`,
		convID, userID,
	).Scan(&exists)
	return exists, err
}

// GetMessages returns messages in a conversation, ordered oldest-first.
func (r *ConversationRepo) GetMessages(ctx context.Context, convID string, limit, offset int) ([]model.Message, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.Query(ctx,
		`SELECT m.id, m.conversation_id, m.sender_id, u.display_name, m.content, m.created_at
		 FROM messages m
		 JOIN users u ON u.id = m.sender_id
		 WHERE m.conversation_id = $1
		 ORDER BY m.created_at ASC
		 LIMIT $2 OFFSET $3`, convID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []model.Message
	for rows.Next() {
		var m model.Message
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.SenderName, &m.Content, &m.CreatedAt); err != nil {
			return nil, err
		}
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []model.Message{}
	}
	return msgs, nil
}

// SendMessage inserts a message and bumps the conversation's updated_at.
func (r *ConversationRepo) SendMessage(ctx context.Context, convID, senderID, content string) (*model.Message, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var msg model.Message
	err = tx.QueryRow(ctx,
		`INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)
		 RETURNING id, conversation_id, sender_id, content, created_at`,
		convID, senderID, content,
	).Scan(&msg.ID, &msg.ConversationID, &msg.SenderID, &msg.Content, &msg.CreatedAt)
	if err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `UPDATE conversations SET updated_at = NOW() WHERE id = $1`, convID)
	if err != nil {
		return nil, err
	}

	// Also mark as read for the sender
	_, err = tx.Exec(ctx,
		`INSERT INTO message_reads (conversation_id, user_id, last_read_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = NOW()`,
		convID, senderID,
	)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Get sender name
	var name string
	_ = r.db.QueryRow(ctx, `SELECT display_name FROM users WHERE id = $1`, senderID).Scan(&name)
	msg.SenderName = name

	return &msg, nil
}

// MarkRead updates the read watermark for a user in a conversation.
func (r *ConversationRepo) MarkRead(ctx context.Context, convID, userID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO message_reads (conversation_id, user_id, last_read_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (conversation_id, user_id) DO UPDATE SET last_read_at = NOW()`,
		convID, userID,
	)
	return err
}

// TotalUnreadCount counts total unread messages across all conversations for a user.
func (r *ConversationRepo) TotalUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE(SUM(cnt), 0) FROM (
			SELECT COUNT(*) as cnt
			FROM messages m
			JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.user_id = $1
			LEFT JOIN message_reads mr ON mr.conversation_id = m.conversation_id AND mr.user_id = $1
			WHERE m.created_at > COALESCE(mr.last_read_at, '1970-01-01'::timestamptz)
			  AND m.sender_id != $1
			GROUP BY m.conversation_id
		) sub`, userID,
	).Scan(&count)
	return count, err
}

// --- internal helpers ---

func (r *ConversationRepo) getMembers(ctx context.Context, convID string) ([]model.ConversationMember, error) {
	rows, err := r.db.Query(ctx,
		`SELECT cm.user_id, u.display_name, u.avatar_url, u.role, cm.joined_at
		 FROM conversation_members cm
		 JOIN users u ON u.id = cm.user_id
		 WHERE cm.conversation_id = $1
		 ORDER BY cm.joined_at ASC`, convID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []model.ConversationMember
	for rows.Next() {
		var m model.ConversationMember
		if err := rows.Scan(&m.UserID, &m.DisplayName, &m.AvatarURL, &m.Role, &m.JoinedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	if members == nil {
		members = []model.ConversationMember{}
	}
	return members, nil
}

func (r *ConversationRepo) getLastMessage(ctx context.Context, convID string) (*model.Message, error) {
	var m model.Message
	err := r.db.QueryRow(ctx,
		`SELECT m.id, m.conversation_id, m.sender_id, u.display_name, m.content, m.created_at
		 FROM messages m
		 JOIN users u ON u.id = m.sender_id
		 WHERE m.conversation_id = $1
		 ORDER BY m.created_at DESC
		 LIMIT 1`, convID,
	).Scan(&m.ID, &m.ConversationID, &m.SenderID, &m.SenderName, &m.Content, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *ConversationRepo) getUnreadCount(ctx context.Context, convID, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		fmt.Sprintf(
			`SELECT COUNT(*)
			 FROM messages m
			 LEFT JOIN message_reads mr ON mr.conversation_id = m.conversation_id AND mr.user_id = $2
			 WHERE m.conversation_id = $1
			   AND m.created_at > COALESCE(mr.last_read_at, '1970-01-01'::timestamptz)
			   AND m.sender_id != $2`,
		), convID, userID,
	).Scan(&count)
	return count, err
}
