---
type: "docs"
title: "Configure Queries"
linkTitle: "Configure Queries"
weight: 25
description: "Define continuous queries to detect and react to data changes"
related:
  concepts:
    - title: "Continuous Queries"
      url: "/concepts/continuous-queries/"
  howto:
    - title: "Configure Sources"
      url: "/drasi-server/how-to-guides/configuration/configure-sources/"
    - title: "Configure Reactions"
      url: "/drasi-server/how-to-guides/configuration/configure-reactions/"
  reference:
    - title: "Configuration Reference"
      url: "/drasi-server/reference/configuration/"
---

{{< term "Continuous Query" "Continuous Queries" >}} are the heart of Drasi. They define what data changes you want to detect and react to.

## Quick Start

A minimal query that matches all nodes from a source:

```yaml
queries:
  - id: all-orders
    query: "MATCH (o:Order) RETURN o"
    sources:
      - sourceId: my-source
```

## Configuration Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | Required | Unique query identifier (referenced by reactions) |
| `query` | string | Required | The Cypher/GQL query text |
| `queryLanguage` | string | `GQL` | Query language: `GQL` or `Cypher` |
| `sources` | array | `[]` | Source subscriptions (see below) |
| `autoStart` | boolean | `false` | Start query automatically on server startup |
| `enableBootstrap` | boolean | `true` | Request bootstrap data for initial state |
| `bootstrapBufferSize` | integer | `10000` | Buffer size during bootstrap replay |
| `joins` | array | None | Join configuration for multi-label queries |
| `priorityQueueCapacity` | integer | None | Override default event queue capacity |
| `dispatchBufferCapacity` | integer | None | Override default dispatch buffer capacity |

## Source Subscriptions

Each query subscribes to one or more sources:

```yaml
queries:
  - id: my-query
    query: "MATCH (o:Order) RETURN o"
    sources:
      - sourceId: orders-db        # Required: which source
        nodes: []                   # Optional: filter node labels
        relations: []               # Optional: filter relation labels
        pipeline: []                # Optional: processing pipeline
```

### Filtering by Label

Limit which data the query receives:

```yaml
sources:
  - sourceId: orders-db
    nodes: [Order, Customer]       # Only receive Order and Customer nodes
    relations: [PLACED_BY]         # Only receive PLACED_BY relations
```

## Query Language

Drasi supports two query languages:

### GQL (Default)

Graph Query Language - the emerging ISO standard:

```yaml
queries:
  - id: high-value-orders
    queryLanguage: GQL
    query: |
      MATCH (o:Order)
      WHERE o.total > 1000
      RETURN o.id, o.customer_id, o.total
```

### Cypher

Neo4j's query language (widely adopted):

```yaml
queries:
  - id: high-value-orders
    queryLanguage: Cypher
    query: |
      MATCH (o:Order)
      WHERE o.total > 1000
      RETURN o.id, o.customer_id, o.total
```

Both languages are functionally similar for most use cases.

## Common Query Patterns

### Simple Node Query

Match all nodes of a type:

```yaml
queries:
  - id: all-products
    query: "MATCH (p:Product) RETURN p.id, p.name, p.price"
    sources:
      - sourceId: inventory-db
```

### Filtered Query

Match nodes meeting a condition:

```yaml
queries:
  - id: low-stock
    query: |
      MATCH (p:Product)
      WHERE p.stock < p.reorder_point
      RETURN p.id, p.name, p.stock, p.reorder_point
    sources:
      - sourceId: inventory-db
```

### Aggregation Query

Compute aggregates that update in real-time:

```yaml
queries:
  - id: order-summary
    query: |
      MATCH (o:Order)
      RETURN count(o) AS total_orders, 
             sum(o.total) AS revenue,
             avg(o.total) AS avg_order_value
    sources:
      - sourceId: orders-db
```

### Relationship Query with Joins

Query across related entities (requires join configuration):

```yaml
queries:
  - id: orders-with-customers
    query: |
      MATCH (o:Order)-[:PLACED_BY]->(c:Customer)
      WHERE o.status = 'pending'
      RETURN o.id, o.total, c.name, c.email
    sources:
      - sourceId: orders-db
    joins:
      - id: PLACED_BY
        keys:
          - label: Order
            property: customer_id
          - label: Customer
            property: id
```

## Join Configuration

Joins connect nodes that don't have explicit relationships in the source data. This is common when working with relational databases where foreign keys define relationships.

### Basic Join

```yaml
joins:
  - id: PLACED_BY              # Relationship label used in query
    keys:
      - label: Order            # First node label
        property: customer_id   # Foreign key property
      - label: Customer         # Second node label  
        property: id            # Primary key property
```

This creates a virtual `PLACED_BY` relationship from `Order` to `Customer` where `Order.customer_id = Customer.id`.

### Multiple Joins

```yaml
queries:
  - id: order-details
    query: |
      MATCH (o:Order)-[:PLACED_BY]->(c:Customer),
            (o)-[:CONTAINS]->(i:OrderItem)
      RETURN o.id, c.name, i.product_name, i.quantity
    sources:
      - sourceId: orders-db
    joins:
      - id: PLACED_BY
        keys:
          - label: Order
            property: customer_id
          - label: Customer
            property: id
      - id: CONTAINS
        keys:
          - label: Order
            property: id
          - label: OrderItem
            property: order_id
```

## Bootstrap Configuration

Bootstrap loads initial data when a query starts, so results reflect existing state (not just new changes).

### Enable/Disable Bootstrap

```yaml
queries:
  - id: streaming-only
    query: "MATCH (e:Event) RETURN e"
    enableBootstrap: false      # Only process new events
    sources:
      - sourceId: event-stream
```

### Bootstrap Buffer Size

For large datasets, increase the buffer:

```yaml
queries:
  - id: large-dataset
    query: "MATCH (p:Product) RETURN p"
    enableBootstrap: true
    bootstrapBufferSize: 50000  # Default is 10000
    sources:
      - sourceId: catalog-db
```

## Performance Tuning

### Queue Capacity

For high-volume queries, increase queue capacity:

```yaml
queries:
  - id: high-volume
    query: "MATCH (e:Event) RETURN e"
    priorityQueueCapacity: 100000    # Events waiting to be processed
    dispatchBufferCapacity: 10000    # Events waiting to be dispatched
    sources:
      - sourceId: event-stream
```

### Multiple Sources

A query can subscribe to multiple sources:

```yaml
queries:
  - id: unified-view
    query: "MATCH (p:Product) RETURN p.id, p.name, p.source"
    sources:
      - sourceId: warehouse-a
      - sourceId: warehouse-b
```

## Complete Example

```yaml
host: 0.0.0.0
port: 8080

sources:
  - kind: postgres
    id: orders-db
    host: ${DB_HOST}
    database: ecommerce
    user: ${DB_USER}
    password: ${DB_PASSWORD}
    tables:
      - public.orders
      - public.customers
      - public.order_items
    bootstrapProvider:
      kind: postgres

queries:
  # Simple: All pending orders
  - id: pending-orders
    autoStart: true
    query: |
      MATCH (o:orders)
      WHERE o.status = 'pending'
      RETURN o.id, o.customer_id, o.total, o.created_at
    sources:
      - sourceId: orders-db

  # Aggregation: Order statistics  
  - id: order-stats
    autoStart: true
    query: |
      MATCH (o:orders)
      RETURN o.status AS status,
             count(o) AS count,
             sum(o.total) AS total_value
    sources:
      - sourceId: orders-db

  # Join: Orders with customer details
  - id: orders-with-customers
    autoStart: true
    query: |
      MATCH (o:orders)-[:CUSTOMER]->(c:customers)
      WHERE o.total > 100
      RETURN o.id, o.total, c.name, c.email
    sources:
      - sourceId: orders-db
    joins:
      - id: CUSTOMER
        keys:
          - label: orders
            property: customer_id
          - label: customers
            property: id

reactions:
  - kind: log
    id: console
    queries: [pending-orders, order-stats, orders-with-customers]
    autoStart: true
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Query returns no results | Labels don't match source data | Check label names match exactly (case-sensitive) |
| Join not working | Keys don't match | Verify join key properties exist and values match |
| Bootstrap timeout | Large dataset | Increase `bootstrapBufferSize` |
| Query not starting | `autoStart: false` | Set `autoStart: true` or start via API |
| Missing data | Wrong source subscription | Verify `sourceId` matches your source's `id` |

### Verifying Query Results

Check current results via API:

```bash
curl http://localhost:8080/api/v1/queries/my-query/results
```

Check query status:

```bash
curl http://localhost:8080/api/v1/queries/my-query
```
