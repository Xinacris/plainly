#!/usr/bin/env python3
"""Claude Code capture hook: logs each prompt and final response to .agent-logs/.

Wired in .claude/settings.json to three events:
  UserPromptSubmit -> stash the prompt (verbatim, from hook stdin) + UTC timestamp
  Stop             -> append the PROMPT entry, then a RESPONSE entry (final assistant
                      text of the turn, read from the transcript whose path arrives
                      on stdin), both stamped with the model that answered
  SessionEnd       -> flush a stashed prompt whose turn never finished

Only the prompt and the final response are logged: assistant text that preceded
a tool call in the same turn is intermediate and is dropped.
The script never blocks the agent: any failure is written to
.claude/hooks/.cache/errors.log and the script exits 0.
"""
import fcntl
import json
import os
import re
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

AUTHOR = "Xinacris"
TOOL = "claude-code"


def project_dir(payload):
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd())


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def cache_dir(root):
    d = root / ".claude" / "hooks" / ".cache"
    d.mkdir(parents=True, exist_ok=True)
    return d


def log_dir(root):
    d = Path(os.environ.get("AGENT_LOG_DIR") or root / ".agent-logs")
    d.mkdir(parents=True, exist_ok=True)
    return d


def remember_model(root, session_id, model):
    if model:
        (cache_dir(root) / f"model-{session_id}").write_text(model)


def known_model(root, session_id):
    f = cache_dir(root) / f"model-{session_id}"
    if f.exists():
        return f.read_text().strip()
    return os.environ.get("ANTHROPIC_MODEL") or "unknown"


def read_transcript(path):
    entries = []
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    except FileNotFoundError:
        pass
    return entries


def is_real_prompt(entry):
    """A user entry typed by the human (not a tool_result, not a meta/injected message)."""
    if entry.get("type") != "user" or entry.get("isMeta") or entry.get("isSidechain"):
        return False
    content = (entry.get("message") or {}).get("content")
    if isinstance(content, str):
        return True
    if isinstance(content, list):
        return not any(isinstance(b, dict) and b.get("type") == "tool_result" for b in content)
    return False


def final_response(entries):
    """Text of the last assistant message(s) after the final tool call of the last turn."""
    start = 0
    for i, e in enumerate(entries):
        if is_real_prompt(e):
            start = i + 1
    texts, model = [], None
    for e in entries[start:]:
        if e.get("type") != "assistant" or e.get("isSidechain"):
            continue
        msg = e.get("message") or {}
        model = msg.get("model") or model
        for block in msg.get("content") or []:
            if not isinstance(block, dict):
                continue
            if block.get("type") == "tool_use":
                texts = []  # anything said before a tool call was intermediate
            elif block.get("type") == "text":
                texts.append(block.get("text", ""))
    return "\n\n".join(t for t in texts if t.strip()), model


def session_file(logs, session_id, first_time):
    existing = sorted(logs.glob(f"*_{session_id}.md"))
    if existing:
        return existing[0]
    stamp = datetime.strptime(first_time, "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%Y-%m-%d_%H-%M-%S")
    return logs / f"{stamp}_{session_id}.md"


ENTRY_RE = re.compile(
    r"^\[LOG_ENTRY type=(PROMPT|RESPONSE) num=(\d+) session=\S+\]\ntimestamp: (\S+)\nmodel: (\S+)",
    re.M,
)


def render_header(session_id, project, body):
    entries = ENTRY_RE.findall(body)
    prompts = [e for e in entries if e[0] == "PROMPT"]
    models = [e[3] for e in entries if e[3] != "unknown"]
    first = prompts[0][2] if prompts else ""
    last = prompts[-1][2] if prompts else ""
    # a session can open with a RESPONSE whose prompt predates the hook being installed
    date = (first or (entries[0][2] if entries else ""))[:10]
    return (
        "---\n"
        f"session_id: {session_id}\n"
        f"date: {date}\n"
        f"author: {AUTHOR}\n"
        f"model: {models[-1] if models else 'unknown'}\n"
        f"tool: {TOOL}\n"
        f"project: {project}\n"
        f"total_exchanges: {len(prompts)}\n"
        f"first_prompt_time: {first}\n"
        f"last_prompt_time: {last}\n"
        "---\n\n"
        f"# Session Log - {date}\n\n"
        f"Session: `{session_id[:8]}` | Project: `{project}` | Author: `{AUTHOR}`\n\n"
        "---\n\n"
    )


def append_entry(root, session_id, kind, text, model, ts):
    logs = log_dir(root)
    lock = open(cache_dir(root) / "log.lock", "w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    try:
        path = session_file(logs, session_id, ts)
        body = ""
        if path.exists():
            content = path.read_text(encoding="utf-8")
            # header ends at the first "\n---\n\n" after the "Session:" line
            marker = content.find("\n---\n\n", content.find("\nSession: `"))
            body = content[marker + len("\n---\n\n"):] if marker != -1 else content
        n_prompts = len([e for e in ENTRY_RE.findall(body) if e[0] == "PROMPT"])
        num = n_prompts + 1 if kind == "PROMPT" else max(n_prompts, 1)
        body += (
            f"[LOG_ENTRY type={kind} num={num} session={session_id[:8]}]\n"
            f"timestamp: {ts}\n"
            f"model: {model}\n\n"
            f"{text}\n\n\n"
        )
        tmp = path.with_suffix(".md.tmp")
        tmp.write_text(render_header(session_id, root.name, body) + body, encoding="utf-8")
        os.replace(tmp, path)
    finally:
        fcntl.flock(lock, fcntl.LOCK_UN)
        lock.close()


def pending_path(root, session_id):
    return cache_dir(root) / f"pending-{session_id}.json"


def flush_pending(root, session_id, model):
    """Write a prompt that was submitted but whose turn never reached Stop (e.g. interrupted)."""
    p = pending_path(root, session_id)
    if p.exists():
        pending = json.loads(p.read_text())
        append_entry(root, session_id, "PROMPT", pending["prompt"], model, pending["timestamp"])
        p.unlink()


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    root = project_dir(payload)
    event = payload.get("hook_event_name")
    session_id = payload.get("session_id", "unknown-session")
    if os.environ.get("CAPTURE_DEBUG"):
        (cache_dir(root) / f"last-{event}.json").write_text(raw)

    if event == "UserPromptSubmit":
        # Neither this payload nor the env names the model, so hold the prompt until
        # Stop, where the transcript says which model answered it.
        flush_pending(root, session_id, known_model(root, session_id))
        pending_path(root, session_id).write_text(
            json.dumps({"prompt": payload.get("prompt", ""), "timestamp": now_iso()})
        )
        return

    if event == "SessionEnd":
        flush_pending(root, session_id, known_model(root, session_id))
        return

    if event == "Stop":
        ts = now_iso()
        text, model = "", None
        # The transcript can lag the Stop event by a moment; retry briefly.
        for _ in range(10):
            text, model = final_response(read_transcript(payload.get("transcript_path", "")))
            if text:
                break
            time.sleep(0.3)
        if not text:
            text = payload.get("last_assistant_message") or "(no final text response captured)"
        model = model or known_model(root, session_id)
        remember_model(root, session_id, model)
        flush_pending(root, session_id, model)
        append_entry(root, session_id, "RESPONSE", text, model, ts)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        try:
            root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd())
            with open(cache_dir(root) / "errors.log", "a") as fh:
                fh.write(f"{now_iso()}\n{traceback.format_exc()}\n")
        except Exception:
            pass
    sys.exit(0)
