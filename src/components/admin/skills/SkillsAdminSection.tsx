"use client";

import { useState, useEffect, useMemo } from "react";
import { getSimpleIcon } from "@/components/resume/SkillBadge";
import { Switch } from "@/components/ui/switch";
import { type JobFieldItem } from "@/components/admin/JobFieldSelector";
import SkillEditorModal from "@/components/admin/skills/SkillEditorModal";
import type { Resume, ResumeSkillKeyword } from "@/types/resume";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

// 섹션 이모지 선택 (ResumePanel에서 동일 패턴 사용)
function SectionEmojiSelector({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [showPicker, setShowPicker] = useState(false);
    return (
        <div className="relative mr-3 inline-block">
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-subtle) text-base transition-colors hover:bg-(--color-border)"
                title="이모지 선택"
            >
                {value || "➕"}
            </button>
            {showPicker && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowPicker(false)}
                    />
                    <div className="absolute top-10 left-0 z-50 shadow-xl">
                        <Picker
                            data={data}
                            onEmojiSelect={(e: any) => {
                                onChange(e.native);
                                setShowPicker(false);
                            }}
                            theme={
                                typeof document !== "undefined" &&
                                document.documentElement.classList.contains(
                                    "dark"
                                )
                                    ? "dark"
                                    : "light"
                            }
                        />
                    </div>
                </>
            )}
        </div>
    );
}

type FlatSkill = ResumeSkillKeyword & {
    categoryIdx: number;
    kwIdx: number;
    categoryName: string;
};

interface DraftData {
    kwData: ResumeSkillKeyword;
    categoryName: string;
    originalCategoryIdx: number | null;
    originalKwIdx: number | null;
    timestamp: number;
}

interface ModalState {
    originalCategoryIdx: number | null;
    originalKwIdx: number | null;
    initialSkill?: ResumeSkillKeyword;
    initialCategoryName?: string;
}

type BatchAction = "level" | "category" | "jobField";

interface SkillsAdminSectionProps {
    resumeData: Resume;
    setResumeData: (r: Resume) => void;
    jobFields: JobFieldItem[];
    onBackup: () => void;
}

const DRAFT_KEY = "resume_skill_draft";

function skillsOrDefault(r: Resume) {
    return r.skills ?? { showEmoji: false, emoji: "✔️", entries: [] };
}

// catIdx를 key string에서 추출할 때 안전하게 파싱
function parseKey(key: string): { catIdx: number; kwIdx: number } {
    const idx = key.indexOf("-");
    return {
        catIdx: Number(key.slice(0, idx)),
        kwIdx: Number(key.slice(idx + 1)),
    };
}

export default function SkillsAdminSection({
    resumeData,
    setResumeData,
    jobFields,
    onBackup,
}: SkillsAdminSectionProps) {
    const [sortMode, setSortMode] = useState<"category" | "alpha">("category");
    const [filterCategory, setFilterCategory] = useState("all");
    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [draftInfo, setDraftInfo] = useState<DraftData | null>(null);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // 배치 선택
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [batchAction, setBatchAction] = useState<BatchAction | null>(null);
    const [batchValue, setBatchValue] = useState("");

    // mount 시 draft 확인
    useEffect(() => {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
            try {
                setDraftInfo(JSON.parse(raw));
            } catch {
                // invalid
            }
        }
    }, []);

    // filter/sort 변경 시 선택 초기화
    useEffect(() => {
        setSelectedKeys(new Set());
        setBatchAction(null);
        setBatchValue("");
    }, [filterCategory, sortMode]);

    // flat skills 생성
    const flatSkills = useMemo<FlatSkill[]>(() => {
        const entries = resumeData.skills?.entries ?? [];
        return entries.flatMap((cat, catIdx) =>
            (cat.keywords ?? []).map((kw, kwIdx) => ({
                ...kw,
                categoryIdx: catIdx,
                kwIdx,
                categoryName: cat.name ?? "",
            }))
        );
    }, [resumeData.skills]);

    // 카테고리 목록
    const categoryNames = useMemo(() => {
        const names = new Set<string>();
        for (const s of resumeData.skills?.entries ?? []) {
            if (s.name) names.add(s.name);
        }
        return [...names];
    }, [resumeData.skills]);

    // filter
    const filtered = useMemo(() => {
        if (filterCategory === "all") return flatSkills;
        return flatSkills.filter((s) => s.categoryName === filterCategory);
    }, [flatSkills, filterCategory]);

    // sort
    const sorted = useMemo(() => {
        if (sortMode === "alpha") {
            return [...filtered].sort((a, b) =>
                a.name.toLowerCase().localeCompare(b.name.toLowerCase())
            );
        }
        return filtered;
    }, [filtered, sortMode]);

    // category groups (sort=category)
    const categoryGroups = useMemo(() => {
        if (sortMode !== "category") return null;
        const groups = new Map<string, FlatSkill[]>();
        for (const s of sorted) {
            const key = s.categoryName || "(미분류)";
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(s);
        }
        return [...groups.entries()];
    }, [sorted, sortMode]);

    // 선택 관련 derived
    const isAllSelected =
        sorted.length > 0 &&
        sorted.every((s) => selectedKeys.has(`${s.categoryIdx}-${s.kwIdx}`));
    const someSelected = selectedKeys.size > 0;

    const toggleSelect = (key: string) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(
                new Set(sorted.map((s) => `${s.categoryIdx}-${s.kwIdx}`))
            );
        }
    };

    const clearSelection = () => {
        setSelectedKeys(new Set());
        setBatchAction(null);
        setBatchValue("");
    };

    // 단일 삭제
    const handleDelete = (catIdx: number, kwIdx: number) => {
        if (!confirm("삭제하시겠습니까?")) return;
        onBackup();
        const skills = skillsOrDefault(resumeData);
        const entries = skills.entries.map((cat, i) => {
            if (i !== catIdx) return cat;
            const kws = [...(cat.keywords ?? [])];
            kws.splice(kwIdx, 1);
            return { ...cat, keywords: kws };
        });
        setResumeData({ ...resumeData, skills: { ...skills, entries } });
    };

    // 배치 삭제
    const handleBatchDelete = () => {
        if (!confirm(`선택한 ${selectedKeys.size}개 스킬을 삭제하시겠습니까?`))
            return;
        onBackup();
        const skills = skillsOrDefault(resumeData);
        const toRemoveMap = new Map<number, Set<number>>();
        for (const key of selectedKeys) {
            const { catIdx, kwIdx } = parseKey(key);
            if (!toRemoveMap.has(catIdx)) toRemoveMap.set(catIdx, new Set());
            toRemoveMap.get(catIdx)!.add(kwIdx);
        }
        const entries = skills.entries.map((cat, catIdx) => {
            const toRemove = toRemoveMap.get(catIdx);
            if (!toRemove) return cat;
            const kws = (cat.keywords ?? []).filter(
                (_, kwIdx) => !toRemove.has(kwIdx)
            );
            return { ...cat, keywords: kws };
        });
        setResumeData({ ...resumeData, skills: { ...skills, entries } });
        clearSelection();
    };

    // 배치 숙련도 변경
    const handleBatchSetLevel = () => {
        onBackup();
        const skills = skillsOrDefault(resumeData);
        const toUpdateMap = new Map<number, Set<number>>();
        for (const key of selectedKeys) {
            const { catIdx, kwIdx } = parseKey(key);
            if (!toUpdateMap.has(catIdx)) toUpdateMap.set(catIdx, new Set());
            toUpdateMap.get(catIdx)!.add(kwIdx);
        }
        const entries = skills.entries.map((cat, catIdx) => {
            const toUpdate = toUpdateMap.get(catIdx);
            if (!toUpdate) return cat;
            const kws = (cat.keywords ?? []).map((kw, kwIdx) =>
                toUpdate.has(kwIdx)
                    ? { ...kw, level: batchValue.trim() || undefined }
                    : kw
            );
            return { ...cat, keywords: kws };
        });
        setResumeData({ ...resumeData, skills: { ...skills, entries } });
        clearSelection();
    };

    // 배치 직무 분야 변경
    const handleBatchSetJobField = () => {
        onBackup();
        const skills = skillsOrDefault(resumeData);
        const toUpdateMap = new Map<number, Set<number>>();
        for (const key of selectedKeys) {
            const { catIdx, kwIdx } = parseKey(key);
            if (!toUpdateMap.has(catIdx)) toUpdateMap.set(catIdx, new Set());
            toUpdateMap.get(catIdx)!.add(kwIdx);
        }
        const entries = skills.entries.map((cat, catIdx) => {
            const toUpdate = toUpdateMap.get(catIdx);
            if (!toUpdate) return cat;
            const kws = (cat.keywords ?? []).map((kw, kwIdx) =>
                toUpdate.has(kwIdx)
                    ? { ...kw, jobField: batchValue || undefined }
                    : kw
            );
            return { ...cat, keywords: kws };
        });
        setResumeData({ ...resumeData, skills: { ...skills, entries } });
        clearSelection();
    };

    // 배치 카테고리 변경
    const handleBatchSetCategory = () => {
        const targetName = batchValue.trim();
        if (!targetName) return;
        onBackup();
        const skills = skillsOrDefault(resumeData);
        let entries = skills.entries.map((e) => ({
            ...e,
            keywords: [...(e.keywords ?? [])],
        }));

        // 대상 카테고리 찾기 또는 생성
        let targetIdx = entries.findIndex((e) => e.name === targetName);
        if (targetIdx === -1) {
            entries = [...entries, { name: targetName, keywords: [] }];
            targetIdx = entries.length - 1;
        }

        // catIdx별로 kwIdx 그룹화 (제거 순서를 위해 내림차순 정렬)
        const byCategory = new Map<number, number[]>();
        for (const key of selectedKeys) {
            const { catIdx, kwIdx } = parseKey(key);
            if (catIdx === targetIdx) continue; // 이미 같은 카테고리
            if (!byCategory.has(catIdx)) byCategory.set(catIdx, []);
            byCategory.get(catIdx)!.push(kwIdx);
        }

        const skillsToAdd: ResumeSkillKeyword[] = [];
        for (const [catIdx, kwIdxs] of byCategory) {
            kwIdxs.sort((a, b) => b - a); // 인덱스 shift 방지를 위해 내림차순
            for (const kwIdx of kwIdxs) {
                skillsToAdd.push(entries[catIdx].keywords[kwIdx]);
                entries[catIdx].keywords.splice(kwIdx, 1);
            }
        }
        entries[targetIdx].keywords.push(...skillsToAdd);

        setResumeData({ ...resumeData, skills: { ...skills, entries } });
        clearSelection();
    };

    // 배치 적용 dispatcher
    const applyBatchAction = () => {
        if (batchAction === "level") handleBatchSetLevel();
        else if (batchAction === "jobField") handleBatchSetJobField();
        else if (batchAction === "category") handleBatchSetCategory();
    };

    // 모달 저장
    const handleSave = (skill: ResumeSkillKeyword, categoryName: string) => {
        onBackup();
        const skills = skillsOrDefault(resumeData);
        let entries = skills.entries.map((e) => ({
            ...e,
            keywords: [...(e.keywords ?? [])],
        }));
        const origCatIdx = modalState?.originalCategoryIdx ?? null;
        const origKwIdx = modalState?.originalKwIdx ?? null;

        let targetCatIdx = entries.findIndex((e) => e.name === categoryName);
        if (targetCatIdx === -1) {
            entries = [...entries, { name: categoryName, keywords: [] }];
            targetCatIdx = entries.length - 1;
        }

        if (origCatIdx !== null && origKwIdx !== null) {
            if (origCatIdx === targetCatIdx) {
                entries[targetCatIdx].keywords[origKwIdx] = skill;
            } else {
                entries[origCatIdx].keywords.splice(origKwIdx, 1);
                entries[targetCatIdx].keywords.push(skill);
            }
        } else {
            entries[targetCatIdx].keywords.push(skill);
        }

        setResumeData({ ...resumeData, skills: { ...skills, entries } });
        setModalState(null);
        setDraftInfo(null);
    };

    // draft 클릭 → 모달 열기
    const openDraft = () => {
        if (!draftInfo) return;
        setModalState({
            originalCategoryIdx: draftInfo.originalCategoryIdx,
            originalKwIdx: draftInfo.originalKwIdx,
            initialSkill: draftInfo.kwData,
            initialCategoryName: draftInfo.categoryName,
        });
    };

    // 카테고리 icon/color/name 수정
    const updateCategory = (
        idx: number,
        field: "iconSlug" | "iconColor" | "name",
        value: string
    ) => {
        const skills = skillsOrDefault(resumeData);
        const entries = skills.entries.map((e, i) => {
            if (i !== idx) return e;
            return { ...e, [field]: value || undefined };
        });
        setResumeData({ ...resumeData, skills: { ...skills, entries } });
    };

    // 카테고리 삭제
    const deleteCategory = (idx: number) => {
        const skills = skillsOrDefault(resumeData);
        const cat = skills.entries[idx];
        if ((cat.keywords ?? []).length > 0) return;
        if (!confirm("카테고리를 삭제하시겠습니까?")) return;
        const entries = skills.entries.filter((_, i) => i !== idx);
        setResumeData({ ...resumeData, skills: { ...skills, entries } });
    };

    // 경험 연결 badge text
    const expBadge = (s: FlatSkill) => {
        if (s.workRef) return s.workRef;
        if (s.projectRef) return s.projectRef;
        return null;
    };

    // 스킬 행 렌더링
    const renderSkillRow = (s: FlatSkill) => {
        const key = `${s.categoryIdx}-${s.kwIdx}`;
        const icon = s.iconSlug ? getSimpleIcon(s.iconSlug) : null;
        const isSelected = selectedKeys.has(key);
        return (
            <div
                key={key}
                className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                    isSelected
                        ? "border-(--color-accent) bg-(--color-accent)/5"
                        : "border-(--color-border) bg-transparent"
                }`}
            >
                {/* 체크박스 */}
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(key)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-(--color-accent)"
                />
                {/* 아이콘 */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {icon ? (
                        <svg
                            role="img"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            style={{ fill: s.iconColor || `#${icon.hex}` }}
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <title>{icon.title}</title>
                            <path d={icon.path} />
                        </svg>
                    ) : (
                        <span className="text-xs text-(--color-muted)">—</span>
                    )}
                </div>
                {/* 이름 */}
                <span className="font-semibold text-(--color-foreground)">
                    {s.name}
                </span>
                {/* level badge */}
                {s.level && (
                    <span className="rounded bg-(--color-surface-subtle) px-1.5 py-0.5 text-xs text-(--color-muted)">
                        {s.level}
                    </span>
                )}
                {/* category badge */}
                <span className="rounded bg-(--color-accent)/10 px-1.5 py-0.5 text-xs text-(--color-accent)">
                    {s.categoryName || "(미분류)"}
                </span>
                {/* experience badge */}
                {expBadge(s) && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {expBadge(s)}
                    </span>
                )}
                {/* spacer */}
                <div className="flex-1" />
                {/* 수정 */}
                <button
                    onClick={() => {
                        onBackup();
                        setModalState({
                            originalCategoryIdx: s.categoryIdx,
                            originalKwIdx: s.kwIdx,
                            initialSkill: {
                                name: s.name,
                                level: s.level,
                                jobField: s.jobField,
                                workRef: s.workRef,
                                projectRef: s.projectRef,
                                iconSlug: s.iconSlug,
                                iconColor: s.iconColor,
                            },
                            initialCategoryName: s.categoryName,
                        });
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                >
                    수정
                </button>
                {/* 삭제 */}
                <button
                    onClick={() => handleDelete(s.categoryIdx, s.kwIdx)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                >
                    삭제
                </button>
            </div>
        );
    };

    // 배치 액션 인라인 폼
    const renderBatchActionForm = () => {
        if (!batchAction) return null;

        const configs: Record<
            BatchAction,
            { label: string; input: React.ReactNode }
        > = {
            level: {
                label: "숙련도",
                input: (
                    <input
                        autoFocus
                        list="batch-level-list"
                        value={batchValue}
                        onChange={(e) => setBatchValue(e.target.value)}
                        placeholder="예: Advanced"
                        className="rounded border border-(--color-border) bg-(--color-surface) px-2 py-1 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                    />
                ),
            },
            category: {
                label: "카테고리",
                input: (
                    <input
                        autoFocus
                        list="batch-category-list"
                        value={batchValue}
                        onChange={(e) => setBatchValue(e.target.value)}
                        placeholder="카테고리명"
                        className="rounded border border-(--color-border) bg-(--color-surface) px-2 py-1 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                    />
                ),
            },
            jobField: {
                label: "직무 분야",
                input: (
                    <select
                        autoFocus
                        value={batchValue}
                        onChange={(e) => setBatchValue(e.target.value)}
                        className="rounded border border-(--color-border) bg-(--color-surface) px-2 py-1 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                    >
                        <option value="">전체</option>
                        {jobFields.map((jf) => (
                            <option key={jf.id} value={jf.id}>
                                {jf.name}
                            </option>
                        ))}
                    </select>
                ),
            },
        };

        const config = configs[batchAction];
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-(--color-muted)">
                    {config.label}:
                </span>
                {config.input}
                <button
                    onClick={applyBatchAction}
                    className="rounded bg-(--color-accent) px-3 py-1 text-sm font-semibold text-(--color-on-accent) transition-opacity hover:opacity-90"
                >
                    적용
                </button>
                <button
                    onClick={() => {
                        setBatchAction(null);
                        setBatchValue("");
                    }}
                    className="rounded bg-(--color-surface-subtle) px-2 py-1 text-sm text-(--color-muted) transition-opacity hover:opacity-70"
                >
                    취소
                </button>
            </div>
        );
    };

    return (
        <section className="space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-6">
            {/* datalists for batch inputs */}
            <datalist id="batch-level-list">
                {["Beginner", "Intermediate", "Advanced", "Expert"].map((l) => (
                    <option key={l} value={l} />
                ))}
            </datalist>
            <datalist id="batch-category-list">
                {categoryNames.map((c) => (
                    <option key={c} value={c} />
                ))}
            </datalist>

            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-(--color-foreground)">
                        <SectionEmojiSelector
                            value={resumeData.skills?.emoji || ""}
                            onChange={(v) => {
                                setResumeData({
                                    ...resumeData,
                                    skills: {
                                        ...skillsOrDefault(resumeData),
                                        emoji: v,
                                    },
                                });
                            }}
                        />
                        스킬 (Skills)
                    </h3>
                    <div className="ml-4 flex items-center gap-2">
                        <Switch
                            id="show-emojis-skills"
                            checked={resumeData.skills?.showEmoji === true}
                            onCheckedChange={(checked) =>
                                setResumeData({
                                    ...resumeData,
                                    skills: {
                                        ...skillsOrDefault(resumeData),
                                        showEmoji: checked,
                                    },
                                })
                            }
                        />
                        <label
                            htmlFor="show-emojis-skills"
                            className="cursor-pointer text-sm font-medium text-(--color-muted) select-none"
                        >
                            이모지 표시
                        </label>
                    </div>
                </div>
                <button
                    onClick={() => {
                        onBackup();
                        setModalState({
                            originalCategoryIdx: null,
                            originalKwIdx: null,
                        });
                    }}
                    className="rounded-lg bg-(--color-accent) px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-(--color-on-accent) transition-opacity hover:opacity-90"
                >
                    + 스킬 추가
                </button>
            </div>

            {/* 정렬/필터 toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* 전체 선택 체크박스 */}
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-(--color-muted) select-none">
                    <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer accent-(--color-accent)"
                    />
                    전체 선택
                </label>
                <div className="h-4 w-px bg-(--color-border)" />
                <select
                    value={sortMode}
                    onChange={(e) =>
                        setSortMode(e.target.value as "category" | "alpha")
                    }
                    className="rounded-lg border border-(--color-border) bg-transparent px-3 py-1.5 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                >
                    <option value="category">카테고리별</option>
                    <option value="alpha">이름순</option>
                </select>
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="rounded-lg border border-(--color-border) bg-transparent px-3 py-1.5 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                >
                    <option value="all">전체</option>
                    {categoryNames.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {/* 배치 액션 바 */}
            {someSelected && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-(--color-accent)/40 bg-(--color-accent)/5 px-4 py-2.5">
                    <span className="shrink-0 text-sm font-semibold text-(--color-foreground)">
                        {selectedKeys.size}개 선택됨
                    </span>
                    <div className="h-4 w-px shrink-0 bg-(--color-border)" />

                    {/* 액션 버튼 그룹 (액션 미선택 시 표시) */}
                    {!batchAction && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => {
                                    setBatchAction("level");
                                    setBatchValue("");
                                }}
                                className="rounded bg-(--color-surface-subtle) px-3 py-1 text-sm font-medium text-(--color-foreground) transition-colors hover:bg-(--color-border)"
                            >
                                숙련도 변경
                            </button>
                            <button
                                onClick={() => {
                                    setBatchAction("jobField");
                                    setBatchValue("");
                                }}
                                className="rounded bg-(--color-surface-subtle) px-3 py-1 text-sm font-medium text-(--color-foreground) transition-colors hover:bg-(--color-border)"
                            >
                                직무 분야
                            </button>
                            <button
                                onClick={() => {
                                    setBatchAction("category");
                                    setBatchValue("");
                                }}
                                className="rounded bg-(--color-surface-subtle) px-3 py-1 text-sm font-medium text-(--color-foreground) transition-colors hover:bg-(--color-border)"
                            >
                                카테고리 변경
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                            >
                                삭제
                            </button>
                        </div>
                    )}

                    {/* 인라인 폼 */}
                    {renderBatchActionForm()}

                    {/* 선택 해제 */}
                    <button
                        onClick={clearSelection}
                        className="ml-auto shrink-0 text-sm text-(--color-muted) underline-offset-2 hover:underline"
                    >
                        선택 해제
                    </button>
                </div>
            )}

            {/* draft item */}
            {draftInfo && (
                <div
                    onClick={openDraft}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-yellow-400 bg-yellow-50 px-4 py-2.5 dark:bg-yellow-900/20"
                >
                    <span className="rounded bg-yellow-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                        임시 저장
                    </span>
                    <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                        {draftInfo.kwData.name || "(이름 없음)"}
                    </span>
                    <span className="text-xs text-yellow-600 dark:text-yellow-300">
                        {draftInfo.categoryName}
                    </span>
                </div>
            )}

            {/* 스킬 리스트 */}
            <div className="space-y-2">
                {sortMode === "category" && categoryGroups
                    ? categoryGroups.map(([catName, catSkills]) => {
                          const catKeys = catSkills.map(
                              (s) => `${s.categoryIdx}-${s.kwIdx}`
                          );
                          const allCatSelected = catKeys.every((k) =>
                              selectedKeys.has(k)
                          );
                          const toggleCat = () => {
                              setSelectedKeys((prev) => {
                                  const next = new Set(prev);
                                  if (allCatSelected)
                                      catKeys.forEach((k) => next.delete(k));
                                  else catKeys.forEach((k) => next.add(k));
                                  return next;
                              });
                          };
                          return (
                              <div key={catName} className="space-y-1">
                                  <label className="mt-2 flex cursor-pointer items-center gap-2 select-none">
                                      <input
                                          type="checkbox"
                                          checked={allCatSelected}
                                          onChange={toggleCat}
                                          className="h-4 w-4 cursor-pointer accent-(--color-accent)"
                                      />
                                      <span className="text-sm font-bold text-(--color-muted)">
                                          {catName}
                                      </span>
                                  </label>
                                  {catSkills.map(renderSkillRow)}
                              </div>
                          );
                      })
                    : sorted.map(renderSkillRow)}
                {sorted.length === 0 && !draftInfo && (
                    <p className="py-4 text-center text-sm text-(--color-muted)">
                        등록된 스킬이 없습니다
                    </p>
                )}
            </div>

            {/* 카테고리 관리 */}
            <div className="border-t border-(--color-border) pt-4">
                <button
                    onClick={() => setShowCategoryManager(!showCategoryManager)}
                    className="text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)"
                >
                    {showCategoryManager ? "▲" : "▼"} 카테고리 관리
                </button>
                {showCategoryManager && (
                    <div className="mt-3 space-y-2">
                        {(resumeData.skills?.entries ?? []).map((cat, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 rounded-lg border border-(--color-border) bg-transparent px-3 py-2"
                            >
                                <input
                                    value={cat.name ?? ""}
                                    onChange={(e) =>
                                        updateCategory(
                                            idx,
                                            "name",
                                            e.target.value
                                        )
                                    }
                                    placeholder="카테고리명"
                                    className="w-40 rounded border border-(--color-border) bg-transparent px-2 py-1 text-sm text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                />
                                <input
                                    value={cat.iconSlug ?? ""}
                                    onChange={(e) =>
                                        updateCategory(
                                            idx,
                                            "iconSlug",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Slug"
                                    className="w-28 rounded border border-(--color-border) bg-transparent px-2 py-1 text-xs text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                />
                                <input
                                    value={cat.iconColor ?? ""}
                                    onChange={(e) =>
                                        updateCategory(
                                            idx,
                                            "iconColor",
                                            e.target.value
                                        )
                                    }
                                    placeholder="#hex"
                                    className="w-20 rounded border border-(--color-border) bg-transparent px-2 py-1 text-xs text-(--color-foreground) focus:border-(--color-accent) focus:outline-none"
                                />
                                <span className="text-xs text-(--color-muted)">
                                    {(cat.keywords ?? []).length}개
                                </span>
                                <button
                                    onClick={() => deleteCategory(idx)}
                                    disabled={(cat.keywords ?? []).length > 0}
                                    title={
                                        (cat.keywords ?? []).length > 0
                                            ? "스킬이 있는 카테고리는 삭제할 수 없습니다"
                                            : "카테고리 삭제"
                                    }
                                    className="rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    삭제
                                </button>
                            </div>
                        ))}
                        {(resumeData.skills?.entries ?? []).length === 0 && (
                            <p className="text-sm text-(--color-muted)">
                                카테고리 없음
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 모달 */}
            {modalState && (
                <SkillEditorModal
                    open={true}
                    onClose={() => {
                        setModalState(null);
                        const raw = localStorage.getItem(DRAFT_KEY);
                        if (raw) {
                            try {
                                setDraftInfo(JSON.parse(raw));
                            } catch {
                                setDraftInfo(null);
                            }
                        } else {
                            setDraftInfo(null);
                        }
                    }}
                    initialSkill={modalState.initialSkill}
                    initialCategoryName={modalState.initialCategoryName}
                    originalCategoryIdx={modalState.originalCategoryIdx}
                    originalKwIdx={modalState.originalKwIdx}
                    categories={categoryNames}
                    works={resumeData.work?.entries ?? []}
                    projects={resumeData.projects?.entries ?? []}
                    jobFields={jobFields}
                    onSave={handleSave}
                />
            )}
        </section>
    );
}
