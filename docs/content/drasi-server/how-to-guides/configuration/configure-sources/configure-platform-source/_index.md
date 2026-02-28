---
type: "docs"
title: "Configure Platform Source"
linkTitle: "Platform"
weight: 40
description: "Consume CloudEvent-wrapped change events from Redis Streams"
toc_hide: true
related:
  concepts:
    - title: "Sources"
      url: "/concepts/sources/"
  howto:
    - title: "Configure Platform Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-platform-reaction/"
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The Platform {{< term "Source" >}} consumes **CloudEvent-wrapped** change events from a **Redis Stream** and converts them into Drasi graph changes.

## When to use the Platform source

- Connect Drasi Server to a Drasi Platform / Kubernetes environment that publishes changes to Redis Streams.
- Consume change events from a shared Redis-backed event bus.
- Scale ingestion horizontally using Redis **consumer groups**.

## Prerequisites

- Redis **5.0+** (Streams + consumer groups).
- A publisher that writes CloudEvent JSON into the stream (see [Event format](#event-format)).

## How it connects

This source **connects outbound** from Drasi Server to Redis; it does not open an inbound port.

## Quick example (Drasi Server config)

Drasi Server source configuration uses **camelCase** keys.

```yaml
sources:
  - kind: platform
    id: platform-events
    autoStart: true

    redisUrl: ${REDIS_URL:-redis://localhost:6379}
    streamKey: drasi-events

    # Optional
    consumerGroup: drasi-core
    consumerName: ${HOSTNAME}
    batchSize: 100
    blockMs: 5000
```

## Configuration reference (Drasi Server)

| Field | Type | Default | Description |
|---|---:|---:|---|
| `kind` | string | required | Must be `platform`. |
| `id` | string | required | Unique source identifier. |
| `autoStart` | boolean | `true` | Whether Drasi Server starts the source on startup. |
| `bootstrapProvider` | object | none | Optional bootstrap provider for initial state. For platform bootstrap use `{ kind: platform, queryApiUrl?, timeoutSeconds? }`. |
| `redisUrl` | string | required | Redis connection URL (for example `redis://host:6379`). |
| `streamKey` | string | required | Redis stream key to consume events from. |
| `consumerGroup` | string | `drasi-core` | Consumer group name. |
| `consumerName` | string | auto | Consumer name within the group (should be unique). |
| `batchSize` | integer | `100` | Max events to read per Redis `XREADGROUP` call. |
| `blockMs` | integer | `5000` | Milliseconds to block waiting for new events. |

Fields support Drasi Server config references like `${ENV_VAR}` / `${ENV_VAR:-default}`.

## Event format

The Platform source expects a **CloudEvent JSON object** whose `data` field is an array of change events.

### CloudEvent wrapper (minimal)

```json
{
  "specversion": "1.0",
  "type": "drasi.change",
  "source": "my-producer",
  "id": "event-123",
  "time": "2025-01-01T00:00:00Z",
  "datacontenttype": "application/json",
  "data": [
    {
      "op": "i",
      "payload": {
        "after": {
          "id": "user-123",
          "labels": ["User"],
          "properties": {"name": "Alice"}
        },
        "source": {"db": "myapp", "table": "node", "ts_ns": 1704067200000000000}
      }
    }
  ]
}
```

### Change events (`data[]`)

Each `data[]` entry has:

- `op`: operation (`"i"` = insert, `"u"` = update, `"d"` = delete)
- `payload.after` for `i`/`u`, `payload.before` for `d`
- `payload.source.table`: element type (`"node"` or `"rel"`/`"relation"`)
- `payload.source.ts_ns`: timestamp in **nanoseconds** (required)

Drasi converts `ts_ns` to element `effectiveFrom` in **milliseconds**: `effectiveFrom = ts_ns / 1_000_000`.

### Relation example

```json
{
  "op": "i",
  "payload": {
    "after": {
      "id": "follows-1",
      "labels": ["FOLLOWS"],
      "startId": "user-123",
      "endId": "user-456",
      "properties": {"since": "2024-01-01"}
    },
    "source": {"db": "myapp", "table": "rel", "ts_ns": 1704067200000000000}
  }
}
```

### Publishing to Redis Streams

Write the CloudEvent JSON as a **string** in a stream entry field named `data` (preferred). The source also checks `event`, `payload`, and `message`.

```bash
redis-cli XADD drasi-events '*' data '{"specversion":"1.0","data":[{"op":"i","payload":{"after":{"id":"user-1","labels":["User"],"properties":{"name":"Alice"}},"source":{"db":"myapp","table":"node","ts_ns":1704067200000000000}}}]}'
```

## Performance tuning notes

- Increase `batchSize` for higher throughput.
- Decrease `blockMs` for lower-latency shutdown and quicker detection of new events (at the cost of more Redis calls).
- Run multiple Drasi Server instances with the same `consumerGroup` (and unique `consumerName`) to scale consumption.

## Troubleshooting

**No events are being processed**
- Confirm you are writing a CloudEvent JSON object (must include a `data` array).
- Ensure your stream entry field is `data` (or `event` / `payload` / `message`).
- Verify `payload.source.ts_ns` is present and is an integer (nanoseconds).

## Known limitations

- The source rejects messages that do not match the expected CloudEvent + `data[]` shape.
- Control messages are identified by `payload.source.db = "Drasi"` (case-insensitive); only `payload.source.table = "SourceSubscription"` is handled.

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/sources/platform/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Platform Source README</h3>
        <p class="unified-card-summary">Implementation notes, Redis behavior, and full schema details</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-source-platform" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-source-platform on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
