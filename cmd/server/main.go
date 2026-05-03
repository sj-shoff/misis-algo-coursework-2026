package main

import (
	"algo-coursework/internal/app"
	"algo-coursework/internal/config"
)

func main() {
	cfg := config.MustLoad()
	application := app.New(cfg)
	application.Run()
}
