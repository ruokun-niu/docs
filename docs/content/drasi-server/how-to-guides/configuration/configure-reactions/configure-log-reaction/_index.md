---
type: "docs"
title: "Configure Log Reaction"
linkTitle: "Log"
weight: 30
description: "Output query results to console with customizable templates"
related:
  concepts:
    - title: "Reactions"
      url: "/concepts/reactions/"
  howto:
    - title: "Configure HTTP Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-http-reaction/"
    - title: "Configure SSE Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The Log {{< term "Reaction" >}} outputs query {{< term "Result Change Event" "result changes" >}} to stdout. It's useful for development, debugging, and simple monitoring scenarios.

## Basic Configuration

```yaml
reactions:
  - kind: log
    id: console-output
    queries: [my-query]
    autoStart: true
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kind` | string | Required | Must be `log` |
| `id` | string | Required | Unique reaction identifier |
| `queries` | array | Required | Query IDs to subscribe to |
| `autoStart` | boolean | `true` | Start reaction automatically |
| `routes` | object | `{}` | Per-query template configurations (`{ <queryId>: { added/updated/deleted } }`) |
| `defaultTemplate` | object | None | Default template for all queries |

## Default Output

Without custom templates, changes are logged as JSON:

```
[console-output] Query 'my-query' (1 items):
[console-output]   [ADD] {"id":"123","name":"Test","value":42}
[console-output]   [UPDATE] {"id":"123","name":"Test","value":42} -> {"id":"123","name":"Test","value":50}
[console-output]   [DELETE] {"id":"123","name":"Test","value":50}
```

## Custom Templates

Use Handlebars templates for custom output formatting.

### Default Template

Apply to all queries:

```yaml
reactions:
  - kind: log
    id: formatted-log
    queries: [my-query]
    defaultTemplate:
      added:
        template: "[NEW] {{after.id}}: {{after.name}} = {{after.value}}"
      updated:
        template: "[UPDATE] {{after.id}}: {{before.value}} -> {{after.value}}"
      deleted:
        template: "[DELETED] {{before.id}}"
```

### Per-Query Templates

Configure templates for specific queries:

```yaml
reactions:
  - kind: log
    id: multi-query-log
    queries: [orders, inventory]
    routes:
      orders:
        added:
          template: "New order #{{after.id}} for ${{after.total}}"
        updated:
          template: "Order #{{after.id}} status: {{before.status}} -> {{after.status}}"
        deleted:
          template: "Order #{{before.id}} cancelled"
      inventory:
        added:
          template: "New product: {{after.name}} ({{after.sku}})"
        updated:
          template: "Stock update: {{after.sku}} now has {{after.quantity}} units"
```

## Template Data

### Available Variables

| Variable | Description | Available In |
|----------|-------------|--------------|
| `{{after}}` | New/current state | `added`, `updated` |
| `{{before}}` | Previous state | `updated`, `deleted` |
| `{{data}}` | Raw result data (when present) | `updated` |
| `{{query_name}}` | Query name that produced the result | all |
| `{{operation}}` | `ADD`, `UPDATE`, or `DELETE` | all |
| `{{after.property}}` | Access a specific property | `added`, `updated` |
| `{{before.property}}` | Access previous property | `updated`, `deleted` |

### JSON Helper

Output entire object as JSON:

```yaml
defaultTemplate:
  added:
    template: "New item: {{json after}}"
```

## Examples

### Simple Debug Logging

```yaml
reactions:
  - kind: log
    id: debug
    queries: [my-query]
```

### Formatted Alert Logging

```yaml
reactions:
  - kind: log
    id: alerts
    queries: [high-priority-alerts]
    defaultTemplate:
      added:
        template: |
          ALERT: {{after.type}}
          ID: {{after.id}}
          Message: {{after.message}}
          Severity: {{after.severity}}
```

### Multi-Query Logging

```yaml
reactions:
  - kind: log
    id: audit-log
    queries: [user-changes, order-changes, inventory-changes]
    routes:
      user-changes:
        added:
          template: "[AUDIT] User created: {{after.email}}"
        updated:
          template: "[AUDIT] User updated: {{after.email}}"
        deleted:
          template: "[AUDIT] User deleted: {{before.email}}"
      order-changes:
        added:
          template: "[AUDIT] Order created: #{{after.id}} (${{after.total}})"
        updated:
          template: "[AUDIT] Order #{{after.id}} status: {{after.status}}"
      inventory-changes:
        updated:
          template: "[AUDIT] Stock change: {{after.sku}} qty={{after.quantity}}"
```

### JSON Output for Processing

```yaml
reactions:
  - kind: log
    id: json-log
    queries: [events]
    defaultTemplate:
      added:
        template: '{"event":"added","data":{{json after}}}'
      updated:
        template: '{"event":"updated","before":{{json before}},"after":{{json after}}}'
      deleted:
        template: '{"event":"deleted","data":{{json before}}}'
```

## Example with per-query templates

This is a reaction-only excerpt (you would include it under your `reactions:` list):

```yaml
reactions:
  - kind: log
    id: sensor-log
    queries: [all-sensors, hot-sensors]
    routes:
      all-sensors:
        added:
          template: "Sensor {{after.id}}: temp={{after.temperature}}°F, humidity={{after.humidity}}%"
        updated:
          template: "Sensor {{after.id}} update: temp={{after.temperature}}°F"
      hot-sensors:
        added:
          template: "HIGH TEMP ALERT: Sensor {{after.id}} at {{after.temperature}}°F"
```

## Viewing Logs

### Docker

```bash
docker logs -f drasi-server
```

### Direct Execution

Logs appear in stdout when running directly:

```bash
./drasi-server --config config/server.yaml
```

### Log Level

Set log level to see more detail:

```yaml
logLevel: debug
```

Or via environment:

```bash
RUST_LOG=debug ./drasi-server --config config/server.yaml
```

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/reactions/log/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Log Reaction README</h3>
        <p class="unified-card-summary">Templates, variables, and plugin behavior</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-reaction-log" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-reaction-log on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>


## Next steps

- [Configure HTTP Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-http-reaction/)
- [Configure gRPC Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-grpc-reaction/)
- [Configure SSE Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/)
