---
name: Token efficiency rules (org-wide)
description: Org-wide rules Claude Code must follow on every task to minimize token burn while keeping output correct, safe, and context-aware. Quality is never the casualty — these are efficiency wins, not shortcuts.
type: feedback
---

# Token efficiency rules (org-wide)

Context budget is finite. Each 5-hour Claude Code session has a hard cap. Claude must actively conserve tokens so the session reaches a natural end, not a context-exhausted crash. Rules below, in priority order.

**Non-negotiable: none of these override correctness.** If a shortcut risks a wrong answer, skip the shortcut. But most token burn is waste, not quality.

## 1. Read surgically — never dump whole files

- Default: `Read` with `offset` + `limit` targeting **only the relevant 20-50 lines**.
- Use `Grep` with `-C 3` for a few surrounding lines before reaching for a full `Read`.
- Full-file `Read` is acceptable only when the file is short (<100 lines) AND every section matters.
- **Don't re-read a file that has been auto-refreshed by a system-reminder.** The reminder already contains the current state.

## 2. Grep with `head_limit` — always

- Exploratory grep defaults to `head_limit: 20` or lower. Rarely need >50 matches.
- If the first 20 aren't enough, refine the pattern — don't raise the limit.
- `files_with_matches` mode before `content` mode when you just need to know *which files*.

## 3. Git: use narrow commands

- `git show <sha> -- <specific-file>` — not full-commit diffs with tens of files.
- `git log --oneline -5` + `| head` — never unbounded history.
- `git diff --stat` before `git diff` full content.
- `grep` the diff via pipe when the full diff is large.

## 4. Mechanical edits → one `Bash` `sed` call, not N `Edit` calls

- 5+ identical renames/replaces across many files → single `grep -rl PATTERN | xargs sed -i 's|A|B|g'`.
- Savings: N Reads + N Edits + N system-reminders collapse into one Bash + one grep-verify.

## 5. Delegate exploration to subagents

- Any investigation that would take **more than ~3 Read/Grep calls**: spawn an `Explore` subagent.
- The big reads stay inside the subagent's context; Claude gets a terse summary back.
- Especially for "find where X is defined across the codebase" or "map the FE→BE flow for feature Y".
- Cost of spawning a subagent < cost of burning main-context on the same research.

## 6. Batch parallel tool calls aggressively — but think before doing

- Independent reads/writes → one message with multiple tool calls (single network round-trip, less session overhead).
- **But**: parallel Edits on files that auto-reload trigger multi-KB system-reminders per edit. Weigh the reminder cost — sometimes one Bash sed beats 10 parallel Edits.

## 7. Use `/compact` at natural breaks

- After a PR merges, after a subagent returns a report, after a bug is confirmed fixed.
- `/compact` keeps the summary, drops raw tool output — **30-70% context recovered**.
- If the user is about to give a new task, a pre-emptive `/compact` at the turn boundary pays back immediately.

## 8. Use `/clear` when switching unrelated contexts

- Unrelated task hand-offs → `/clear` is cheaper than carrying stale context.
- Anything "remembered" that matters should already be in git-tracked memory files, not in session context.

## 9. Fast mode (`/fast`) when the task is mechanical

- Opus 4.6 on fast mode is cheaper per turn with equivalent quality on sweeps, renames, mechanical refactors, and most CI/config edits.
- Keep full Opus 4.7 for architecture, novel bug diagnosis, security review, tricky code generation.

## 10. Short, specific responses

- End-of-turn summary: 1-2 sentences. "Shipped X. Next?"
- No rehashing of what was just done — the user saw the tool calls.
- Avoid preamble ("Let me now…"), bullet-lists of "what I did", celebratory closings.
- If the answer is a single URL, return the URL. If it's a single sentence, return the sentence.

## 11. Between tool calls, ≤25 words

- One sentence of narration per tool batch, max. Not a running commentary.
- No restating the plan before each tool — the prior plan still stands.

## 12. Don't narrate policy or branching decisions the user already gave

- If they said "merge it" — don't re-explain that merging triggers a deploy. Just merge.
- Trust accumulated context. Confirm only for destructive or newly-risky actions.

## 13. Prefer memory lookups over re-investigation

- Before exploring, grep existing `.claude/memory/*.md` for existing pointers.
- Any search/investigation taking >1 min must be saved to memory as file+line pointers — don't pay discovery cost twice.

## 14. End-of-turn self-check

Before the final response, ask: "Did I say anything here that the user already knew?" If yes, delete it. Did I re-read a file already in context? That's waste — note it.

## 15. Accept system-reminder cost as mostly unavoidable

- File system-reminders fire on every post-Edit re-read — multi-KB each, not controllable.
- To reduce *their* frequency: fewer Edits per turn. Prefer one `sed` + one commit over 10 Edits + 1 commit.
- Plan the edit set before executing; batch in a single commit per logical change.

## 16. Prompt caching for stable context (Claude API work)

When building Claude API integrations (any product where the `anthropic` SDK is called directly, not Claude Code CLI): mark system prompts, large doc references, and fixed context with `cache_control: {"type": "ephemeral"}`.

- **Savings:** cache reads cost 0.1× base input tokens. Typical 85% latency drop on repeat calls, proportional token cost reduction.
- **Thresholds:** minimum 4,096 tokens (Opus/Haiku), 2,048 (Sonnet) to be cacheable.
- **Layout:** place *static* content first, *changing* content last so the cache prefix stays valid.
- **TTL:** 5-min default (free refresh), 1-hour for less-frequent tasks.
- **Source:** <https://platform.claude.com/docs/en/build-with-claude/prompt-caching>
- **Caveat:** API-level. Claude Code CLI doesn't expose caching controls directly yet — this rule applies to product integrations with AI features.

## 17. Subagents for task isolation — aggressively

Expanded from rule 5. Cost of spawning a subagent < cost of burning main context on the same research.

- **When to delegate:** any investigation >3 Read/Grep calls, any planning >500 words of scratch thinking, any research that involves reading docs/URLs.
- **Briefing format:** self-contained prompt, explicit "report in under 500 words, bulleted, with source URLs". The big reads stay in the subagent.
- **Return format:** ask for a condensed summary, not raw output. If the subagent returns 10KB, the cost moved but didn't drop.
- **Parallelize independent research** — multiple subagent calls in one message so they run concurrently.

## 18. Skills: `disable-model-invocation: true` for reference-only skills

For any skill under `.claude/skills/` that's a *reference* (API docs, checklists, playbooks) rather than a *task*:

```yaml
---
name: some-reference-skill
description: Brief enough to judge relevance in ~100 tokens
disable-model-invocation: true
---
```

- **Savings:** only the 100-token description lives in context. The full skill body (can be 5-10 KB) loads only when explicitly invoked via `/<skill-name>`.
- **Tradeoff:** won't auto-invoke contextually — the user (or a memory rule) has to remember to call it.
- **When to flag it:** reference material that's rarely used per session. For often-needed skills, leave auto-invocation on.

## 19. Just-in-time dynamic context in skills

Inside `.claude/skills/*.md` files, use shell backticks to inject live data at skill-invocation time:

```markdown
Current git state:
!`git status --short`

Changed files:
!`git diff --name-only HEAD~1`
```

- **Savings:** skill body stays small; Claude sees *live* data when the skill runs instead of stale cached examples.
- **Use cases:** branch info, recent commits, current test failures, API health check output.
- **Caveat:** command runs before Claude sees the prompt. Must be fast — don't run codebase-wide scans in a skill. Seconds, not minutes.

## 20. Context editing (`compact_20260112` beta) — monitor for CLI support

API-level feature that auto-strips stale tool outputs (old file reads, outdated grep results) when context fills — *without* compacting the entire conversation.

- **Claimed savings:** 84% context reduction in 100-turn evaluations, 29% performance lift.
- **Status:** beta on the Claude API (Opus/Sonnet 4.5+) as `betas=["compact-2026-01-12"]`. Claude Code CLI doesn't expose it yet — watch release notes.
- **When it lands in CLI:** prefer it over manual `/compact` for long sessions where the bloat is stale tool output, not novel reasoning.

## 21. Audit MCP servers with `/mcp`

MCP tool descriptions are deferred-loaded by default in Claude Code, but **connected server count still affects context**. Each connected MCP server adds overhead.

- **Action:** periodically run `/mcp` to list connected servers. Disable any not actively used this session.
- **Savings:** not huge per server, but cumulative across a long session and many servers.

## 22. Auto-memory + git-tracked memory (compound effect)

The combination of `.claude/memory/MEMORY.md` (auto, local, git-tracked) + per-user personal memory is the canonical long-session context pattern.

- **Implication:** every non-trivial finding should go to one of these two places. Session context is *transient* and expensive; memory is *durable* and cheap.
- **Compact-instructions steer:** adding a "Compact Instructions" block to CLAUDE.md tells Claude Code what to keep when auto-compacting. Worth considering for any product with long sessions.

---

**Priority when torn:**
Correctness → Safety → Context-awareness → Token efficiency.

Never sacrifice the first three for the fourth. But never burn tokens on work that doesn't serve any of them either.

---

## Self-audit checklist (run before /compact)

- Did Claude Read any file >200 lines? Should it have used offset/limit?
- Did Claude leave a grep without `head_limit`?
- Did any mechanical edit touch 5+ files via N tool calls when `sed` would've worked?
- Did Claude spawn a subagent for any research >3 grep calls?
- Did Claude write any end-of-turn text >2 sentences?
- Is there a finding from this turn that should be pinned to memory instead of staying in session?