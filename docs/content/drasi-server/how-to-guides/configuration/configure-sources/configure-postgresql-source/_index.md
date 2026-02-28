---
type: "docs"
title: "Configure PostgreSQL Source"
linkTitle: "PostgreSQL"
weight: 50
description: "Stream changes from PostgreSQL using logical replication"
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

The PostgreSQL {{< term "Source" >}} streams row-level changes from a PostgreSQL database using **logical replication (WAL / pgoutput)**.

## When to use the PostgreSQL source

- Keep Drasi queries continuously updated from a system-of-record PostgreSQL database.
- Drive reactions from database changes (alerts, notifications, downstream sync, cache/materialized-view updates).
- Build reactive services that need transactional ordering of changes.

## Prerequisites

- PostgreSQL **10+** (requires `pgoutput`).
- Logical replication enabled (`wal_level = logical`).
- A database user with **LOGIN**, **REPLICATION**, and **SELECT** permissions on replicated tables.
- A publication that contains the tables you want to stream.

## How it connects

This source **connects outbound** from Drasi Server to PostgreSQL over the PostgreSQL protocol; it does not open an inbound port.

## Quick example (Drasi Server config)

Drasi Server source configuration uses **camelCase** keys.

```yaml
sources:
  - kind: postgres
    id: orders-db
    autoStart: true

    host: ${PGHOST:-localhost}
    port: ${PGPORT:-5432}
    database: ${PGDATABASE:-mydb}
    user: ${PGUSER:-drasi_user}
    password: ${PGPASSWORD}

    # The PostgreSQL publication controls which tables are streamed.
    publicationName: drasi_publication
    slotName: drasi_slot

    # Optional
    sslMode: prefer

    # Optional: used for bootstrapping and key overrides (see notes below)
    tables:
      - public.orders
      - public.customers
    tableKeys:
      - table: public.order_items
        keyColumns: [order_id, product_id]

    # Optional: preload initial state for newly-subscribed queries
    bootstrapProvider:
      kind: postgres
```

## Configure PostgreSQL

### 1) Enable logical replication

Set (and restart PostgreSQL):

```ini
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
```

### 2) Create a replication user

```sql
CREATE USER drasi_user WITH REPLICATION LOGIN PASSWORD 'your-password';
GRANT USAGE ON SCHEMA public TO drasi_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO drasi_user;
```

### 3) Create a publication

```sql
-- Specific tables
CREATE PUBLICATION drasi_publication FOR TABLE public.orders, public.customers;

-- Or all tables
-- CREATE PUBLICATION drasi_publication FOR ALL TABLES;
```

### 4) (Recommended) ensure updates/deletes have enough key data

For reliable UPDATE/DELETE handling, ensure tables have primary keys.
If you’re replicating tables without primary keys, configure `tableKeys` (below).

If you need old-row values for some workloads, consider:

```sql
ALTER TABLE public.orders REPLICA IDENTITY FULL;
```

## Data mapping

- Each changed row becomes a Drasi graph {{< term "Node" >}}.
- **Label**: table name (for example `orders`).
- **Properties**: columns become node properties.
- **Element ID**:
  - For `public` schema tables: `table:key` (for example `orders:123`).
  - For non-`public` schema tables: `schema.table:key` (for example `sales.orders:123`).

If no key columns can be resolved for a row, the source logs a warning and falls back to a generated UUID: `table:uuid`.

## Configuration reference (Drasi Server)

| Field | Type | Default | Description |
|---|---:|---:|---|
| `kind` | string | required | Must be `postgres`. |
| `id` | string | required | Unique source identifier. |
| `autoStart` | boolean | `true` | Whether Drasi Server starts the source on startup. |
| `bootstrapProvider` | object | none | Optional bootstrap provider for initial state. For PostgreSQL bootstrap, use `{ kind: postgres }`. |
| `host` | string | `localhost` | PostgreSQL host. |
| `port` | integer | `5432` | PostgreSQL port. |
| `database` | string | required | Database name. |
| `user` | string | required | Database user (must have replication permission). |
| `password` | string | `""` | Password. |
| `tables` | string[] | `[]` | Table list used for bootstrapping and key overrides. Streaming is controlled by the PostgreSQL publication. |
| `slotName` | string | `drasi_slot` | Logical replication slot name (created if missing, reused if it exists). |
| `publicationName` | string | `drasi_publication` | Publication to subscribe to. |
| `sslMode` | string | `prefer` | SSL mode: `disable`, `prefer`, `require`. |
| `tableKeys` | array | `[]` | Override key columns per table (see below). |

Fields marked with support Drasi Server config references like `${ENV_VAR}` / `${ENV_VAR:-default}`.

### tableKeys

Use `tableKeys` to define key columns for element ID generation when primary keys are missing or not suitable.

```yaml
tableKeys:
  - table: public.order_items
    keyColumns: [order_id, product_id]
```

Notes:
- For tables outside the `public` schema, use `schema.table` in `tableKeys.table`.
- Key columns are joined with `_` in the element id (for example `order_items:1001_5`).

## Performance tuning notes

- Prefer a publication that only includes the tables you need; it reduces WAL decode and downstream processing.
- Large transactions are buffered and dispatched together on commit; very large transactions can increase memory usage.
- Monitor replication slot lag to avoid excessive WAL retention.

## Verifying It Works

After starting Drasi Server with your PostgreSQL source, verify the connection:

### 1. Check source status

```bash
curl http://localhost:8080/api/v1/sources/orders-db
```

Expected response includes `"status": "running"`.

### 2. Make a test change in PostgreSQL

```sql
INSERT INTO public.orders (id, customer_id, total, status)
VALUES (999, 1, 100.00, 'pending');
```

### 3. Verify the change was captured

If you have a log reaction configured:

```
[console-output] Query 'my-query' (1 items):
[console-output]   [ADD] {"id":"999","customer_id":"1","total":"100.00","status":"pending"}
```

Or query results via API:

```bash
curl http://localhost:8080/api/v1/queries/my-query/results
```

### 4. Check replication slot in PostgreSQL

```sql
SELECT slot_name, active, restart_lsn 
FROM pg_replication_slots 
WHERE slot_name = 'drasi_slot';
```

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `logical decoding requires wal_level >= logical` | WAL level too low | Set `wal_level = logical` in `postgresql.conf` and restart |
| `permission denied to create replication slot` | Missing permission | `ALTER USER drasi_user WITH REPLICATION;` |
| `MD5 authentication is not supported` | Auth method incompatible | Use `scram-sha-256` or `trust` in `pg_hba.conf` |
| `publication "drasi_publication" does not exist` | Publication not created | `CREATE PUBLICATION drasi_publication FOR TABLE ...;` |
| `could not connect to server: Connection refused` | Wrong host/port | Verify `host` and `port` values, check firewall |
| No changes captured | Table not in publication | Verify table is in publication: `SELECT * FROM pg_publication_tables;` |
| Unstable element IDs | No primary key | Add primary key or configure `tableKeys` |

### PostgreSQL Permissions Checklist

Your database user needs:

```sql
-- Required permissions
ALTER USER drasi_user WITH REPLICATION LOGIN;
GRANT USAGE ON SCHEMA public TO drasi_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO drasi_user;

-- For tables without primary keys (if using REPLICA IDENTITY FULL)
ALTER TABLE public.orders REPLICA IDENTITY FULL;
```

### Understanding Replica Identity

PostgreSQL's replica identity determines what data is included in WAL for UPDATE/DELETE:

| Setting | Behavior | Use When |
|---------|----------|----------|
| `DEFAULT` | Primary key columns only | Tables have primary keys |
| `FULL` | All columns | Need before/after values, or no primary key |
| `NOTHING` | No old values | Inserts only (not recommended) |

Set per table:

```sql
ALTER TABLE public.orders REPLICA IDENTITY FULL;
```

## Known limitations

- TRUNCATE messages are decoded but currently **not converted** into Drasi change events.
- If PostgreSQL does not include sufficient key data for an UPDATE, the source may not be able to treat it as a true update (ensure primary keys or set appropriate replica identity).

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/sources/postgres/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">PostgreSQL Source README</h3>
        <p class="unified-card-summary">Implementation notes, prerequisites, and behavior details</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-source-postgres" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-source-postgres on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
