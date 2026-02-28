---
type: "docs"
title: "Getting Started"
linkTitle: "Getting Started"
weight: 10
hide_readingtime: true
description: "Add drasi-lib to your Rust project and run your first continuous query"
related:
  concepts:
    - title: "Why Drasi?"
      url: "/concepts/overview/"
    - title: "Sources"
      url: "/concepts/sources/"
    - title: "Continuous Queries"
      url: "/concepts/continuous-queries/"
    - title: "Reactions"
      url: "/concepts/reactions/"
  reference:
    - title: "Query Language Reference"
      url: "/reference/query-language/"
    - title: "Available Sources"
      url: "/drasi-lib/reference/sources/"
    - title: "Available Reactions"
      url: "/drasi-lib/reference/reactions/"
---

The quickest way to get started using drasi-lib is to create a simple example. This minimal example monitors a mock sensor source and reacts when temperature exceeds 75°C:

## Add drasi-lib dependencies

Add drasi-lib to your `Cargo.toml`, along with tokio and the source and reaction crates you need:

```toml
[dependencies]
drasi-lib = "0.3"
drasi-source-mock = "0.1"
drasi-reaction-log = "0.1"
tokio = { version = "1", features = ["full"] }
```

## Write your first drasi-lib application


```rust
use drasi_lib::{DrasiLib, Query};
use drasi_source_mock::{MockSource, MockSourceConfig};
use drasi_reaction_log::{LogReaction, LogReactionConfig};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Create a mock sensor source
    let source = MockSource::new("sensors", MockSourceConfig {
        data_type: "sensor".to_string(),
        interval_ms: 1000,
    })?;

    // Create a log reaction for alerts
    let reaction = LogReaction::new(
        "alerts",
        vec!["high-temp".to_string()],
        LogReactionConfig::default(),
    )?;

    // Build and run
    let core = DrasiLib::builder()
        .with_source(source)
        .with_reaction(reaction)
        .with_query(
            Query::gql("high-temp")
                .query("MATCH (s:Sensor) WHERE s.temperature > 75 RETURN s")
                .from_source("sensors")
                .build()
        )
        .build()
        .await?;

    core.start().await?;
    tokio::signal::ctrl_c().await?;
    core.stop().await
}
```

When a sensor's temperature crosses 75°C, you'll receive a change event with the sensor data. When it drops back below, you'll receive a deletion event—enabling precise "enter/exit" logic without manual state tracking.

## Documentation Resources

For complete documentation, builder API reference, and advanced configuration:

<div class="card-grid card-grid--2">
  <a href="https://github.com/drasi-project/drasi-core/blob/main/lib/README.md" target="_blank" rel="noopener">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">GitHub README</h3>
        <p class="unified-card-summary">Complete builder API, configuration options, and plugin development guides</p>
      </div>
    </div>
  </a>
  <a href="https://crates.io/crates/drasi-lib" target="_blank" rel="noopener">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-box"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">crates.io</h3>
        <p class="unified-card-summary">Package info, version history, and dependencies</p>
      </div>
    </div>
  </a>
  <a href="https://docs.rs/drasi-lib" target="_blank" rel="noopener">
    <div class="unified-card unified-card--reference">
      <div class="unified-card-icon"><i class="fas fa-book"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">docs.rs</h3>
        <p class="unified-card-summary">API documentation with type definitions and usage examples</p>
      </div>
    </div>
  </a>
</div>