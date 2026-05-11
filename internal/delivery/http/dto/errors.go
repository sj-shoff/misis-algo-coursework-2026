package dto

import "errors"

var (
	ErrMissingSource       = errors.New("source field is required")
	ErrMissingSink         = errors.New("sink field is required")
	ErrEmptyEdges          = errors.New("edges list cannot be empty")
	ErrNonPositiveCapacity = errors.New("capacity must be positive")
	ErrInvalidEdge         = errors.New("edge must contain non-empty 'from' and 'to' fields")
)
