package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/qaveedel/payday/backend/internal/model"
)

type ContactRepo struct {
	db *pgxpool.Pool
}

func NewContactRepo(db *pgxpool.Pool) *ContactRepo {
	return &ContactRepo{db: db}
}

func (r *ContactRepo) Create(ctx context.Context, c *model.CreateContactRequest, createdBy string) (*model.Contact, error) {
	var contact model.Contact
	err := r.db.QueryRow(ctx,
		`INSERT INTO contacts (name, sheba, card_number, account_number, national_id, phone, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, name, sheba, card_number, account_number, national_id, phone, created_by, created_at, updated_at`,
		c.Name, c.Sheba, c.CardNumber, c.AccountNumber, c.NationalID, c.Phone, createdBy,
	).Scan(
		&contact.ID, &contact.Name, &contact.Sheba, &contact.CardNumber,
		&contact.AccountNumber, &contact.NationalID, &contact.Phone,
		&contact.CreatedBy, &contact.CreatedAt, &contact.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &contact, nil
}

func (r *ContactRepo) List(ctx context.Context) ([]model.Contact, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, sheba, card_number, account_number, national_id, phone, created_by, created_at, updated_at
		 FROM contacts ORDER BY name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []model.Contact
	for rows.Next() {
		var c model.Contact
		err := rows.Scan(&c.ID, &c.Name, &c.Sheba, &c.CardNumber, &c.AccountNumber,
			&c.NationalID, &c.Phone, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	if contacts == nil {
		contacts = []model.Contact{}
	}
	return contacts, nil
}

func (r *ContactRepo) GetByID(ctx context.Context, id string) (*model.Contact, error) {
	var c model.Contact
	err := r.db.QueryRow(ctx,
		`SELECT id, name, sheba, card_number, account_number, national_id, phone, created_by, created_at, updated_at
		 FROM contacts WHERE id = $1`, id,
	).Scan(&c.ID, &c.Name, &c.Sheba, &c.CardNumber, &c.AccountNumber,
		&c.NationalID, &c.Phone, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ContactRepo) Update(ctx context.Context, id string, c *model.CreateContactRequest) error {
	_, err := r.db.Exec(ctx,
		`UPDATE contacts SET name = $1, sheba = $2, card_number = $3, account_number = $4,
		        national_id = $5, phone = $6, updated_at = NOW()
		 WHERE id = $7`,
		c.Name, c.Sheba, c.CardNumber, c.AccountNumber, c.NationalID, c.Phone, id)
	return err
}

func (r *ContactRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM contacts WHERE id = $1`, id)
	return err
}

// FindByNameAndIBAN checks if a contact with this name and IBAN value already exists for this user.
func (r *ContactRepo) FindByNameAndIBAN(ctx context.Context, name, ibanType, ibanValue, createdBy string) (*model.Contact, error) {
	var col string
	switch ibanType {
	case "sheba":
		col = "sheba"
	case "card":
		col = "card_number"
	case "account":
		col = "account_number"
	default:
		return nil, nil
	}

	var c model.Contact
	query := `SELECT id, name, sheba, card_number, account_number, national_id, phone, created_by, created_at, updated_at
		FROM contacts WHERE name = $1 AND ` + col + ` = $2 AND created_by = $3 LIMIT 1`
	err := r.db.QueryRow(ctx, query, name, ibanValue, createdBy).Scan(
		&c.ID, &c.Name, &c.Sheba, &c.CardNumber, &c.AccountNumber,
		&c.NationalID, &c.Phone, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}
