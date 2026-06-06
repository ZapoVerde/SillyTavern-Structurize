# Structurize

**[Released]**

When SillyTavern injects lorebook entries into the prompt, the AI receives only the entry's body text. The entry title, aliases, and trigger keywords are discarded before the prompt is assembled.

This is often harmless when the entry repeats its own name, but if the entry does not do that, we lose the most important part of the context.

Consider this lorebook entry:

**Title**

```
Elena Valcieri
```

**Keywords**

```
elena, valcieri, beth
```

**Content**

```
Matriarch of House Valcieri. Controls the family's finances and
oversees its political alliances. Known for her patience,
political skill, and ruthless pragmatism.
```

What SillyTavern injects:

```
Matriarch of House Valcieri. Controls the family's finances and
oversees its political alliances. Known for her patience,
political skill, and ruthless pragmatism.
```

The AI receives the facts, but never sees the name "Elena Valcieri" or any of the entry's aliases.

Structurize restores that missing structure. It wraps every activated lorebook entry in a template of your choice, reinserting the title and keywords directly into the prompt. It can also add a header and footer around the entire lorebook section, giving the AI clear boundaries around injected knowledge.

With the default template, the same entry becomes:

```
<Elena Valcieri>
(elena, valcieri, beth)
Matriarch of House Valcieri. Controls the family's finances and
oversees its political alliances. Known for her patience,
political skill, and ruthless pragmatism.
</Elena Valcieri>
```

---

## Installation

1. Open SillyTavern and click the **Extensions** icon (the puzzle piece).
2. Click **Install extension**.
3. Paste:

   ```
   https://github.com/ZapoVerde/SillyTavern-Structurize
   ```
4. Click **Install just for me** or **Install for all users**.
5. Structurize will appear in your extensions list. Formatting is enabled by default.

---

## How It Works

For every activated lorebook entry, Structurize applies an **entry template** before the text reaches the AI.

Templates can use three placeholders:

| Placeholder   | Inserts                                              |
| ------------- | ---------------------------------------------------- |
| `{{title}}`   | The lorebook entry title                             |
| `{{keys}}`    | Trigger keywords formatted as `(keyword1, keyword2)` |
| `{{content}}` | The entry body text                                  |

Default template:

```xml
<{{title}}>
{{keys}}
{{content}}
</{{title}}>
```

Example output:

```
The following is an index of important characters and ideas from the story:

<Elena Valcieri>
(elena, valcieri, beth)
Matriarch of House Valcieri...
</Elena Valcieri>

<House Caldera>
(caldera, the caldera)
Minor noble house based in the eastern reaches...
</House Caldera>

End Index
```

Templates are fully customizable.

Bracket style:

```
[{{title}}]
{{keys}}
{{content}}
```

Markdown style:

```markdown
**{{title}}**
{{keys}}
{{content}}
```

---

## Settings

Structurize can be configured from the Extensions drawer.

| Setting                   | Default                        | Description                                           |
| ------------------------- | ------------------------------ | ----------------------------------------------------- |
| **Enable formatting**     | On                             | Enables or disables all Structurize processing.       |
| **Verbose logging**       | Off                            | Writes diagnostic information to the browser console. |
| **Prepend global header** | On                             | Adds a header before all formatted lorebook entries.  |
| **Header text**           | *The following is an index...* | The text used for the global header.                  |
| **Entry template**        | `<{{title}}>...`               | Template applied to every activated entry.            |
| **Append global footer**  | On                             | Adds a footer after all formatted lorebook entries.   |
| **Footer text**           | `End Index`                    | The text used for the global footer.                  |

---

## Notes

* Structurize never modifies your lorebook files.
* Formatting occurs only in memory at injection time.
* Header and footer text consume a small number of additional tokens.
* If an entry is activated multiple times during a generation, Structurize formats it only once.
