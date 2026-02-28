---
type: "docs"
title: "Configure HTTP Source"
linkTitle: "HTTP"
weight: 20
description: "Receive change events via HTTP"
related:
  concepts:
    - title: "Sources"
      url: "/concepts/sources/"
  howto:
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
    - title: "Configure Reactions"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The HTTP {{< term "Source" >}} exposes HTTP endpoints that external applications can use to **push change events** (insert/update/delete) into {{< term "Drasi Server" >}}.

Use it for webhooks, custom integrations, or any system that can make HTTP requests.

## When to use the HTTP source

- Accept change events from systems that can’t use gRPC (simple HTTP clients, webhooks).
- Build a lightweight ingestion endpoint for custom apps and scripts.
- Feed Drasi from an event bridge that transforms external events into Drasi’s change-event schema.

## Prerequisites

- Your producer can reach the HTTP endpoint (`host:port`).
- You can generate JSON payloads matching the event schema below.

{{< alert title="No built-in auth" color="warning" >}}
The HTTP source does not provide authentication/authorization. Run it on a trusted network or place it behind an API gateway / reverse proxy that enforces auth and TLS.
{{< /alert >}}

## Quick example (Drasi Server config)

Drasi Server source configuration uses **camelCase** keys.

```yaml
sources:
  - kind: http
    id: events-api
    autoStart: true

    host: 0.0.0.0
    port: 9000

    # Optional
    endpoint: null
    timeoutMs: 10000
```

If you run Drasi Server in Docker, remember to publish the HTTP source port:

```yaml
# docker-compose.yml (snippet)
services:
  drasi-server:
    image: ghcr.io/drasi-project/drasi-server:latest
    ports:
      - "8080:8080"   # Drasi Server REST API
      - "9000:9000"   # HTTP source
```

## Connecting and sending events

### Endpoints

The HTTP source exposes:

- `GET /health`
- `POST /sources/{sourceId}/events`
- `POST /sources/{sourceId}/events/batch`

`{sourceId}` must match the source `id` from your Drasi Server config (otherwise requests are rejected).

### Event schema

Events are JSON objects with a tagged-union `operation` field:

- `operation: "insert" | "update"` uses an `element` (a `node` or `relation`).
- `operation: "delete"` uses `id` (and optionally `labels`).

{{< alert title="Timestamps" color="info" >}}
If provided, `timestamp` is **nanoseconds** since Unix epoch. The HTTP source converts it to milliseconds internally.
If omitted, the source uses the current system time.
{{< /alert >}}

#### Insert/update: node

```json
{
  "operation": "insert",
  "element": {
    "type": "node",
    "id": "user-123",
    "labels": ["User"],
    "properties": {
      "email": "alice@example.com",
      "age": 30,
      "active": true
    }
  },
  "timestamp": 1738650000000000000
}
```

#### Insert/update: relation

```json
{
  "operation": "insert",
  "element": {
    "type": "relation",
    "id": "follows-1",
    "labels": ["FOLLOWS"],
    "from": "user-123",
    "to": "user-456",
    "properties": {
      "since": "2024-01-01"
    }
  }
}
```

Relationship direction semantics are:

`(from)-[relation]->(to)`

#### Delete

```json
{
  "operation": "delete",
  "id": "user-123",
  "labels": ["User"],
  "timestamp": 1738650001000000000
}
```

### curl examples

Single event:

```bash
curl -X POST http://localhost:9000/sources/events-api/events \
  -H 'Content-Type: application/json' \
  -d '{
    "operation":"insert",
    "element":{
      "type":"node",
      "id":"test-1",
      "labels":["Test"],
      "properties": {"message":"hello"}
    }
  }'
```

Batch:

```bash
curl -X POST http://localhost:9000/sources/events-api/events/batch \
  -H 'Content-Type: application/json' \
  -d '{
    "events": [
      {"operation":"insert","element":{"type":"node","id":"1","labels":["Test"],"properties":{}}},
      {"operation":"update","element":{"type":"node","id":"1","labels":["Test"],"properties":{"status":"updated"}}}
    ]
  }'
```

## Configuration reference (Drasi Server)

| Field | Type | Default | Description |
|---|---:|---:|---|
| `kind` | string | required | Must be `http`. |
| `id` | string | required | Unique source identifier. Used as `{sourceId}` in request URLs. |
| `autoStart` | boolean | `true` | Whether Drasi Server starts the source on startup. |
| `host` | string | required | Address to bind the HTTP server to. |
| `port` | integer | required | Port to listen on. |
| `endpoint` | string | none | Reserved for future use. (Currently not used to change routing.) |
| `timeoutMs` | integer | `10000` | Reserved for future use. (Currently not enforced by the plugin implementation.) |
| `adaptiveEnabled` | boolean | plugin default (`true`) | Enable/disable adaptive parameter adjustment. |
| `adaptiveMaxBatchSize` | integer | plugin default (`1000`) | Maximum events per batch. |
| `adaptiveMinBatchSize` | integer | plugin default (`10`) | Minimum batch size used by the adaptive batcher. |
| `adaptiveMaxWaitMs` | integer | plugin default (`100`) | Maximum time to wait before dispatching a batch. |
| `adaptiveMinWaitMs` | integer | plugin default (`1`) | Minimum wait time between batches (helps coalesce messages). |
| `adaptiveWindowSecs` | integer | plugin default (`5`) | Throughput measurement window. |
| `bootstrapProvider` | object | none | Optional bootstrap provider to preload initial state. See [Configure Bootstrap Providers](/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/). |

## Performance tuning notes

- Use the `/events/batch` endpoint when you can; it reduces HTTP overhead.
- For bursty workloads, increase `adaptiveMaxBatchSize` (note: internal buffering scales with this).
- For lower latency, reduce `adaptiveMaxWaitMs`.
- If you want stable behavior (no adaptive adjustment), set `adaptiveEnabled: false`.

## Troubleshooting

**Connection refused**
- Ensure the source is started (`autoStart: true` or started via the server API).
- Verify Docker port publishing and firewall rules.

**400 “Source name mismatch”**
- The `{sourceId}` path segment must match the configured `id`.

**Invalid event format**
- Ensure JSON is valid.
- Ensure `operation` is one of `insert`, `update`, `delete`.
- For insert/update, include `element.type`, `element.id`, and `element.labels`.
- For relations, include `from` and `to`.

## Known limitations

- No built-in auth/TLS; use a gateway/reverse-proxy if you need them.
- `endpoint` and `timeoutMs` are accepted by Drasi Server configuration but are currently not enforced/used by the plugin implementation.

## Producer Examples

### Python

```python
import requests
import json
from datetime import datetime

DRASI_URL = "http://localhost:9000"
SOURCE_ID = "events-api"

def send_event(operation, element=None, element_id=None, labels=None):
    """Send a change event to Drasi HTTP source."""
    url = f"{DRASI_URL}/sources/{SOURCE_ID}/events"
    
    if operation in ("insert", "update"):
        payload = {
            "operation": operation,
            "element": element
        }
    else:  # delete
        payload = {
            "operation": "delete",
            "id": element_id,
            "labels": labels or []
        }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()

# Insert a new user
send_event("insert", element={
    "type": "node",
    "id": "user-123",
    "labels": ["User"],
    "properties": {
        "name": "Alice",
        "email": "alice@example.com",
        "created_at": datetime.now().isoformat()
    }
})

# Update the user
send_event("update", element={
    "type": "node",
    "id": "user-123",
    "labels": ["User"],
    "properties": {
        "name": "Alice Smith",
        "email": "alice.smith@example.com"
    }
})

# Delete the user
send_event("delete", element_id="user-123", labels=["User"])
```

### Node.js

```javascript
const axios = require('axios');

const DRASI_URL = 'http://localhost:9000';
const SOURCE_ID = 'events-api';

async function sendEvent(event) {
  const url = `${DRASI_URL}/sources/${SOURCE_ID}/events`;
  const response = await axios.post(url, event);
  return response.data;
}

// Insert a node
await sendEvent({
  operation: 'insert',
  element: {
    type: 'node',
    id: 'order-456',
    labels: ['Order'],
    properties: {
      customer_id: 'user-123',
      total: 99.99,
      status: 'pending'
    }
  }
});

// Send batch of events
const batchUrl = `${DRASI_URL}/sources/${SOURCE_ID}/events/batch`;
await axios.post(batchUrl, {
  events: [
    { operation: 'insert', element: { type: 'node', id: 'item-1', labels: ['Item'], properties: { name: 'Widget' }}},
    { operation: 'insert', element: { type: 'node', id: 'item-2', labels: ['Item'], properties: { name: 'Gadget' }}}
  ]
});
```

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/sources/http/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">HTTP Source README</h3>
        <p class="unified-card-summary">Protocol details, JSON schema, and usage examples</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-source-http" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-source-http on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
