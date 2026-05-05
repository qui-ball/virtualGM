"""Agent configuration tests."""
from __future__ import annotations

from backend_generalist import agent as agent_mod


def test_build_agent_passes_raw_model_id_to_openrouter(monkeypatch) -> None:
    """The CLI model value is treated as a raw OpenRouter model ID."""

    captured: dict[str, object] = {}

    class FakeAgent:
        def __init__(self, model: str, **kwargs: object) -> None:
            captured["model"] = model
            captured["kwargs"] = kwargs

    def fake_register_tools(agent: object) -> None:
        captured["registered_agent"] = agent

    monkeypatch.setattr(agent_mod, "Agent", FakeAgent)
    monkeypatch.setattr(agent_mod, "register_tools", fake_register_tools)

    agent, model_settings = agent_mod.build_agent("moonshotai/kimi-k2.6")

    assert captured["model"] == "openrouter:moonshotai/kimi-k2.6"
    assert captured["registered_agent"] is agent
    assert model_settings == {}


def test_build_agent_uses_raw_openrouter_default(monkeypatch) -> None:
    """The no-flag default is also stored as a raw OpenRouter model ID."""

    captured: dict[str, object] = {}

    class FakeAgent:
        def __init__(self, model: str, **kwargs: object) -> None:
            captured["model"] = model

    monkeypatch.setattr(agent_mod, "Agent", FakeAgent)
    monkeypatch.setattr(agent_mod, "register_tools", lambda agent: None)

    agent_mod.build_agent()

    assert captured["model"] == "openrouter:qwen/qwen3.5-397b-a17b"
