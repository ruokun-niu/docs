---
type: "docs"
title: "Build from Source"
linkTitle: "Build from Source"
weight: 40
description: "Compile Drasi Server from source code"
related:
  howto:
    - title: "Docker Installation"
      url: "/drasi-server/how-to-guides/installation/install-with-docker/"
    - title: "Install the SSE CLI"
      url: "/drasi-server/how-to-guides/installation/install-sse-cli/"
    - title: "Configure Drasi Server"
      url: "/drasi-server/how-to-guides/configuration/configure-drasi-server/"
  reference:
    - title: "CLI Reference"
      url: "/drasi-server/reference/cli/"
---

Building {{< term "Drasi Server" >}} from source gives you full control over the build process and allows you to contribute to the project or create custom builds.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) 1.88 or later
- Git
- C compiler (for native dependencies)

### Install Rust

Install Rust using [rustup](https://www.rust-lang.org/tools/install), the official Rust toolchain installer. Follow the instructions for your platform on the rustup website.

After installation, verify Rust is available:

```bash
rustc --version
cargo --version
```

### Native Dependencies

{{< read file="/shared-content/installation/drasi-server/build-from-source-prereqs.md" >}}

## Clone the Drasi Server Repository

```bash
git clone https://github.com/drasi-project/drasi-server.git
cd drasi-server
```

## Build and Install Drasi Server

Build Drasi Server and install the compiled binary into a local `./bin` directory:

```bash
cargo install --path . --root . --locked
```

The first build downloads and compiles all dependencies, so it can take several minutes. Subsequent builds are much faster thanks to Cargo's build cache. The `--root .` flag tells Cargo to place the compiled `drasi-server` binary in the `./bin` directory.

### Verify the Build

```bash
./bin/drasi-server --version
```

You should see output showing the version number, for example:

```text
drasi-server 0.2.1
rustc: rustc 1.88.0 (6b00bc388 2025-06-23)
plugin-sdk: 0.9.1
```

{{% alert title="Iterating on the source code?" color="info" %}}
If you are actively modifying Drasi Server, use `cargo build` for faster, incremental debug builds and run directly with Cargo instead of reinstalling each time:

```bash
cargo build                                # debug build at target/debug/drasi-server
cargo run -- --config config/server.yaml   # build and run in one step
```

Add `--release` for an optimized build at `target/release/drasi-server`.
{{% /alert %}}

## Configuration

### Create Configuration File

Drasi Server requires a configuration file that defines your sources, queries, and reactions. 

Create a configuration yaml file for Drasi Server. See the [Configuration Reference](/drasi-server/reference/configuration/) for details on all available configuration options.

Alternatively, use the `init` command to create a starter configuration file:

```bash
./bin/drasi-server init --output config/server.yaml
```

### Validate Configuration

Check your configuration file without starting the server:

```bash
./bin/drasi-server validate --config config/server.yaml

# Show resolved environment variables
./bin/drasi-server validate --config config/server.yaml --show-resolved
```

### Check System Dependencies

```bash
./bin/drasi-server doctor

# Include optional dependencies
./bin/drasi-server doctor --all
```

## Run Drasi Server

Run Drasi Server using the installed binary:

```bash
./bin/drasi-server --config config/server.yaml
```