# Docker Development Standards

<!-- Standards set: docker-general-development@0.1.0 | Date: 2026-10-25 -->

## Purpose

This document defines the engineering standard for packaging a service as a Docker image
orchestrated with Docker Compose.

It covers base image selection, non-root operation, volume and bind-mount wiring,
configuration injection, and host-platform caveats.

It is written to be executed directly by an AI coding agent and to be read without
effort by a human reviewer.

## Scope

A project is in scope when all of the following conditions hold.

- The project ships a Dockerfile that produces a runnable container image.
- A Compose file orchestrates the service for local or single-host deployment.
- The container may mount host files, named volumes, or repository checkouts.

Multi-node orchestration (Kubernetes, Swarm) is out of scope, because scheduling,
secrets, and storage rules differ.

## How To Use This Standard

This section is the entry point for an agent.

Read it before reading anything else in this document.

**Order Of Operations**

1. Read the project rules file, such as `AGENTS.md`, `README.md`, or
   `docs/GUIDELINES.md`, because a project rule overrides this standard.
2. Read the Dockerfile and the Compose file together - they form one contract.
3. Apply the sections of this standard that match the task.
4. Verify with a clean bring-up, not a render check alone.

**Precedence**

When two rules conflict, apply the first matching source in this list.

| Rank | Source                                    | Example                              |
|------|-------------------------------------------|--------------------------------------|
| 1    | An explicit instruction from the user     | "Keep the image on Bookworm"         |
| 2    | The project rules file                    | `docs/GUIDELINES.md`                 |
| 3    | The existing convention in the repository | Volume layout already wired          |
| 4    | This standard                             | Single config directory mount        |
| 5    | Docker and Compose documentation          | Anything the above rows do not cover |

## Documentation

- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Compose specification: https://docs.docker.com/compose/compose-file/
- Named volumes: https://docs.docker.com/engine/storage/volumes/
- Git `safe.directory`: https://git-scm.com/docs/git-config

## Base Image Selection

- Keep every stage on the same OS release when the builder links a binary the runtime
  stage executes, so the binary runs against the glibc it was built for.
- When the build links a prebuilt native binary (a downloaded `.so`, `.a`, or a crate
  shipping vendor objects), check the symbol floor it sets. A base image whose glibc
  predates the requirement fails at link time with undefined references such as
  `__isoc23_strtol`. Pick the base release from the native dependency's requirements,
  not from habit.
- Pin bases by name and release, such as `rust:1.94-trixie` and `debian:trixie-slim`.
  Do not float on a distribution codename family.
- Install only what the runtime needs in the final stage, and include `ca-certificates`
  plus the VCS client when the process performs network or Git operations.

## Non-Root Operation

- Run the process as an unprivileged `USER`.
- Every path a named volume mounts onto must exist in the image and be owned by the
  runtime uid. Docker populates an empty named volume from the image directory, so a
  missing or root-owned path leaves the container unable to write on first start.
- Do not work around ownership by running as root. Fix the image.

## Mounts And Configuration

- Mount configuration as a directory, not a single file, when the application writes
  the file back. Atomic save patterns (write a sibling temp file, then rename) fail on
  a file bind mount, so the mount must cover the directory the rename spans.
- Every required configuration path needs an explicit environment variable or mount in
  the Compose file. A default that resolves relative to the container workdir fails as
  a missing file at `/`, which surfaces as an unrelated startup error.
- Bind-mount host checkouts read-only (`:ro`) when the container only consumes them,
  so a write-enabled application cannot modify the source regardless of its own
  strategy settings.
- Git refuses to operate on checkouts owned by a different uid than the process
  ("dubious ownership", Git 2.35.2 and later). When the container performs Git
  operations on bind-mounted repositories, declare the mount roots in the image with
  `git config --system --add safe.directory '/mount-root/*'`.
- Use `file://` URLs for local-path sources so the uniform clone path applies,
  including shallow-clone semantics, instead of a local-clone fallback that may copy
  the full history.

## Compose File

- Omit the top-level `version` key. It is obsolete and warns on every invocation.
- Enforce required environment values with `${VAR:?}` so the stack refuses to start
  without them.
- Parameterize host-side mount paths through `.env` - commit an `.env.example` and
  gitignore the real file.
- Keep credential material out of tracked files: commit `*.example` templates and
  gitignore the instantiated files.

## Host Platform Notes

- On Windows, Docker Desktop must run the Linux engine for `linux/amd64` images. A
  Windows-engine daemon cannot pull them. `docker compose version` succeeds under
  either engine, so detect the mode with a pull or `docker info`, not by the CLI
  responding.
- MSYS-based shells (Git Bash) rewrite arguments that look like paths and can consume a
  leading dash, turning `--entrypoint` into `-entrypoint`. Set `MSYS_NO_PATHCONV=1` or
  write container paths with a `//` prefix.
- On Windows, `python3` may resolve to the Store stub. Use `python` or `py`.

## Testing

- A Dockerfile or Compose change is verified by `docker compose up -d --build` on clean
  volumes - `compose config` renders syntax but proves nothing about the runtime.
- Exercise the startup paths that touch every mounted path before calling the
  deployment healthy: open the data stores, perform the Git operations, and call the
  health endpoint.
- Verify a file the application writes back (a config save) actually persists to the
  host through the mount.

## Definition of Done

- The image builds from a clean context and the container reaches `healthy` on empty
  named volumes.
- Every mounted path is readable or writable by the runtime uid as required.
- No credential material lives in tracked files. Examples are committed.
- `docker compose config` renders without warnings.

## Project Conventions

- Each component carries its own `Dockerfile` at the component root:
  `excel-api-node/`, `excel-api-java/`, `excel-api-csharp/`, `excel-api-go/`,
  `excel-api-test/`.
- `docker-compose.yaml` runs a chosen implementation via `IMAGE=<name>`;
  `docker-compose.test.yaml` runs the black-box integration suite against it.
- Runtime data mounts through `work/data/` - locks bind at `./work/data/locks`
  to `/data/locks`; configuration mounts read-only.
- Build and verify images per `docs/DEPLOYMENT.md` before treating one as
  shippable.
