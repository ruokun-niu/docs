---
type: "docs"
title: "Configure Mock Source"
linkTitle: "Mock"
weight: 30
description: "Generate synthetic data for development and testing"
related:
  concepts:
    - title: "Sources"
      url: "/concepts/sources/"
  howto:
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

The Mock {{< term "Source" >}} generates synthetic data on a timer, so you can test queries and reactions without connecting to a real system.

## When to use the Mock source

- Developing and testing continuous queries locally.
- Demo environments where you want predictable, infrastructure-free data generation.
- Load/throughput testing (within reason).

## Quick example (Drasi Server config)

Drasi Server source configuration uses **camelCase** keys.

```yaml
sources:
  - kind: mock
    id: demo-sensors
    autoStart: true

    # Optional - defaults to generic
    dataType: sensor_reading
    intervalMs: 1000
```

## Configuration reference (Drasi Server)

| Field | Type | Default | Description |
|---|---:|---:|---|
| `kind` | string | required | Must be `mock`. |
| `id` | string | required | Unique source identifier. |
| `autoStart` | boolean | `true` | Whether Drasi Server starts the source on startup. |
| `bootstrapProvider` | object | none | Optional bootstrap provider for initial state (usually not needed for mock data). |
| `dataType` | string or object | `generic` | Data generation mode (see [Data Types](#data-types-and-generated-nodes)). |
| `intervalMs` | integer | `5000` | Interval between generated events in milliseconds (must be `> 0`). |

Fields support Drasi Server config references like `${ENV_VAR}` / `${ENV_VAR:-default}`.

## Data types and generated nodes

The `dataType` field controls what kind of data the mock source generates. It can be specified as:

- **Simple string**: `"counter"`, `"sensor_reading"`, or `"generic"`
- **Object with options**: `{ type: sensor_reading, sensor_count: 10 }`

### Counter

Generates sequential counter values. Each event is an **INSERT**.

```yaml
dataType: counter
```

- **Label**: `Counter`
- **Element ID**: `counter_{sequence}`
- **Properties**: `value` (sequential integer), `timestamp` (RFC3339 string)

### Sensor Reading

Simulates sensor devices. The first reading for each sensor generates an **INSERT**, subsequent readings generate **UPDATE** events for the same node.

**Simple form** (5 sensors):
```yaml
dataType: sensor_reading
```

**With custom sensor count**:
```yaml
dataType:
  type: sensor_reading
  sensor_count: 10
```

- **Label**: `SensorReading`
- **Element ID**: `sensor_{sensor_id}` (one per simulated sensor)
- **Properties**: `sensor_id` (integer 0 to sensor_count-1), `temperature` (float 20.0..30.0), `humidity` (float 40.0..60.0), `timestamp`

{{< alert title="Legacy alias" color="info" >}}
`dataType: sensor` is still accepted as an alias for `sensor_reading` for backwards compatibility.
{{< /alert >}}

### Generic (default)

Generates random data. Each event is an **INSERT**.

```yaml
dataType: generic
```

- **Label**: `Generic`
- **Element ID**: `generic_{sequence}`
- **Properties**: `value` (random i32), `message` ("Generic mock data"), `timestamp`

## Example: Testing with sensor data

```yaml
sources:
  - kind: mock
    id: sensors
    autoStart: true
    dataType:
      type: sensor_reading
      sensor_count: 3
    intervalMs: 1000

queries:
  - id: high-temp
    query: |
      MATCH (s:SensorReading)
      WHERE s.temperature > 25
      RETURN s.sensor_id, s.temperature
    sources:
      - sourceId: sensors
    autoStart: true

reactions:
  - kind: log
    id: alerts
    queries: [high-temp]
    autoStart: true
```

This configuration:
1. Simulates 3 sensors generating readings every second
2. Monitors for temperatures above 25°C
3. Logs alerts when high temperatures are detected

## Performance tuning notes

- Decrease `intervalMs` to generate more data (higher load).
- Use multiple mock sources with different `id`s if you want independent streams.
- For `sensor_reading`, increase `sensor_count` to simulate more devices.

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid data_type '...'` | Unrecognized data type value | Use `counter`, `sensor_reading`, or `generic` |
| `interval_ms cannot be 0` | intervalMs set to 0 | Set `intervalMs` to a positive integer |
| `unknown field` | Typo in field name | Check spelling; use camelCase (e.g., `intervalMs` not `interval_ms`) |

## Known limitations

- Sequence counters reset on restart; data is not persisted.
- No relationships are generated.
- `sensor_reading` generates updates for existing nodes; `counter` and `generic` only generate inserts.

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/sources/mock/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Mock Source README</h3>
        <p class="unified-card-summary">Generated schemas, validation rules, and behavior details</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-source-mock" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-source-mock on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
