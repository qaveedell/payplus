package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/qaveedel/payday/backend/internal/model"
)

type NoteRepo struct {
	db *pgxpool.Pool
}

func NewNoteRepo(db *pgxpool.Pool) *NoteRepo {
	return &NoteRepo{db: db}
}

func (r *NoteRepo) Create(ctx context.Context, paymentID, authorID, content string) (*model.Note, error) {
	var n model.Note
	err := r.db.QueryRow(ctx,
		`INSERT INTO notes (payment_id, author_id, content)
		 VALUES ($1, $2, $3)
		 RETURNING id, payment_id, author_id, content, created_at`,
		paymentID, authorID, content,
	).Scan(&n.ID, &n.PaymentID, &n.AuthorID, &n.Content, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *NoteRepo) ListByPayment(ctx context.Context, paymentID string) ([]model.Note, error) {
	rows, err := r.db.Query(ctx,
		`SELECT n.id, n.payment_id, n.author_id, u.display_name, n.content, n.created_at
		 FROM notes n
		 JOIN users u ON u.id = n.author_id
		 WHERE n.payment_id = $1
		 ORDER BY n.created_at ASC`, paymentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []model.Note
	for rows.Next() {
		var n model.Note
		err := rows.Scan(&n.ID, &n.PaymentID, &n.AuthorID, &n.AuthorName, &n.Content, &n.CreatedAt)
		if err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	if notes == nil {
		notes = []model.Note{}
	}
	return notes, nil
}
