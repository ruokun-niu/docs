---
type: "docs"
title: "Configure PostgreSQL Bootstrap Provider"
linkTitle: "PostgreSQL"
weight: 40
description: "Bootstrap queries from a PostgreSQL snapshot"
related:
  howto:
    - title: "Configure Sources"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/"
    - title: "Configure PostgreSQL Source"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/configure-postgresql-source/"
    - title: "Configure Bootstrap Providers"
      url: "/drasi-server/how-to-guides/configuration/configure-bootstrap-providers/"
---

The **PostgreSQL bootstrap provider** loads initial state from a PostgreSQL database so queries start with a complete snapshot before streaming begins.

## When to use PostgreSQL bootstrap

- You need historical/current state from PostgreSQL when a query starts.
- Your query depends on existing rows (aggregations, joins, thresholds).
- You want snapshot + WAL streaming from the same database.

## Prerequisites

- Use with a **PostgreSQL source** (`sources[].kind: postgres`).
- The PostgreSQL source must be able to connect and read the configured tables.

## Quick example (Drasi Server config)

In Drasi Server config, bootstrap provider keys are **camelCase**, and the discriminator field is `bootstrapProvider.kind`.

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

    publicationName: drasi_publication
    slotName: drasi_slot

    # Optional: used for bootstrap scope and key overrides
    tables:
      - public.orders
      - public.customers

    bootstrapProvider:
      kind: postgres
```

## Configuration reference

`postgres` accepts **no additional fields**.

| Field | Type | Required | Description |
|---|---|---:|---|
| `kind` | string | Yes | Must be `postgres` |

## Notes

- Drasi Server only allows `kind: postgres` when the source is also `kind: postgres`.
- Scope comes from the source configuration (for example `tables` / `tableKeys`).

## Documentation resources

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/components/bootstrappers/postgres/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">PostgreSQL Bootstrap README</h3>
        <p class="unified-card-summary">Implementation notes and behavior details</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-bootstrap-postgres" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">drasi-bootstrap-postgres on crates.io</h3>
        <p class="unified-card-summary">Package info and release history</p>
      </div>
    </div>
  </a>
</div>
