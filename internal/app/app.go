package app

import (
	"algo-coursework/internal/config"
	router "algo-coursework/internal/delivery/http/router"
	"algo-coursework/internal/usecase/maxflow"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type App struct {
	server *http.Server
	logger *slog.Logger
}

func New(cfg *config.Config) *App {
	logger := newLogger(cfg.LogLevel)

	solver := maxflow.New()
	router := router.NewRouter(solver, logger)

	server := &http.Server{
		Addr:         cfg.Address(),
		Handler:      router,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
	}

	return &App{server: server, logger: logger}
}

func (a *App) Run() {
	go func() {
		a.logger.Info("server started", "addr", a.server.Addr)
		if err := a.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			a.logger.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	a.waitForShutdown()
}

func (a *App) waitForShutdown() {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	sig := <-quit

	a.logger.Info("shutdown signal received", "signal", sig.String())

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := a.server.Shutdown(ctx); err != nil {
		a.logger.Error("graceful shutdown failed", "error", err)
		return
	}

	a.logger.Info("server stopped gracefully")
}

func newLogger(level string) *slog.Logger {
	var l slog.Level
	switch level {
	case "debug":
		l = slog.LevelDebug
	case "warn":
		l = slog.LevelWarn
	case "error":
		l = slog.LevelError
	default:
		l = slog.LevelInfo
	}
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: l}))
}
