# Алгоритм Эдмондса–Карпа — Визуализатор

> Курсовая работа · БИВТ-24-6 · Атряхин С.А.  
> Курс «Алгоритмы и структуры данных» · НИТУ МИСИС · 2026

## Описание

Клиент-серверное веб-приложение для пошаговой визуализации алгоритма Эдмондса–Карпа нахождения максимального потока в транспортных сетях.

## Запуск

```bash
go mod download
make up
# Сервер: http://localhost:8120
```

## API

### POST /api/solve

**Request:**
```json
{
  "source": "S",
  "sink":   "T",
  "edges": [
    { "from": "S", "to": "A", "capacity": 10 },
    { "from": "A", "to": "T", "capacity": 10 }
  ]
}
```

**Response:**
```json
{
  "maxFlow": 10,
  "steps": [
    {
      "iteration":  1,
      "path":       ["S", "A", "T"],
      "bottleneck": 10,
      "edges":      [...],
      "residualEdges": [...],
      "message":    "Итерация 1: путь [S → A → T], узкое место Δ = 10, суммарный поток = 10"
    }
  ],
  "minCutSrc": ["S"]
}
```

## Ключевые архитектурные решения

| Принцип | Реализация |
|---|---|
| **SRP** | `EdmondsKarp`, `SolverHandler`, `UIController` — одна ответственность |
| **OCP** | Новый алгоритм подключается реализацией `port.MaxFlowSolver` |
| **DIP** | `SolverHandler` зависит от интерфейса, а не от `EdmondsKarp` |
| **Graceful Shutdown** | `app.go`: SIGTERM → `server.Shutdown(ctx)` с таймаутом 5s |
| **Context** | `Solve(ctx, ...)` прерывается по `ctx.Done()` |
| **Валидация** | `dto.SolveRequest.Validate()` до вызова usecase |
| **Structured Logging** | `log/slog` — стандартная библиотека Go 1.21+ |
