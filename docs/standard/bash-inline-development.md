# Bash Inline Engineering Standards

<!-- Standards set: bash-inline-development@0.1.6 | Date: 2026-10-25 -->

## Purpose

This document defines the engineering standard for using bash as an
inline tool: one-liners, loops, pipelines, and scratch probe scripts
run from a terminal or an agent session - not for building shippable
shell programs.

It covers host differences between GNU bash and Git Bash, invocation
forms, environment and PATH handling, exit codes and pipelines,
quoting, managed-desktop constraints, scratch-probe conventions, and
the boundary where an existing project utility replaces a script.

It is written to be executed directly by an AI coding agent and to be
read without effort by a human reviewer.

## Scope

A task is in scope when all of the following conditions hold.

- Bash runs as a means, not the deliverable - probing state, reshaping
  output, driving a tool chain, checking an environment.
- The script lives for minutes: a `-c` string, a loop typed at the
  prompt, a heredoc-fed probe, or a scratch file deleted after use.
- The environment is a managed desktop - no admin rights assumed, no
  guarantee of package installation, an unfamiliar PATH.

Authoring a shipped script, a cron job, a system init script, or the
project's own tooling is out of scope - those follow product
engineering standards, though every rule here still applies.

## How To Use This Standard

This section is the entry point for an agent.

Read it before reading anything else in this document.

**Order Of Operations**

Follow these steps in order at the start of every task that uses bash
as an inline tool.

1. Read the project rules file, such as `AGENTS.md`, `README.md`, or
   `docs/GUIDELINES.md`, because a project rule overrides this
   standard.
2. Discover the tool before writing a command - `command -v x` tells
   you what a name resolves to, never assume presence or version.
3. Prefer the project utility that owns the capability - a probe that
   an existing helper already covers is a utility call, not a
   pipeline.
4. Pick the invocation form: a one-liner for a single step, a loop for
   a sweep, a `work/scripts/*.sh` file for anything reused or nested.
5. Set the output contract up front - capture to a `work/dumps/` file
   when output is large, machine-read, or inspected more than once.
6. Verify by exit code and printed evidence - never by the absence of
   an error message.
7. Check the result against the Definition of Done before reporting
   the task complete.

**Precedence**

When two rules conflict, apply the first matching source in this list.

| Rank | Source                            | Example                                      |
|------|-----------------------------------|----------------------------------------------|
| 1    | Explicit user instruction         | "Use set -x for verbose probe debugging"     |
| 2    | Project rules file                | `AGENTS.md`, `docs/GUIDELINES.md`            |
| 3    | Existing repository convention    | Established shell helper conventions         |
| 4    | This standard                     | Bash inline engineering standard             |
| 5    | General POSIX shell best practice | Anything the four sources above do not cover |

**Non-Negotiable Rules**

- **A pipeline hides the left side's exit code.** `cmd | head`
  reports `head`'s status - check the command's exit code on the
  unpiped run, read `PIPESTATUS[0]`, or capture to a file first.
- **Machine-read output gets a forced locale.** `LC_ALL=C` in front of
  a command whose text you parse - localized tools break field
  grammars.
- **Variables are quoted.** `"$var"` at every expansion site - an
  unquoted expansion word-splits and glob-expands, and a path with a
  space silently becomes two arguments.
- **Heredocs are single-quoted.** `cat <<'EOF'` or
  `python3 - <<'EOF'` keeps `$`, backticks, and `$(...)` inside the
  payload - shell expansion inside a heredoc silently eats both.
- **Environment overrides go on the command, not in `export`.**
  `VAR=x cmd` scopes the change to the one run - a stray `export`
  leaks into every later command in the session, and `env -u VAR cmd`
  verifies a no-variable path without unsetting anything.
- **A probe prints evidence.** Observed values, not pass/fail - the
  reader verifies the claim from the printed data.
- **Lock-holders are investigated, not killed.** A held dpkg or
  package-manager lock means another process is working - find it
  (`fuser`, `ps`), wait for it, and never kill an updater mid-flight.

A violation of any of these rules is a defect, not a style preference.

## Agent Intake Protocol

**Detection First**

Before asking the user anything, inspect the repository and infer the
probe environment.

| Signal Found In Repository              | Inferred Decision                     | Confidence |
|-----------------------------------------|---------------------------------------|------------|
| Bash scripts targeting Git Bash         | Windows MSYS2 path translation active | High       |
| `.bashrc` or `.bash_profile` in repo    | Linux/Unix environment defaults       | High       |
| `.shellcheckrc` configuration file      | Strict ShellCheck enforcement enabled | High       |
| Temporary scripts in `work/` or `temp/` | Scratch probe workflow active         | High       |
| No shell scripts at all                 | Fresh probing context                 | High       |

**Existing Project**

When detection is confident, state the conclusion and ask for a single
confirmation rather than running a questionnaire.

Example: "I see scratch probe conventions under `work/` and a
`.shellcheckrc` - I will probe under those conventions.

Is that correct?"

When detection is ambiguous, ask only the questions that resolve the
ambiguity.

**New Project**

When the repository is empty or the user declares a new probing
context, ask the following questions.

| Question                     | Options                       | Default If Declined |
|------------------------------|-------------------------------|---------------------|
| Target operating system      | Linux/macOS, Windows Git Bash | Detected host       |
| ShellCheck strictness        | Default, strict (`-S error`)  | Default             |
| Scratch directory for probes | `work/`, `temp/`, other       | `work/`             |

## Documentation

The following are the authoritative sources for inline bash work.

- [GNU Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html)
  - quoting, expansion, `PIPESTATUS`, and process substitution.
- [POSIX Shell Command Language](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html)
  - the portable subset.
- [ShellCheck Wiki](https://www.shellcheck.net/wiki/)
  - static analysis rules for shell scripts.

## Language Version

Inline probes target GNU Bash 5.2+ on Linux and macOS, and the MSYS2
Git Bash port on Windows.

Scripts stay inside the POSIX-leaning subset that both hosts share.

On runtime upgrade, re-validate all rules against release notes before
writing code.

## Project Structure

Scratch probe content lives in a temporary tree that is removed when
the session ends.

```
repo-root/
+-- work/
    |-- scripts/         # Short-lived scratch probe scripts (*.tmp.sh)
    +-- dumps/           # Raw command outputs and captured traces
```

- `work/dumps/` holds command captures - one subdirectory per probe
  topic, JSON output redirected in full.
- `work/scripts/` holds throwaway probe scripts - single-quoted
  heredoc writes only, deleted with the scratch tree.
- A dump is inspected with the file tools, not `cat`-ed back into the
  transcript - large output stays out of context.
- Temporary test directories (`mkdir work/dumps/empty`) are removed
  with `rmdir` when done - empty-dir PATH tricks leave no trace.

## Naming Conventions

| Element               | Convention                                  | Example                    |
|-----------------------|---------------------------------------------|----------------------------|
| Scratch script files  | `kebab-case` or `snake_case` with `.tmp.sh` | `probe-ports.tmp.sh`       |
| Shell functions       | `snake_case`, `probe_` prefix               | `probe_listening_ports`    |
| Environment variables | `UPPERCASE`                                 | `EXAMPLE_APP_PORT`         |
| Dump directories      | `kebab-case`, one per topic                 | `work/dumps/package-lock/` |

## Code Conventions

**Host Differences**

Probes run on GNU bash (Linux, macOS) and Git Bash (Windows) - same
language, different universe.

| Behavior                | GNU bash                  | Git Bash on Windows                                                                 |
|-------------------------|---------------------------|-------------------------------------------------------------------------------------|
| Null device             | `/dev/null`               | `/dev/null` works, `nul` is a literal filename                                      |
| Path translation        | Native paths              | `C:\a\b` unquoted loses backslashes - quote or forward-slash                        |
| MSYS path conversion    | None                      | `/var` rewrites to `C:/Program Files/Git/var` - prefix `MSYS_NO_PATHCONV=1`         |
| Console encoding        | UTF-8 locale              | cp1252 - Unicode-heavy output to files, not the console                             |
| `grep -P`               | PCRE on any locale        | Refuses non-UTF-8 locales - use `LC_ALL=C.UTF-8` or `-E`                            |
| Line endings            | LF                        | `.gitattributes` pins `eol=lf` - count CR bytes with `tr -cd '\r' < f &#124; wc -c` |
| Null-terminating tools  | `-z`/`-0` fully supported | `xargs -0` works - needed for fscache refreshes                                     |
| `find`, `sort`, `xargs` | GNU coreutils             | MSYS ports - mostly compatible, test flags                                          |
| Package managers        | apt/dnf/pacman/brew       | none - winget or choco from cmd, not bash                                           |
| PowerShell interop      | `pwsh` if installed       | `powershell -ExecutionPolicy Bypass -NoProfile -File` for `.ps1`                    |
| Process inspection      | `ps`, `fuser`, `/proc`    | `ps` is the MSYS list - tasklist via `cmd /c`                                       |

Two Windows-host quirks worth keeping near the surface:

- A bulk rewrite under `core.fscache` leaves every touched file
  phantom-modified - `git diff` clean, `git status` full. Refresh
  per-path with
  `git -c core.fscache=false ls-files -m -z | xargs -0 -n 100 git -c core.fscache=false update-index --refresh --`.
- Build output can be localized - trust the exit code or read the raw
  tail, never grep for English result words.

**Invocation Forms**

- `bash -c '<line>'` - a single composed step. Quote the whole string
  once - inner single quotes are impossible inside it.
- Interactive line or loop - sweeps like
  `for t in a b c; do command -v "$t" || echo "$t missing"; done` are
  the discovery idiom.
- `cmd1 && cmd2` - chain only when later steps depend on the earlier
  succeeding, and prefer one command per agent call anyway.
- `work/scripts/<name>.tmp.sh` - multi-step probes live in scratch
  files, run with `bash file` or `bash -x file` for tracing. A
  pipeline's debug story is a log file, not a longer pipeline.
- `env VAR=x cmd` - per-command environment, the override that cannot
  leak.
- `bash <<'EOF'` - a multi-statement probe passed on stdin, quoted
  delimiter mandatory:

  ```bash
  bash <<'EOF'
  set -euo pipefail
  target_dir="$1"
  ls -la "$target_dir"
  EOF
  ```

**Environment And PATH**

- `command -v` is the discovery verb - `which` is an alias with
  inconsistent flags across distributions.
- PATH differs between login shells, non-login shells, and service
  environments - a tool that exists interactively can be absent for a
  spawned process. Probe the environment the command will actually
  see, not your own.
- Simulate a missing tool with a clean PATH -
  `env PATH=/tmp/emptydir cmd` - the standard way to verify a
  tool-absent code path without uninstalling anything.
- `~/.bashrc` edits affect new shells, never the running one - source
  it or use the full path for the current session.
- Machine-wide variables lag: a process started before `setx` or a
  `/etc/environment` change sees the old environment - verify with
  `env -u` per run rather than trusting inheritance.

**Exit Codes And Pipelines**

- The exit code is the contract - `echo $?` or `; echo "exit=$?"` on
  every verification run.
- `PIPESTATUS` (bash, not POSIX `sh`) indexes each pipeline member:

  ```bash
  command_a | command_b
  if [ "${PIPESTATUS[0]}" -ne 0 ]; then
    echo "First command failed" >&2
    exit 1
  fi
  ```

- `cmd || true` is a deliberate swallow - acceptable when the failure
  is the probe's expected outcome and you print the code anyway.
- Never append an exit-code marker into the same redirection as a JSON
  payload - `cmd > out.json` followed by an echoed marker into the same
  file leaves `Extra data` trailing the document and every downstream
  parse fails. Print the marker to the console or stderr, or capture
  `STATUS=$?` in a variable outside the redirect.
- `xargs` exit code aggregates child failures - `xargs -0` pairs with
  `-print0`/`-z` producers for filenames with spaces.
- Never `if cmd | grep -q pattern` to test for presence - the pipe
  runs `grep`, not the condition you meant, and `grep -q` on a
  truncated stream can false-positive.

**Quoting And Word Splitting**

- Double quotes for variable expansion, single quotes for literal
  text - the difference is `$` and backtick interpretation.
- `"$@"` and arrays for argument lists - string-concatenated commands
  re-split and lose quoting boundaries.
- `--` terminates option parsing - `rm -- "$f"`, `grep -- "$pat"` -
  when an argument could begin with a dash.
- `$(...)` not backticks - nestable, readable, no escaping ambiguity.
- Parameter expansion supplies defaults - `${var:-default}` guards an
  unset value without an `if`.
- Process substitution `<(...)` feeds a command's stdout where a file
  is expected - `diff <(cmd a) <(cmd b)`.

**Managed-Desktop Constraints**

- No admin, no installs, no daemons - probes stay user-level.
- Interpreters may exist but are not guaranteed - `command -v python3`
  before relying on it, and `jq` covers the common JSON work without
  any interpreter setup.
- Do not write to system paths or `/tmp` scratch shared with other
  users - scratch lives in the project's `work/` tree.
- A long-running lock or update (`apt`, update managers) belongs to
  another process - inspect the holder and wait.

**Scratch Probe Conventions**

- Scratch probes live in a gitignored working directory with a `.tmp.`
  infix in the name (`.tmp.<purpose>.sh`) - they are deleted or archived
  after use and never referenced by shipped code.
- Dumps live one subdirectory per probe topic, JSON output redirected
  in full - inspect a dump with the file tools, never `cat` it back
  into the transcript, so large output stays out of context.
- A probe is disposable: optimize for fast writing and clear output, not
  structure - but keep the non-negotiable rules (they exist because
  probes are where shortcuts hurt).
- Temporary directories a probe creates are removed with `rmdir` when
  done - an empty-dir PATH trick leaves no trace.
- Never put credentials, tokens, or user data into a probe - scripts in
  a scratch directory outlive memory of them.

**When To Reach For Bash**

- The capability has no existing utility that covers it:
  package-manager state, service health, PATH resolution sweeps,
  capability simulation, lock inspection.
- JSON shaping when `jq` cannot express the transform -
  `python3 - <<'EOF'` for structured reads, `python3 -m json.tool`
  for pretty-printing.
- Orchestration around existing utilities - loops over `--json`
  output, batched document validation, environment permutations for
  testing.
- Never to replace a capability a project utility already owns, never
  to parse rendered text a utility already emits as JSON.

**Common Operations**

**Discover Executables**

```bash
for t in nmcli apt pactl python3 node; do
  printf "%-12s " "$t"; command -v "$t" || echo "-"
done
```

**List Pending OS Upgrades**

```bash
LC_ALL=C apt list --upgradable 2>/dev/null
LC_ALL=C apt-get -s upgrade | tail -3   # kept-back count lives here
```

**Wait Out A Package-Manager Lock**

```bash
fuser /var/lib/dpkg/lock-frontend 2>/dev/null   # who holds it
ps -o pid,cmd -p "$(fuser /var/lib/dpkg/lock-frontend 2>/dev/null)"
# then poll until the holder exits - never kill it
```

**Simulate A Missing Tool**

```bash
mkdir -p work/dumps/emptypath
env PATH="$PWD/work/dumps/emptypath" tool-under-test --json
rmdir work/dumps/emptypath
```

**Shape JSON Output**

```bash
probe-tool connections --json | jq '.[] | .name'
probe-tool connections --json | python3 -m json.tool | head -40
python3 - <<'EOF'
import json
d = json.load(open("work/dumps/x.json"))
print([e["name"] for e in d["entries"]])
EOF
```

**Batch-Validate Documents**

```bash
for f in docs/a.md docs/b.md; do
  printf "%-50s " "$f"
  doc-check "$f" 2>&1 | tail -1
done
```

**Probe With Per-Command Environment**

```bash
EXAMPLE_APP_DATA=/path/to/data example-tool --json  # scoped override
env -u EXAMPLE_APP_DATA example-tool --json         # verify the no-env path
```

**Inspect A Text File Region**

```bash
sed -n '40,60p' file        # last resort - prefer the file tools
grep -n "pattern" file      # locate, then read the range
tr -cd '\r' < file | wc -c  # 0 means LF-clean
```

**Forbidden Patterns**

- Unquoted expansions (`echo $file`) - word-splitting and globbing.
- `eval` with untrusted variables - arbitrary code execution.
- Ignoring pipeline failures - the right side's exit code hides the
  left side's crash.
- `export` for a one-off override - it leaks into every later command.

## Formatting and Linting

ShellCheck lints every scratch script file.

```bash
shellcheck -s bash work/scripts/*.tmp.sh
```

Suppress a rule deliberately with a directive comment that states the
reason - never blanket-disable with `shellcheck -e` at the call site.

Indentation is two spaces.

## Testing

Inline commands are verified on synthetic inputs.

Run the probe against a known-good fixture and check the exit code and
stderr - an assertion is a printed value, not a silent zero.

Use `bash -n` for a syntax check without execution, and `bash -x` for
a traced run when a probe misbehaves.

## Build

Not applicable - inline scripts are interpreted, not built.

Scratch files do not need `chmod +x` when invoked as `bash file`.

A scratch file that graduates into project tooling leaves `work/` and
follows the product's script conventions instead.

## Dependencies

Inline probes use standard coreutils and widely available helpers.

| Category | Tool                            | Purpose                    |
|----------|---------------------------------|----------------------------|
| Text     | `grep`, `sed`, `awk`, `tr`      | Line and field processing  |
| Files    | `find`, `xargs`, `sort`, `uniq` | Filesystem sweeps          |
| JSON     | `jq`, `python3 -m json.tool`    | Structured output shaping  |
| Process  | `ps`, `fuser`                   | Lock and holder inspection |
| Lint     | `shellcheck`                    | Static analysis of scripts |

Avoid fragile or platform-absent utilities - a probe that needs an
uncommon tool declares the dependency in its header comment.

## Verification

| Check                       | Command Or Method                               | Applies To                |
|-----------------------------|-------------------------------------------------|---------------------------|
| ShellCheck analysis         | `shellcheck -s bash work/scripts/*.tmp.sh`      | All scratch probe scripts |
| Syntax check without run    | `bash -n work/scripts/*.tmp.sh`                 | All bash script files     |
| Verify variable quoting     | `grep -r -n '\$[A-Za-z0-9_]\+' work/scripts/`   | Audit unquoted expansions |
| Check for set -euo pipefail | `grep -L "set -euo pipefail" work/scripts/*.sh` | Must find zero matches    |
| Stray scratch files         | `ls work/scripts/`                              | Empty after session       |

## Definition of Done

**Correctness**

- Commands ran against the environment they claim to probe - PATH,
  locale, and privileges verified, not assumed.
- Verification output shows observed values, not inferred success.
- Pipelines were checked on the unpiped command or via `PIPESTATUS`.

**Structure**

- Scratch files live under `work/scripts/` and dumps under
  `work/dumps/`.
- Machine-read text ran under `LC_ALL=C` or was captured raw.

**Quality**

- The probe prints the evidence it claims - exit codes next to every
  assertion.
- Every `export` is justified - overrides are per-command otherwise.
- ShellCheck reports no warnings on scratch files kept for the
  session.

**Hygiene**

- No lock-holders killed, no system paths touched, no stray exports.
- Scratch files under `work/` are removed when done.
- The report cites the evidence - a captured dump path or printed
  output, never "it worked".

## General Principles

- **Always quote variables.** `"$var"` at every expansion site.
- **Check the left side of the pipe.** `PIPESTATUS` or the unpiped
  run decides the verdict.
- **Single-quote heredocs.** `<<'EOF'` keeps the payload literal.
- **Locale before parsing.** `LC_ALL=C` for machine-read output.
- **Per-command environment.** `VAR=x cmd`, never `export`.
- **Print evidence, not verdicts.** The reader verifies from data.
- **Clean up scratch files.** `work/` ends the session empty.
- **Investigate lock-holders.** Wait, never kill an updater.

## Fed Patterns

Patterns proven in projects that adopted this standard and evolved their own conventions.

**Device-namespace paths lose a backslash layer.** A literal `'\\.\pipe\name'` or
`'\\?\C:\...'` crossing the bash-to-PowerShell hand-off arrives as `'\.\pipe\'` inside a
single-quoted heredoc the same as an inline `-Command`, and .NET resolves it relative to cwd.
Build the value programmatically (`[char]92` concatenation, `[IO.Path]` joins) and print it
before use - never trust a literal `\\` through this channel.

**Bash double quotes corrupt PowerShell payloads.** `$env:` variables expand to empty before
the called program sees them - `powershell -Command "Set-Clipboard -Value '... $env:USERPROFILE
...'"` strips the variable name. Build command and payload strings in a `.ps1` file with
single-quoted literals, or write the file with a single-quoted heredoc.

## Sources

- https://www.gnu.org/software/bash/manual/bash.html - GNU Bash
  Reference Manual: quoting, expansion, `PIPESTATUS`, process
  substitution.
- https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
  - POSIX Shell Command Language: the portable subset.
- https://www.shellcheck.net/wiki/ - ShellCheck static analysis rules.
- `bash(1)` - quoting, expansion, `PIPESTATUS`, process substitution.
- `help test`, `help printf` - builtins over `/usr/bin` variants.
- The repository's agent rules and decision records - the
  project-utility boundary this standard implements.

## Project Conventions

- Repo scripts live in `shell/` - currently `sync.sh`, which must run
  through `bash`, never `sh`.
- `work/` is the only scratch root for temporary artifacts; scripts write
  nowhere else.
- Host shells vary (GNU bash on Linux/macOS, Git Bash on Windows) - keep
  scripts POSIX-clean and probe tool variants before relying on flags.
- Parallel verification batches run each subshell with an absolute path -
  in `cd root && (cd a; ...) & (cd b; ...) &`, the jobs after the first `&`
  inherit the original working directory, not `root`.
