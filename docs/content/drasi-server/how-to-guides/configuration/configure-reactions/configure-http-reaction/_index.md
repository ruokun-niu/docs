---
type: "docs"
title: "Configure HTTP Reaction"
linkTitle: "HTTP"
weight: 20
description: "Send webhooks and HTTP requests when query results change"
related:
  concepts:
    - title: "Reactions"
      url: "/concepts/reactions/"
  howto:
    - title: "Configure gRPC Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-grpc-reaction/"
    - title: "Configure SSE Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The HTTP {{< term "Reaction" >}} sends HTTP requests when query {{< term "Result Change Event" "results change" >}}. Use it for webhooks, API integrations, and triggering external systems.

## Basic Configuration

```yaml
reactions:
  - kind: http
    id: webhook
    queries: [my-query]
    baseUrl: https://api.example.com
    routes:
      my-query:
        added:
          url: /events
          method: POST
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kind` | string | Required | Must be `http` |
| `id` | string | Required | Unique reaction identifier |
| `queries` | array | Required | Query IDs to subscribe to |
| `autoStart` | boolean | `true` | Start reaction automatically |
| `baseUrl` | string | `http://localhost` | Base URL for requests |
| `token` | string | None | Bearer token for authorization |
| `timeoutMs` | integer | `5000` | Request timeout in milliseconds |
| `routes` | object | `{}` | Per-query endpoint configurations |

## Route Configuration

Each query can have routes for different change types:

| Change Type | When Triggered | Data Available |
|-------------|----------------|----------------|
| `added` | New item in results | `{{after}}` |
| `updated` | Item changed | `{{before}}`, `{{after}}` |
| `deleted` | Item removed | `{{before}}` |

### Route Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Path to append to `baseUrl` (or an absolute `http(s)://...` URL) |
| `method` | string | Yes | HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) |
| `body` | string | No | Request body (supports templates). If empty, the plugin sends the raw JSON data for that change. |
| `headers` | object | No | Custom HTTP headers (values also support templates) |

## Handlebars Templates

URLs and bodies support Handlebars templating:

```yaml
routes:
  my-query:
    added:
      url: /orders/{{after.id}}
      method: POST
      body: |
        {
          "order_id": "{{after.id}}",
          "total": {{after.total}},
          "customer": "{{after.customer_name}}"
        }
```

### Template Variables

| Variable | Description |
|----------|-------------|
| `{{after}}` | Full after object |
| `{{after.property}}` | Specific property value |
| `{{before}}` | Full before object (update/delete) |
| `{{before.property}}` | Previous property value |
| `{{json after}}` | JSON-serialized object |

## Authentication

### Bearer Token

```yaml
reactions:
  - kind: http
    id: api-webhook
    queries: [events]
    baseUrl: https://api.example.com
    token: ${API_TOKEN}
```

Adds header: `Authorization: Bearer <token>`

### Custom Headers

```yaml
reactions:
  - kind: http
    id: custom-auth
    queries: [events]
    baseUrl: https://api.example.com
    routes:
      events:
        added:
          url: /webhook
          method: POST
          headers:
            X-API-Key: ${API_KEY}
            X-Custom-Header: custom-value
            Content-Type: application/json
```

## Examples

### Simple Webhook

```yaml
reactions:
  - kind: http
    id: simple-webhook
    queries: [orders]
    baseUrl: https://hooks.example.com
    routes:
      orders:
        added:
          url: /new-order
          method: POST
          body: '{{json after}}'
          headers:
            Content-Type: application/json
```

### GitHub Integration

Create GitHub issues on alerts:

```yaml
reactions:
  - kind: http
    id: github-issues
    queries: [critical-alerts]
    baseUrl: https://api.github.com
    token: ${GITHUB_TOKEN}
    routes:
      critical-alerts:
        added:
          url: /repos/{{after.repo}}/issues
          method: POST
          body: |
            {
              "title": "Alert: {{after.type}}",
              "body": "{{after.message}}\n\nSeverity: {{after.severity}}"
            }
          headers:
            Accept: application/vnd.github+json
            X-GitHub-Api-Version: "2022-11-28"
```

### Slack Notification

```yaml
reactions:
  - kind: http
    id: slack-alerts
    queries: [important-events]
    baseUrl: https://hooks.slack.com
    routes:
      important-events:
        added:
          url: /services/XXX/YYY/ZZZ
          method: POST
          body: |
            {
              "text": "New event: {{after.title}}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*{{after.title}}*\n{{after.description}}"
                  }
                }
              ]
            }
          headers:
            Content-Type: application/json
```

### RESTful API Updates

```yaml
reactions:
  - kind: http
    id: sync-api
    queries: [products]
    baseUrl: https://inventory.example.com/api
    token: ${API_TOKEN}
    timeoutMs: 10000
    routes:
      products:
        added:
          url: /products
          method: POST
          body: '{{json after}}'
          headers:
            Content-Type: application/json
        updated:
          url: /products/{{after.id}}
          method: PUT
          body: '{{json after}}'
          headers:
            Content-Type: application/json
        deleted:
          url: /products/{{before.id}}
          method: DELETE
```

### Multi-Query Webhook

```yaml
reactions:
  - kind: http
    id: event-hub
    queries: [orders, inventory, customers]
    baseUrl: https://events.example.com
    token: ${EVENT_HUB_TOKEN}
    routes:
      orders:
        added:
          url: /events/order-created
          method: POST
          body: '{"order": {{json after}}}'
        updated:
          url: /events/order-updated
          method: POST
          body: '{"order": {{json after}}, "previous": {{json before}}}'
      inventory:
        updated:
          url: /events/stock-changed
          method: POST
          body: '{"product": "{{after.sku}}", "quantity": {{after.quantity}}}'
      customers:
        added:
          url: /events/customer-registered
          method: POST
          body: '{"customer": {{json after}}}'
```

## Timeout Configuration

```yaml
reactions:
  - kind: http
    id: slow-api
    queries: [events]
    baseUrl: https://slow-api.example.com
    timeoutMs: 30000
```

## Error Handling

HTTP reactions log errors but continue processing. Monitor logs for:

- Connection timeouts
- HTTP error responses (4xx, 5xx)
- Invalid response formats

Enable debug logging for troubleshooting:

```yaml
logLevel: debug
```

## Testing

### Using webhook.site

Test webhooks without a real endpoint:

1. Go to https://webhook.site
2. Copy your unique URL
3. Configure the reaction:

```yaml
reactions:
  - kind: http
    id: test-webhook
    queries: [my-query]
    baseUrl: https://webhook.site
    routes:
      my-query:
        added:
          url: /your-unique-id
          method: POST
          body: '{{json after}}'
```

### Local Testing

Use a local HTTP server:

```bash
# Python
python -m http.server 9999

# Node.js
npx http-server -p 9999
```

```yaml
reactions:
  - kind: http
    id: local-test
    queries: [my-query]
    baseUrl: http://localhost:9999
    routes:
      my-query:
        added:
          url: /test
          method: POST
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
  - id: high-value-orders
    query: |
      MATCH (o:orders)
      WHERE o.total > 500
      RETURN o.id, o.customer_id, o.total, o.status
    sources:
      - sourceId: orders-db

reactions:
  - kind: http
    id: order-notifications
    queries: [high-value-orders]
    baseUrl: ${WEBHOOK_URL}
    token: ${WEBHOOK_TOKEN}
    timeoutMs: 10000
    routes:
      high-value-orders:
        added:
          url: /orders/high-value
          method: POST
          body: |
            {
              "event": "high_value_order",
              "order_id": "{{after.id}}",
              "customer_id": "{{after.customer_id}}",
              "total": {{after.total}}
            }
          headers:
            Content-Type: application/json
        updated:
          url: /orders/{{after.id}}/status
          method: PUT
          body: |
            {
              "status": "{{after.status}}",
              "previous_status": "{{before.status}}"
            }
          headers:
            Content-Type: application/json
```

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/reactions/http/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">HTTP Reaction README</h3>
        <p class="unified-card-summary">Routing, templates, and payload behavior</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-reaction-http" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-reaction-http on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>

## Next steps

- [Configure gRPC Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-grpc-reaction/)
- [Configure SSE Reaction](/drasi-server/how-to-guides/configuration/configure-reactions/configure-sse-reaction/)
