# Prompt Engineering Best Practices

Research compiled from Anthropic, OpenAI, Palantir, DeepSeek, and prompt engineering guides.

## Core Principles

### 1. Tell What TO DO, Not What NOT to Do

Negative instructions ironically emphasize the unwanted behavior.

| Bad | Good |
|-----|------|
| "Do not use markdown" | "Write flowing prose paragraphs" |
| "NEVER output raw text" | "Use narrate() for all player communication" |
| "Don't ask for preferences" | "Recommend from trending movies" |

### 2. Provide Context (The WHY)

Models follow rules better when they understand the purpose.

| Bad | Good |
|-----|------|
| "NEVER use ellipses" | "Your response will be read aloud by text-to-speech, which cannot pronounce ellipses" |
| "You MUST use tools for ALL output" | "The player only sees output from narrate(). Text outside tool calls is invisible to them." |

### 3. Use Examples Showing Desired Behavior

Claude 4.x and DeepSeek pay close attention to examples. Show the correct format rather than explaining it abstractly.

```xml
<example>
User: I attack the goblin
Assistant: [calls narrate("You swing your sword at the goblin!")]
          [calls roll_dice(1, "d20")]
</example>
```

### 4. Structure with XML Tags

Use tags like `<rules>`, `<task>`, `<examples>` to create clear boundaries between sections.

```xml
<role>You are a game master for Daggerheart.</role>

<output_rules>
All player-facing text must go through narrate().
</output_rules>

<examples>
...
</examples>
```

### 5. Be Specific and Direct

Replace vague instructions with explicit ones.

| Bad | Good |
|-----|------|
| "Keep it short" | "Use 2-3 sentences" |
| "Be descriptive" | "Include one sensory detail (sound, smell, or texture) per scene" |
| "Create an analytics dashboard" | "Include user activity graphs, retention metrics, and export functionality" |

### 6. Match Prompt Style to Output Style

If you want minimal formatting in output, write your prompt with minimal formatting. The model tends to mirror the style it sees.

### 7. Start Simple, Iterate

Don't over-engineer on the first attempt. Test with real inputs and refine based on actual failures.

## Tool/Function Calling Specific

### Forcing Tool-Only Output

1. **API-level**: Use `tool_choice="required"` or `tool_choice="any"` when available
2. **Prompt-level**: Frame the model's role around tool use:
   - "You are an API caller. Call tools with valid JSON. Do not output prose."
   - "You communicate exclusively through tool calls."

### Sequencing Tool Calls

When outcomes depend on tool results (like dice rolls), the model must stop and wait:

```
✅ ALLOWED together: narrate(setup) + roll_dice()
   "The goblin attacks!" + roll(1, d20) → STOP

❌ FORBIDDEN together: roll_dice() + narrate(outcome)
   You don't know the result yet!
```

### DeepSeek-Specific Notes

- Adheres well to system prompts
- Less stable in multi-turn function calling
- V3.1/V3.2 improved stability significantly
- Benefits from few-shot examples in system prompt
- Ensure JSON schemas are correctly structured

## Anti-Patterns to Avoid

1. **Excessive negative language**: "FORBIDDEN", "NEVER", "WRONG", "penalized"
2. **Redundant emphasis**: Repeating the same rule 5 different ways
3. **Over-engineering**: Adding complexity before testing simple versions
4. **Vague threats**: "You will fail if..." without explaining why or what success looks like
5. **Walls of text**: Dense paragraphs instead of structured, scannable format

## Recommended Prompt Structure

```xml
<role>
[Who the model is - one sentence]
</role>

<output_format>
[How to communicate - positive framing, with WHY]
</output_format>

<rules>
[Numbered list of specific behaviors]
</rules>

<examples>
[2-3 examples showing correct behavior]
</examples>

<context>
[Domain knowledge, reference materials]
</context>
```

## Sources

- [Anthropic Claude 4 Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Prompt Engineering Guide - Tips](https://www.promptingguide.ai/introduction/tips)
- [Palantir - Best Practices for Prompt Engineering](https://www.palantir.com/docs/foundry/aip/best-practices-prompt-engineering)
- [Latitude - 10 Best Practices for Production-Grade LLM Prompt Engineering](https://latitude-blog.ghost.io/blog/10-best-practices-for-production-grade-llm-prompt-engineering/)
- [Fireworks - Function Calling in DeepSeek V3](https://fireworks.ai/blog/function-calling-deepseekv3)
- [OpenAI Community - Tool Use Best Practices](https://community.openai.com/t/prompting-best-practices-for-tool-use-function-calling/1123036)
- [Mistral - Function Calling Docs](https://docs.mistral.ai/capabilities/function_calling)
