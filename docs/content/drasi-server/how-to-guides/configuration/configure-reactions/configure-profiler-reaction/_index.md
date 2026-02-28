---
type: "docs"
title: "Configure Profiler Reaction"
linkTitle: "Profiler"
weight: 50
description: "Collect performance metrics for queries"
related:
  concepts:
    - title: "Reactions"
      url: "/concepts/reactions/"
    - title: "Continuous Queries"
      url: "/concepts/continuous-queries/"
  howto:
    - title: "Configure Log Reaction"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/configure-log-reaction/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The Profiler {{< term "Reaction" >}} collects and reports performance metrics for {{< term "Continuous Query" "queries" >}}. Use it to monitor query performance, identify bottlenecks, and optimize your {{< term "Drasi Server" >}} deployment.

## Basic Configuration

```yaml
reactions:
  - kind: profiler
    id: query-profiler
    queries: [my-query]
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `kind` | string | Required | Must be `profiler` |
| `id` | string | Required | Unique reaction identifier |
| `queries` | array | Required | Query IDs to profile |
| `autoStart` | boolean | `true` | Start profiler automatically |
| `windowSize` | integer | `100` | Number of results in metrics window |
| `reportIntervalSecs` | integer | `60` | Report interval in seconds |

## Metrics Collected

The profiler tracks:

| Metric | Description |
|--------|-------------|
| **Event count** | Total events processed |
| **Throughput** | Events per second |
| **Latency** | Processing time per event |
| **P50/P95/P99** | Latency percentiles |
| **Error rate** | Failed event percentage |

## Window Configuration

The `windowSize` controls how many recent results are used for metric calculations:

```yaml
reactions:
  - kind: profiler
    id: detailed-profiler
    queries: [high-volume-query]
    windowSize: 1000  # Use last 1000 results for metrics
```

| Use Case | Window Size |
|----------|-------------|
| Quick feedback | 10-50 |
| Stable metrics | 100-500 |
| Trend analysis | 500-2000 |

## Report Interval

Control how often metrics are reported to the Drasi Server logs:

```yaml
reactions:
  - kind: profiler
    id: frequent-reports
    queries: [critical-query]
    reportIntervalSecs: 10  # Report every 10 seconds
```

| Use Case | Interval |
|----------|----------|
| Real-time monitoring | 5-15 seconds |
| General monitoring | 30-60 seconds |
| Long-term trends | 300+ seconds |

## Sample Output

Profiler output in logs:

```
[query-profiler] ========== Profiling Report ==========
[query-profiler] Source→Query: ...
[query-profiler] Query Processing: ...
[query-profiler] Query→Reaction: ...
[query-profiler] Reaction Processing: ...
[query-profiler] Total End-to-End: ...
[query-profiler] ======================================
```

## Use Cases

### Development Profiling

Quick feedback during development:

```yaml
reactions:
  - kind: profiler
    id: dev-profiler
    queries: [test-query]
    windowSize: 50
    reportIntervalSecs: 10
```

### Production Monitoring

Long-term production monitoring:

```yaml
reactions:
  - kind: profiler
    id: production-profiler
    queries: [order-query, inventory-query, customer-query]
    windowSize: 500
    reportIntervalSecs: 60
```

### Performance Testing

Detailed metrics during load tests:

```yaml
reactions:
  - kind: profiler
    id: load-test-profiler
    queries: [load-test-query]
    windowSize: 2000
    reportIntervalSecs: 5
```

### Multi-Query Profiling

Profile multiple queries:

```yaml
reactions:
  - kind: profiler
    id: all-queries-profiler
    queries:
      - orders
      - inventory
      - customers
      - analytics
    windowSize: 200
    reportIntervalSecs: 30
```

## Complete Example

```yaml
host: 0.0.0.0
port: 8080
logLevel: info

sources:
  - kind: postgres
    id: main-db
    host: ${DB_HOST}
    database: production
    user: ${DB_USER}
    password: ${DB_PASSWORD}
    tables:
      - public.orders
      - public.inventory

queries:
  - id: order-updates
    query: "MATCH (o:orders) RETURN o"
    sources:
      - sourceId: main-db

  - id: low-inventory
    query: |
      MATCH (i:inventory)
      WHERE i.quantity < i.reorder_point
      RETURN i
    sources:
      - sourceId: main-db

reactions:
  # Production reactions
  - kind: http
    id: order-webhook
    queries: [order-updates]
    baseUrl: https://api.example.com

  - kind: sse
    id: inventory-dashboard
    queries: [low-inventory]
    port: 8081

  # Profiler for monitoring
  - kind: profiler
    id: query-profiler
    queries: [order-updates, low-inventory]
    windowSize: 200
    reportIntervalSecs: 60
```

## Combining with Log Reaction

Use both profiler and log reactions for comprehensive debugging:

```yaml
reactions:
  # Debug logging
  - kind: log
    id: debug-log
    queries: [my-query]

  # Performance metrics
  - kind: profiler
    id: profiler
    queries: [my-query]
    windowSize: 100
    reportIntervalSecs: 30
```

## Interpreting Metrics

### Throughput

- **Low throughput**: May indicate source issues or query complexity
- **Variable throughput**: Normal for event-driven systems
- **Sudden drops**: Check source connectivity

### Latency

- **High P99**: Occasional slow events (may be acceptable)
- **High P50**: Consistently slow processing (investigate)
- **High variance**: Query complexity varies with data

### Errors

- **Any errors**: Investigate immediately
- **Increasing errors**: Check source connectivity
- **Pattern-based**: May indicate specific data issues

## Performance Tuning Guide

Based on profiler metrics:

### High Latency

1. Check query complexity
2. Review source configuration
3. Consider query optimization
4. Increase server resources

### Low Throughput

1. Verify source is producing events
2. Check query subscriptions
3. Review reaction configurations
4. Monitor system resources

### Memory Issues

1. Reduce `windowSize`
2. Increase report interval
3. Profile fewer queries

## Troubleshooting

### No Reports

- Verify profiler is started
- Check query is receiving events
- Review log level configuration

### Inaccurate Metrics

- Increase `windowSize` for stability
- Wait for enough events to accumulate
- Check for event bursts skewing metrics

### High Overhead

- Increase `reportIntervalSecs`
- Reduce `windowSize`
- Profile only critical queries

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/reactions/profiler/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Profiler Reaction README</h3>
        <p class="unified-card-summary">Implementation details and runtime behavior.</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-reaction-profiler" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-reaction-profiler on crates.io</h3>
        <p class="unified-card-summary">Package info and release history.</p>
      </div>
    </div>
  </a>
</div>

## Next Steps

- [Operations Guide](/drasi-server/how-to-guides/operations/) - Production operations
- [Troubleshooting](/drasi-server/how-to-guides/operations/troubleshooting/) - Debug issues
