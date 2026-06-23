# Prompt Engineering Best Practices

A synthesis of official guidance from **Anthropic** (Claude) and **OpenAI** (GPT),
distilled into shared principles plus the vendor-specific advice that matters in
practice. Sourced from each company's current documentation (see [Sources](#sources)).

> **TL;DR** — Be explicit, give context and examples, structure the prompt, and tell
> the model what to *do* rather than what *not* to do. Both vendors converge on these.
> They diverge mostly on *how much* hand-holding to give, on formatting conventions
> (Claude favors XML tags; GPT favors Markdown/structure), and on how to treat
> reasoning models vs. standard models.

---

## 1. Before you prompt

Prompt engineering is the *cheapest* lever, but not always the right one. Establish
these first:

1. **Define success criteria** — know what "good" output looks like before tuning.
2. **Build a way to test** — even a handful of eval cases beats eyeballing.
3. **Start from a first draft** — then iterate against the criteria.

> Not every failure is a prompting problem. Latency and cost are often better solved by
> switching models; accuracy ceilings may need retrieval, tools, or fine-tuning.
> Prompt engineering is **iterative**: draft → observe → refine wording, context, and
> specificity → repeat.

---

## 2. Universal principles (both vendors agree)

### 2.1 Be clear, specific, and direct
Treat the model like a brilliant but brand-new colleague with no context on your norms.
The more precisely you state the desired output, format, and constraints, the better the
result. If you want "above and beyond" behavior, *ask for it explicitly* — don't rely on
inference.

> **Golden rule (Anthropic):** Show your prompt to a colleague with minimal context. If
> they'd be confused, so will the model.

- Specify the **outcome, length, format, and tone** you want.
- For ordered or multi-part work, use **numbered steps or bullet points**.
- Reduce "fuzzy" descriptors. Instead of *"fairly short"*, say *"in 2–3 sentences."*

### 2.2 Provide context and motivation
Explaining *why* you want something helps the model generalize to your intent.

| Less effective | More effective |
| --- | --- |
| `NEVER use ellipses` | `This will be read by a text-to-speech engine, so never use ellipses — it can't pronounce them.` |

### 2.3 Show, don't just tell — use examples (few-shot)
A few well-crafted input/output examples are one of the most reliable ways to steer
format, tone, and structure. Make examples:

- **Relevant** — mirror your real use case.
- **Diverse** — cover edge cases so the model doesn't latch onto an unintended pattern.
- **Structured** — visually/semantically separated from the instructions.

Anthropic recommends **3–5 examples**; you can even ask the model to critique your
examples for relevance/diversity or generate more.

### 2.4 Put instructions where the model will weight them
- Put **instructions at the start** of the prompt; separate them from context with a
  delimiter (`###`, `"""`, or tags).
- For **long context**, repeat key instructions at **both the top and the bottom** —
  models attend most strongly to the edges of a long input.

### 2.5 Say what TO do, not what NOT to do
Positive framing steers more reliably than prohibitions.

| Instead of | Try |
| --- | --- |
| "Do not use Markdown." | "Write in smoothly flowing prose paragraphs." |
| "Don't ask the user for their info." | "Diagnose from the symptoms; if data is missing, suggest the next diagnostic step." |

### 2.6 Structure the prompt into labeled sections
Both vendors recommend organizing prompts into clear regions — Role/Objective,
Instructions, Reasoning steps, Output format, Examples, Context. Use **Markdown headers**
or **XML/tags** so the model can tell instructions from data from examples.
(Anthropic leans XML tags; OpenAI leans Markdown + occasional XML.)

### 2.7 Encourage step-by-step reasoning for hard tasks
Letting the model "think" before answering improves accuracy on multi-step problems.
Errors usually come from misunderstanding intent, insufficient context-gathering, or
weak step-by-step reasoning — all of which deliberate reasoning mitigates. (See the
reasoning-model caveat in §5.)

### 2.8 Use the right tools for grounding
- **Retrieval-Augmented Generation (RAG):** supply relevant proprietary context so the
  model answers from your data, not its priors.
- **Tool/function calling:** let the model act rather than guess.
- **Prompt caching:** put stable, reusable content at the **start** of the prompt to cut
  cost and latency on repeated calls.

---

## 3. Structure & formatting conventions

| Concern | Anthropic (Claude) | OpenAI (GPT) |
| --- | --- | --- |
| Primary delimiter | **XML tags** (`<instructions>`, `<context>`, `<example>`, `<document>`) | **Markdown** headers/lists; XML for document-heavy tasks |
| Multiple documents | `<documents><document index="n"><source>…</source><document_content>…</document_content></document></documents>` | XML or ID-based formats; **JSON underperforms** for many docs |
| Output shaping | Ask for an XML-tagged output region; use Structured Outputs for schemas | "Output Format" section; JSON mode / structured outputs |
| Roles | `system` sets role/persona | `developer` > `user` > `assistant` authority hierarchy |

**Match your prompt's style to the desired output.** If you want prose, write the prompt
in prose; heavy Markdown in the prompt tends to produce heavy Markdown in the response.

---

## 4. Anthropic / Claude-specific guidance

### 4.1 Give Claude a role
A one-line `system` persona (`"You are a senior Python reviewer…"`) measurably focuses
tone and behavior.

### 4.2 XML tags are first-class
Wrap each content type in its own descriptive, consistent tag; nest when there's natural
hierarchy. This is the single biggest lever for parsing complex Claude prompts cleanly.

### 4.3 Long-context tips
- **Put longform data at the top**, above the query/instructions/examples — can improve
  quality by up to ~30% on complex multi-document inputs.
- **Ground answers in quotes:** ask Claude to first extract relevant quotes (into
  `<quotes>` tags), then reason from them — cuts through document noise.

### 4.4 Control verbosity and format explicitly
Modern Claude is concise by default and may skip post-tool summaries. If you want
visibility, ask for it. To reduce Markdown/bullet spam, instruct prose explicitly (and
keep your own prompt in prose).

### 4.5 Thinking is adaptive — tune effort, not steps
- Current models use **adaptive thinking** (`thinking: {type: "adaptive"}`) controlled by
  an **`effort`** parameter, *not* manual `budget_tokens`.
- Prefer **general instructions** ("think thoroughly", "verify your answer before
  finishing") over hand-written step lists — Claude's reasoning often beats a prescribed
  plan.
- Watch for **overthinking** at high effort; constrain with "pick an approach and commit"
  or lower `effort`.
- **Prefill is deprecated** (4.6+ returns 400 on a trailing assistant turn). Use
  Structured Outputs, tool calling, or a direct "respond without preamble" instruction
  instead.

### 4.6 Don't over-prompt the newest models
Claude 4.x is far more proactive and instruction-literal. Aggressive legacy phrasing
("CRITICAL: you MUST…", "If in doubt, use the tool") now causes **over**-triggering.
Dial it back to normal phrasing ("Use this tool when…").

### 4.7 Be explicit about action vs. suggestion
"Can you suggest changes?" may yield only suggestions. To get edits, say "Change this
function…" Use `<default_to_action>` / `<do_not_act_before_instructions>` system snippets
to set the default posture.

### 4.8 Parallel tool calls
Claude parallelizes tool calls well; you can push to ~100% with a `<use_parallel_tool_calls>`
snippet (and explicitly note when calls are dependent and must be sequential).

### 4.9 Agentic & long-horizon work
- **Track state in files:** structured JSON (`tests.json`) for status, freeform
  `progress.txt` for notes, and **git** for checkpoints.
- **Multi-context-window tasks:** use the first window to scaffold (tests, setup scripts),
  later windows to iterate a todo list; prefer starting fresh + reading filesystem state
  over compaction when feasible.
- **Context awareness:** tell Claude if the harness auto-compacts so it doesn't wrap up
  early to "save tokens."
- **Curb over-engineering** with an explicit "keep it minimal" snippet (no unrequested
  features, docs, defensive code, or abstractions).
- **Curb hallucination** with "never speculate about code you haven't opened — read the
  file first."
- **Curb test-gaming** with "implement a general solution, not one that only passes the
  tests; don't hard-code."

### 4.10 Context engineering (agents)
> Goal: *the smallest set of high-signal tokens that maximize the desired outcome.*

- **System prompts at the right "altitude"** — neither brittle hardcoded logic nor vague
  platitudes. Organize with headers/tags; start minimal, add only on observed failures.
- **Tools:** self-contained, robust to error, unambiguous. If a human can't tell which
  tool to use, neither can the model. Minimize overlap; return token-efficient results.
- **Just-in-time retrieval:** pass lightweight identifiers (paths/URLs) and let the agent
  load detail on demand instead of pre-loading everything.
- **Long-horizon strategies:** compaction (summarize + discard), structured note-taking
  (persist memory outside context), and sub-agents (delegate, return condensed summaries).

---

## 5. OpenAI / GPT-specific guidance

### 5.1 Standard models vs. reasoning models — opposite instincts
- **GPT (standard) models** want **explicit, precise instructions** — spell out the
  logic and data.
- **Reasoning models** do better with **high-level goals**; over-specifying the steps can
  hurt. Give them the objective and constraints, let them work out the *how*.

### 5.2 Message-role hierarchy
`developer` instructions outrank `user` messages, which outrank `assistant`. Put durable
app rules in the `developer`/system role. Store production prompts in code (versioned,
testable) rather than ad-hoc.

### 5.3 GPT-4.1 follows instructions literally
4.1 is more literal than its predecessors — under-specification shows. Recommended flow:

1. Start with a high-level **"Response Rules"** section.
2. Add detailed sections for specific behaviors.
3. Use **ordered steps** for workflows.
4. Debug by hunting **conflicting instructions** and adding clarifying examples.

> "A single sentence firmly and unequivocally clarifying your desired behavior is almost
> always sufficient to steer the model back on course."

### 5.4 Agentic system-prompt reminders (≈+20% on internal benchmarks)
Include three reminders for agent workflows:
1. **Persistence** — keep going until the task is fully resolved before yielding.
2. **Tool-calling** — use tools to get facts instead of guessing.
3. **Planning** (optional) — explicitly plan before, and reflect after, each call.

Use the API's native `tools` field rather than hand-injecting tool descriptions.

### 5.5 Long context (up to ~1M tokens)
- Decide and **state the knowledge boundary**: "use only the provided context" vs.
  "supplement with your own knowledge."
- **Repeat instructions at the start and end** of long inputs.
- For document-heavy prompts, **XML or ID-based formats beat JSON** in OpenAI's tests.

### 5.6 Chain of thought without a reasoning model
GPT-4.1 isn't a reasoning model but benefits from "think step by step." Start basic, then
refine the reasoning instructions based on observed failure patterns.

### 5.7 Classic API tactics (still hold)
- Use the **latest/most capable** model for the task.
- **Temperature 0** for factual extraction and deterministic Q&A; raise it for creative
  variety.
- Use **descriptive adjectives** for tone (formal, friendly, technical…).
- **Show and tell**, then iterate.

---

## 6. Quick-reference checklist

**Foundations (every prompt)**
- [ ] Stated the task, output format, length, and tone explicitly
- [ ] Gave context / motivation for non-obvious instructions
- [ ] Included 3–5 relevant, diverse examples (if format/consistency matters)
- [ ] Phrased instructions as "do this," not "don't do that"
- [ ] Put instructions first; repeated key ones at the end of long inputs
- [ ] Structured the prompt into labeled sections (XML for Claude, Markdown for GPT)

**Reasoning & tools**
- [ ] Asked for step-by-step reasoning on multi-step tasks
- [ ] Standard model → precise steps; reasoning model → goals only
- [ ] Added a self-check / verification instruction
- [ ] Used tools/RAG for facts instead of relying on model memory

**Vendor-specific**
- [ ] *Claude:* tuned `effort` (not `budget_tokens`); dropped legacy "CRITICAL/MUST"
      over-prompting; dropped prefill; XML tags + quote-grounding for long docs
- [ ] *GPT:* set `developer`-role rules; added persistence/tool/planning reminders for
      agents; stated the context knowledge boundary

**Then**
- [ ] Tested against eval cases and iterated

---

## Sources

**Anthropic**
- [Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)
- [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

**OpenAI**
- [Prompt engineering (API guide)](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [GPT-4.1 prompting guide (cookbook)](https://developers.openai.com/cookbook/examples/gpt4-1_prompting_guide)
- [Best practices for prompt engineering with the OpenAI API](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api)
- [Prompt engineering best practices for ChatGPT](https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt)

*Synthesized 2026-06-23.*
