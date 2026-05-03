package port

import (
	"algo-coursework/internal/domain/entity"
	"context"
)

type MaxFlowSolver interface {
	Solve(ctx context.Context, graph entity.Graph) (entity.Result, error)
}
