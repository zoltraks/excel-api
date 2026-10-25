# Documentation Style

**Documentation Style**

- Write short sentences.
- Use explicit line breaks.
- One idea per paragraph. Do not group unrelated thoughts in the same paragraph.
- **Blank Lines**: Never put more than one blank line between any sections or blocks. Avoid using two or more consecutive blank lines.
- **Language Consistency**: Always preserve the language of the document being modified.
- **Lists**: Prefer bullet points (`-`) over numbering. Avoid numbering unless the order is strictly required for technical correctness. Always put exactly one blank line before starting a list.
- **Procedures**: Do not use numbered lists for complex procedures with code blocks. Instead: end the introductory sentence with a dot. Use a bold heading for each step on its own line. Put exactly one empty line before the step description or code. Put exactly one empty line after the step content.
- Use standard ASCII characters.
- Keep section names short. Do not put qualifiers in section names using parentheses.
- **Heading Format**: For H3-level subsections, use bold text on its own line instead of `###` syntax.
- **Flattened Structure**: Use H2 for all major sections under the main H1. Avoid deeply nested hierarchies. Stick to the existing heading levels of the document being modified.
- **Horizontal Dividers**: Do not use `---` anywhere in documents. Separate sections using headings only.
- **Headings**: Avoid using colons in headings.

**Markdown Tables**

- Keep them readable as plain text.
- **Proactive Formatting**: When editing any document in markdown format, check and fix markdown table alignment and documentation style compliance — even for tables not directly edited.
- **Cell descriptions**: Use short, telegraphic noun phrases. Never start with "A", "An", or "The". Avoid full sentences.
- **Minimal width**: Use the minimum column width that satisfies all constraints. Do not pad columns wider than necessary.
- **Pipes**: All vertical pipes `|` must be vertically aligned.
- **Separator row**: Use exactly `W` dashes where `W` is the maximum character width of all items in that column including the header.
- **Padding**: Use exactly one space on the left (`| `) and at least one space on the right (` |`).
- Content must be aligned left. Do not use `:---` or `---:`.
- **Visual Indicators**: Use `✓` for affirmative/available features and `✗` for negative/unavailable features.

**Formatting Rules**

- Put code, commands, file names, and paths in backticks.
- **Code Blocks**: Always use three backticks for code blocks. No indentation: starts at the very beginning of the line. Mandatory spacing: exactly one blank line before and after the block.

**API Design Documentation**

- **Endpoint Structure**: Group endpoints by resource.
- **Table Format**: Use tables to list paths and methods.
- **Parameter Tables**: Use tables with `Name`, `Type`, `Required`, and `Description`.
- **Error Consistency**: Document standard error envelopes using JSON blocks and error code tables. Error description strings must be short.

**CHANGELOG Maintenance**

- For version bumping rules and CHANGELOG format, see `docs/VERSIONING.md`.
