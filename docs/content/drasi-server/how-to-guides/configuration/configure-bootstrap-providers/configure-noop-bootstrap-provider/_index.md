---
type: "docs"
title: "Configure NoOp Bootstrap Provider"
linkTitle: "NoOp"
weight: 20
description: "Disable bootstrap and only process new events"
related:
  howto:
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
---

The **NoOp bootstrap provider** returns no initial data. Queries start “empty” and only process streaming changes.

## When to use NoOp bootstrap

- Event-only sources where historical state is not needed.
- You explicitly want to ignore existing data and only react to new changes.
- Testing streaming behavior without bootstrap overhead.

## Quick example (Drasi Server config)

```yaml
sources:
  - kind: http
    id: webhook
    autoStart: true
    host: 0.0.0.0
    port: 9000

    bootstrapProvider:
      kind: noop
```

## Configuration reference

`noop` accepts **no additional fields**.

| Field | Type | Required | Description |
|---|---|---:|---|
| `kind` | string | Yes | Must be `noop` |

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/bootstrappers/noop/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">NoOp Bootstrap README</h3>
        <p class="unified-card-summary">Behavior notes and examples</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-bootstrap-noop" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-bootstrap-noop on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
