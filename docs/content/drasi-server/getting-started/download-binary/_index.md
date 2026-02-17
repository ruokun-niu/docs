---
type: "docs"
title: "Setup: Download Binary"
linkTitle: "Download Binary"
weight: 30
description: "Download a prebuilt Drasi Server binary for your platform"
---

This is the fastest way to get started with Drasi Server. Download a prebuilt binary and start the tutorial database.

## Prerequisites

- **curl** — Needed to download the Drasi Server binary and used in later tutorial steps <a href="https://curl.se/download.html" target="_blank" rel="noopener noreferrer">(Install curl)</a>
- **Docker** — Needed to run the PostgreSQL database used in the tutorial. The easiest way to get started depends on your platform:
  - **Mac/Windows**: Install <a href="https://www.docker.com/products/docker-desktop/" target="_blank" rel="noopener noreferrer">Docker Desktop</a>
  - **Linux**: Install <a href="https://docs.docker.com/engine/install/" target="_blank" rel="noopener noreferrer">Docker Engine</a> (recommended) or <a href="https://docs.docker.com/desktop/setup/install/linux/" target="_blank" rel="noopener noreferrer">Docker Desktop</a>
  - Recommended resources: 4+ CPU cores, 8+ GB memory
- **Text Editor** — Needed to edit files during the tutorial (e.g. <a href="https://code.visualstudio.com/" target="_blank" rel="noopener noreferrer">Visual Studio Code</a>)

#### Verify Docker is Running

```bash
docker ps
```

If Docker is running, you'll see a table with these headings showing running containers (even if no containers are running):

```
CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```

If you see an error like `Cannot connect to the Docker daemon`, Docker isn't running. Start Docker Desktop (Mac/Windows) or the Docker service (`sudo systemctl start docker` on Linux) and wait for it to fully initialize, then try again. If problems persist, see the [Docker troubleshooting guide](https://docs.docker.com/config/daemon/troubleshoot/) for additional help.

## Step 1: Create Tutorial Folder

Open a terminal and in a suitable location on your machine, create a folder for the tutorial files, then change to that directory. For example:

```bash
mkdir drasi-server
cd drasi-server
```

## Step 2: Download the Drasi Server Binary

The rest of the tutorial assumes you have the Drasi Server executable at `./bin/drasi-server`, so the next step is to download the appropriate binary for your platform and place it there:

{{< tabpane persist="header" >}}
{{< tab header="macOS (Apple Silicon)" lang="bash" >}}
mkdir -p bin
curl -sL https://github.com/drasi-project/drasi-server/releases/latest/download/drasi-server-darwin-arm64.tar.gz | tar xz -C bin
chmod +x bin/drasi-server
{{< /tab >}}
{{< tab header="macOS (Intel)" lang="bash" >}}
mkdir -p bin
curl -sL https://github.com/drasi-project/drasi-server/releases/latest/download/drasi-server-darwin-amd64.tar.gz | tar xz -C bin
chmod +x bin/drasi-server
{{< /tab >}}
{{< tab header="Linux (x64)" lang="bash" >}}
mkdir -p bin
curl -sL https://github.com/drasi-project/drasi-server/releases/latest/download/drasi-server-linux-amd64.tar.gz | tar xz -C bin
chmod +x bin/drasi-server
{{< /tab >}}
{{< tab header="Linux (ARM64)" lang="bash" >}}
mkdir -p bin
curl -sL https://github.com/drasi-project/drasi-server/releases/latest/download/drasi-server-linux-arm64.tar.gz | tar xz -C bin
chmod +x bin/drasi-server
{{< /tab >}}
{{< /tabpane >}}

## Step 3: Verify the Download

Verify the binary works:

```bash
./bin/drasi-server --version
```

You should see output showing the version number, for example:

```
drasi-server 0.1.0
```

---

## Step 4: Download the Tutorial Files

TODO


## Step 5: Set Environment Variables

The tutorial uses environment variables for port numbers and database host so the same commands work across all setup environments. Run the following to set the defaults for the Download Binary environment:

```bash
export SERVER_PORT=8080
export SSE_PORT=8081
export POSTGRES_HOST_PORT=5432
```

---

## ✅ Environment Setup Complete!

You now have Drasi Server accessible at `./bin/drasi-server` from the repository root.

<p><a href="../#database" class="btn btn-success btn-lg">Continue with the Tutorial <i class="fas fa-arrow-right ms-2"></i></a></p>
