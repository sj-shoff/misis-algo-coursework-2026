package handler

import (
	"algo-coursework/internal/delivery/http/dto"
	"algo-coursework/internal/domain/port"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

type SolverHandler struct {
	solver port.MaxFlowSolver
	logger *slog.Logger
}

func NewSolverHandler(solver port.MaxFlowSolver, logger *slog.Logger) *SolverHandler {
	return &SolverHandler{
		solver: solver,
		logger: logger,
	}
}

func (h *SolverHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		h.writeError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var req dto.SolveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("failed to decode request", "error", err)
		h.writeError(w, "bad request", http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		h.writeError(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	result, err := h.solver.Solve(r.Context(), req.ToGraph())
	if err != nil {
		h.logger.Error("algorithm failed", "error", err)
		if errors.Is(err, r.Context().Err()) {
			h.writeError(w, "request timeout", http.StatusRequestTimeout)
			return
		}
		h.writeError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	h.logger.Info("solve completed",
		"source", req.Source,
		"sink", req.Sink,
		"maxFlow", result.MaxFlow,
		"steps", len(result.Steps),
	)

	h.writeJSON(w, dto.SolveResponse{
		MaxFlow:   result.MaxFlow,
		Steps:     result.Steps,
		MinCutSrc: result.MinCutSrc,
	}, http.StatusOK)
}

func (h *SolverHandler) writeJSON(w http.ResponseWriter, v any, status int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		h.logger.Error("failed to encode response", "error", err)
	}
}

func (h *SolverHandler) writeError(w http.ResponseWriter, msg string, status int) {
	h.writeJSON(w, dto.ErrorResponse{Error: msg, Code: status}, status)
}
