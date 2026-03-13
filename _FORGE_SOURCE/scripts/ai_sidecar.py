import json
import sys
import urllib.error
import urllib.request
from typing import Any, Dict


OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
DEFAULT_MODEL = "llama3.1:8b"


def read_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {"mode": "ping"}
    return json.loads(raw)


def emit(payload: Dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def heuristic_plan(prompt: str, selection: str, context: str) -> Dict[str, Any]:
    summary = prompt.strip() or "No prompt provided."
    actions = []

    if "definition" in summary.lower():
        actions.append({
            "type": "node.classify",
            "classification": "definition",
            "target": selection or "current-selection",
        })
    if "link" in summary.lower():
        actions.append({
            "type": "link.create",
            "direction": "outgoing",
            "source": selection or "current-selection",
            "target_hint": "resolve-from-prompt",
        })
    if "tag" in summary.lower():
        actions.append({
            "type": "tag.attach",
            "target": selection or "current-selection",
            "tag_hint": "extract-from-prompt",
        })
    if not actions:
        actions.append({
            "type": "note.annotate",
            "target": selection or "current-selection",
            "instruction": "Interpret request and attach as structured annotation",
        })

    return {
        "ok": True,
        "engine": "heuristic",
        "summary": summary[:180],
        "actions": actions,
        "warnings": [] if context else ["No workspace context provided."],
    }


def ollama_plan(model: str, prompt: str, selection: str, context: str, mode: str) -> Dict[str, Any]:
    system = (
        "You are the FORGE Python sidecar. Return strict JSON only. "
        "Translate user intent into structured knowledge-work actions. "
        "Schema: {\"summary\": string, \"actions\": array, \"warnings\": array}. "
        "Each action should use concise keys and be deterministic where possible."
    )
    user = (
        f"Mode: {mode}\n"
        f"Prompt: {prompt}\n"
        f"Selection: {selection}\n"
        f"Workspace context: {context[:4000]}\n"
        "Return only JSON."
    )

    body = json.dumps(
        {
            "model": model or DEFAULT_MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "format": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "actions": {"type": "array"},
                    "warnings": {"type": "array"},
                },
                "required": ["summary", "actions", "warnings"],
            },
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        OLLAMA_URL,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=90) as response:
        data = json.loads(response.read().decode("utf-8"))
        content = data.get("message", {}).get("content", "{}")
        parsed = json.loads(content)
        return {
            "ok": True,
            "engine": "ollama",
            "summary": parsed.get("summary", ""),
            "actions": parsed.get("actions", []),
            "warnings": parsed.get("warnings", []),
        }


def main() -> None:
    try:
        payload = read_payload()
        mode = str(payload.get("mode", "ping"))

        if mode == "ping":
            emit(
                {
                    "ok": True,
                    "engine": "python-sidecar",
                    "summary": "FORGE Python sidecar is available.",
                    "actions": [],
                    "warnings": [],
                }
            )
            return

        prompt = str(payload.get("prompt", ""))
        selection = str(payload.get("selection", ""))
        context = str(payload.get("context", ""))
        model = str(payload.get("model", DEFAULT_MODEL))

        try:
            result = ollama_plan(model, prompt, selection, context, mode)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
            result = heuristic_plan(prompt, selection, context)

        emit(result)
    except Exception as exc:  # noqa: BLE001
        emit(
            {
                "ok": False,
                "engine": "python-sidecar",
                "summary": f"Python sidecar failed: {exc}",
                "actions": [],
                "warnings": ["Sidecar execution error."],
            }
        )


if __name__ == "__main__":
    main()
