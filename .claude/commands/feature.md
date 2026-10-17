---
description: Run the four-agent dev team (planner → coder → tester → reviewer) on a feature request
argument-hint: <feature request, e.g. "add rate limiting to the login endpoint">
---

Run the dev-team pipeline for this feature request:

> $ARGUMENTS

The agents hand work to each other through files in `.pipeline/`, so each one has the context of the one before it. Run them one at a time, in order, using the Agent tool with the matching `subagent_type`. Wait for each to finish before starting the next.

## 0. Prepare
- If `$ARGUMENTS` is empty, ask for the feature request and stop.
- Run `git status --short`. If there are uncommitted changes to tracked files, list them and ask whether to continue. Changes could get mixed into the feature.
- Create a branch from the current one: `git switch -c feature/<short-kebab-slug-of-the-request>`. Never work on `main` directly.
- Empty the handoff folder: delete `.pipeline/` if it exists, then create it and write the request to `.pipeline/request.md`.

## 1. Planner
Agent `planner`, prompt: "Feature request: <the request>. Read .pipeline/request.md, study the codebase, and write the spec to .pipeline/spec.md."
Then check that `.pipeline/spec.md` exists. Show the user the planner's summary in a few lines and continue. Don't wait for approval unless the spec lists assumptions that change what gets built.

## 2. Coder
Agent `coder`, prompt: "Implement .pipeline/spec.md exactly, then write .pipeline/changes.md."

## 3. Tester
Agent `tester`, prompt: "Write and run tests for the change described in .pipeline/spec.md and .pipeline/changes.md, then write .pipeline/tests.md."

## 4. Reviewer
Agent `reviewer`, prompt: "Review the change on this branch against .pipeline/spec.md, .pipeline/changes.md and .pipeline/tests.md, and give your verdict."
Save the reviewer's full reply to `.pipeline/review.md` (the reviewer cannot write files).

## 5. Loop or finish
- **CHANGES REQUESTED**: run the coder, then the tester, then the reviewer again. The coder reads review.md first. Allow at most 2 extra rounds. If the third verdict is still CHANGES REQUESTED, stop and show the user the open "Must fix" items.
- **APPROVE**: stop here. Do not commit, merge, push or touch any database. Tell the user:
  - the branch name and the files changed (`git diff --stat` plus new files),
  - the test results from tests.md,
  - the reviewer's verdict and any "Should fix" notes,
  - any schema change that still has to be pushed (local DB first, then the live DB only with the user's go-ahead).

  Then ask whether to commit the branch and merge it into main.
