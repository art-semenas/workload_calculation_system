# Token Cost Analysis: Sub-Agents and Skills Patterns

*Date: 2026-03-17*

## The Core Mechanic

Every Claude API call is stateless. The full conversation history is re-sent on every turn. This means:

- **Fixed overhead** (system prompt, tool definitions, CLAUDE.md) → re-sent each turn, but **cached at 10% cost** after the first turn
- **Conversation history** → grows linearly, re-sent each turn at full cost
- **Skills** → injected once as a hidden `isMeta:true` message, then persist in history for the rest of the session
- **Sub-agents** → separate context windows; parent pays only for the result text returned

---

## Skills: What You Actually Pay

| Skill | Size | Est. tokens | Model |
|---|---|---|---|
| `tor-workload-review` | 167 lines | ~1,100–1,400 | Haiku |
| `sync-analyze` | 357 lines | ~2,300–3,000 | Haiku |
| `workbook-sheet-analysis` | 62+170 lines | ~1,500–2,000 | Haiku |
| Typical superpowers skill | 100–500 lines | 600–4,000 | Any |

**Available-but-not-invoked:** only the description (~20–60 tokens per skill). The full skill list is capped at 4,000 tokens across all skills combined.

**On invocation:** full content is injected once. For a 20-turn session after invocation, a 1,500-token skill costs `1,500 × 20 = 30,000` cumulative tokens in history — but these are **eligible for caching** once stable, reducing to ~3,000 tokens effective cost. At Haiku rates (~$0.00025/1K input cached tokens), this is a fraction of a cent.

**Verdict on skills:** Favourable at almost any reasonable session length. The cost is dominated by caching discounts. Three skills invoked simultaneously add ~5,000 tokens to history — negligible vs. the guidance value they provide over dozens of turns.

---

## Sub-Agents: What You Actually Pay

Each sub-agent starts a **fresh context window** with:
- Its own system prompt: ~500–3,000 tokens
- Tool definitions: ~5,000–55,000 tokens (depends on MCP config)
- CLAUDE.md auto-loaded: ~1,000–4,000 tokens
- Any skills in its `skills:` frontmatter

**Per-agent startup cost: 5,000–50,000 tokens** before it reads a single file.

Results returned to parent are **injected into parent context** as tool output. A sub-agent that returns 5,000 tokens adds those 5,000 tokens to the parent's history, compounding on every subsequent turn.

**Multiplier at current config (Haiku + medium effort):**

| Setup | Approximate token multiplier |
|---|---|
| Single agent, 20 turns | 1× |
| 3 parallel sub-agents (results: ~1,500 tokens each) | 3–4× total cost |
| 10 parallel sub-agents | 8–12× total cost |

The `sync-analyze` skill's design — spawn N subagents, collect JSON summaries (~200 tokens each), discard raw transcript — is the textbook correct pattern. The sub-agents pay the reading cost in their own isolated windows; the parent context accumulates only the distilled summaries.

**Verdict on sub-agents:** Favourable *only when used for isolation*, not for parallel execution of tasks that could run in the main thread. The startup overhead (~5–50K tokens per invocation) means sub-agents break even only for tasks that would otherwise inject thousands of tokens into the main context.

---

## What Makes the Tradeoff Unfavourable

1. **MCP server bloat.** If MCP servers are active, each adds 1,000–17,000 tokens to *every sub-agent's* startup cost. With 5+ servers, sub-agent startup can cost 55K tokens before any work.

2. **Verbose sub-agent returns.** A sub-agent that dumps raw file content back to the parent defeats the purpose of isolation.

3. **Skills invoked in short sessions.** A 2,000-token skill invoked on turn 1 of a 3-turn session is less efficient than simply prompting inline. Breakeven is roughly 5–10 turns.

4. **Multiple large skills in one session.** Three 3,000-token skills = 9,000 tokens of persistent history. At 30 subsequent turns, that is 270,000 cumulative token-turns — but caching reduces this to ~27,000 effective token-turns.

---

## SDD Framework Practical Recommendations

**Current config:** Haiku, medium effort, superpowers plugin enabled.

| Practice | Recommendation |
|---|---|
| Skill size | Keep under 300 lines for domain skills; reserve 300–500 lines only for multi-phase workflows like `sync-analyze` |
| Sub-agent result design | Always specify output format in the sub-agent prompt; JSON summaries, not raw content |
| MCP servers | Audit active MCP servers — disable unused ones. Each idle MCP server taxes every sub-agent startup |
| CLAUDE.md | Keep under 200 lines; move workflow-specific sections into skills |
| Parallel sub-agents | Use for I/O-bound isolation (reading many files, chunked documents). Avoid for logic that can run in-thread |
| Session structure | Invoke domain skills early (turn 1–3); amortize their context cost across the whole session |

**The tradeoff is favourable** under these conditions: prompt caching is working (stable early context), sub-agents return concise summaries, and skills are invoked in sessions long enough to justify the upfront injection.

---

## Context Accumulation Model

A concrete model for a 20-turn session with 2 skill invocations and 3 sub-agent calls:

**Turn-0 baseline (input tokens for first message):**
- System prompt: ~4,000 tokens (cached after this)
- Tool definitions: ~5,000–55,000 tokens
- CLAUDE.md: ~1,000–5,000 tokens (cached)
- First user message: ~50 tokens
- **Total turn-0 input: ~10,000–64,000 tokens**

**Growth curve (without compaction):**

```
tokens_turn_N ≈ fixed_overhead + (avg_turn_size × N) + skill_content + subagent_results
```

If average turn size = 500 tokens and fixed overhead = 10,000 tokens, by turn 50 you are at ~35,000 tokens/turn input. Auto-compaction triggers at ~190K total (95% of 200K window).

**Prompt caching effect:** Sessions with stable early context see 40–81% cost reduction. A documented real case reduced total cost from $6.00 to $1.15 via caching alone.

---

## Sources

- [Token counting — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Context windows — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- [Create custom subagents — Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Extend Claude with skills — Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Manage costs effectively — Claude Code Docs](https://code.claude.com/docs/en/costs)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Claude Code Subagent Cost Explosion: 887K Tokens/Min](https://www.aicosts.ai/blog/claude-code-subagent-cost-explosion-887k-tokens-minute-crisis)
- [Building a 24/7 Claude Code Wrapper? Here's Why Each Subprocess Burns 50K Tokens](https://dev.to/jungjaehoon/why-claude-code-subagents-waste-50k-tokens-per-turn-and-how-to-fix-it-41ma)
- [Prompt caching — Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Context Management with Subagents in Claude Code](https://www.richsnapp.com/article/2025/10-05-context-management-with-subagents-in-claude-code)
