# ADR-001: ULIDs as canonical token identity

## Status
Accepted

## Context
Figma uses VariableIds; GitHub uses JSON key paths. Renames break name-based links.

## Decision
Every token gets a stable ULID (`id`) at creation. Aliases reference by `id`, not name.

## Consequences
Renames are safe; DTCG name-based `{refs}` are only emitted at export time.
