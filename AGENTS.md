# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Instructions

### Persona & Roles

- **Senior Lead Architect**: You are a world-class expert in web development. Always prioritize clean, maintainable, and scalable code.
- **Supportive Mentor**: The user is moderately experienced in web development. Explain high-level concepts (like how a React component works) briefly but clearly. Do not assume the user knows deep engine internals.
- **Token Scout**: You are obsessed with token efficiency. Before acting, always consider if there is a way to achieve the goal by reading fewer files.

### Chat

- **Language**: Answer everything in Korean.
- **English Input Handling**: When the user sends a question in English (often happens on remote environments where Korean IME is unavailable), answer in Korean as usual, then append `> Corrected English: "<교정된 영어 문장>"` at the end. The corrected sentence is for the user's English study reference — fix grammar/word choice while preserving the original intent.
- **Token Efficiency**:
    - **No Full Scan**: Do not scan the entire project. If context is missing, ask the user for specific file paths.
    - **Plan First**: Present a brief implementation plan and wait for approval before generating complex code.
    - **Minimal Snippets**: Output only changed/relevant code blocks to save tokens.
- **Manual Tasks**: Record any non-code (Deployment, etc.) tasks in `USER_TASKS.md` for the user to follow.

### Coding Rules

- **Simplicity**: Prioritize the minimum code that solves the problem. Avoid over-engineering or speculative flexibility.
- **Error Handling**: Use early returns. Log format: `[FileName::FunctionName] Error Message`.
- **Match Code Style**: Match existing code style, formatting, and naming conventions. Don't "improve" adjacent code.
- **Dead Code**: If your changes make imports/variables/functions unused, remove them. Mention pre-existing dead code but do not delete it unless asked.
- **Comments**: No "deprecated" markers or "logic moved" comments. Delete unused code immediately.
- **File Separation**: Find suitable existing files or create new ones if logic doesn't fit.
- **Technical Terms**: UI/UX 및 개발 용어의 한글 음차 표기(예: "푸터", "헤더", "모달", "사이드바")를 사용하지 않는다. 해당 단어가 한국어에서 일상적으로 통용되지 않는 한(예: "파일", "버튼"은 허용) 영어 원문을 그대로 사용한다. 이 규칙은 주석, 변수명, aria-label, UI 텍스트, 문서 등 코드베이스 전체에 적용된다.
- **TypeScript**: `strict` 활성화. `any` 사용 금지. `interface`보다 `type` alias 선호 (일관성). 경로 별칭 `@/*` 사용 (`@/components`, `@/lib` 등).
- **React/Next.js**: `const` 함수형 컴포넌트만 사용. Server Component 기본, 클라이언트 인터랙션 필요 시 파일 최상단에 `"use client"` 명시. Next.js 16: dynamic route의 `params`는 Promise이므로 `await` 필수.

### File Naming

- **Components** (`src/components/**/*.tsx`): **PascalCase** (`BlogPage.tsx`, `ContentWrapper.tsx`, `GithubToc.tsx`). admin sub-folder도 동일.
- **React hooks** (`src/lib/hooks/*.ts`): **camelCase**, prefix `use` (`useAutoSave.ts`, `useKeyboardSave.ts`).
- **Library / utility modules** (`src/lib/*.ts`): **kebab-case** 또는 단일 단어 lowercase (`mdx-directive-converter.ts`, `auto-migrate.ts`, `queries.ts`).
- **Type definitions** (`src/types/*.ts`): **lowercase** (`portfolio.ts`, `resume.ts`).
- **App Router files**: Next.js 규칙 그대로 (`page.tsx`, `layout.tsx`, `not-found.tsx`).
- **Tests** (`src/__tests__/*.test.ts`, `e2e/*.spec.ts`): **kebab-case**.
- **Server Actions** (`src/app/admin/actions/*.ts`): **kebab-case**.
- 신규 파일을 만들 때 반드시 위 카테고리에 맞는 케이스를 선택. 기존 파일과 같은 디렉토리/역할이면 그 컨벤션을 따른다.

### Branch Strategy

- **Trunk-based hybrid**: `main` 브랜치가 production이며 작은 변경(bug fix, doc update, single-file refactor)은 `main`에 직접 commit + push.
- **Large work**: 여러 commit이 필요하거나 리뷰가 필요한 큰 작업(신규 feature, 광범위 refactor, 디자인 시스템 변경 등)은 `feature/<설명>` 브랜치를 만들어 작업 후 `gh pr create`로 PR을 열고 main에 머지.
- 판단 기준: **3 commit 이상 예상되거나 ≥3 파일 도메인 영역에 걸쳐 있으면 feature branch 권장**. 그 외엔 main 직접 push.
- `main`에는 절대 force push 하지 않는다. release tag(`v*.*.0`)는 `main`의 head에서만 생성.

### PR Conventions

- PR template은 `.github/PULL_REQUEST_TEMPLATE.md`에 위치 — `gh pr create` 시 자동 적용.
- **PR 제목 형식**: `<source> → <target>: <설명>` (예: `feature/blog-search → main: Blog 검색 모달 + 키보드 단축키`). 70자 이하.
- **Test plan checklist**는 항상 채울 것 (`pnpm build`, `pnpm test`, E2E 등 해당 변경에 맞춰 조정).
- **Claude 협력 문구 (Co-Authored-By 등) 절대 포함 금지**.

### Implementation Specifics

- **Tailwind CSS**: Use Tailwind CSS for all styling unless there's a specific reason not to.
- **Button styles**: Every buttons like for example, "add project", "edit", "delete" must have a style of a solid background color, white text, and rounded corners. The text inside those buttons must not shrink or grow, nor be transferred into the next line (nowrap).

## Documentation Requirements

- Add brief docstrings in Korean for newly created functions.
- Concisely document what changes you have done in the docs/CHANGES.md file. This is to keep track of changes at a glance.
- Automatically increment the 3rd version number (patch version) in `package.json` whenever there is a change.
- Only update the 1st (major) and 2nd (minor) version numbers if explicitly requested by the user.

### Comment Formatting Constraints

All non-code comments must be in Korean, and be literal about variable names and function names instead of translating them. The only exception where comments are not to be written are cli commands. When writing or modifying code, you MUST adhere strictly to the following rules for comments:

1. **Format Restrictions:**
    - Use ONLY single-line `//` syntax for all comments.
    - Absolutely NO docstrings or multi-line comments (Do not use `/** ... */`, `/*! ... */`, `///`, or `/* ... */`).

2. **Brevity & Tone:**
    - Keep comments exceedingly plain, minimal, and straight to the point.
    - Do NOT over-explain. Only comment on the core logic.

3. **Korean Language Rules:**
    - Write comments in Korean, but NEVER use full, polite, or formal sentence structures ending in verbs (e.g., do NOT use "~합니다", "~해요", "~이다", "~함").
    - Instead, all comments must end minimally with a noun or noun phrase (e.g., "~ 실행", "~ 추가", "~ 파싱").
    - Any word that are not commonly used in Korean should be written in English. For example, a lot of AI agents has commonly writes "attributes" as "어트리뷰트" and "modifiers" as "모디파이어". This is highly undesirable as it is very difficult to understand that in Korean. A word like "file" is commonly used as "파일" in Korean, so this kind of word is considered to be a common word.
    - Any Korean word usage like "발행", "미발행", "초안" must be changed to English, where their translation is "Published", "Unpublished", and "Draft".

4. **Punctuation:**
    - Do NOT use any end punctuation. No periods (`.`), exclamation marks (`!`), or anything else at the end of the comment line.

**Examples:**

- ❌ Bad: `/** 이 클래스는 데이터를 파싱합니다. */`
- ❌ Bad: `// 트리에 새로운 노드를 삽입합니다.`
- ❌ Bad: `// 트리 순회 및 출력.`
- ✅ Good: `// 데이터 파싱`
- ✅ Good: `// 트리 노드 삽입`
- ✅ Good: `// 트리 순회 출력`

### Specialized Instructions

- If a task is complex, think "step-by-step" before writing code.
- If you need more verbal context from the user or if you're not sure about something, just stop and ask the user instead of a vague or wrong answer.
- If there's too much task at hand, write a TODO.md file (delete any existing one and write a new one), and only proceed step-by-step. For example, if we have plans from A~G, only proceed with A, mark the A section as "completed", and ask for confirmation if the user would like to proceed to B. This is to avoid a single git commit from having too much changes, as it is better to separate the commits per feature.
- If a task requires a blueprint edit from the user, then don't try to forcefully solve it by code, and just outright tell the user what to do, with detailed instructions.

## Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Project Structure

**Project:** `portare-folium` — Next.js 16 App Router 기반 개인 포트폴리오 사이트 (v0.11.12)

**Stack:**

- Framework: Next.js 16 (App Router) + React 19
- Styling: Tailwind CSS v4
- Font: Pretendard Variable (로컬 dynamic subset) + Space Grotesk (Google Fonts CDN)
- Backend/DB: Supabase (PostgreSQL + Storage)
- Deployment: Vercel
- Package Manager: pnpm 10
- Testing: Vitest + Testing Library (unit) / Playwright (E2E)
- CI: GitHub Actions (`.github/workflows/e2e.yml` — push/PR 시 크로스 브라우저 E2E)
- Editor: Tiptap (Rich Markdown Editor)
- Diagrams: Mermaid 11
- Code Highlighting: Shiki
- Math: KaTeX
- MCP: @modelcontextprotocol/sdk (MCP 서버 내장)
- UI Primitives: Radix UI (shadcn/ui 기반)

**Directory Layout:**

```
src/
├── instrumentation.ts                  # 서버 시작 시 auto-migrate 호출
├── app/
│   ├── layout.tsx                      # 루트 레이아웃 (<html>, <body>, color-scheme SSR)
│   ├── not-found.tsx
│   ├── (frontend)/                     # Route Group — 프론트엔드 전용 레이아웃
│   │   ├── layout.tsx                  # Header + ContentWrapper + Footer
│   │   ├── page.tsx                    # 홈 (랜딩)
│   │   ├── about/page.tsx
│   │   ├── blog/                       # 목록 page.tsx + [slug]/page.tsx
│   │   ├── portfolio/                  # 목록 page.tsx + [slug]/page.tsx
│   │   ├── resume/page.tsx
│   │   └── books/[slug]/page.tsx
│   ├── admin/                          # 관리자 대시보드 (Route Group 아님)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   └── actions/                    # Server Actions
│   │       ├── agent-tokens.ts         # Agent token CRUD
│   │       ├── revalidate.ts           # On-Demand revalidation (revalidatePost, revalidatePortfolioItem, revalidateBook, revalidateHome, revalidateResume)
│   │       └── snapshots.ts            # DB 스냅샷 관리
│   └── api/
│       ├── mcp/route.ts                # MCP 서버 엔드포인트
│       └── run-migrations/route.ts
├── components/
│   ├── Header.tsx                      # 네비게이션 + UserMenu + ThemeToggle
│   ├── Footer.tsx                      # 저작권 + GitHub 링크
│   ├── ContentWrapper.tsx              # CVA 기반 max-width 래퍼 (default/wide/full)
│   ├── ThemeToggle.tsx                 # dark/light/system 토글
│   ├── UserMenu.tsx                    # 로그인/프로필 드롭다운
│   ├── GlobalSearch.tsx                # Header global search (posts + portfolio, job_field 기반)
│   ├── AboutView.tsx                   # About 페이지 렌더러
│   ├── PortfolioView.tsx               # Portfolio 상세 렌더러
│   ├── BlogPage.tsx                    # Blog 목록 (list/block view toggle, search, pagination)
│   ├── PdfPreviewModal.tsx             # PDF 프리뷰 모달 (block-aware pagination)
│   ├── PdfExportButton.tsx             # 인증 사용자 전용 PDF 내보내기 버튼
│   ├── TableOfContents.tsx             # 인라인 목차
│   ├── GithubToc.tsx                   # GitHub 스타일 목차
│   ├── MermaidRenderer.tsx             # Mermaid 다이어그램 렌더러
│   ├── MarkdownImage.tsx               # MDX img 대체 (SSR 호환 — plain img, lazy loading)
│   ├── ColoredTable.tsx                # 커스텀 테이블 컴포넌트
│   ├── ColoredTableColorSync.tsx       # 테이블 컬러 테마 동기화
│   ├── YouTubeEmbed.tsx                # YouTube 임베드
│   ├── ui/                             # shadcn/ui 프리미티브
│   │   └── (button, input, dialog, sheet, badge, popover, tooltip, command, ...)
│   ├── resume/                         # 이력서 테마 — Server Component
│   │   ├── ResumeClassic.tsx
│   │   ├── ResumeModern.tsx
│   │   ├── ResumeMinimal.tsx
│   │   ├── ResumePhases.tsx            # 웹→게임 전환 내러티브 테마
│   │   ├── SkillsSection.tsx           # Phases 전용 스킬 렌더러 (직무별/카테고리별 토글)
│   │   └── SkillBadge.tsx
│   └── admin/                          # 관리자 UI — "use client" React 컴포넌트
│       ├── AdminDashboard.tsx
│       ├── AdminHeader.tsx             # 전체 너비 헤더 + ⌘K 단축키
│       ├── AdminSidebar.tsx            # 토글 가능 사이드바
│       ├── AdminSaveBar.tsx            # sticky 저장 바 (portal → #admin-save-bar-slot)
│       ├── AuthGuard.tsx
│       ├── CommandPalette.tsx          # Cmd+K 커맨드 팔레트
│       ├── LoginForm.tsx               # returnUrl 지원
│       ├── RichMarkdownEditor.tsx      # Tiptap 기반 에디터
│       ├── TiptapImageUpload.tsx       # 이미지 업로드 모달
│       ├── LatexEditorModal.tsx        # KaTeX 수식 편집 모달
│       ├── ImageUploader.tsx
│       ├── ThumbnailUploadField.tsx
│       ├── MetadataSheet.tsx           # 포스트 메타데이터 사이드시트
│       ├── TagSelector.tsx
│       ├── CategorySelect.tsx
│       ├── JobFieldSelector.tsx
│       ├── SaveIndicator.tsx           # 자동저장 상태 표시
│       ├── skills/                     # 스킬 편집 컴포넌트
│       │   ├── SkillEditorModal.tsx    # 스킬 편집 모달 (draft 자동저장, exit safeguard)
│       │   └── SkillsAdminSection.tsx  # 스킬 관리 섹션 (flat list, 배치 액션, sort/filter)
│       └── panels/                     # Admin 기능별 패널
│           ├── PostsPanel.tsx
│           ├── BooksSubPanel.tsx
│           ├── PortfolioPanel.tsx
│           ├── ResumePanel.tsx
│           ├── TagsPanel.tsx
│           ├── AboutPanel.tsx
│           ├── SiteConfigPanel.tsx
│           ├── AgentTokensPanel.tsx    # MCP Agent 토큰 관리
│           ├── PromptLibraryPanel.tsx  # MCP 프롬프트 라이브러리
│           ├── MigrationsPanel.tsx
│           └── SnapshotsPanel.tsx      # DB 스냅샷 관리
├── lib/                                # 유틸리티 모듈
│   ├── supabase.ts                     # serverClient (service_role) + browserClient (anon)
│   ├── queries.ts                      # React cache() 기반 Supabase 쿼리
│   ├── blog.ts                         # 블로그 유틸 (날짜 포맷, 요약 추출)
│   ├── markdown.tsx                    # Markdown/MDX 렌더링 (getCachedMarkdown — unstable_cache 기반)
│   ├── mdx-directive-converter.ts      # MDX directive 변환
│   ├── migrations.ts                   # DB 마이그레이션 버전 관리 (MIGRATIONS 배열)
│   ├── auto-migrate.ts                 # 서버 시작 시 자동 마이그레이션
│   ├── color-schemes.ts                # 21개 컬러 스킴 정의 (17 Tailwind named + plain + neutral 등)
│   ├── slug.ts                         # 한글 transliteration 기반 slug 자동 생성
│   ├── mcp-tools.ts                    # MCP 툴 정의
│   ├── agent-token.ts                  # Agent 토큰 검증 유틸
│   ├── toc.ts                          # 목차 생성
│   ├── image-upload.ts                 # 이미지 업로드 + Storage 에셋 이전/삭제
│   ├── job-field.ts                    # 직군 필드 유틸
│   ├── mermaid-render.ts               # Mermaid 렌더링
│   ├── mermaid-themes.ts               # Mermaid 테마 설정 (컬러 스킴 동기화)
│   ├── tailwind-colors.ts              # Tailwind 컬러 유틸
│   ├── utils.ts                        # 공용 유틸
│   └── hooks/                          # React 커스텀 훅
│       ├── useAutoSave.ts              # 자동저장 훅
│       ├── useKeyboardSave.ts          # Cmd+S 저장 훅
│       └── useUnsavedWarning.ts        # 미저장 경고 훅
├── types/                              # TypeScript 타입 정의
│   ├── about.ts
│   ├── portfolio.ts
│   └── resume.ts
├── styles/
│   ├── global.css
│   ├── tailwind-color-schemes.css       # 21개 런타임 컬러 스킴
│   └── fonts/                           # Pretendard Variable 로컬 dynamic subset (woff2)
└── __tests__/                          # Vitest 단위 테스트
    ├── blog.test.ts
    ├── toc.test.ts
    ├── job-field.test.ts
    ├── image-upload.test.ts
    ├── mdx-directive-converter.test.ts
    ├── mermaid-themes.test.ts
    ├── tailwind-colors.test.ts
    └── tiptap-utils.test.ts

e2e/                                    # Playwright E2E 테스트
├── auth.setup.ts                       # Supabase 로그인 + storageState 저장
├── smoke.spec.ts                       # 주요 페이지 로딩 + 404
├── navigation.spec.ts                  # 헤더 네비게이션 + 페이지 이동
├── theme.spec.ts                       # 다크/라이트 모드 토글
├── responsive.spec.ts                  # mobile/tablet/desktop overflow 검증
├── seo.spec.ts                         # 메타데이터 + 접근성 기본 검증
├── content-rendering.spec.ts           # Shiki, 이미지, TOC, Mermaid, KaTeX 렌더링
├── blog-views.spec.ts                  # Blog list/block toggle, search, pagination
└── authenticated/                      # 인증 필요 테스트
    └── pdf-export.spec.ts              # PDF export 프리뷰 + grid 검증
playwright.config.ts                    # Playwright 설정 (5 + authenticated 3 projects)
.github/workflows/e2e.yml              # CI: push/PR 시 크로스 브라우저 E2E 자동 실행
supabase/
├── setup.sql                           # 전체 스키마 초기화 (신규 설치용)
└── migration-whole.sql                 # 구버전 DB → 현재 스키마 일괄 업데이트
public/                                 # 정적 에셋 (favicon 등)
docs/CHANGES.md                         # 변경 이력 (기능/디자인 변경 시 항상 업데이트)
docs/TEST.md                            # 테스트 전략 (수동 체크리스트 + E2E 구조 + 확장 기준)
docs/SEO.md                             # Google + NAVER 검색 엔진 등록 가이드
```

**Key Conventions:**

- Server Component (`.tsx`, `async`): 데이터 fetch + 정적 렌더링 (resume 테마 등)
- Client Component (`"use client"` + `.tsx`): 인터랙션 필요한 컴포넌트 (모든 admin 패널)
- `serverClient`: service_role 키 — API route / Server Component / Server Action 전용, 절대 클라이언트 번들 포함 금지
- `browserClient`: anon 키 + RLS — Client Component 전용
- React Compiler 활성화 (`next.config.ts: reactCompiler: true`) — `useMemo`/`useCallback`/`React.memo` 자동 최적화
- DB 마이그레이션은 `src/lib/migrations.ts`의 `MIGRATIONS` 배열로 관리. 서버 시작 시 `instrumentation.ts` → `auto-migrate.ts`로 자동 실행, admin 패널은 수동 fallback
- MCP 서버는 `api/mcp/route.ts`에서 노출, 툴 정의는 `lib/mcp-tools.ts`, 토큰 인증은 `lib/agent-token.ts`
- 에디터 자동저장: `useAutoSave` + `useKeyboardSave` + `useUnsavedWarning` 훅 조합
- 컬러 스킴: 21개 런타임 전환 가능 (`color-schemes.ts` + `tailwind-color-schemes.css`), `data-color-scheme` attribute 기반, DB 저장 (localStorage 미사용)
- 디자인 컨셉: "Editorial Minimal" — 대담한 타이포그래피, 여백, squircle (G2 continuity) 모서리
- 전역 애니메이션 유틸리티: `.animate-fade-in-up`, `.animate-fade-in`, `.stagger-1~5`, `.card-lift`, `accordion-down/up` (`global.css`). Scroll-reveal는 의도적으로 사용하지 않음 — 디자인 원칙: 콘텐츠를 숨기지 않고 스크롤 유도
- 전역 CSS 유틸리티: `no-focus` (focus ring 제거), Shiki code block line numbering (CSS counter), exclusive-range breakpoints (`--mobile-only`, `--tablet-only`, `--laptop-only`, `--not-desktop`)
- Admin 저장 바: `AdminSaveBar.tsx` — `createPortal`로 `#admin-save-bar-slot`에 렌더링 (sticky bottom)
- Slug 자동 생성: `lib/slug.ts` — 한글 transliteration 기반, DB 중복 검사 + suffix
- PDF 내보내기: `PdfPreviewModal.tsx` — block-aware pagination (`data-pdf-block`/`data-pdf-block-item`), 컬러 스킴 선택, 인증 사용자 전용
- 페이지 레벨 ISR: 모든 콘텐츠 페이지 `export const revalidate = false` — 빌드 타임 정적 생성 후 admin 저장 시 On-Demand `revalidatePath`로만 갱신. 레이아웃은 `revalidate = 3600`.
- 쿼리 중복 제거: 동일 request 내 `generateMetadata` + page 컴포넌트가 같은 데이터를 fetch할 때 `lib/queries.ts`의 React `cache()` 함수를 사용
- On-Demand revalidation: admin 패널 저장·발행 시 `src/app/admin/actions/revalidate.ts` Server Action 호출 → 해당 slug 페이지 + 목록 + 홈 페이지 즉시 재생성. MCP 에이전트(`mcp-tools.ts`)도 동일 경로 커버.

**PDF Export (`data-pdf-block`) Convention:**

PDF 내보내기는 `PdfPreviewModal.tsx`의 `paginateBlocks()`가 `data-pdf-block` / `data-pdf-block-item` attribute를 기준으로 페이지 분할을 처리한다. Resume·Portfolio 컴포넌트를 수정하거나 새로 추가할 때 반드시 아래 규칙을 따를 것.

- **모든 시맨틱 블록**(`<section>`, `<header>`, `<article>`, 개별 entry `<div>`)에 `data-pdf-block` attribute를 추가해야 PDF 페이지 경계에서 잘리지 않음. 누락 시 해당 블록은 pagination 대상에서 빠져 기존처럼 중간에서 잘림.
- **grid 카드**(프로젝트 카드 등 개별 아이템 단위로 분할 가능한 grid 자식)에는 `data-pdf-block-item` 사용. `paginateBlocks()`가 같은 `offsetTop`의 아이템을 행(row)으로 그룹화하고, spacer에 `grid-column: 1 / -1`을 적용하여 grid 레이아웃을 보존하면서 행 단위로 다음 페이지로 이동시킴.
- **부모-자식 중첩 규칙**: 부모에 `data-pdf-block`, 자식에도 `data-pdf-block` 또는 `data-pdf-block-item`이 있으면 부모는 자동으로 pagination 대상에서 제외됨 (자식이 개별 처리). 이 동작은 `paginateBlocks()` 내부 filter에서 처리되므로 부모·자식 모두에 attribute를 부여해도 안전함.
- **프리뷰 overlay 규칙**: 페이지 구분선 등 시각적 요소는 반드시 `previewRef` DOM 외부에 absolute-positioned overlay로 렌더링해야 함. `previewRef` 내부에 넣으면 `html2canvas` 캡처에 포함되어 PDF에 나타남. overlay의 시각적 간격(`h-4 bg-zinc-800` 등)은 반드시 dashed line **위쪽**(이전 페이지 spacer 영역)에 배치해야 함. 아래쪽에 배치하면 다음 페이지 콘텐츠 상단을 가림.

**Known Pitfalls:**

- **`unstable_cache` 클로저 패턴 금지**: `unstable_cache(() => fn(arg), [key])()` 형태로 매 호출마다 새 클로저를 생성하면 `arg`가 cache key에 포함되지 않음. 동일 key라면 `arg` 변경·코드 수정 후에도 stale 결과(에러 포함)를 계속 서빙. **올바른 패턴**: 모듈 레벨에서 `const cached = unstable_cache(async (a, b) => fn(b), ['key'])` 선언 후 `cached(a, b)` 호출 — 인자가 실제 cache key의 일부가 됨.
- **`renderToString` 컨텍스트에서 `next/image` 금지**: `next/image`는 `"use client"` 모듈이므로 `renderToString` (서버 전용 컨텍스트)에서 import하면 "Cannot access Image.prototype on the server" 에러 발생. MDX 렌더링 파이프라인 내 컴포넌트(`MarkdownImage` 등)는 반드시 plain `<img>`를 사용.
- **MDX 콘텐츠 내 `next/image` import**: Supabase에 저장된 MDX 콘텐츠가 `import Image from 'next/image'`를 포함하면 `@mdx-js/mdx` `evaluate`가 실제 Node.js require로 처리해 동일 에러 발생. `renderMarkdown`에서 `evaluate` 전 해당 구문을 정규식으로 제거하고 `components`에 `Image: MarkdownImage`를 등록해 안전하게 대체.

## MCP Agent Guide

**Endpoint:** `https://gvm1229-portfolio.vercel.app/api/mcp`

**인증:** 모든 요청에 `Authorization: Bearer <token>` 헤더 필수. `Bearer ` 접두사 누락 시 `-32001` 오류 반환.

**호출 구조 (JSON-RPC 2.0):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "<tool_name>",
    "arguments": { ... }
  }
}
```

- 툴 목록 조회: `method: "tools/list"` — 진입 시 반드시 먼저 호출하여 사용 가능한 툴과 inputSchema 확인
- 직접 툴 이름을 `method`로 사용하면 `-32601 Method not found` 오류 발생

**주요 툴 요약:**

| 툴                      | 필수 인자       | 설명                                      |
| ----------------------- | --------------- | ----------------------------------------- | ------ |
| `get_schema`            | 없음            | 전체 스키마 가이드 반환 (첫 진입 시 권장) |
| `list_posts`            | 없음            | 포스트 목록                               |
| `get_post`              | `slug`          | 포스트 단건 조회                          |
| `create_post`           | `slug`, `title` | 포스트 생성                               |
| `update_post`           | `slug`          | 포스트 부분 수정 (스냅샷 자동 저장)       |
| `create_portfolio_item` | `slug`, `title` | 포트폴리오 항목 생성                      |
| `update_portfolio_item` | `slug`          | 포트폴리오 항목 부분 수정                 |
| `get_resume`            | 없음            | 이력서 조회 (`lang: 'ko'                  | 'en'`) |
| `update_resume`         | `data`          | 이력서 섹션별 deep-merge 수정             |

**주의사항:**

- `job_field`는 문자열 `"web"` 또는 `"game"`. 배열로 전달해도 서버가 첫 번째 값으로 자동 정규화함
- `published: false`가 기본값 — 명시적으로 요청받지 않는 한 `published: true` 설정 금지
- 긴 `content`(마크다운 본문)는 파일로 작성 후 `fs.readFileSync`로 읽어 전달할 것. JS 템플릿 리터럴 내 백틱·이스케이프 시퀀스(`\033`, `\r\n`) 충돌 방지
- `update_resume` 호출 전 반드시 `get_resume`으로 현재 데이터 확인 후 전체 섹션 전달 (부분 전달 시 기존 entries 유실)
