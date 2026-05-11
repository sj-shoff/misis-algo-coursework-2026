// Package config отвечает за загрузку конфигурации из переменных окружения.
// Использование cleanenv позволяет читать .env-файл в dev-режиме
// и реальные env vars в production (Docker, Kubernetes).
package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

// Config — всё, что нужно приложению для запуска.
// Теги `env` и `env-default` — декларативная конфигурация без if-цепочек.
type Config struct {
	// HTTPPort — порт HTTP-сервера.
	HTTPPort string `env:"SERVER_PORT" env-default:"8120"`

	// ReadTimeout — таймаут чтения HTTP-запроса.
	ReadTimeout time.Duration `env:"READ_TIMEOUT" env-default:"5s"`

	// WriteTimeout — таймаут записи HTTP-ответа.
	WriteTimeout time.Duration `env:"WRITE_TIMEOUT" env-default:"10s"`

	// IdleTimeout — таймаут keep-alive соединений.
	IdleTimeout time.Duration `env:"IDLE_TIMEOUT" env-default:"15s"`

	// LogLevel — уровень логирования: debug, info, warn, error.
	LogLevel string `env:"LOG_LEVEL" env-default:"info"`
}

// Address возвращает адрес для http.Server.Addr в формате ":port".
func (c *Config) Address() string {
	return fmt.Sprintf(":%s", c.HTTPPort)
}

// MustLoad загружает конфигурацию. При критической ошибке завершает процесс —
// «fail fast» на старте лучше, чем странное поведение в рантайме.
func MustLoad() *Config {
	var cfg Config

	// Пробуем загрузить .env — игнорируем ошибку «файл не найден».
	if _, err := os.Stat(".env"); err == nil {
		if err := cleanenv.ReadConfig(".env", &cfg); err != nil {
			log.Fatalf("config: failed to read .env: %v", err)
		}
	} else if err := cleanenv.ReadEnv(&cfg); err != nil {
		log.Fatalf("config: failed to read env: %v", err)
	}

	return &cfg
}
