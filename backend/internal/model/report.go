package model

type ReportSummary struct {
	TotalPayments   int   `json:"total_payments"`
	TotalAmount     int64 `json:"total_amount"`
	PaidAmount      int64 `json:"paid_amount"`
	UnpaidAmount    int64 `json:"unpaid_amount"`
	PaidCount       int   `json:"paid_count"`
	UnpaidCount     int   `json:"unpaid_count"`
	ProblematicCount int  `json:"problematic_count"`
}

type ContactReport struct {
	ContactID   *string `json:"contact_id"`
	ContactName string  `json:"contact_name"`
	TotalAmount int64   `json:"total_amount"`
	PaidAmount  int64   `json:"paid_amount"`
	Count       int     `json:"count"`
}

type TimelinePoint struct {
	Period      string `json:"period"`
	TotalAmount int64  `json:"total_amount"`
	PaidAmount  int64  `json:"paid_amount"`
	Count       int    `json:"count"`
}
