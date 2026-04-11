package handler

import (
	"net/http"

	"github.com/qaveedel/payday/backend/internal/repository"
)

type ReportHandler struct {
	reportRepo *repository.ReportRepo
}

func NewReportHandler(reportRepo *repository.ReportRepo) *ReportHandler {
	return &ReportHandler{reportRepo: reportRepo}
}

func (h *ReportHandler) Summary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	summary, err := h.reportRepo.Summary(r.Context(), q.Get("date_from"), q.Get("date_to"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to get summary"})
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (h *ReportHandler) ByContact(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	report, err := h.reportRepo.ByContact(r.Context(), q.Get("date_from"), q.Get("date_to"))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to get report"})
		return
	}
	writeJSON(w, http.StatusOK, report)
}

func (h *ReportHandler) Timeline(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	granularity := q.Get("granularity")
	if granularity == "" {
		granularity = "day"
	}

	timeline, err := h.reportRepo.Timeline(r.Context(), q.Get("date_from"), q.Get("date_to"), granularity)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to get timeline"})
		return
	}
	writeJSON(w, http.StatusOK, timeline)
}
