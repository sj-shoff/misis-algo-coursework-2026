package dto

import "errors"

var (
	ErrMissingSource       = errors.New("field 'source' is required")
	ErrMissingSink         = errors.New("field 'sink' is required")
	ErrEmptyEdges          = errors.New("edge list cannot be empty")
	ErrNonPositiveCapacity = errors.New("capacity must be positive")
	ErrInvalidEdge         = errors.New("edge must contain non-empty 'from' and 'to'")
)
