---
phase: 3
slug: tool-surface-consolidation-v2-0
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-20
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| LLM agent → tool args | The model supplies `action`, `item`, `name`, `value`, `is_boss`, `amount` to the consolidated tools; untrusted, validated via `ModelRetry` | Tool-call arguments (game-state mutations) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-03-01 | Tampering | `set_countdown` value | mitigate | `value < 0` → `ModelRetry` guard (D-05); absolute upsert removes delta/clamp ambiguity | closed |
| T-03-02 | Tampering | `modify_inventory` remove | mitigate | Not-present `ModelRetry` lists current inventory (D-03); shared `pc is None` guard | closed |
| T-03-03 | Elevation | stale `is_boss_battle` firing Blaze-of-Glory in a non-boss fight | mitigate | Auto-clear flag when last enemy removed in `remove_enemy` (D-08b) | closed |
| T-03-04 | Information disclosure | tool result strings | accept | Local CLI / single-user; no PII; result strings already returned today | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-03-01 | T-03-01 | Mitigation implemented per 03-01 (the `value < 0` `ModelRetry` guard and absolute-value upsert in `set_countdown`); user elected to accept this audit pass without spawning a verifying auditor. | bilunsun | 2026-05-20 |
| R-03-02 | T-03-02 | Mitigation implemented per 03-01 (`modify_inventory` retains the not-present `ModelRetry` and shared `pc is None` guard); user elected to accept this audit pass without spawning a verifying auditor. | bilunsun | 2026-05-20 |
| R-03-03 | T-03-03 | Mitigation implemented per 03-01 (auto-clear of `is_boss_battle` in `remove_enemy` when enemies empty); also exercised end-to-end in the 03-02 golden-path human-verify smoke (non-boss fight did not fire Blaze-of-Glory). User elected to accept this audit pass without spawning a verifying auditor. | bilunsun | 2026-05-20 |
| R-03-04 | T-03-04 | Information-disclosure risk on tool result strings accepted by design at plan time: local CLI, single user, no PII, strings already surfaced pre-phase. | bilunsun | 2026-05-20 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-20 | 4 | 4 | 0 | /gsd-secure-phase (user-directed accept-all) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-20
