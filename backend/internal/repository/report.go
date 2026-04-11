package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/qaveedel/payday/backend/internal/model"
)

type ReportRepo struct {
	db *pgxpool.Pool
}

func NewReportRepo(db *pgxpool.Pool) *ReportRepo {
	return &ReportRepo{db: db}
}

func (r *ReportRepo) Summary(ctx context.Context, dateFrom, dateTo string) (*model.ReportSummary, error) {
	where := "WHERE parent_id IS NULL"
	args := []interface{}{}
	argIdx := 1

	if dateFrom != "" {
		where += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		where += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}

	var s model.ReportSummary
	err := r.db.QueryRow(ctx, fmt.Sprintf(
		`SELECT
			COUNT(*),
			COALESCE(SUM(amount), 0),
			COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END), 0),
			COUNT(CASE WHEN status = 'paid' THEN 1 END),
			COUNT(CASE WHEN status = 'unpaid' THEN 1 END),
			COUNT(CASE WHEN status = 'problematic' THEN 1 END)
		 FROM payments %s`, where), args...,
	).Scan(&s.TotalPayments, &s.TotalAmount, &s.PaidAmount, &s.UnpaidAmount,
		&s.PaidCount, &s.UnpaidCount, &s.ProblematicCount)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *ReportRepo) ByContact(ctx context.Context, dateFrom, dateTo string) ([]model.ContactReport, error) {
	where := "WHERE p.parent_id IS NULL"
	args := []interface{}{}
	argIdx := 1

	if dateFrom != "" {
		where += fmt.Sprintf(" AND p.created_at >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		where += fmt.Sprintf(" AND p.created_at <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(
		`SELECT p.contact_id, COALESCE(c.name, p.name) as contact_name,
		        COALESCE(SUM(p.amount), 0), COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0),
		        COUNT(*)
		 FROM payments p
		 LEFT JOIN contacts c ON c.id = p.contact_id
		 %s
		 GROUP BY p.contact_id, contact_name
		 ORDER BY SUM(p.amount) DESC`, where), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reports []model.ContactReport
	for rows.Next() {
		var cr model.ContactReport
		err := rows.Scan(&cr.ContactID, &cr.ContactName, &cr.TotalAmount, &cr.PaidAmount, &cr.Count)
		if err != nil {
			return nil, err
		}
		reports = append(reports, cr)
	}
	if reports == nil {
		reports = []model.ContactReport{}
	}
	return reports, nil
}

func (r *ReportRepo) Timeline(ctx context.Context, dateFrom, dateTo, granularity string) ([]model.TimelinePoint, error) {
	truncTo := "day"
	switch granularity {
	case "week":
		truncTo = "week"
	case "month":
		truncTo = "month"
	}

	where := "WHERE parent_id IS NULL"
	args := []interface{}{}
	argIdx := 1

	if dateFrom != "" {
		where += fmt.Sprintf(" AND created_at >= $%d", argIdx)
		args = append(args, dateFrom)
		argIdx++
	}
	if dateTo != "" {
		where += fmt.Sprintf(" AND created_at <= $%d", argIdx)
		args = append(args, dateTo)
		argIdx++
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(
		`SELECT date_trunc('%s', created_at)::date::text as period,
		        COALESCE(SUM(amount), 0),
		        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
		        COUNT(*)
		 FROM payments %s
		 GROUP BY period
		 ORDER BY period ASC`, truncTo, where), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []model.TimelinePoint
	for rows.Next() {
		var tp model.TimelinePoint
		err := rows.Scan(&tp.Period, &tp.TotalAmount, &tp.PaidAmount, &tp.Count)
		if err != nil {
			return nil, err
		}
		points = append(points, tp)
	}
	if points == nil {
		points = []model.TimelinePoint{}
	}
	return points, nil
}
