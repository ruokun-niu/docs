---
type: "docs"
title: "Continuous Query Syntax"
linkTitle: "Continuous Query Syntax"
weight: 20
hide_readingtime: true
no_list: true
notoc: true
description: >
    Writing Continuous Queries
---

{{< term "Continuous Query" "Continuous Queries" >}} are written using a subset of the {{< term "openCypher" "Cypher Query Language" >}} or {{< term "GQL" "Graph Query Language" >}} (GQL). These query languages allow you to describe patterns in graph data and specify transformations to detect changes of interest.

Both query languages work with graph patterns using ASCII-art syntax where round brackets represent {{< term "Node" "nodes" >}} and arrows represent {{< term "Relationship" "relationships" >}}. The key difference is that Drasi evaluates these queries continuously against streaming data changes rather than executing them once against static data.

## Query Language Documentation

<div class="card-grid">
  <a href="gql/">
    <div class="unified-card unified-card--reference">
      <div class="unified-card-icon">
        <i class="fas fa-code"></i>
      </div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Graph Query Language (GQL)</h3>
        <p class="unified-card-summary">GQL subset supported by Drasi based on the ISO/IEC 39075 standard.</p>
      </div>
    </div>
  </a>
  <a href="cypher/">
    <div class="unified-card unified-card--reference">
      <div class="unified-card-icon">
        <i class="fas fa-code"></i>
      </div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Cypher Query Language</h3>
        <p class="unified-card-summary">openCypher subset supported by Drasi for pattern matching and graph traversal.</p>
      </div>
    </div>
  </a>
  <a href="drasi-custom-functions/">
    <div class="unified-card unified-card--reference">
      <div class="unified-card-icon">
        <span style="font-family: serif; font-style: italic; font-size: 1.5rem;">f(x)</span>
      </div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Drasi Custom Functions</h3>
        <p class="unified-card-summary">Extended functions for continuous query processing including time-based operations.</p>
      </div>
    </div>
  </a>
</div>

## Learning Resources

If you are new to Cypher, Neo4j provides excellent resources:
- [Getting Started](https://neo4j.com/docs/getting-started/cypher-intro/)
- [Cheat Sheet](https://neo4j.com/docs/cypher-cheat-sheet/current/)

