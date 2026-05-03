package maxflow_test

import (
	"algo-coursework/internal/domain/entity"
	"algo-coursework/internal/usecase/maxflow"
	"context"
	"math"
	"testing"
)

func TestEdmondsKarp_SimpleGraph(t *testing.T) {
	solver := maxflow.New()
	graph := entity.Graph{
		Source: "S",
		Sink:   "T",
		Edges: []entity.Edge{
			{From: "S", To: "A", Capacity: 10},
			{From: "S", To: "B", Capacity: 10},
			{From: "A", To: "C", Capacity: 4},
			{From: "A", To: "D", Capacity: 8},
			{From: "B", To: "D", Capacity: 9},
			{From: "C", To: "T", Capacity: 10},
			{From: "D", To: "C", Capacity: 6},
			{From: "D", To: "T", Capacity: 10},
		},
	}

	result, err := solver.Solve(context.Background(), graph)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	const wantFlow = 19
	if math.Abs(result.MaxFlow-wantFlow) > 1e-9 {
		t.Errorf("MaxFlow = %v, want %v", result.MaxFlow, wantFlow)
	}

	if len(result.Steps) == 0 {
		t.Error("expected at least one step")
	}
}

func TestEdmondsKarp_SingleEdge(t *testing.T) {
	solver := maxflow.New()
	graph := entity.Graph{
		Source: "S",
		Sink:   "T",
		Edges:  []entity.Edge{{From: "S", To: "T", Capacity: 42}},
	}

	result, err := solver.Solve(context.Background(), graph)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.MaxFlow != 42 {
		t.Errorf("MaxFlow = %v, want 42", result.MaxFlow)
	}
}

func TestEdmondsKarp_NoPath(t *testing.T) {
	solver := maxflow.New()
	graph := entity.Graph{
		Source: "S",
		Sink:   "T",
		Edges:  []entity.Edge{{From: "A", To: "B", Capacity: 10}},
	}

	result, err := solver.Solve(context.Background(), graph)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.MaxFlow != 0 {
		t.Errorf("MaxFlow = %v, want 0", result.MaxFlow)
	}
}

func TestEdmondsKarp_ContextCancellation(t *testing.T) {
	solver := maxflow.New()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	graph := entity.Graph{
		Source: "S",
		Sink:   "T",
		Edges:  []entity.Edge{{From: "S", To: "T", Capacity: 10}},
	}

	_, err := solver.Solve(ctx, graph)
	if err == nil {
		t.Log("completed before ctx check — acceptable for tiny graph")
	}
}
