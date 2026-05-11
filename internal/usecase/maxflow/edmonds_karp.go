package maxflow

import (
	"algo-coursework/internal/domain/entity"
	"algo-coursework/internal/domain/port"
	"context"
	"fmt"
	"math"
)

var _ port.MaxFlowSolver = (*EdmondsKarp)(nil)

type EdmondsKarp struct{}

func New() port.MaxFlowSolver {
	return &EdmondsKarp{}
}

type residualGraph struct {
	cap   map[string]map[string]float64
	adj   map[string][]string
	nodes []string
}

func newResidualGraph(edges []entity.Edge) *residualGraph {
	rg := &residualGraph{
		cap: make(map[string]map[string]float64),
		adj: make(map[string][]string),
	}

	nodeSet := make(map[string]bool)

	addNode := func(v string) {
		if !nodeSet[v] {
			nodeSet[v] = true
			rg.nodes = append(rg.nodes, v)
			rg.cap[v] = make(map[string]float64)
		}
	}

	for _, e := range edges {
		addNode(e.From)
		addNode(e.To)
		rg.cap[e.From][e.To] += e.Capacity
		rg.addNeighbor(e.From, e.To)
		rg.addNeighbor(e.To, e.From)
	}

	return rg
}

func (rg *residualGraph) addNeighbor(u, v string) {
	for _, x := range rg.adj[u] {
		if x == v {
			return
		}
	}
	rg.adj[u] = append(rg.adj[u], v)
}

func (rg *residualGraph) bfs(source, sink string) map[string]string {
	parent := make(map[string]string)
	parent[source] = ""
	queue := []string{source}

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		for _, next := range rg.adj[curr] {
			if _, visited := parent[next]; !visited && rg.cap[curr][next] > 0 {
				parent[next] = curr
				if next == sink {
					return parent
				}
				queue = append(queue, next)
			}
		}
	}
	return nil
}

func reconstructPath(parent map[string]string, source, sink string) []string {
	path := []string{}
	for curr := sink; curr != source; curr = parent[curr] {
		path = append([]string{curr}, path...)
	}
	return append([]string{source}, path...)
}

func (rg *residualGraph) bottleneck(path []string) float64 {
	delta := math.MaxFloat64
	for i := 0; i < len(path)-1; i++ {
		if res := rg.cap[path[i]][path[i+1]]; res < delta {
			delta = res
		}
	}
	return delta
}

func (rg *residualGraph) augment(path []string, delta float64) {
	for i := 0; i < len(path)-1; i++ {
		u, v := path[i], path[i+1]
		rg.cap[u][v] -= delta
		rg.cap[v][u] += delta
	}
}

func (rg *residualGraph) snapshot(originalEdges []entity.Edge) []entity.FlowEdge {
	result := make([]entity.FlowEdge, len(originalEdges))
	for i, e := range originalEdges {
		flow := e.Capacity - rg.cap[e.From][e.To]
		result[i] = entity.FlowEdge{
			From:     e.From,
			To:       e.To,
			Capacity: e.Capacity,
			Flow:     flow,
		}
	}
	return result
}

func (rg *residualGraph) minCutVertices(source string) []string {
	visited := make(map[string]bool)
	queue := []string{source}
	visited[source] = true

	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		for _, next := range rg.adj[curr] {
			if !visited[next] && rg.cap[curr][next] > 0 {
				visited[next] = true
				queue = append(queue, next)
			}
		}
	}

	var result []string
	for v := range visited {
		result = append(result, v)
	}
	return result
}

func (ek *EdmondsKarp) Solve(ctx context.Context, graph entity.Graph) (entity.Result, error) {
	if graph.Source == graph.Sink {
		return entity.Result{}, fmt.Errorf("source и sink не могут совпадать")
	}

	rg := newResidualGraph(graph.Edges)
	var totalFlow float64
	var steps []entity.Step
	iteration := 0

	for {
		select {
		case <-ctx.Done():
			return entity.Result{}, ctx.Err()
		default:
		}

		parent := rg.bfs(graph.Source, graph.Sink)
		if parent == nil {
			break
		}

		path := reconstructPath(parent, graph.Source, graph.Sink)
		delta := rg.bottleneck(path)

		rg.augment(path, delta)
		totalFlow += delta
		iteration++

		steps = append(steps, entity.Step{
			Iteration:  iteration,
			Path:       path,
			Bottleneck: delta,
			Edges:      rg.snapshot(graph.Edges),
			Message: fmt.Sprintf("Итерация %d: путь [%s], Δ = %.0f, поток = %.0f",
				iteration, formatPath(path), delta, totalFlow),
		})
	}

	return entity.Result{
		MaxFlow:   totalFlow,
		Steps:     steps,
		MinCutSrc: rg.minCutVertices(graph.Source),
	}, nil
}

func formatPath(path []string) string {
	if len(path) == 0 {
		return ""
	}
	result := path[0]
	for _, v := range path[1:] {
		result += " → " + v
	}
	return result
}
