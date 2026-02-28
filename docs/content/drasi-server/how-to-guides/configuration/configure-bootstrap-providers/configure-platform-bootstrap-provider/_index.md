---
type: "docs"
title: "Configure Platform Bootstrap Provider"
linkTitle: "Platform"
weight: 30
description: "Bootstrap queries from a remote Drasi Query API"
toc_hide: true
related:
  howto:
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
    - title: "Configure Sources"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/"
---

The **Platform bootstrap provider** bootstraps initial state by streaming elements from a **remote Drasi Query API** over HTTP.

## When to use Platform bootstrap

- You want to bootstrap one Drasi Server instance from another environment.
- You’re building a federated / multi-environment setup where initial state lives elsewhere.

## Prerequisites

- Network access from Drasi Server to the remote Query API.
- The remote Query API must expose a `/subscription` endpoint that streams JSON-NL.

## Quick example (Drasi Server config)

```yaml
sources:
  - kind: http
    id: webhook
    autoStart: true
    host: 0.0.0.0
    port: 9000

    bootstrapProvider:
      kind: platform
      queryApiUrl: http://remote-drasi:8080
      timeoutSeconds: 600
```

## Configuration reference

| Field | Type | Required | Description |
|---|---|---:|---|
| `kind` | string | Yes | Must be `platform` |
| `queryApiUrl` | string | Yes | Base URL of the remote Query API service |
| `timeoutSeconds` | integer | No | Request timeout in seconds (default: 300) |

## Troubleshooting

- If bootstrap stalls or times out, increase `timeoutSeconds` and verify the remote endpoint can stream for large datasets.

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/bootstrappers/platform/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Platform Bootstrap README</h3>
        <p class="unified-card-summary">Protocol details and element schema (JSON-NL)</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-bootstrap-platform" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-bootstrap-platform on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
