package http

import (
	"algo-coursework/internal/delivery/http/handler"
	"algo-coursework/internal/delivery/http/middleware"
	"algo-coursework/internal/domain/port"
	"algo-coursework/static"
	"io/fs"
	"log/slog"
	"net/http"
)

func NewRouter(solver port.MaxFlowSolver, logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.Handle("/api/solve", handler.NewSolverHandler(solver, logger))

	cssFS := mustSubFS(static.FS, "css")
	jsFS := mustSubFS(static.FS, "js")

	mux.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.FS(cssFS))))
	mux.Handle("/js/", http.StripPrefix("/js/", http.FileServer(http.FS(jsFS))))

	indexHTML := mustReadFile(static.FS, "templates/index.html")
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(indexHTML)
	})

	return middleware.CORS(
		middleware.Logging(logger, mux),
	)
}

func mustSubFS(fsys fs.FS, dir string) fs.FS {
	sub, err := fs.Sub(fsys, dir)
	if err != nil {
		panic("static: failed to sub FS for dir=" + dir + ": " + err.Error())
	}
	return sub
}

func mustReadFile(fsys fs.FS, name string) []byte {
	data, err := fs.ReadFile(fsys, name)
	if err != nil {
		panic("static: failed to read file=" + name + ": " + err.Error())
	}
	return data
}
