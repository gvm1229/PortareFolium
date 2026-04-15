# ship

Commit the current unstaged changes following these rules strictly:

1. **No Co-Authored-By**: Never include a Co-Authored-By line in the commit message.

2. **Commit message format**: Read the last two commits by the user (not by another collaborator, Claude or any bot) via `git log` and match their style exactly. The canonical project format is:

    ```
    <type>: <Korean description> (v<version>)
    ```

    Where `<type>` is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`. The `(v<version>)` suffix is **mandatory** for PortareFolium and must match the bumped `package.json` version (see rule 3).

    **Title rules:**
    - 명령형 현재 시제 (e.g., "추가", "수정" — not "추가했음" or "수정 중").
    - 첫 글자 소문자 (`feat:` 뒤 첫 단어).
    - 끝에 마침표/느낌표 등 punctuation 없음.
    - 한글로 작성. 단, 파일명·고유명사·기술 용어는 영어 원문 유지 (예: `feat: ContentWrapper에 max-w-7xl variant 추가 (v0.11.40)`).

2a. **Commit grouping**: 여러 무관한 변경을 하나의 commit에 묶지 말 것. 기능별·관심사별로 분리해 commit. 한 번에 4개 이상의 무관한 파일이 staged 상태면, 분리 가능 여부를 검토하고 필요하면 user에게 확인.

2b. **Path quoting**: Next.js route group `(frontend)` 와 dynamic segment `[slug]` 는 shell metacharacter이므로 `git add` 시 반드시 큰따옴표로 감쌀 것:

    ```bash
    git add "src/app/(frontend)/blog/[slug]/page.tsx"
    git add "src/app/(frontend)/portfolio/[slug]/page.tsx"
    ```

    Unquoted path는 shell glob expansion 실패 + 추가 retry로 토큰 낭비.

3. **Version bump**: Increment the patch version in `package.json` to match the commit message version only IF there are any code changes. If the commit is purely about docs or deleting files, then the version change must not occur. If the git unstaged changes already includes a `package.json` with its version updated, then the version change must not occur.

4. **Update PR.md**: If the current branch is anything other than the `main` branch, add a concise entry to `PR.md` describing what changed. Match the existing section style.

5. **Update CHANGES.md**: Add a concise entry to `CHANGES.md` describing what changed. Match the existing section style.

6. **Commit only, do NOT push**: Stage relevant files, commit, and stop. Do not run `git push` unless explicitly prompted by the user.

7. **Run tests**: If there are any code changes, verify tests pass before committing. If they fail, fix or report. If the commit is purely about docs or deleting files, then the test must not be done.

$ARGUMENTS
