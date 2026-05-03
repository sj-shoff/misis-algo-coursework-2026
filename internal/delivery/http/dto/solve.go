package dto

import "algo-coursework/internal/domain/entity"

type EdgeDTO struct {
	From     string  `json:"from"`
	To       string  `json:"to"`
	Capacity float64 `json:"capacity"`
}

type SolveRequest struct {
	Source string    `json:"source"`
	Sink   string    `json:"sink"`
	Edges  []EdgeDTO `json:"edges"`
}

func (r *SolveRequest) Validate() error {
	if r.Source == "" {
		return ErrMissingSource
	}
	if r.Sink == "" {
		return ErrMissingSink
	}
	if len(r.Edges) == 0 {
		return ErrEmptyEdges
	}
	for _, e := range r.Edges {
		if e.Capacity <= 0 {
			return ErrNonPositiveCapacity
		}
		if e.From == "" || e.To == "" {
			return ErrInvalidEdge
		}
	}
	return nil
}

func (r *SolveRequest) ToGraph() entity.Graph {
	edges := make([]entity.Edge, len(r.Edges))
	for i, e := range r.Edges {
		edges[i] = entity.Edge{
			From:     e.From,
			To:       e.To,
			Capacity: e.Capacity,
		}
	}
	return entity.Graph{
		Source: r.Source,
		Sink:   r.Sink,
		Edges:  edges,
	}
}

type SolveResponse struct {
	MaxFlow   float64       `json:"maxFlow"`
	Steps     []entity.Step `json:"steps"`
	MinCutSrc []string      `json:"minCutSrc"`
}

type ErrorResponse struct {
	Error string `json:"error"`
	Code  int    `json:"code"`
}
