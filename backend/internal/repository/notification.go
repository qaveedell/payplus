package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/qaveedel/payday/backend/internal/model"
)

type NotificationRepo struct {
	db *pgxpool.Pool
}

func NewNotificationRepo(db *pgxpool.Pool) *NotificationRepo {
	return &NotificationRepo{db: db}
}

// ListForUser returns all notifications for a given user, newest first.
func (r *NotificationRepo) ListForUser(ctx context.Context, userID string) ([]model.Notification, error) {
	rows, err := r.db.Query(ctx,
		`SELECT n.id, n.user_id, n.title, n.message, n.is_read, n.created_by, u.display_name, n.created_at
		 FROM notifications n
		 JOIN users u ON u.id = n.created_by
		 WHERE n.user_id = $1
		 ORDER BY n.created_at DESC`, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []model.Notification
	for rows.Next() {
		var n model.Notification
		if err := rows.Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.IsRead, &n.CreatedBy, &n.CreatedByName, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifications = append(notifications, n)
	}
	if notifications == nil {
		notifications = []model.Notification{}
	}
	return notifications, nil
}

// UnreadCount returns the number of unread notifications for a user.
func (r *NotificationRepo) UnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`, userID,
	).Scan(&count)
	return count, err
}

// MarkRead marks a notification as read (only if it belongs to the user).
func (r *NotificationRepo) MarkRead(ctx context.Context, notifID, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, notifID, userID,
	)
	return err
}

// MarkAllRead marks all notifications as read for a user.
func (r *NotificationRepo) MarkAllRead(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, userID,
	)
	return err
}

// Create inserts a notification for a single user.
func (r *NotificationRepo) Create(ctx context.Context, userID, createdBy, title, message string) (*model.Notification, error) {
	var n model.Notification
	err := r.db.QueryRow(ctx,
		`INSERT INTO notifications (user_id, title, message, created_by)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, user_id, title, message, is_read, created_by, created_at`,
		userID, title, message, createdBy,
	).Scan(&n.ID, &n.UserID, &n.Title, &n.Message, &n.IsRead, &n.CreatedBy, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

// GetAllUserIDs returns all user IDs (for broadcast notifications).
func (r *NotificationRepo) GetAllUserIDs(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx, `SELECT id FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}
