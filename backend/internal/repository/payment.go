package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/qaveedel/payday/backend/internal/model"
)

type PaymentRepo struct {
	db *pgxpool.Pool
}

func NewPaymentRepo(db *pgxpool.Pool) *PaymentRepo {
	return &PaymentRepo{db: db}
}

func (r *PaymentRepo) Create(ctx context.Context, p *model.CreatePaymentRequest, createdBy string) (*model.Payment, error) {
	var payment model.Payment
	err := r.db.QueryRow(ctx,
		`INSERT INTO payments (parent_id, type, name, iban_type, iban_value, amount, reference_number, bank_name, receipt_url, national_id, phone, contact_id, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		 RETURNING id, parent_id, type, name, iban_type, iban_value, amount, reference_number, bank_name,
		           national_id, phone, status, is_confirmed, confirmed_at, receipt_url,
		           contact_id, created_by, created_at, updated_at`,
		p.ParentID, p.Type, p.Name, p.IBANType, p.IBANValue, p.Amount,
		p.ReferenceNumber, p.BankName, p.ReceiptURL,
		p.NationalID, p.Phone, p.ContactID, createdBy,
	).Scan(
		&payment.ID, &payment.ParentID, &payment.Type, &payment.Name,
		&payment.IBANType, &payment.IBANValue, &payment.Amount, &payment.ReferenceNumber, &payment.BankName,
		&payment.NationalID, &payment.Phone, &payment.Status, &payment.IsConfirmed,
		&payment.ConfirmedAt, &payment.ReceiptURL, &payment.ContactID,
		&payment.CreatedBy, &payment.CreatedAt, &payment.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *PaymentRepo) GetByID(ctx context.Context, id string) (*model.Payment, error) {
	var p model.Payment
	err := r.db.QueryRow(ctx,
		`SELECT p.id, p.parent_id, p.type, p.name, p.iban_type, p.iban_value, p.amount,
		        p.reference_number, p.bank_name, p.national_id, p.phone, p.status, p.is_confirmed,
		        p.confirmed_at, p.receipt_url, p.contact_id, p.created_by, p.created_at, p.updated_at,
		        u.display_name
		 FROM payments p
		 JOIN users u ON u.id = p.created_by
		 WHERE p.id = $1`, id,
	).Scan(
		&p.ID, &p.ParentID, &p.Type, &p.Name, &p.IBANType, &p.IBANValue, &p.Amount,
		&p.ReferenceNumber, &p.NationalID, &p.Phone, &p.Status, &p.IsConfirmed,
		&p.ConfirmedAt, &p.ReceiptURL, &p.ContactID, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
		&p.CreatorName,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepo) List(ctx context.Context, f model.PaymentFilter) (*model.PaymentListResponse, error) {
	var conditions []string
	var args []interface{}
	argIdx := 1

	// Only show top-level payments (not sub-payments)
	conditions = append(conditions, "p.parent_id IS NULL")

	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("p.type = $%d", argIdx))
		args = append(args, f.Type)
		argIdx++
	}
	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("p.status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}
	if f.Name != "" {
		conditions = append(conditions, fmt.Sprintf("p.name ILIKE $%d", argIdx))
		args = append(args, "%"+f.Name+"%")
		argIdx++
	}
	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(p.name ILIKE $%d OR p.iban_value ILIKE $%d OR p.reference_number ILIKE $%d OR p.phone ILIKE $%d OR p.bank_name ILIKE $%d)",
			argIdx, argIdx, argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}
	if f.DateFrom != "" {
		conditions = append(conditions, fmt.Sprintf("p.created_at >= $%d", argIdx))
		args = append(args, f.DateFrom)
		argIdx++
	}
	if f.DateTo != "" {
		conditions = append(conditions, fmt.Sprintf("p.created_at <= $%d", argIdx))
		args = append(args, f.DateTo)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM payments p %s", where)
	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, err
	}

	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.PageSize

	orderClause := "p.created_at DESC"
	switch f.SortBy {
	case "status":
		orderClause = "p.status ASC, p.created_at DESC"
	case "status_desc":
		orderClause = "p.status DESC, p.created_at DESC"
	case "amount":
		orderClause = "p.amount ASC, p.created_at DESC"
	case "amount_desc":
		orderClause = "p.amount DESC, p.created_at DESC"
	}

	query := fmt.Sprintf(
		`SELECT p.id, p.parent_id, p.type, p.name, p.iban_type, p.iban_value, p.amount,
		        p.reference_number, p.bank_name, p.national_id, p.phone, p.status, p.is_confirmed,
		        p.confirmed_at, p.receipt_url, p.contact_id, p.created_by, p.created_at, p.updated_at,
		        u.display_name
		 FROM payments p
		 JOIN users u ON u.id = p.created_by
		 %s
		 ORDER BY %s
		 LIMIT $%d OFFSET $%d`,
		where, orderClause, argIdx, argIdx+1,
	)
	args = append(args, f.PageSize, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []model.Payment
	for rows.Next() {
		var p model.Payment
		err := rows.Scan(
			&p.ID, &p.ParentID, &p.Type, &p.Name, &p.IBANType, &p.IBANValue, &p.Amount,
			&p.ReferenceNumber, &p.BankName, &p.NationalID, &p.Phone, &p.Status, &p.IsConfirmed,
			&p.ConfirmedAt, &p.ReceiptURL, &p.ContactID, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
			&p.CreatorName,
		)
		if err != nil {
			return nil, err
		}
		payments = append(payments, p)
	}

	if payments == nil {
		payments = []model.Payment{}
	}

	return &model.PaymentListResponse{
		Payments: payments,
		Total:    total,
		Page:     f.Page,
		PageSize: f.PageSize,
	}, nil
}

func (r *PaymentRepo) GetSubPayments(ctx context.Context, parentID string) ([]model.Payment, error) {
	rows, err := r.db.Query(ctx,
		`SELECT p.id, p.parent_id, p.type, p.name, p.iban_type, p.iban_value, p.amount,
		        p.reference_number, p.bank_name, p.national_id, p.phone, p.status, p.is_confirmed,
		        p.confirmed_at, p.receipt_url, p.contact_id, p.created_by, p.created_at, p.updated_at,
		        u.display_name
		 FROM payments p
		 JOIN users u ON u.id = p.created_by
		 WHERE p.parent_id = $1
		 ORDER BY p.created_at ASC`, parentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []model.Payment
	for rows.Next() {
		var p model.Payment
		err := rows.Scan(
			&p.ID, &p.ParentID, &p.Type, &p.Name, &p.IBANType, &p.IBANValue, &p.Amount,
			&p.ReferenceNumber, &p.BankName, &p.NationalID, &p.Phone, &p.Status, &p.IsConfirmed,
			&p.ConfirmedAt, &p.ReceiptURL, &p.ContactID, &p.CreatedBy, &p.CreatedAt, &p.UpdatedAt,
			&p.CreatorName,
		)
		if err != nil {
			return nil, err
		}
		payments = append(payments, p)
	}
	if payments == nil {
		payments = []model.Payment{}
	}
	return payments, nil
}

func (r *PaymentRepo) UpdateStatus(ctx context.Context, id string, status string, receiptURL string) error {
	query := `UPDATE payments SET status = $1, updated_at = NOW()`
	args := []interface{}{status}
	argIdx := 2

	if receiptURL != "" {
		query += fmt.Sprintf(", receipt_url = $%d", argIdx)
		args = append(args, receiptURL)
		argIdx++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argIdx)
	args = append(args, id)

	_, err := r.db.Exec(ctx, query, args...)
	return err
}

func (r *PaymentRepo) Confirm(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE payments SET is_confirmed = TRUE, confirmed_at = NOW(), updated_at = NOW() WHERE id = $1`, id)
	return err
}

func (r *PaymentRepo) Update(ctx context.Context, id string, p *model.CreatePaymentRequest) error {
	_, err := r.db.Exec(ctx,
		`UPDATE payments SET name = $1, iban_type = $2, iban_value = $3, amount = $4,
		        bank_name = $5, national_id = $6, phone = $7, contact_id = $8, updated_at = NOW()
		 WHERE id = $9`,
		p.Name, p.IBANType, p.IBANValue, p.Amount, p.BankName, p.NationalID, p.Phone, p.ContactID, id)
	return err
}
