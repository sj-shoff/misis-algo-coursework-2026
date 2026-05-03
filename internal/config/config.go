package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ilyakaznacheev/cleanenv"
)

type Config struct {
	HTTPPort     string        `env:"SERVER_PORT" env-default:"8120"`
	ReadTimeout  time.Duration `env:"READ_TIMEOUT" env-default:"5s"`
	WriteTimeout time.Duration `env:"WRITE_TIMEOUT" env-default:"10s"`
	IdleTimeout  time.Duration `env:"IDLE_TIMEOUT" env-default:"15s"`
	LogLevel     string        `env:"LOG_LEVEL" env-default:"info"`
}

func (c *Config) Address() string {
	return fmt.Sprintf(":%s", c.HTTPPort)
}

func MustLoad() *Config {
	var cfg Config

	if _, err := os.Stat(".env"); err == nil {
		if err := cleanenv.ReadConfig(".env", &cfg); err != nil {
			log.Fatalf("config: failed to read .env: %v", err)
		}
	} else if err := cleanenv.ReadEnv(&cfg); err != nil {
		log.Fatalf("config: failed to read env: %v", err)
	}

	return &cfg
}
