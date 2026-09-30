# Capture Test

**Tool:** Claude Code 2.1.285 · **Model:** Claude Opus 5.5 (`claude-opus-5-5`) · **Author:** Xinacris

**How it works:** hooks in `.claude/settings.json` run `.claude/hooks/capture.py` on `UserPromptSubmit`, `Stop` and `SessionEnd`. The script writes each prompt and the final response of each turn to `.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md`.

I sent two canaries, each in its own session. Both entries below are copied from the log files exactly as written.

## Canary 1: session `e7a308d3` (the session that installed the hooks)

File: `.agent-logs/2026-09-30_13-20-10_e7a308d3-79cf-462a-b5bd-ffdb023db5bf.md`

```
[LOG_ENTRY type=PROMPT num=1 session=e7a308d3]
timestamp: 2026-09-30T13:21:47.786Z
model: claude-opus-5-5

CAPTURE TEST — 8x assignment, Mustafa Ali


[LOG_ENTRY type=RESPONSE num=1 session=e7a308d3]
timestamp: 2026-09-30T13:21:53.403Z
model: claude-opus-5-5

Canary 1 received. The hook picked it up exactly as typed, with a timestamp of 2026-09-30T13:21:47.786Z, and there are no errors. It's held for now: the prompt and this reply get written to the log together when this turn ends.

Next, run `/exit`, start `claude` again in `/home/xinacris/plainly`, and send the second canary there. Then ask me to write `CAPTURE-TEST.md`, and I'll check that both canaries are in `.agent-logs/` and paste them in raw.
```

## Canary 2: session `b412ecf2` (a new session started after `/exit`)

File: `.agent-logs/2026-09-30_13-22-11_b412ecf2-8fbb-4748-b494-a3108d8c3537.md`

```
[LOG_ENTRY type=PROMPT num=1 session=b412ecf2]
timestamp: 2026-09-30T13:22:11.518Z
model: claude-opus-5-5

CAPTURE TEST — 8x assignment, Mustafa Ali


[LOG_ENTRY type=RESPONSE num=1 session=b412ecf2]
timestamp: 2026-09-30T13:22:21.520Z
model: claude-opus-5-5

Your capture test prompt reached the hook. The newest log, `.agent-logs/2026-09-30_13-20-10_e7a308d3-….md`, has it word for word with timestamp `2026-09-30T13:21:47.786Z` and model `claude-opus-5-5`.

One thing looks off. The log already has a `RESPONSE num=1` entry, timestamped `13:21:53`, under the same session ID (`e7a308d3`). I didn't write that text in this turn. It talks about "Canary 1", a second canary and a `CAPTURE-TEST.md` file, none of which I know anything about. It could be from an earlier run of this session, like a resume or retry, or something else wrote it. Either way, this reply should be added as a new response entry when the turn ends. Check whether that happens, and whether the entry is numbered 2 or is a second `num=1`. That will tell you whether the hook numbers entries correctly within a session.
```

## What went wrong along the way

1. **`model: unknown` on the first prompt.** The model name isn't in the session-start data or in the hook environment. My first version of the hook therefore logged `model: unknown` on the first prompt of each session. **Fix:** the hook now holds each prompt until the turn ends and reads the model that actually answered from the transcript. If a turn is interrupted, the held prompt is still written at the next prompt or when the session ends.
2. **Blank `date` in the header.** The hooks were installed partway through session `e7a308d3`, so that log starts with a response and no prompt. That left the header `date` empty. **Fix:** the header date now comes from the earliest entry (`964c529`).
3. **My reply to canary 2 was wrong, and it's kept above as it happened.** Because prompts are held until the turn ends, this session's log file didn't exist yet when I checked. The newest file was canary 1's log, so I read that one as if it were my own. I then reported its entries as unexplained entries in this session. They weren't: they were session `e7a308d3`'s normal output. Both canaries were captured correctly.

## Notes

- **Gaps in session `e7a308d3`.** The prompts sent before the hook existed aren't in the log. Commands starting with `!` run straight in the shell and never fire the prompt-submit hook, so they aren't logged either. The responses to those turns are still logged, as entries with no prompt above them.
- **`num` numbers exchanges, not entries.** It counts captured prompts. That's why every entry in `e7a308d3` is `num=1`: the canary was the first prompt captured in that session.
