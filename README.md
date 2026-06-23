# TPC-AIOS

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

**TPC-AIOS is a simplified, open-source cut of TPC-AI — the agent harness behind [Pandora](https://pandora.thepocket.company/), a multi-tenant product [Accucrazy](https://accucrazy.com/) runs in production for customers.**

[Pandora](https://pandora.thepocket.company/) is the live product; TPC-AI is the multi-tenant agent
harness powering it; TPC-AIOS is a single-user distillation of that harness. I took the cloud-coupled
system we actually operate, pulled out the tenancy and cloud-specific plumbing, and kept the core
that makes an agent runtime tick — small enough to read in an afternoon. This open-source cut isn't
itself a product and isn't a tutorial; it's an honest look at how the real thing is built.

> [!NOTE]
> The production product (Pandora, built on TPC-AI) is multi-tenant and serves customers. This
> open-source cut is a simplified demonstration of how the harness is built — not a maintained
> product, and not wired to run end-to-end (the embedding seam throws until you point it at an
> embedder, and there's no UI). The code is real; treat it as a reference to read and borrow from,
> not a dependency to install.

---

## Highlights

There are two layers here, and the second is the part I find worth sharing.

**The usual building blocks** — what any agent harness needs, kept as small readable modules:

- a ReAct loop (native function-calling first, regex fallback);
- a tool registry, a plugin system, and an MCP client for external tools;
- conversation memory with hybrid keyword + vector search;
- skills with progressive disclosure;
- store-then-reference context feeding;
- multiple model providers behind one interface (OpenAI-compatible + Gemini);
- delegation to other agents.

**The parts a single-user tool usually doesn't need** — carried over from the multi-tenant system
this came from, because they're what lets it grow without rotting:

- one capability contract governs core, plugin, and MCP tools alike;
- security enforced in the runtime, not the prompt (SSRF guard, untrusted-content boundaries);
- identity travels with each call instead of sitting in a global — and fails loudly when it's missing;
- a reserved tool namespace held in place by an invariant checked at registration;
- declarative, layered tool policy (deny over allow);
- per-run usage metering and ownership checks, kept as live seams.

It runs as single-user (identity is just `local`), but that second layer is intact rather than
deleted — partly so widening back out to multi-tenant is a config change, partly because the
contrast is the interesting part. See [`src/cautionary/`](src/cautionary/).

---

## Architecture at a glance

```
                          ┌───────────────────────────────┐
          ask(input) ───▶ │  Agent: Vin (AgentDefinition)  │   an agent is a row of data
                          └───────────────┬───────────────┘
                                          ▼
                          ┌───────────────────────────────┐
                          │  ReAct loop                    │   native FC → regex fallback
                          │  fail-closed tool gate         │   → unknown/denied never runs
                          └───────────────┬───────────────┘
                                          ▼
      ┌──────────────── the AgentTool contract (one shape) ─────────────────┐
      │   source: 'core' | 'plugin' | 'mcp'    ·    name 'mcp__' ⟺ source    │
      └──┬────────────┬────────────┬────────────┬────────────┬───────────┬──┘
         ▼            ▼            ▼            ▼            ▼           ▼
    ┌─────────┐  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐
    │  Tools  │  │ Policy │  │ Security │  │Providers │  │ Memory │  │  Skills  │
    │ registry│  │deny >  │  │ SSRF +   │  │ OpenAI / │  │ SQLite │  │progressive│
    │         │  │ allow  │  │untrusted │  │ Gemini   │  │ RRF/MMR│  │disclosure│
    └─────────┘  └────────┘  └──────────┘  └──────────┘  └────────┘  └──────────┘
         ▲                                                                
     ┌───┴─────┐   ┌───────────┐   ┌─────────┐                           
     │ Plugins │   │ MCP stdio │   │ Context │   store-then-reference     
     └─────────┘   └───────────┘   └─────────┘                           
```

The planes, and where each lives:

| Plane | What it is | Where |
|---|---|---|
| Capability contract | one `AgentTool` shape for core/plugin/MCP tools | [`src/types.ts`](src/types.ts), [`docs/01`](docs/01-capability-map.md) |
| Naming & boundaries | reserved `mcp__` namespace, enforced invariant | [`src/tools/tool-name.ts`](src/tools/tool-name.ts), [`docs/02`](docs/02-naming-and-boundaries.md) |
| Tool runtime + security | registry, policy, SSRF, untrusted content | [`src/policy/`](src/policy/), [`src/security/`](src/security/), [`docs/03`](docs/03-tool-runtime-security.md) |
| Providers | provider-agnostic; OpenAI-compatible + optional Gemini | [`src/providers/`](src/providers/) |
| Memory | SQLite, RRF/MMR/temporal decay, embed seam | [`src/memory/`](src/memory/), [`docs/08`](docs/08-memory-lifecycle.md) |
| Context | store-then-reference feeding, compaction safeguard | [`src/context/`](src/context/), [`docs/07`](docs/07-context-feeding.md) |
| Skills | progressive disclosure | [`src/skills/`](src/skills/), [`docs/09`](docs/09-skill-platform.md) |
| Plugins / MCP | runtime extension + external tool materialization | [`src/plugin/`](src/plugin/), [`src/mcp/`](src/mcp/) |
| The ReAct loop | the readable engine skeleton | [`src/agent/react-loop.ts`](src/agent/react-loop.ts) |
| Multi-agent | delegation as one data-driven tool (`delegate_to_agent`) | [`src/agent/delegate.tool.ts`](src/agent/delegate.tool.ts), [`docs/13`](docs/13-delegation-and-subagents.md) |
| Tenancy (collapsed) | the single↔multi-tenant seams kept as a reference | [`src/cautionary/`](src/cautionary/), [`docs/05`](docs/05-tenant-isolation-collapsed.md) |

---

## Quickstart

```bash
cp .env.example .env          # pick a provider: an OpenAI-compatible endpoint, or Gemini
```

The wiring lives in [`src/index.ts`](src/index.ts):

```ts
import { boot, ask } from './src/index.js';
await boot();                                   // providers + tools + memory
console.log((await ask('…')).answer);           // the one agent, Vin
```

Keys come from the environment only — nothing hardcoded. Pick a provider in `.env`: an
OpenAI-compatible endpoint (`OPENAI_BASE_URL` / `OPENAI_MODEL`), or Gemini (`GEMINI_API_KEY`, then
`HARNESS_PROVIDER=gemini`). Conversation memory is a local SQLite file. See `.env.example`.

---

## Docs

Each part has a short note in [`docs/`](docs/) on roughly why it's shaped the way it is — read
whichever is relevant, no need to go in order:

`00` foundations · `01` capability map · `02` naming & boundaries · `03` tool runtime + security ·
`04` resilience & data discipline · `05` tenant isolation (collapsed) · `06` metering ·
`07` context feeding · `08` memory lifecycle · `09` skill platform · `10` engineering discipline ·
`11` mechanism over form · `12` future control plane · `13` delegation & sub-agents · plus
[`docs/SECURITY.md`](docs/SECURITY.md).

---

## License

[MIT](LICENSE) © 2026 [Accucrazy](https://accucrazy.com/) · built for [Pandora](https://pandora.thepocket.company/).
