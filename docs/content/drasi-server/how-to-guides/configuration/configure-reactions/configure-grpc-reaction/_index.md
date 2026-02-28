---
type: "docs"
title: "Configure gRPC Reaction"
linkTitle: "gRPC"
weight: 10
description: "Stream query results via gRPC"
related:
  concepts:
    - title: "Reactions"
      url: "/concepts/reactions/"
  howto:
    - title: "Configure gRPC Source"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/configure-grpc-source/"
    - title: "Configure HTTP Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-http-reaction/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The gRPC {{< term "Reaction" >}} streams query {{< term "Result Change Event" "result changes" >}} to gRPC clients. It's ideal for high-performance, low-latency applications that need real-time updates.

## Basic Configuration

```yaml
reactions:
  - kind: grpc
    id: grpc-stream
    queries: [my-query]
    endpoint: grpc://localhost:50052
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kind` | string | Required | Must be `grpc` |
| `id` | string | Required | Unique reaction identifier |
| `queries` | array | Required | Query IDs to subscribe to |
| `autoStart` | boolean | `true` | Start reaction automatically |
| `endpoint` | string | `grpc://localhost:50052` | gRPC server endpoint |
| `timeoutMs` | integer | `5000` | Request timeout in milliseconds |
| `batchSize` | integer | `100` | Items per batch |
| `batchFlushTimeoutMs` | integer | `1000` | Flush timeout for partial batches |
| `maxRetries` | integer | `3` | Maximum retry attempts |
| `connectionRetryAttempts` | integer | `5` | Connection retry attempts |
| `initialConnectionTimeoutMs` | integer | `10000` | Initial connection timeout |
| `metadata` | object | `{}` | gRPC metadata headers |

## Batching Configuration

Batch events for improved throughput:

```yaml
reactions:
  - kind: grpc
    id: batched-stream
    queries: [high-volume-query]
    endpoint: grpc://processor:50052
    batchSize: 500
    batchFlushTimeoutMs: 2000
```

| Setting | Low Latency | High Throughput |
|---------|-------------|-----------------|
| `batchSize` | 1-10 | 100-1000 |
| `batchFlushTimeoutMs` | 100-500 | 1000-5000 |

## Retry Configuration

Handle connection failures gracefully:

```yaml
reactions:
  - kind: grpc
    id: reliable-stream
    queries: [critical-events]
    endpoint: grpc://processor:50052
    maxRetries: 5
    connectionRetryAttempts: 10
    initialConnectionTimeoutMs: 30000
```

## Metadata Headers

Add custom metadata to gRPC calls:

```yaml
reactions:
  - kind: grpc
    id: authenticated-stream
    queries: [events]
    endpoint: grpc://processor:50052
    metadata:
      authorization: Bearer ${API_TOKEN}
      x-client-id: drasi-server
      x-environment: production
```

## Protocol Definition

The gRPC reaction sends results to a service implementing `drasi.v1.ReactionService` (see `reaction.proto` in the plugin repo):

```protobuf
syntax = "proto3";

package drasi.v1;

service ReactionService {
  rpc ProcessResults(ProcessResultsRequest) returns (ProcessResultsResponse);
  rpc StreamResults(stream QueryResult) returns (stream StreamResultsResponse);
  rpc Subscribe(SubscribeRequest) returns (stream QueryResult);
  rpc HealthCheck(google.protobuf.Empty) returns (ReactionHealthCheckResponse);
}
```

## Use Cases

### Real-Time Processing

Stream events to a processing service:

```yaml
reactions:
  - kind: grpc
    id: event-processor
    queries: [transactions, alerts]
    endpoint: grpc://processor.service:50052
    batchSize: 100
    timeoutMs: 5000
```

### Microservice Integration

Connect to downstream microservices:

```yaml
reactions:
  - kind: grpc
    id: order-service
    queries: [new-orders]
    endpoint: grpc://order-service:50052
    metadata:
      x-service-name: drasi-server

  - kind: grpc
    id: inventory-service
    queries: [stock-changes]
    endpoint: grpc://inventory-service:50052
```

### Cross-Datacenter Streaming

Stream to remote datacenters:

```yaml
reactions:
  - kind: grpc
    id: remote-dc
    queries: [replicated-events]
    endpoint: grpc://remote-dc.example.com:50052
    timeoutMs: 30000
    connectionRetryAttempts: 10
    metadata:
      x-datacenter: us-west
```

## Docker Compose Example

```yaml
version: '3.8'

services:
  drasi-server:
    image: ghcr.io/drasi-project/drasi-server:latest
    ports:
      - "8080:8080"
    volumes:
      - ./config:/config:ro
    depends_on:
      - event-processor

  event-processor:
    image: your-grpc-processor:latest
    ports:
      - "50052:50052"
```

Configuration:

```yaml
reactions:
  - kind: grpc
    id: processor-stream
    queries: [events]
    endpoint: grpc://event-processor:50052
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
  - kind: grpc
    id: order-processor
    queries: [order-events]
    endpoint: ${GRPC_ENDPOINT:-grpc://localhost:50052}
    timeoutMs: 10000
    batchSize: 50
    batchFlushTimeoutMs: 1000
    maxRetries: 5
    metadata:
      authorization: Bearer ${API_TOKEN}
```

## Performance tuning

### Low latency

```yaml
reactions:
  - kind: grpc
    id: low-latency
    queries: [events]
    endpoint: grpc://processor:50052
    batchSize: 1
    batchFlushTimeoutMs: 50
    timeoutMs: 1000
```

### Higher throughput

```yaml
reactions:
  - kind: grpc
    id: high-throughput
    queries: [events]
    endpoint: grpc://processor:50052
    batchSize: 500
    batchFlushTimeoutMs: 2000
```

## Troubleshooting

### Connection Timeout

- Increase `initialConnectionTimeoutMs`
- Verify endpoint is reachable
- Check firewall rules

### Frequent Disconnects

- Increase `connectionRetryAttempts`
- Check network stability
- Monitor processor service health

### High Latency

- Reduce `batchSize`
- Reduce `batchFlushTimeoutMs`
- Check network latency

### Message Backlog

- Increase `batchSize`
- Scale the receiving service

## gRPC vs HTTP

| Aspect | gRPC | HTTP |
|--------|------|------|
| **Performance** | Higher throughput | Lower throughput |
| **Latency** | Lower | Higher |
| **Protocol** | HTTP/2 | HTTP/1.1 |
| **Streaming** | Native bidirectional | One-way |
| **Integration** | Requires gRPC service | Standard webhooks |
| **Best for** | High-volume, real-time | API integrations |

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/reactions/grpc/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">gRPC Reaction README</h3>
        <p class="unified-card-summary">Protocol, proto files, and plugin behavior</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-reaction-grpc" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-reaction-grpc on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>

## Next steps

- [Configure HTTP Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-http-reaction/)
- [Configure SSE Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/)
