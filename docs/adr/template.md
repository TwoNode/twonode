# Architecture Decision Record (ADR) Template

## Rules

1. **One decision per file**, titled as the decision ("Money crosses the API as integer kobo"),
   not as the topic ("Money").
2. **`NNNN-kebab-title.md`.** Four digits, the next free number, never reused or renumbered. If
   two open PRs claim the same number, the later one renumbers before it merges.
3. **Status** is `Proposed`, `Accepted`, `Rejected`, `Deprecated` or `Superseded`. Write
   `Accepted` when the decision has been made and the PR records it. Write `Proposed` only while
   it is still open, and let the PR that settles it change the Status and the Date. Keep rejected
   ones: "we looked at this and said no" is worth finding.
4. **An accepted ADR is not rewritten.** Fix a typo or a dead link in place. Anything that
   changes the meaning is a new ADR that says `Supersedes: NNNN`, and the old one becomes
   `Superseded` with `Superseded by: NNNN`. The old text stays, because its value is what was
   known at the time.
5. **Land it with the change.** When a decision comes with code in this repo, the ADR is in the
   same PR, so the reason and the change arrive together. A backend-only decision gets its own
   small PR here, and the backend PR cites the number. A decision made ahead of the code lands
   alone.
6. **Name who decided, and when.** `Date` is the day the decision was made (UTC), not the day it
   was written down. `Decided by` is the person who could have said no. An agent may draft an
   ADR; only a person can accept it.
7. **Say what enforces it.** A gate (`npm run verify-…`), a test, or `review only`, written out.
   Prose is not a check: where a decision has already cost money once, add the gate in the same
   change.
8. **Write the downsides and the alternatives.** Consequences list what gets harder, what is being
   accepted, and what would make us revisit. Each alternative says why not. An ADR with only
   benefits is a sales page.
9. **Backfilling is allowed and must be honest.** Add a `Backfilled` line, date the decision by
   the commit that introduced it, and cite that commit. Where the reasoning was never written
   down, say so; do not reconstruct a context nobody recorded.
10. **Treat an accepted ADR as a constraint.** If a change would contradict one, stop and propose
    a superseding ADR instead of working around it. Code that enforces or depends on a decision
    cites it in a comment (`ADR-0007`), and the ADR lists the files and documents it binds.
11. **Short, and no secrets.** One page, two at most; link out for detail. No passwords, tokens,
    customer names or real employee data.

---

## Template

```markdown
# NNNN. Title: the choice, in a few words

- **Status:** Proposed | Accepted | Rejected | Deprecated | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Decided by:** Person or role
- **Related:** PR links, files, other records
- **Enforced by:** Test suite, CI gate, or database constraint

## Context

The problem and the forces behind it.

## Decision

What we chose, stated plainly.

## Alternatives considered and rejected

What else was considered and why it was not chosen.

## Consequences & Downsides

What gets better, what gets worse or harder, and what this commits us to later.
```
