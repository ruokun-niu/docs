---
type: "docs"
title: "Configure Platform Reaction"
linkTitle: "Platform"
weight: 40
description: "Publish query results to Redis Streams"
toc_hide: true
related:
  concepts:
    - title: "Reactions"
      url: "/concepts/reactions/"
  howto:
    - title: "Configure Platform Source"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/configure-platform-source/"
    - title: "Configure SSE Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The Platform {{< term "Reaction" >}} publishes query {{< term "Result Change Event" "result changes" >}} to Redis Streams in CloudEvent format. It enables integration with {{< term "Drasi for Kubernetes" >}} or any system that consumes from Redis Streams.

## Basic Configuration

```yaml
reactions:
  - kind: platform
    id: redis-publisher
    queries: [my-query]
    redisUrl: redis://localhost:6379
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kind` | string | Required | Must be `platform` |
| `id` | string | Required | Unique reaction identifier |
| `queries` | array | Required | Query IDs to subscribe to |
| `autoStart` | boolean | `true` | Start reaction automatically |
| `redisUrl` | string | Required | Redis connection URL |
| `pubsubName` | string | Optional | Pub/sub name used in CloudEvent metadata |
| `sourceName` | string | Optional | Source name used in CloudEvent metadata |
| `maxStreamLength` | integer | None | Maximum stream length (enables trimming) |
| `emitControlEvents` | boolean | `false` | Emit control events |
| `batchEnabled` | boolean | `false` | Enable batching |
| `batchMaxSize` | integer | `100` | Maximum batch size |
| `batchMaxWaitMs` | integer | `100` | Maximum wait time for batch |

## Redis Connection URL

```yaml
# Local Redis
redisUrl: redis://localhost:6379

# With password
redisUrl: redis://:password@localhost:6379

# With username and password
redisUrl: redis://user:password@localhost:6379

# With database selection
redisUrl: redis://localhost:6379/1

# TLS connection
redisUrl: rediss://localhost:6379
```

## Event Format

Each Redis Streams entry contains a single field named `data` with a JSON-encoded Dapr CloudEvent envelope.

```json
{
  "data": {
    "kind": "change",
    "queryId": "my-query",
    "sequence": 42,
    "sourceTimeMs": 1705318245123,
    "addedResults": [{"id":"123","name":"Test"}],
    "updatedResults": [{"before":{"id":"123","name":"Old"},"after":{"id":"123","name":"New"}}],
    "deletedResults": []
  },
  "datacontenttype": "application/json",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "pubsubname": "drasi-pubsub",
  "source": "drasi-core",
  "specversion": "1.0",
  "time": "2025-01-15T10:30:45.123Z",
  "topic": "my-query-results",
  "type": "com.dapr.event.sent"
}
```

If `pubsubName` or `sourceName` are set, they appear as `pubsubname` and `source` in the CloudEvent envelope.

When `emitControlEvents` is enabled, control events use the same envelope with `data.kind: "control"` and a `controlSignal`.

## Batching Configuration

For high-throughput scenarios, enable batching:

```yaml
reactions:
  - kind: platform
    id: batched-publisher
    queries: [high-volume-events]
    redisUrl: redis://localhost:6379
    batchEnabled: true
    batchMaxSize: 500
    batchMaxWaitMs: 200
```

| Setting | Low Latency | High Throughput |
|---------|-------------|-----------------|
| `batchEnabled` | `false` | `true` |
| `batchMaxSize` | 1-10 | 100-1000 |
| `batchMaxWaitMs` | 10-50 | 100-500 |

## Stream Length Management

Prevent unbounded stream growth:

```yaml
reactions:
  - kind: platform
    id: bounded-stream
    queries: [events]
    redisUrl: redis://localhost:6379
    maxStreamLength: 100000
```

When the stream exceeds `maxStreamLength`, older entries are automatically trimmed.

## Control Events

Emit control events for stream lifecycle:

```yaml
reactions:
  - kind: platform
    id: with-control
    queries: [events]
    redisUrl: redis://localhost:6379
    emitControlEvents: true
```

Control events include:
- Stream initialization
- Query status changes
- Error notifications

## Stream Key Naming

By default, streams use the CloudEvent `topic` format `{queryId}-results`. This is independent of `pubsubName` (which only affects CloudEvent metadata).

```yaml
reactions:
  - kind: platform
    id: custom-metadata
    queries: [orders]
    redisUrl: redis://localhost:6379
    pubsubName: order-events  # metadata only
    sourceName: ecommerce-system
```

Events published to stream key: `orders-results`

## Use Cases

### Drasi Platform Integration

Connect Drasi Server to the Drasi Platform:

```yaml
reactions:
  - kind: platform
    id: platform-connector
    queries: [all-events]
    redisUrl: ${PLATFORM_REDIS_URL}
```

### Event Bus

Use Redis Streams as an event bus:

```yaml
reactions:
  - kind: platform
    id: event-bus
    queries: [orders, inventory, customers]
    redisUrl: redis://redis:6379
    batchEnabled: true
    batchMaxSize: 100
```

### Cross-Service Communication

Publish events for other services to consume:

```yaml
reactions:
  - kind: platform
    id: service-events
    queries: [order-created, order-updated]
    redisUrl: redis://redis:6379
    pubsubName: order-service-events
    maxStreamLength: 50000
```

### Data Replication

Replicate data changes to other systems:

```yaml
reactions:
  - kind: platform
    id: replication
    queries: [all-changes]
    redisUrl: redis://replica-redis:6379
    batchEnabled: true
    batchMaxSize: 500
    batchMaxWaitMs: 100
```

## Consuming Events

### Using redis-cli

```bash
# Read from stream
redis-cli XREAD STREAMS my-query-results 0

# Read new events (blocking)
redis-cli XREAD BLOCK 0 STREAMS my-query-results $

# Consumer group
redis-cli XREADGROUP GROUP my-group consumer-1 STREAMS my-query-results >
```

### Python Consumer

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379)

# Create consumer group
try:
    r.xgroup_create('my-query-results', 'my-group', id='0', mkstream=True)
except redis.exceptions.ResponseError:
    pass  # Group already exists

while True:
    events = r.xreadgroup('my-group', 'consumer-1', {'my-query-results': '>'}, block=5000)
    for stream, messages in events:
        for message_id, data in messages:
            event = json.loads(data[b'data'])
            print(f"Received: {event}")
            r.xack('my-query-results', 'my-group', message_id)
```

### Node.js Consumer

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function consume() {
  // Create consumer group
  try {
    await redis.xgroup('CREATE', 'my-query-results', 'my-group', '0', 'MKSTREAM');
  } catch (e) {
    // Group exists
  }

  while (true) {
    const result = await redis.xreadgroup(
      'GROUP', 'my-group', 'consumer-1',
      'BLOCK', 5000,
      'STREAMS', 'my-query-results', '>'
    );

    if (result) {
      for (const [stream, messages] of result) {
        for (const [id, fields] of messages) {
          const event = JSON.parse(fields[1]);
          console.log('Received:', event);
          await redis.xack('my-query-results', 'my-group', id);
        }
      }
    }
  }
}

consume();
```

## Docker Compose Setup

```yaml
version: '3.8'

services:
  drasi-server:
    image: ghcr.io/drasi-project/drasi-server:latest
    ports:
      - "8080:8080"
    environment:
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./config:/config:ro
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

## Complete Example

```yaml
host: 0.0.0.0
port: 8080
logLevel: info

sources:
  - kind: postgres
    id: orders-db
    host: ${DB_HOST}
    database: ecommerce
    user: ${DB_USER}
    password: ${DB_PASSWORD}
    tables:
      - public.orders

queries:
  - id: order-events
    query: "MATCH (o:orders) RETURN o.id, o.status, o.total"
    sources:
      - sourceId: orders-db

reactions:
  - kind: platform
    id: order-stream
    queries: [order-events]
    redisUrl: ${REDIS_URL:-redis://localhost:6379}
    pubsubName: ecommerce-orders
    sourceName: order-service
    maxStreamLength: 100000
    batchEnabled: true
    batchMaxSize: 100
    batchMaxWaitMs: 100
```

## Monitoring

### Stream Info

```bash
redis-cli XINFO STREAM my-query-results
```

### Stream Length

```bash
redis-cli XLEN my-query-results
```

### Consumer Groups

```bash
redis-cli XINFO GROUPS my-query-results
```

### Pending Messages

```bash
redis-cli XPENDING my-query-results my-group
```

## Troubleshooting

### Connection Errors

- Verify Redis is running and accessible
- Check connection URL format
- Verify network connectivity

### Memory Issues

- Set `maxStreamLength` to limit growth
- Monitor Redis memory usage
- Configure Redis maxmemory policies

### Message Backlog

- Scale consumers
- Enable batching
- Increase consumer throughput

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/reactions/platform/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Platform Reaction README</h3>
        <p class="unified-card-summary">Redis Streams format and CloudEvent envelope</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-reaction-platform" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-reaction-platform on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>

## Next steps

- [Configure Platform Source](/drasi-server/how-to-guides/configuration/configure-sources/configure-platform-source/)
- [Configure SSE Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/)

