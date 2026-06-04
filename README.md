# Structurize

A SillyTavern extension that formats activated lorebook entries before they are injected into the prompt.

## What it does

Hooks the `WORLDINFO_SCAN_DONE` event (ST 1.15+) and rewrites each activated entry's content with a structured title header. If the entry has primary keywords, they are emitted as an alias line directly below the title. Optionally wraps the entire block with a configurable header and footer line.

**Example output in prompt:**

```
The following is an index of important characters and ideas from the story:

[Elena Valcieri]
(elena, valcieri, beth)
Elena Valcieri is the matriarch of House Valcieri...

[House Caldera]
(caldera, the caldera)
A minor noble house based in the eastern reaches...

End Index
```

Entries with no primary keywords omit the alias line entirely.

## Settings

All options are in the **Structurize** drawer under Extensions settings.

| Setting | Default | Description |
|---|---|---|
| Enable formatting | on | Master toggle |
| Prepend global header | on | Adds a line before all entries |
| Header text | *"The following is an index..."* | Configurable header |
| Title format | `[Title]` | How entry titles are rendered (see formats below) |
| Append global footer | on | Adds a line after all entries |
| Footer text | `\nEnd Index\n` | Configurable footer |

### Title formats

| Format | Output |
|---|---|
| `[Title]` | `[Elena Valcieri]` |
| `**Title**` | `**Elena Valcieri**` |
| `### Title` | `### Elena Valcieri` |
| `<Title_No_Spaces>` | `<Elena_Valcieri>...</Elena_Valcieri>` |
| `<Title As Is>` | `<Elena Valcieri>...</Elena Valcieri>` |

For XML formats the alias line appears inside the tag, between the opening tag and the content.

## Notes

- Header and footer are synthetic entries injected only into the in-memory scan state. Nothing is written to disk.
- The extension is idempotent: re-firing the scan event on the same state (recursive activations, force-activations) will not double-format entries.
- Token budget is calculated by ST core before this extension runs, so header and footer text add tokens beyond the budget. Keep them short.
