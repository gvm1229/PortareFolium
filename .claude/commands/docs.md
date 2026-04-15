# docs

Update project documentation to reflect recent code changes. Run the following steps **in order**, skipping any step that has nothing to do.

## Step 1: Update CHANGES.md

1. Run `git log --oneline -20` and `git diff HEAD~5 --stat` to identify recent changes not yet documented.
2. Read the top of `docs/CHANGES.md` to find the latest documented version.
3. If there are undocumented commits since that version, add a new version entry following the existing style:
    - Increment the patch version from the latest entry (e.g., `v0.11.7` -> `v0.11.8`)
    - Use the format: `## v<version> (<date>)` with `### <Type>: <Korean summary>`
    - List changed files with brief descriptions
4. If CHANGES.md is already up to date, say so and move on.

**Single source of truth**: `docs/CHANGES.md` is the **only** project-level changelog. Do **not** create daily log files (e.g., `docs/logs/YYYYMMDD-*.md`) or alternative changelogs — version-grouped CHANGES.md is the canonical history. The release workflow (`.github/workflows/release.yml`) extracts release notes directly from this file via `awk` matching `## v<version>`, so format consistency is critical.

## Step 2: Write PR\_<branch>.md (non-main branches only)

1. Check the current branch with `git branch --show-current`.
2. If the branch is `main`, skip this step entirely.
3. Otherwise, run `git log main..HEAD --oneline` and `git diff main...HEAD --stat` to see all branch changes.
4. Create or update `PR_<branch-name>.md` (replace `/` with `-` in branch name) in the project root with:
    - **Title**: A concise PR title (under 70 characters)
    - **Summary**: 1-3 bullet points describing what changed and why
    - **Changed Files**: Grouped by category (feat/fix/refactor/docs/test)
    - **Test Plan**: Checklist of verification steps
5. Match the tone and format of the existing `PR.md` if one exists.

## Step 3: Update AGENTS.md project structure

1. Run `git diff HEAD~5 --stat` (or `git diff main...HEAD --stat` if on a non-main branch) to identify structural changes.
2. Read the `## Project Structure` section of `AGENTS.md`.
3. Only update if there are **structural** changes such as:
    - New components, pages, or lib modules added or removed
    - New directories created
    - Convention changes (new patterns, renamed concepts, removed systems)
    - Stack changes (new dependencies, framework upgrades)
4. Do NOT update for:
    - Bug fixes within existing files
    - Content changes (copy, translations)
    - Minor refactors that don't change the file tree or conventions
5. If updating, make **surgical edits** — touch only the lines that changed. Keep descriptions brief ("which is where", not full details).
6. If no structural changes exist, say so and move on.

## Output

After all steps, report a brief summary of what was updated (or that everything was already current).

$ARGUMENTS
