---
type: "docs"
title: "Configure ScriptFile Bootstrap Provider"
linkTitle: "ScriptFile"
weight: 50
description: "Bootstrap queries from JSONL script files"
related:
  howto:
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
    - title: "Configure Sources"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/"
---

The **ScriptFile bootstrap provider** loads initial graph data from one or more **JSONL (JSON Lines)** files.

## When to use ScriptFile bootstrap

- Local development and tests where you want deterministic starting data.
- Bootstrapping reference/static data without connecting to an external system.
- Seeding a query when your streaming source starts empty.

## Prerequisites

- The Drasi Server process must have filesystem access to each configured path.
- Files must be valid JSONL, and the first record must be a `Header`.

## Quick example (Drasi Server config)

```yaml
sources:
  - kind: http
    id: events-api
    autoStart: true
    host: 0.0.0.0
    port: 9000

    bootstrapProvider:
      kind: scriptfile
      filePaths:
        - /data/bootstrap/nodes.jsonl
        - /data/bootstrap/relations.jsonl
```

## JSONL format (overview)

Each line is a JSON object with a `kind` field.

```jsonl
{"kind":"Header","start_time":"2024-01-01T00:00:00Z","description":"Initial data"}
{"kind":"Node","id":"alice","labels":["Person"],"properties":{"name":"Alice"}}
{"kind":"Node","id":"bob","labels":["Person"],"properties":{"name":"Bob"}}
{"kind":"Relation","id":"r1","labels":["KNOWS"],"start_id":"alice","end_id":"bob","properties":{"since":2020}}
{"kind":"Finish","description":"Done"}
```

For the complete schema and supported record types, see the provider README.

## Configuration reference

| Field | Type | Required | Description |
|---|---|---:|---|
| `kind` | string | Yes | Must be `scriptfile` |
| `filePaths` | array of strings | Yes | JSONL files to read (in order) |

## Creating JSONL Files

### File Structure

Each JSONL file contains one JSON object per line. The first record must be a `Header`, and the last should be a `Finish`:

```jsonl
{"kind":"Header","start_time":"2024-01-01T00:00:00Z","description":"Initial products"}
{"kind":"Node","id":"prod-1","labels":["Product"],"properties":{"name":"Widget","price":9.99,"stock":100}}
{"kind":"Node","id":"prod-2","labels":["Product"],"properties":{"name":"Gadget","price":19.99,"stock":50}}
{"kind":"Finish","description":"Done"}
```

### Python Script to Generate JSONL

```python
import json
from datetime import datetime

def create_bootstrap_file(data, output_path, description="Bootstrap data"):
    """Create a JSONL bootstrap file from a list of records."""
    with open(output_path, 'w') as f:
        # Header
        f.write(json.dumps({
            "kind": "Header",
            "start_time": datetime.now().isoformat() + "Z",
            "description": description
        }) + '\n')
        
        # Data records
        for record in data:
            f.write(json.dumps(record) + '\n')
        
        # Finish
        f.write(json.dumps({
            "kind": "Finish",
            "description": "Done"
        }) + '\n')

# Example: Create product bootstrap data
products = [
    {"kind": "Node", "id": "prod-1", "labels": ["Product"], 
     "properties": {"name": "Widget", "price": 9.99, "stock": 100}},
    {"kind": "Node", "id": "prod-2", "labels": ["Product"], 
     "properties": {"name": "Gadget", "price": 19.99, "stock": 50}},
]

create_bootstrap_file(products, "bootstrap/products.jsonl", "Product catalog")
```

### Record Types

| Kind | Required Fields | Description |
|------|-----------------|-------------|
| `Header` | `start_time` | First record; marks bootstrap start |
| `Node` | `id`, `labels`, `properties` | A graph node |
| `Relation` | `id`, `labels`, `start_id`, `end_id`, `properties` | A relationship between nodes |
| `Finish` | (none) | Last record; marks bootstrap complete |

### Relation Example

```jsonl
{"kind":"Header","start_time":"2024-01-01T00:00:00Z","description":"Orders with items"}
{"kind":"Node","id":"order-1","labels":["Order"],"properties":{"total":29.98,"status":"pending"}}
{"kind":"Node","id":"item-1","labels":["OrderItem"],"properties":{"product":"Widget","quantity":2}}
{"kind":"Node","id":"item-2","labels":["OrderItem"],"properties":{"product":"Gadget","quantity":1}}
{"kind":"Relation","id":"rel-1","labels":["CONTAINS"],"start_id":"order-1","end_id":"item-1","properties":{}}
{"kind":"Relation","id":"rel-2","labels":["CONTAINS"],"start_id":"order-1","end_id":"item-2","properties":{}}
{"kind":"Finish","description":"Done"}
```

## Performance / operational notes

- This provider streams files line-by-line (it does not require loading the whole dataset into memory), but bootstrap volume still impacts memory/CPU based on `queries[].bootstrapBufferSize`.

## Verifying Bootstrap Worked

After Drasi Server starts, query results should include bootstrapped data:

```bash
curl http://localhost:8080/api/v1/queries/my-query/results
```

If bootstrap data is missing:
- Check file paths are accessible to Drasi Server (especially in Docker)
- Verify JSONL format is correct (one valid JSON object per line)
- Check logs for bootstrap errors

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/bootstrappers/scriptfile/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">ScriptFile Bootstrap README</h3>
        <p class="unified-card-summary">Schema and examples for JSONL bootstrap scripts</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-bootstrap-scriptfile" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-bootstrap-scriptfile on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
