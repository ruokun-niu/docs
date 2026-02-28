---
type: "docs"
title: "Getting Started"
linkTitle: "Getting Started"
weight: 5
no_list: true
hide_readingtime: true
description: "Build your first change-driven solution with Drasi Server"

draft: true
---

This Getting Started tutorial teaches you how to use Drasi Server by progressively building a change-driven solution. You'll start with a simple configuration and extend it step by step — each step introduces a new Drasi capability.

| Step | What You'll Learn | Time |
|------|-------------------|------|
| **[Step 1: Set Up Your Environment](#setup)** | Install Drasi Server and set up your development environment | 5 min |
| **[Step 2: Set Up the Tutorial Database](#database)** | Start a PostgreSQL database and load sample data | 3 min |
| **[Step 3: Create Your First Configuration](#phase-1)** | Use `drasi-server init` to create a Source, Continuous Query, and Log Reaction — see changes flow through Drasi in real time | 10 min |
| **[Step 4: Add a Query with Criteria](#phase-2)** | Add a filtered query via the REST API — learn how `WHERE` clauses control which changes generate notifications | 3 min |
| **[Step 5: Add an Aggregation Query](#phase-3)** | Add a query with `count()` — see aggregations update automatically as data changes. Introduces the SSE CLI for streaming results | 5 min |
| **[Step 6: Add Time-Based Detection](#phase-4)** | Detect the *absence* of activity over time — a powerful capability for monitoring and alerting | 5 min |
| **[Step 7: Add Cross-Source Joins](#phase-5)** | Add an HTTP Source and join its data with PostgreSQL data using virtual relationships | 5 min |

**Steps 1–3** give you a working Drasi Server example in under 20 minutes. **Steps 4–7** are optional and explore progressively advanced capabilities — complete as many as you like.

## Step 1: Set Up Your Environment {#setup}

Choose your preferred environment for working through the Getting Started tutorial. Each approach gets you to the same starting point with Drasi Server installed and ready to run the tutorial.

<div class="card-grid">
  <a href="github-codespace/">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fab fa-github"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">GitHub Codespace</h3>
        <p class="unified-card-summary">One-click cloud environment. No local installation needed.</p>
      </div>
    </div>
  </a>
  <a href="dev-container/">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fas fa-cube"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Dev Container</h3>
        <p class="unified-card-summary">VS Code Dev Container with all dependencies preconfigured.</p>
      </div>
    </div>
  </a>
  <a href="download-binary/">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fas fa-download"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Download Binary</h3>
        <p class="unified-card-summary">Download a prebuilt binary for macOS or Linux. The fastest way to get started.</p>
      </div>
    </div>
  </a>
  <a href="build-from-source/">
    <div class="unified-card unified-card--tutorials">
      <div class="unified-card-icon"><i class="fas fa-hammer"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Build from Source</h3>
        <p class="unified-card-summary">Clone and build Drasi Server yourself. Ideal for contributors.</p>
      </div>
    </div>
  </a>
</div>

<div style="margin-top: 2rem;"></div>

After completing your preferred setup, return here to continue with the tutorial.

---

## Step 2: Setup the Tutorial Database {#database}

The tutorial uses a PostgreSQL database as a data source. Start the database container using Docker Compose:

```bash
docker compose -f examples/getting-started/database/docker-compose.yml up -d
```

Verify the database container is running:

```bash
docker compose -f examples/getting-started/database/docker-compose.yml ps
```

You should see the `getting-started-postgres` container with a status of `Up`:

```text
NAME                       IMAGE                COMMAND                  SERVICE    CREATED          STATUS                    PORTS
getting-started-postgres   postgres:14-alpine   "docker-entrypoint.s…"   postgres   31 seconds ago   Up 30 seconds (healthy)   0.0.0.0:5432->5432/tcp
```

If the container shows a different status or you see errors, check the container logs with `docker compose -f examples/getting-started/database/docker-compose.yml logs`. See the [Docker Compose documentation](https://docs.docker.com/compose/) for additional troubleshooting help.

### Initialize the Database

Once the container is up, initialize the database schema and sample data.

The tutorial uses a simple `Message` table with the following schema:

| Field | Type | Description |
|-------|------|-------------|
| MessageId | integer | Unique message identifier |
| From | varchar(50) | Who sent the message |
| Message | varchar(200) | The message content |
| CreatedAt | timestamp | When the message was sent |

<div style="margin-top: 1.5rem;"></div>

The `Message` table is initially populated with these messages:

| MessageId | From | Message |
|-----------|------|---------|
| 1 | Buzz Lightyear | To infinity and beyond! |
| 2 | Brian Kernighan | Hello World |
| 3 | Antoninus | I am Spartacus |
| 4 | David | I am Spartacus |

<div style="margin-top: 1.5rem;"></div>

Run the database initialization script:

```bash
docker exec -i getting-started-postgres psql -U postgres -d getting_started < examples/getting-started/database/init.sql
```

You should see:

```text
NOTICE:  Getting Started database initialized successfully!
NOTICE:  Tables: Message
NOTICE:  Publication: drasi_pub
NOTICE:  Replication slot: drasi_slot
```

Verify the sample data was loaded:

```bash
docker exec getting-started-postgres psql -U drasi_user -d getting_started -c 'SELECT * FROM "Message";'
```

You should see the 4 sample messages:

```text
 MessageId |      From       |         Message          |         CreatedAt          
-----------+-----------------+--------------------------+----------------------------
         1 | Buzz Lightyear  | To infinity and beyond!  | 2026-02-10 21:30:08.123456
         2 | Brian Kernighan | Hello World              | 2026-02-10 21:30:08.123456
         3 | Antoninus       | I am Spartacus           | 2026-02-10 21:30:08.123456
         4 | David           | I am Spartacus           | 2026-02-10 21:30:08.123456
(4 rows)
```

---

## Step 3: Create Your First Configuration {#phase-1}

Now you'll create your initial Drasi Server configuration using the interactive `drasi-server init` command.

The `init` command walks you through an interactive wizard that will assist you in creating a correctly formatted Drasi Server config file. The wizard will only write the config file at the end, so if you make a mistake just break out of the wizard using `ctrl-c` and run `drasi-server init` again. 


> **Note:** The `init` command cannot be used to edit existing config files, you must edit them in your preferred text editor.


### Create the Drasi Server Configuration

From the tutorial root folder, run the following command:

```bash
./bin/drasi-server init --output getting-started.yaml
```

Here's what to enter at each prompt:

#### 1. Server Settings

Configuration starts with general Drasi Server settings.

| Prompt | Enter | Notes |
|--------|-------|-------|
| **Server host** | `0.0.0.0` (default) | Press Enter to accept |
| **Server port** | `${SERVER_PORT:-8080}` | Uses env var with 8080 as default (see note below) |
| **Log level** | `info` | Use arrow keys to select |
| **Enable persistent indexing (RocksDB)?** | `No` (default) | Press Enter to accept |
| **State store** | `None` | Use arrow keys to select "None - In-memory state" |

<div style="margin-top: 1.5rem;"></div>

Your terminal should show this once you have completed the Server Settings section of the wizard:

```text
Server Settings
---------------
> Server host: 0.0.0.0
> Server port: ${SERVER_PORT:-8080}
> Log level: info
> Enable persistent indexing (RocksDB)? No
> State store (for plugin state persistence): None - In-memory state (lost on restart)
```

> **Environment variables in config values:** The `${SERVER_PORT:-8080}` syntax tells Drasi Server to use the value of the `SERVER_PORT` environment variable, falling back to `8080` if it isn't set. You can use this `${VAR:-default}` pattern in any configuration value.

#### 2. Data Sources

After configuring server settings, you'll add a data source. For this tutorial, use the arrow keys to highlight **PostgreSQL**, press Space to select the source, then Enter.

After selecting PostgreSQL, you'll configure the database connection settings:

| Prompt | Enter | Notes |
|--------|-------|-------|
| **Source ID** | `my-postgres` | A unique name for this source |
| **Database host** | `${DB_HOST:-localhost}` | Defaults to `localhost` if `DB_HOST` is not set |
| **Database port** | `${POSTGRES_HOST_PORT:-5432}` | Defaults to `5432` if `POSTGRES_HOST_PORT` is not set |
| **Database name** | `getting_started` | The tutorial database |
| **Database user** | `drasi_user` | |
| **Database password** | `drasi_password` | Type the password (characters won't display) and press Enter |
| **Tables to monitor** | `Message` | The table we'll query |
| **Configure table keys for tables without primary keys??** | `Yes` | Required for CDC change tracking |
| **Does table 'Message' need key columns specified?** | `Yes` | Need to configure tableKey for `Message` table |
| **Key columns for 'Message'** | `MessageId` | The Message table's primary key |
| **Bootstrap provider** | `PostgreSQL` | Use arrow keys to select "PostgreSQL - Load initial data" |


<div style="margin-top: 1.5rem;"></div>

Your terminal should show this once you complete the Data Source section of the wizard:

```text
Data Sources
------------
Select one or more data sources for your configuration.

> Select sources (space to select, enter to confirm): PostgreSQL - CDC from PostgreSQL database

Configuring PostgreSQL Source
------------------------------
> Source ID: my-postgres
> Database host: ${DB_HOST:-localhost}
> Database port: ${POSTGRES_HOST_PORT:-5432}
> Database name: getting_started
> Database user: drasi_user
> Database password: ********
> Tables to monitor (comma-separated): Message
> Configure table keys for tables without primary keys? Yes
> Does table 'Message' need key columns specified? Yes
> Key columns for 'Message' (comma-separated): MessageId
> Bootstrap provider (for initial data loading): PostgreSQL - Load initial data from PostgreSQL
```

#### 3. Reactions

Finally, you will add a Reaction to process changes to the Continuous Query results. 

Use the arrow keys to highlight **Log**, press Space to select the Reaction, then Enter.

After selecting Log, you'll configure the following settings:

| Prompt | Enter | Notes |
|--------|-------|-------|
| **Reaction ID** | `log-reaction` (default) | Press Enter to accept |
 
After completing the Reactions section of the wizard, your terminal will show the following:

```text
Reactions
---------
Select how you want to receive query results.

> Select reactions (space to select, enter to confirm): Log - Write query results to console

Configuring Log Reaction
------------------------
> Reaction ID: log-reaction


Configuration saved to: getting-started.yaml

Next steps:
  1. Review and edit getting-started.yaml as needed
  2. Run: drasi-server --config getting-started.yaml
```

### Update the Default Continuous Query

The wizard created a default Continuous Query that selects all nodes from the `my-postgres` Source. Now you'll edit the Continuous Query to select only `Message` nodes and to rename some of their fields for clarity.

Open `getting-started.yaml` in your preferred editor and find the `queries` section. The wizard's default Continuous Query looks like this:

```yaml
queries:
- id: my-query
  autoStart: true
  query: MATCH (n) RETURN n
  queryLanguage: GQL
  middleware: []
  sources:
  - sourceId: my-postgres
    nodes: []
    relations: []
    pipeline: []
  enableBootstrap: true
  bootstrapBufferSize: 10000
```

Replace the `id` and `query` settings as shown here:

```yaml
queries:
  - id: all-messages
    autoStart: true
    query: |
      MATCH (m:Message)
      RETURN m.MessageId AS MessageId, m.From AS From, m.Message AS Message
    queryLanguage: GQL
    ...
```

The `|` character allows you to write the query across multiple lines for readability. The `Message` label in the `Match` clause must match the table name exactly (labels are case-sensitive). Leave the other fields (`queryLanguage`, `sources`, etc.) as they are.

### Update the Log Reaction
Because you changed the Continuous Query's `id` from `my-query` to `all-messages`, you need to update the Log Reaction's configuration to subscribe to the new Continuous Query ID.

Find the `reactions` section in your config file and update the `queries` field to reference the new query ID as shown here:

```yaml
reactions:
  - kind: log
    id: log-reaction
    queries:
      - all-messages    # Update this from my-query to all-messages
    autoStart: true
```

### Run Drasi Server

Run Drasi Server with your new configuration using the following command:

```bash
./bin/drasi-server --config getting-started.yaml
```

You'll see detailed startup logs as Drasi Server initializes all configured Sources, Continuous Queries, and Reactions. There's a lot of output, so look for these key lines:

```
Starting Drasi Server
  Config file: getting-started.yaml
  API Port: 8080
  Log level: info
```

This shows the name of the config file being used, the log level that controls the output to the console, and the port on which the Drasi Server management API is accessible.

```
[log-reaction] Started - receiving results from queries: ["all-messages"]
```

This confirms that the `log-reaction` Reaction is subscribed to Query Result Change notifications from the `all-messages` Continuous Query.

```
Drasi Server started successfully with API on port 8080
```

Shortly after, the bootstrap process loads the initial data from the `Messages` table and passes it to the `all-messages` query for processing. Look for output like this in the console:

```text
[BOOTSTRAP] Query 'all-messages' completed bootstrap from source 'my-postgres' (4 events)
[BOOTSTRAP] Query 'all-messages' all sources completed bootstrap
[BOOTSTRAP] Emitted bootstrapCompleted signal for query 'all-messages'

```

### View Continuous Query Results

At any time you can view the current result set of a Continuous Query using Drasi Server's [REST API](../reference/rest-api/). For example, choose your preferred method to view the `all-messages` query results:

{{< tabpane text=true >}}
{{% tab header="Browser" %}}

Click to open the following URL in a browser:

<a href="http://localhost:8080/api/v1/queries/all-messages/results" target="_blank">http://localhost:8080/api/v1/queries/all-messages/results</a>

{{% /tab %}}
{{% tab header="curl" %}}

Run the following curl command in the terminal:

```bash
curl -s http://localhost:8080/api/v1/queries/all-messages/results
```

{{% /tab %}}
{{% tab header="VS Code REST Client" %}}

If you are using VS Code, you can call the REST API using the <a href="https://marketplace.visualstudio.com/items?itemName=humao.rest-client" target="_blank">REST Client extension</a>.

The Drasi Server repo includes a file at `examples/getting-started/requests.http` that contains a variety of pre-written REST API requests for use with the Getting Started tutorial.

{{% /tab %}}
{{< /tabpane >}}

However you choose to view the `all-messages` results, that data will look something like this (formatted for readability):

```json
{
  "success": true,
  "data": [
    {
      "From": "Buzz Lightyear",
      "Message": "To infinity and beyond!",
      "MessageId": "1"
    },
    {
      "From": "Brian Kernighan",
      "Message": "Hello World",
      "MessageId": "2"
    },
    {
      "From": "Antoninus",
      "Message": "I am Spartacus",
      "MessageId": "3"
    },
    {
      "From": "David",
      "Message": "I am Spartacus",
      "MessageId": "4"
    }
  ],
  "error": null
}
```

> **Tip:** The Drasi Server REST API also provides a Swagger UI at **http://localhost:808/api/v1/docs/** where you can explore all available endpoints interactively.

### Test the all-messages Continuous Query

Open a **new terminal** and run the following command to manually insert a record into the `Message` table:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "INSERT INTO \"Message\" (\"From\", \"Message\") VALUES ('You', 'My first message!');"
```

Watch the Drasi Server console — a notification of an addition to the `all-messages` query result appears instantly output by the Log Reaction:

```text
[log-reaction] Query 'all-messages' (1 items):
[log-reaction]   [ADD] {"From":"You","Message":"My first message!","MessageId":"5"}
```
> **Tip:** You can customize the Log Reaction output format using templates. See [Configure Log Reaction](../how-to-guides/configuration/configure-reactions/configure-log-reaction/) for details.

If you view the `all-messages` query results again through the REST API, you'll see the new message included in the result set.

Now, run the following command to update the message we just inserted and change its text:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "UPDATE \"Message\" SET \"Message\" = 'My first UPDATED message!' WHERE \"MessageId\" = 5;"
```

The notification output by the Log Reaction shows the the item from the query result before and after the update:

```text
[log-reaction] Query 'all-messages' (1 items):
[log-reaction]   [UPDATE] {"From":"You","Message":"My first message!","MessageId":"5"} -> {"From":"You","Message":"My first UPDATED message!","MessageId":"5"}
```

If you view the `all-messages` query results again through the REST API, you'll see the message text has been updated in the query result set.

Finally, delete the message with this command:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "DELETE FROM \"Message\" WHERE \"MessageId\" = 5;"
```

The console shows the message being deleted from the query's result set:

```text
[log-reaction] Query 'all-messages' (1 items):
[log-reaction]   [DELETE] {"From":"You","Message":"My first UPDATED message!","MessageId":"5"}
```

If you view the `all-messages` query results again through the REST API, you'll see the message is no longer included in the result set.

{{< alert title="Key Concept" color="info" >}}
All data source changes that alter the result set of a Continuous Query generate notifications that are delivered to subscribed Reactions for handling. The above example demonstrates the simple Log Reaction that displays these notifications to the console, but there are more sophisticated Reactions that can send notifications to other systems, trigger actions, update databases, and more. You can also write your own custom Reactions to implement any behavior you want in response to changes in your data.
{{< /alert >}}

<div style="margin-top: 1.5rem;"></div>

**✅ Checkpoint**: You've created your first Source, Continuous Query, and Reaction. You know how to view the current result set of a Continuous Query through the REST API. And you've also seen how changes in the database flow into Drasi Server and notification of changes to Continuous Query results are output by Reactions as soon as they happen. 

---

## Step 4: Add a Query with Criteria {#phase-2}

The `all-messages` Continuous Query is very simple and includes all messages written to the Message table. Now you'll add a second Continuous Query that answers the question "Who sent messages containing 'Hello World'?". You will add the new `hello-world-senders` Continuous Query using the Drasi Server REST API so you learn how to extend your configuration without restarting Drasi Server. 

### The hello-world-senders Query

Here's how the new query would look in a Drasi Server config file:

```yaml
- id: hello-world-senders
  autoStart: true
  sources:
    - sourceId: my-postgres
  query: |
    MATCH (m:Message) 
    WHERE m.Message = 'Hello World' 
    RETURN m.MessageId AS Id, m.From AS Sender
  queryLanguage: Cypher
```

The `MATCH` clause selects all `Message` nodes from the data source. The `WHERE` clause filters to only messages where the `Message` field equals `'Hello World'` — so changes to messages with different content won't appear in this query's result set. The `RETURN` clause renames the output fields to `Id` and `Sender`.

Notice this query uses `queryLanguage: Cypher` instead of `GQL` — Drasi Server supports Continuous Queries written in both [GQL](../../reference/query-language/gql.md) and [openCypher](../../reference/query-language/cypher.md).

### Add the Query via the REST API

In your second terminal, use the following `curl` command to create the `hello-world-senders` Continuous Query:

```bash
curl -X POST http://localhost:8080/api/v1/queries \
  -H "Content-Type: application/json" \
  -d '{
    "id": "hello-world-senders",
    "autoStart": true,
    "sources": [{"sourceId": "my-postgres"}],
    "query": "MATCH (m:Message) WHERE m.Message = '\''Hello World'\'' RETURN m.MessageId AS Id, m.From AS Sender",
    "queryLanguage": "Cypher"
  }'
```

> **Note:** This command is also included in the `examples/getting-started/requests.http` file for use with the VS Code REST Client extension.

The new `hello-world-senders` Continuous Query references the same `my-postgres` Source used by the original `all-messages` Continuous Query — multiple Continuous Queries can share the same Source.

### Update the Log Reaction

Without a Reaction subscribed to the `hello-world-senders` Continuous Query, Drasi Server will not send notifications when the query results change.

To subscribe the Log Reaction to the new query, you need to delete and re-create it with both queries listed.

> **Note:** Drasi Server does not currently support editing existing Sources, Continuous Queries, or Reactions through the REST API. To modify a component, you must delete it and re-add it with the updated configuration.

```bash
# Delete the existing log reaction
curl -X DELETE http://localhost:${SERVER_PORT:-8080}/api/v1/reactions/log-reaction

# Re-create it subscribed to both queries
curl -X POST http://localhost:${SERVER_PORT:-8080}/api/v1/reactions \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "log",
    "id": "log-reaction",
    "queries": ["all-messages", "hello-world-senders"],
    "autoStart": true
  }'
```

You should see in the Drasi Server console that the `log-reaction` is now subscribed to both queries.

Also, if you open the Drasi Server config file (getting-started.yaml), you'll see that the new query has been added to the `queries` section, and the `log-reaction` configuration has been updated to include both queries. Drasi Server automatically updates the config file when you make changes through the REST API, so the config file is always an up-to-date representation of your running Drasi Server configuration. You can stop Drasi Server from automatically updating the config file by setting `persistConfig` to `false` in the server settings section of the config file.

### Test the hello-world-senders Continuous Query

Run the following command to insert a new message that matches the `WHERE` criteria of the `hello-world-senders` query:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "INSERT INTO \"Message\" (\"From\", \"Message\") VALUES ('Alice', 'Hello World');"
```

Watch the console and you will see notifications for both the `all-messages` and `hello-world-senders` queries — the new message is part of both query result sets:

```
[log-reaction] Query 'hello-world-senders' (1 items):
[log-reaction]   [ADD] {"Id":"6","Sender":"Alice"}
[log-reaction] Query 'all-messages' (1 items):
[log-reaction]   [ADD] {"From":"Alice","Message":"Hello World","MessageId":"6"}
```

Now add a message that doesn't match the `hello-world-senders` criteria:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "INSERT INTO \"Message\" (\"From\", \"Message\") VALUES ('Bob', 'Goodbye World');"
```

The console shows the new message in the `all-messages` query, but there is no notification for the `hello-world-senders` query because the new message doesn't meet the query's `WHERE` criteria and so isn't part of that query's result set:

```
[log-reaction] Query 'all-messages' (1 items):
[log-reaction]   [ADD] {"From":"Bob","Message":"Goodbye World","MessageId":"7"}
```

**✅ Checkpoint**: You understand how to add new Continuous Queries to a running Drasi Server instance via the REST API. You also understand how `WHERE` clauses in Continuous Queries control what data is part of the query's result set and therefore what changes generate notifications to subscribed Reactions.

---

## Step 5: Add an Aggregation Query {#phase-3}

Drasi maintains state across all the data it processes, enabling Continuous Queries that compute aggregations — like counts, sums, or averages — that update automatically as the underlying data changes. This is useful for dashboards, reporting, and any scenario where you need live summary statistics without polling or recalculating from scratch.

### The message-counts Query

Here's the new query as it would appear in a Drasi Server config file:

```yaml
- id: message-counts
  autoStart: true
  sources:
    - sourceId: my-postgres
  query: |
    MATCH (m:Message) 
    RETURN m.Message AS MessageText, count(m) AS Count
  queryLanguage: Cypher
```

The `count(m)` aggregation groups messages by their `Message` text and counts how many times each message has been sent. As messages are inserted or deleted, Drasi automatically recalculates the affected counts.

### Add the Query via the REST API

```bash
curl -X POST http://localhost:8080/api/v1/queries \
  -H "Content-Type: application/json" \
  -d '{
    "id": "message-counts",
    "autoStart": true,
    "sources": [{"sourceId": "my-postgres"}],
    "query": "MATCH (m:Message) RETURN m.Message AS MessageText, count(m) AS Count",
    "queryLanguage": "Cypher"
  }'
```

### Introduce the SSE CLI

Until now, you've been watching changes through the Log Reaction in the Drasi Server console. For the remaining steps, you'll use the **SSE CLI** — a command-line tool included in the Drasi Server repo that streams query result changes directly to your terminal. It automatically creates a temporary SSE Reaction on the server and cleans it up when you press `Ctrl+C`.

Build the SSE CLI:

```bash
cd examples/sse-cli && cargo build --release && cd ../..
```

### Stream the message-counts Query

In a **new terminal**, start the SSE CLI to stream changes from the `message-counts` query:

```bash
./examples/sse-cli/target/release/drasi-sse-cli \
  --server http://localhost:8080 \
  --query message-counts
```

You'll see:

```text
Creating SSE reaction 'sse-cli-...' for query 'message-counts'... done.
Streaming events (Ctrl-C to stop)...
```

### Test Aggregation Updates

In your other terminal, insert a new "Hello World" message:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "INSERT INTO \"Message\" (\"From\", \"Message\") VALUES ('Eve', 'Hello World');"
```

Watch the SSE CLI terminal — you'll see the count update:

```json
{
  "queryId": "message-counts",
  "results": [
    { 
      "after": { 
        "Count": 3,
        "MessageText": "Hello World"
      },
      "before": { 
        "Count": 2,
        "MessageText": "Hello World"
      }
    }
  ]
}
```

The count for "Hello World" incremented from 2 to 3. 

Now delete Eve's message:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "DELETE FROM \"Message\" WHERE \"From\" = 'Eve';"
```

The count goes back down:

```json
{
  "queryId": "message-counts",
  "results": [
    { 
      "after": { 
        "Count": 2,
        "MessageText": "Hello World"
      },
      "before": { 
        "Count": 3,
        "MessageText": "Hello World"
      }
    }
  ]
}
```

Drasi didn't re-scan the table — it incrementally updated the aggregation based on each individual change.

Press `Ctrl+C` in the SSE CLI terminal to stop streaming.

**✅ Checkpoint**: You understand that Drasi tracks state — aggregations update in real-time as data changes, without re-querying the database.

---

## Step 6: Add Time-Based Detection {#phase-4}

Drasi can detect patterns over time, including the *absence* of activity. This is powerful for monitoring and alerting scenarios — for example, detecting when a sensor stops reporting, when a user goes idle, or when an expected event doesn't happen within a deadline.

### The inactive-senders Query

Here's the new query as it would appear in a Drasi Server config file:

```yaml
- id: inactive-senders
  autoStart: true
  sources:
    - sourceId: my-postgres
  query: |
    MATCH (m:Message) 
    WITH m.From AS MessageFrom, max(drasi.changeDateTime(m)) AS LastMessageTimestamp 
    WHERE LastMessageTimestamp <= datetime.realtime() - duration({ seconds: 20 }) 
      OR drasi.trueLater(LastMessageTimestamp <= datetime.realtime() - duration({ seconds: 20 }), 
                         LastMessageTimestamp + duration({ seconds: 20 })) 
    RETURN MessageFrom, LastMessageTimestamp
  queryLanguage: Cypher
```

This query introduces two Drasi-specific functions:

- **`drasi.changeDateTime(m)`** — returns the timestamp when the node was last changed, rather than relying on a user-managed timestamp column. This means the query works even if the table doesn't have a `CreatedAt` field.
- **`drasi.trueLater(condition, futureTime)`** — schedules Drasi to re-evaluate the condition at `futureTime`. Without this, the time-based `WHERE` clause would only be checked when data changes. With `drasi.trueLater`, Drasi automatically re-evaluates after the 20-second window expires, causing idle senders to appear in the result set even when no new data arrives.

The `WHERE` clause combines two conditions with `OR`: senders who are *already* inactive, and a scheduled future check for senders who *will become* inactive if no new message arrives within 20 seconds.

### Add the Query via the REST API

```bash
curl -X POST http://localhost:8080/api/v1/queries \
  -H "Content-Type: application/json" \
  -d '{
    "id": "inactive-senders",
    "autoStart": true,
    "sources": [{"sourceId": "my-postgres"}],
    "query": "MATCH (m:Message) WITH m.From AS MessageFrom, max(drasi.changeDateTime(m)) AS LastMessageTimestamp WHERE LastMessageTimestamp <= datetime.realtime() - duration({ seconds: 20 }) OR drasi.trueLater(LastMessageTimestamp <= datetime.realtime() - duration({ seconds: 20 }), LastMessageTimestamp + duration({ seconds: 20 })) RETURN MessageFrom, LastMessageTimestamp",
    "queryLanguage": "Cypher"
  }'
```

### Stream the inactive-senders Query

In a separate terminal, start the SSE CLI:

```bash
./examples/sse-cli/target/release/drasi-sse-cli \
  --server http://localhost:8080 \
  --query inactive-senders
```

### Wait and Observe

After about 20 seconds of inactivity, senders will start appearing in the SSE CLI output as they become inactive:

```json
{
  "queryId": "inactive-senders",
  "results": [
    { "op": "i", "data": { "MessageFrom": "Buzz Lightyear", "LastMessageTimestamp": "2026-..." } }
  ]
}
```

### Reactivate a Sender

In your other terminal, send a message from Alice:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "INSERT INTO \"Message\" (\"From\", \"Message\") VALUES ('Alice', 'Still here!');"
```

Watch the SSE CLI — Alice disappears from the inactive list (her `LastMessageTimestamp` just updated). After 20 more seconds of inactivity, she'll reappear automatically thanks to `drasi.trueLater`.

Press `Ctrl+C` to stop the SSE CLI.

**✅ Checkpoint**: You understand that Drasi can detect the *absence* of activity over time — a powerful capability for monitoring, alerting, and SLA enforcement.

---

## Step 7: Add Cross-Source Joins {#phase-5}

So far you've used a single PostgreSQL source. Now you'll add an HTTP source and join data across both sources using a virtual relationship. Cross-source joins are useful when related data lives in different systems — for example, combining database records with live data from APIs, IoT devices, or microservices.

**Scenario**: Track where message senders are currently located and their availability status. Imagine the HTTP source receives location updates from a mobile app or badge system.

### The messages-with-location Query

Here's the join query as it would appear in a Drasi Server config file:

```yaml
- id: messages-with-location
  autoStart: true
  sources:
    - sourceId: my-postgres
    - sourceId: location-tracker
  query: |
    MATCH (m:Message)-[:FROM_USER]->(u:UserLocation) 
    WITH m.Message, m.From, u.location, u.status, max(m.CreatedAt)
    RETURN m.MessageId AS Id, m.Message AS Message, 
           m.From AS Sender, u.location AS Location, u.status AS Status
  queryLanguage: Cypher
  joins:
    - id: FROM_USER
      keys:
        - label: Message
          property: From
        - label: UserLocation
          property: name
```

The `joins` section creates a virtual relationship `FROM_USER` that connects `Message.From` to `UserLocation.name`. This lets the `MATCH` clause traverse across sources as if the data were in a single graph. The query references **two sources** — `my-postgres` and `location-tracker` — and Drasi handles the join across them.

### Add an HTTP Source

Create the HTTP source via the REST API:

```bash
curl -X POST http://localhost:8080/api/v1/sources \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "http",
    "id": "location-tracker",
    "autoStart": true,
    "host": "0.0.0.0",
    "port": 9000,
    "bootstrapProvider": {
      "kind": "scriptfile",
      "filePaths": ["examples/getting-started/locations.json"]
    }
  }'
```

The `bootstrapProvider` loads initial location data from a JSON file on startup.

### Add the Query via the REST API

```bash
curl -X POST http://localhost:8080/api/v1/queries \
  -H "Content-Type: application/json" \
  -d '{
    "id": "messages-with-location",
    "autoStart": true,
    "sources": [{"sourceId": "my-postgres"}, {"sourceId": "location-tracker"}],
    "query": "MATCH (m:Message)-[:FROM_USER]->(u:UserLocation) RETURN m.MessageId AS Id, m.Message AS Message, m.From AS Sender, u.location AS Location, u.status AS Status",
    "queryLanguage": "Cypher",
    "joins": [{
      "id": "FROM_USER",
      "keys": [
        {"label": "Message", "property": "From"},
        {"label": "UserLocation", "property": "name"}
      ]
    }]
  }'
```

### Stream the messages-with-location Query

In a separate terminal, start the SSE CLI:

```bash
./examples/sse-cli/target/release/drasi-sse-cli \
  --server http://localhost:8080 \
  --query messages-with-location
```

The bootstrap data includes locations for some senders, so you may see initial results appear.

### Update Location in Real-Time

Simulate Brian moving to a new location by sending an update to the HTTP source:

```bash
curl -X POST http://localhost:9000/sources/location-tracker/events \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "update",
    "element": {
      "type": "node",
      "id": "brian",
      "labels": ["UserLocation"],
      "properties": {"name": "Brian Kernighan", "location": "Conference Room B", "status": "away"}
    }
}'
```

Watch the SSE CLI — Brian's messages now show the new location:

```json
{
  "queryId": "messages-with-location",
  "results": [
    { "op": "u", "data": { "before": { "Id": 2, "Message": "Hello World", "Sender": "Brian Kernighan", "Location": "Building A, Floor 3", "Status": "online" }, "after": { "Id": 2, "Message": "Hello World", "Sender": "Brian Kernighan", "Location": "Conference Room B", "Status": "away" } } }
  ]
}
```

### Add a New User Location

Send a message from a new user and then add their location:

```bash
docker exec -it getting-started-postgres psql -U drasi_user -d getting_started -c \
  "INSERT INTO \"Message\" (\"From\", \"Message\") VALUES ('Alice', 'Good morning!');"

curl -X POST http://localhost:9000/sources/location-tracker/events \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "insert",
    "element": {
      "type": "node",
      "id": "brian",
      "labels": ["UserLocation"],
      "properties": {"name": "Alice", "location": "Home Office", "status": "online"}
    }
}'
```

Alice's message appears in the joined query once her location is added — the join is resolved in real-time.

Press `Ctrl+C` to stop the SSE CLI.

**✅ Checkpoint**: You understand how to join data across multiple sources using virtual relationships. Changes to either source propagate through the join in real-time.

---

## What You've Learned {#summary}

You built a complete change-driven solution from scratch:

| Concept | What You Did |
|---------|-------------|
| **Sources** | Created PostgreSQL and HTTP sources to connect Drasi to different data systems |
| **Queries** | Wrote 5 Continuous Queries: simple change detection, criteria-based selection, aggregation, time-based detection, and cross-source joins |
| **Reactions** | Configured a Log Reaction for console output and used the SSE CLI to stream query result changes to your terminal |
| **Joins** | Connected data across sources using virtual relationships |
| **Configuration** | Used `drasi-server init` to scaffold an initial configuration, then dynamically added components via the REST API |
| **REST API** | Used the REST API to create, delete, and query Sources, Continuous Queries, and Reactions while the server is running |

The core Drasi pattern: **Sources connect to data → Continuous Queries detect changes → Reactions distribute notifications of result set changes**.

---

## Cleanup {#cleanup}

Stop Drasi Server with `Ctrl+C`.

Stop the tutorial database:

```bash
docker compose -f examples/getting-started/database/docker-compose.yml down -v
```

The `-v` flag removes the persistent volume. Without it, the database data persists after the container is removed and can cause confusion if you restart the tutorial later.

---

## Next Steps

<div class="card-grid">
  <a href="/concepts/overview/">
    <div class="unified-card unified-card--concepts">
      <div class="unified-card-icon"><i class="fas fa-lightbulb"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Understand Drasi Concepts</h3>
        <p class="unified-card-summary">Understand how Drasi works under the hood</p>
      </div>
    </div>
  </a>
  <a href="../how-to-guides/configuration/configure-sources/">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-database"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Configure Sources</h3>
        <p class="unified-card-summary">Detect changes in PostgreSQL, HTTP, gRPC, and more</p>
      </div>
    </div>
  </a>
  <a href="../how-to-guides/configuration/configure-queries/">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-search"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Configure Queries</h3>
        <p class="unified-card-summary">Write advanced Continuous Queries in GQL and openCypher</p>
      </div>
    </div>
  </a>
  <a href="../how-to-guides/configuration/configure-reactions/">
    <div class="unified-card unified-card--howto">
      <div class="unified-card-icon"><i class="fas fa-bolt"></i></div>
      <div class="unified-card-content">
        <h3 class="unified-card-title">Configure Reactions</h3>
        <p class="unified-card-summary">React to changes using SSE, gRPC, Stored Procedures, and more</p>
      </div>
    </div>
  </a>
</div>