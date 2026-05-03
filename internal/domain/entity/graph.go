package entity

type Graph struct {
	Source string
	Sink   string
	Edges  []Edge
}

type Edge struct {
	From     string
	To       string
	Capacity float64
}

type FlowEdge struct {
	From     string  `json:"from"`
	To       string  `json:"to"`
	Capacity float64 `json:"capacity"`
	Flow     float64 `json:"flow"`
}

type Step struct {
	Iteration     int            `json:"iteration"`
	Path          []string       `json:"path"`
	Bottleneck    float64        `json:"bottleneck"`
	Edges         []FlowEdge     `json:"edges"`
	Message       string         `json:"message"`
	ResidualEdges []ResidualEdge `json:"residualEdges"`
}

type ResidualEdge struct {
	From     string  `json:"from"`
	To       string  `json:"to"`
	Capacity float64 `json:"capacity"`
}

type Result struct {
	MaxFlow   float64  `json:"maxFlow"`
	Steps     []Step   `json:"steps"`
	MinCutSrc []string `json:"minCutSrc"`
}
