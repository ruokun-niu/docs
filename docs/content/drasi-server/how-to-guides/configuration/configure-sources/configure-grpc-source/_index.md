---
type: "docs"
title: "Configure gRPC Source"
linkTitle: "gRPC"
weight: 10
description: "Receive change events via gRPC"
related:
  concepts:
    - title: "Sources"
      url: "/concepts/sources/"
  howto:
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
    - title: "Configure gRPC Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-grpc-reaction/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The gRPC {{< term "Source" >}} exposes a gRPC server endpoint that external applications can use to **push change events** (insert/update/delete) into {{< term "Drasi Server" >}}.

It’s a good fit when you already have gRPC in your stack and want a **typed, high-throughput** ingestion path.

## When to use the gRPC source

- Ingest high-volume change events from services that already communicate over gRPC.
- Stream telemetry / IoT readings into Drasi with low per-event overhead.
- Feed Drasi from a CDC pipeline that can emit protobuf messages.
- Build a language-agnostic integration using generated gRPC client stubs.

## Prerequisites

- Your producer application can connect to the gRPC endpoint (`host:port`) over the network.
- A gRPC client implementation for your language (generated from the protobuf schema).

{{< alert title="Plaintext gRPC" color="warning" >}}
The current gRPC source implementation in Drasi Core does not expose server-side TLS configuration. Plan to run it on a trusted network or behind a TLS-terminating proxy.
{{< /alert >}}

## Quick example (Drasi Server config)

Drasi Server source configuration uses **camelCase** keys.

```yaml
sources:
  - kind: grpc
    id: grpc-events
    autoStart: true

    host: 0.0.0.0
    port: 50051

    # Optional
    endpoint: null
    timeoutMs: 5000
```

If you run Drasi Server in Docker, remember to publish the gRPC port:

```yaml
# docker-compose.yml (snippet)
services:
  drasi-server:
    image: ghcr.io/drasi-project/drasi-server:latest
    ports:
      - "8080:8080"     # Drasi Server REST API
      - "50051:50051"   # gRPC source
```

## Connecting and sending events

The gRPC source implements the `drasi.v1.SourceService` service from the Drasi Core gRPC source plugin.

### Service methods

- `SubmitEvent` (unary): submit a single change event.
- `StreamEvents` (streaming): stream many change events; the server periodically replies with progress.
- `HealthCheck` (unary): basic health status.
- `RequestBootstrap` (server streaming): currently returns an empty stream (placeholder).

### Event schema (protobuf)

Change events are represented by `drasi.v1.SourceChange`.

- For **insert/update** operations, send an `Element` (either a `Node` or `Relation`).
- For **delete** operations, send `ElementMetadata` (so Drasi can identify what to remove).

Key types (simplified):

```protobuf
// drasi/v1/common.proto
message SourceChange {
  ChangeType type = 1;                 // INSERT, UPDATE, DELETE
  oneof change {
    Element element = 2;               // insert/update
    ElementMetadata metadata = 3;      // delete
  }
  google.protobuf.Timestamp timestamp = 4;
  string source_id = 5;
}

message ElementMetadata {
  ElementReference reference = 1;
  repeated string labels = 2;
  uint64 effective_from = 3;           // nanoseconds since Unix epoch
}

message ElementReference {
  string source_id = 1;
  string element_id = 2;
}
```

{{< alert title="Timestamps" color="info" >}}
`effective_from` is **nanoseconds**. The gRPC source converts it to milliseconds internally.
{{< /alert >}}

### Quick smoke test with grpcurl

List services:

```bash
grpcurl -plaintext localhost:50051 list
```

Health check:

```bash
grpcurl -plaintext localhost:50051 drasi.v1.SourceService/HealthCheck
```

For complete client examples (Python/Go) and full request payloads, see the plugin README linked below.

## Configuration reference (Drasi Server)

| Field | Type | Default | Description |
|---|---:|---:|---|
| `kind` | string | required | Must be `grpc`. |
| `id` | string | required | Unique source identifier. |
| `autoStart` | boolean | `true` | Whether Drasi Server starts the source on startup. |
| `host` | string | `0.0.0.0` | Address to bind the gRPC server to. |
| `port` | integer | `50051` | Port to listen on. |
| `endpoint` | string | none | Reserved for future use. (Currently not used to change routing.) |
| `timeoutMs` | integer | `5000` | Reserved for future use. (Currently not enforced by the plugin implementation.) |
| `bootstrapProvider` | object | none | Optional bootstrap provider to preload initial state. See [Configure Bootstrap Providers](/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/). |

## Performance tuning notes

- Prefer `StreamEvents` for high-throughput ingestion; it avoids per-RPC overhead.
- Reuse a single gRPC channel from your producer instead of reconnecting per event.
- If you need isolation by producer, run multiple gRPC sources on different ports (distinct `id`s).

## Troubleshooting

**Connection refused**
- Ensure the source is started (`autoStart: true` or started via the server API).
- Verify Docker port publishing and firewall rules.

**HealthCheck fails**
- Confirm you are using `-plaintext` (no TLS) when testing with `grpcurl`.

**“Invalid event data” responses**
- Ensure you are sending `SourceChange` with the correct `type` and matching `change` field.
- For delete operations, include `metadata.reference.element_id` and `metadata.labels`.

## Known limitations

- No server-side TLS configuration (plaintext gRPC).
- `RequestBootstrap` currently returns an empty stream.
- `endpoint` and `timeoutMs` are accepted by Drasi Server configuration but are currently not enforced/used by the plugin implementation.

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/sources/grpc/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">gRPC Source README</h3>
        <p class="unified-card-summary">Protocol details, full protobuf schema, and client examples</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-source-grpc" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-source-grpc on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
