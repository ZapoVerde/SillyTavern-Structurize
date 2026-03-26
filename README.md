# Structurize

A SillyTavern extension that formats activated lorebook entries before they are injected into the prompt.

## What it does

Hooks the `WORLDINFO_SCAN_DONE` event (ST 1.15+) and rewrites each activated entry's content with a structured title header. Optionally wraps the entire block with a configurable header and footer line.

**Example output in prompt:**

```
The following is an index of important characters and ideas from the story:

[Aria Voss]
A former imperial cartographer, now working as a smuggler...

[The Hollow Crown]
An artifact of disputed origin, said to grant its wearer...

End Index
```

## Settings

All options are in the **Structurize** drawer under Extensions settings.

| Setting | Default | Description |
|---|---|---|
| Enable formatting | on | Master toggle |
| Prepend global header | on | Adds a line before all entries |
| Header text | *"The following is an index..."* | Configurable header |
| Title format | `[Title]` | How entry titles are rendered (`[Title]`, `**Title**`, `### Title`) |
| Append global footer | on | Adds a line after all entries |
| Footer text | `\nEnd Index\n` | Configurable footer |

## Notes

- Header and footer are synthetic entries injected only into the in-memory scan state. Nothing is written to disk.
- The extension is idempotent: re-firing the scan event on the same state (recursive activations) will not double-format entries.
- Token budget is calculated by ST core before this extension runs, so header/footer text adds tokens beyond the budget. Keep them short.
