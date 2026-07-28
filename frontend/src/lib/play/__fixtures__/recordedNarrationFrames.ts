/**
 * Real SSE frames captured from a live turn (z-ai/glm-5.2 via OpenRouter), trimmed to the
 * opening deltas, the final delta, and the settle.
 *
 * These pin the cross-boundary contract: the field names and payload shapes the backend
 * actually emits, replayed through the real frontend reducer. Neither side's unit tests can
 * catch a rename on the other side of the wire; this can.
 */

export const RECORDED_TURN_FRAMES = [
  {
    "event": "narration_delta",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0",
    "text": "That was"
  },
  {
    "event": "narration_delta",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0",
    "text": "That was three nights"
  },
  {
    "event": "narration_delta",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0",
    "text": "That was three nights ago."
  },
  {
    "event": "narration_delta",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0",
    "text": "That was three nights ago. Gundren rode"
  },
  {
    "event": "narration_delta",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0",
    "text": "That was three nights ago. Gundren rode out of"
  },
  {
    "event": "narration_delta",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0",
    "text": "That was three nights ago. Gundren rode out of Neverwinter that evening with Sildar, and you haven't seen him since.\n\nRight now you're standing on the Triboar Trail, longsword in hand, the wagon of mining supplies creaking behind you on the road. Two dead horses block the path ahead, black-fletched arrows in their sides. A goblin stands ten paces before you, bow drawn and a toothy grin on its face. Something else moves in the brush to your left.\n\nThe goblin's fingers tighten on the bowstring.\n\nWhat do you do?"
  },
  {
    "event": "narration",
    "text": "That was three nights ago. Gundren rode out of Neverwinter that evening with Sildar, and you haven't seen him since.\n\nRight now you're standing on the Triboar Trail, longsword in hand, the wagon of mining supplies creaking behind you on the road. Two dead horses block the path ahead, black-fletched arrows in their sides. A goblin stands ten paces before you, bow drawn and a toothy grin on its face. Something else moves in the brush to your left.\n\nThe goblin's fingers tighten on the bowstring.\n\nWhat do you do?",
    "tool_call_id": "call_cd7d834f18a64e3a9360cde0"
  }
] as const;
