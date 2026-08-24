# ⚡ AgentForge

<p align="center">
  <img src="https://img.shields.io/badge/AGENTIC-AI-7C3AED?style=for-the-badge&labelColor=0B0F19" />
  <img src="https://img.shields.io/badge/LANGGRAPH-ORCHESTRATION-00B894?style=for-the-badge&labelColor=0B0F19" />
  <img src="https://img.shields.io/badge/FASTAPI-REALTIME-009688?style=for-the-badge&labelColor=0B0F19&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/RAG-HYBRID-FF6B35?style=for-the-badge&labelColor=0B0F19" />
  <img src="https://img.shields.io/badge/MCP-TOOLS-111827?style=for-the-badge&labelColor=0B0F19" />
  <img src="https://img.shields.io/badge/MIT-LICENSE-22C55E?style=for-the-badge&labelColor=0B0F19" />
</p>

<h1 align="center">
  Build AI Systems That <br/>
  <strong>Think Beyond One Prompt.</strong>
</h1>

<p align="center">
  <b>Plan. Retrieve. Reason. Collaborate. Execute. Verify.</b>
</p>

<p align="center">
  AgentForge is an extensible multi-agent AI platform built around
  <br/>
  LangGraph, hybrid RAG, knowledge graphs, MCP tools,
  <br/>
  human-in-the-loop workflows, persistent state, and real-time streaming.
</p>

<p align="center">
  <a href="#-why-agentforge">Why AgentForge</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-capabilities">Capabilities</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## ✦ The Idea

Most AI applications still look like this:

```text
┌──────────┐      ┌─────────┐      ┌──────────┐
│   USER   │ ───► │   LLM   │ ───► │  ANSWER  │
└──────────┘      └─────────┘      └──────────┘
```

AgentForge is built around a different execution model:

```text
                         ┌──────────────┐
                         │     USER     │
                         └──────┬───────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ INTENT ROUTER   │
                       └───────┬─────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │   SUPERVISOR    │
                       └───────┬─────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │ WEB/RAG  │     │  GRAPH   │     │   MATH   │
        │  AGENT   │     │  AGENT   │     │  AGENT   │
        └────┬─────┘     └────┬─────┘     └────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                     ┌──────────────────┐
                     │ TOOLS / MCP      │
                     └────────┬─────────┘
                              ▼
                     ┌──────────────────┐
                     │ HUMAN APPROVAL   │
                     └────────┬─────────┘
                              ▼
                     ┌──────────────────┐
                     │  EVALUATION      │
                     └────────┬─────────┘
                              ▼
                         FINAL ANSWER
```

The current implementation already includes a 12-agent LangGraph workflow, routing, RAG, knowledge-graph reasoning, web retrieval, HITL, persistence, and evaluation.

---

# 🚀 Why AgentForge?

AgentForge is built for people who want to move from:

> **"LLM wrapper"**

to:

> **"AI system."**

It combines multiple AI engineering patterns in one extensible foundation:

<table>
<tr>
<td align="center" width="33%">

### 🧠

**Agent Orchestration**

Supervisor-driven LangGraph workflows with specialized reasoning stages.

</td>

<td align="center" width="33%">

### 🔎

**Hybrid RAG**

Vector retrieval + lexical retrieval + fusion + reranking.

</td>

<td align="center" width="33%">

### 🕸️

**Knowledge Graph**

Relationship-aware reasoning over local knowledge.

</td>
</tr>

<tr>
<td align="center">

### 🔌

**MCP**

External tool integration with local fallbacks.

</td>

<td align="center">

### 🧑‍⚖️

**HITL**

Pause workflows and require explicit approval.

</td>

<td align="center">

### 💾

**Persistent State**

Checkpointed graph state + durable conversations.

</td>
</tr>

<tr>
<td align="center">

### ⚡

**Streaming**

Real-time FastAPI streaming endpoints.

</td>

<td align="center">

### 📊

**Observability**

Prometheus + Grafana + health/readiness probes.

</td>

<td align="center">

### 🔐

**Authentication**

User-scoped authenticated workflows.

</td>
</tr>
</table>

These capabilities are already represented in the repository's current implementation and documentation.

---

# 🧩 12-Stage Intelligence Pipeline

AgentForge currently orchestrates:

```text
01  Safety
02  Intent Routing
03  Clarification
04  Query Rewriting
05  Recency Guard
06  Human Approval Gate
07  Web Retrieval
08  Knowledge Graph Reasoning
09  RAG
10  Mathematical Reasoning
11  Response Generation
12  Evaluation
```

### Why this matters

A user does not need to know which AI mechanism is appropriate.

AgentForge decides:

```text
"What kind of reasoning does this task require?"
                ↓
"Which information sources are relevant?"
                ↓
"Which tools should be used?"
                ↓
"Does this require approval?"
                ↓
"How should the answer be verified?"
```

---

# 🔍 Retrieval That Goes Beyond Vector Search

AgentForge's local RAG pipeline combines multiple retrieval strategies:

```text
                   QUERY
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Semantic Retrieval      Lexical Retrieval
      (Vector)                  (BM25)
          │                     │
          └──────────┬──────────┘
                     ▼
              Rank Fusion
                     │
                     ▼
                Reranking
                     │
                     ▼
             Grounded Context
```

The current Chroma-based pipeline supports vector retrieval, lexical ranking, Reciprocal Rank Fusion, and optional LLM reranking.

---

# 🕸️ Knowledge Graph Reasoning

Not every question is semantic.

Some questions are about **relationships**.

AgentForge provides a dedicated graph-oriented retrieval path:

```text
Documents
    ↓
Graph-RAG Store
    ↓
Relationship Retrieval
    ↓
NetworkX Reasoning
    ↓
RAG Grounding
    ↓
Answer
```

This is designed for relationship-style local queries and uses a separate graph-RAG ingestion path.

---

# 🔌 MCP — Tool Connectivity

AgentForge supports MCP-backed tools through a dedicated bridge architecture.

```text
             Agent
               │
               ▼
          MCP Bridge
               │
               ▼
         MCP Tool Server
           ╱         ╲
          ▼           ▼
      Web Search   Calculator
```

The current implementation also provides local fallbacks when MCP is unavailable.

---

# 🛡️ Human-in-the-Loop

AI does not have to blindly continue every workflow.

For supported tasks:

```text
        Agent
          │
          ▼
      Proposed
       Action
          │
     ┌────┴────┐
     ▼         ▼
  APPROVE    REJECT
     │         │
     ▼         ▼
 CONTINUE     STOP
```

## AgentForge persists HITL decisions with user/thread context for auditing.

# 💾 Persistent Intelligence

AgentForge isn't designed around a disposable request.

### LangGraph Checkpointing

```text
Graph State
     ↓
Checkpoint
     ↓
Resume
```

### Conversation Store

```text
User
 ↓
Thread
 ↓
Messages
 ↓
Metadata
 ↓
Audit
```

The documented persistence layer includes PostgreSQL checkpointer tables, conversation storage, users, and HITL events.

---

# ⚡ Real-Time by Design

### API

```http
POST /invoke
POST /stream
```

### Operational Endpoints

```http
GET /healthz
GET /readyz
GET /metrics
```

### Persistence

```http
GET /store/threads
GET /store/{thread_id}
POST /feedback
```

The project also exposes authenticated registration/login and HITL audit endpoints.

---

# 📊 Built-In Observability

AgentForge ships with:

```text
FastAPI
   │
   ▼
/metrics
   │
   ▼
Prometheus
   │
   ▼
Grafana
```

You can monitor:

* request rate
* 5xx error rate
* P95 latency
* traffic by endpoint
* status-code distribution

---

# 🏗️ Architecture at a Glance

```text
                         ┌───────────────────┐
                         │       USER        │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │      FASTAPI      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │   INTENT ROUTER   │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │     SUPERVISOR    │
                         └─────────┬─────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
                  ▼                ▼                ▼
             ┌─────────┐      ┌─────────┐      ┌─────────┐
             │   WEB   │      │   RAG   │      │  GRAPH  │
             │  AGENT  │      │  AGENT  │      │  AGENT  │
             └────┬────┘      └────┬────┘      └────┬────┘
                  │                │                │
                  └────────────────┼────────────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    MCP / TOOLS    │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    HITL GATE      │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │    EVALUATION     │
                         └─────────┬─────────┘
                                   │
                                   ▼
                         ┌───────────────────┐
                         │  FINAL RESPONSE   │
                         └───────────────────┘
```

---

# 🧰 Stack

| Layer            | Technology                 |
| ---------------- | -------------------------- |
| 🐍 Backend       | Python                     |
| ⚡ API            | FastAPI                    |
| 🧠 Orchestration | LangGraph                  |
| 🖥️ UI           | Streamlit                  |
| 🐘 Persistence   | PostgreSQL                 |
| 🔎 RAG           | ChromaDB                   |
| 🕸️ Graph        | NetworkX                   |
| 🔌 Tools         | MCP                        |
| ⚡ Cache          | Redis / in-memory fallback |
| 📈 Monitoring    | Prometheus + Grafana       |
| 🐳 Containers    | Docker                     |
| ☸️ Deployment    | Kubernetes                 |
| 🔁 CI/CD         | GitHub Actions             |

---

# 📁 Repository Structure

```text
AgentForge/
│
├── agent/                 # AI orchestration + agents + tools
├── client/                # Python client
├── service/               # FastAPI service + persistence
├── schema/                # Request / response schemas
├── scripts/               # RAG ingestion
├── docs/                  # Architecture documentation
├── docker/                # Container definitions
├── k8s/                   # Kubernetes manifests
├── monitoring/            # Prometheus configuration
├── media/                 # Architecture assets
│
├── compose.yaml
├── run_service.py
├── run_client.py
├── streamlit_app.py
├── requirements.txt
└── README.md
```

The current repository separates orchestration, tools, local RAG, graph RAG, persistence, service APIs, monitoring, and deployment.

---

# 🧪 CI/CD

The repository currently includes:

### Continuous Integration

* Python tests
* Docker build verification
* push/PR triggers

### Continuous Delivery

* version-tag releases
* Docker image publishing
* manual dispatch

These workflows are already documented in the repository.

---

# 🚀 Quick Start

### Clone

```bash
git clone https://github.com/Roshanrameshhub/AgentForge.git
cd AgentForge
```

### Install

```bash
pip install -r requirements.txt
```

### Start API

```bash
python run_service.py
```

### Start UI

```bash
streamlit run streamlit_app.py
```

### Optional full infrastructure

```bash
docker compose up -d --build
```

The documented local stack includes FastAPI, Streamlit, Prometheus, and Grafana.

---

# 📚 Feed AgentForge Your Own Knowledge

Place PDFs inside:

```text
rag_docs/
```

Run:

```bash
python scripts/ingestion/ingest_local_rag_pdfs.py \
  --pdf-dir rag_docs \
  --reset
```

Then ask:

```text
local: summarize the uploaded documents
```

For graph-oriented documents:

```text
graph_rag_docs/
```

```bash
python scripts/ingestion/ingest_graph_rag_pdfs.py \
  --pdf-dir graph_rag_docs \
  --reset
```

---

# 🌌 Roadmap

AgentForge is evolving toward a broader **autonomous AI workbench**.

### ✅ Foundation

* [x] LangGraph supervisor
* [x] Multi-agent workflow
* [x] Hybrid RAG
* [x] Knowledge graph reasoning
* [x] MCP tools
* [x] Human-in-the-loop
* [x] Persistent graph state
* [x] Conversation persistence
* [x] Streaming
* [x] Monitoring
* [x] Authentication

### 🚧 Intelligence

* [ ] Dynamic task planning
* [ ] Parallel agent execution
* [ ] Long-term memory
* [ ] Context compression
* [ ] Agent verification
* [ ] Self-correction
* [ ] Better evaluation
* [ ] Advanced retrieval

### 🔮 Next Generation

* [ ] Multimodal AI
* [ ] Realtime voice
* [ ] Computer-use workflows
* [ ] Expanded MCP ecosystem
* [ ] Agent/plugin marketplace
* [ ] Autonomous multi-step execution

The existing codebase already provides the supervisor, retrieval, HITL, persistence, MCP, and monitoring foundations on which these capabilities can evolve.

---

# ⚠️ Current Limitations

The current implementation is strong as an orchestration foundation but is still evolving.

Known limitations include:

* heuristic evaluation rather than complete factual verification
* clarification requiring a subsequent user turn
* possible routing errors for ambiguous inputs
* retrieval quality depending on ingestion, embeddings, chunking, and reranking quality

---

# 🎯 What AgentForge Is For

AgentForge can serve as a foundation for building:

```text
Research Agents
Developer Copilots
Knowledge Assistants
Document Intelligence
Enterprise AI Workflows
Autonomous Task Systems
Multi-Agent Applications
```

The underlying goal is simple:

> **Don't build another chatbot. Build a system that can reason through work.**

---

# 🤝 Contributing

Contributions are welcome across:

* new agents
* retrieval strategies
* MCP integrations
* security
* evaluation
* observability
* agent state
* multimodal workflows
* performance optimization

---

# ⚖️ License

AgentForge is distributed under the **MIT License**.

See [`LICENSE`](LICENSE) for the full terms.

This project is derived from an MIT-licensed open-source foundation and has been renamed and substantially extended as **AgentForge**. Original license and copyright notices are retained.

---

<p align="center">

## ⚡ AgentForge

### **From prompts → to reasoning → to autonomous workflows.**

**The orchestration layer for the next generation of AI applications.**

</p>
