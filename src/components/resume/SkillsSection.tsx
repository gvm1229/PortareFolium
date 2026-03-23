"use client";

import { useState } from "react";
import type {
    ResumeSkill,
    ResumeSkillKeyword,
    ResumeWork,
    ResumeProject,
} from "@/types/resume";
import { SkillBadge, getSimpleIcon } from "@/components/resume/SkillBadge";
import { matchesJobField } from "@/lib/job-field";

type FlatSkill = ResumeSkillKeyword & { categoryName?: string };

function flattenKeywords(skills: ResumeSkill[]): FlatSkill[] {
    return skills.flatMap((cat) =>
        (cat.keywords ?? []).map((kw) => ({ ...kw, categoryName: cat.name }))
    );
}

// work composite key: "Position @ Company" 또는 "Company"
function workKey(w: ResumeWork): string {
    if (!w.name) return "";
    return w.position ? `${w.position} @ ${w.name}` : w.name;
}

function groupByExperience(
    keywords: FlatSkill[],
    activeJobField: string,
    works: ResumeWork[],
    projects: ResumeProject[]
): { key: string; label: string; isActive: boolean; skills: FlatSkill[] }[] {
    const activeWorkKeys = new Set(
        works
            .filter((w) => matchesJobField(w.jobField, activeJobField))
            .map(workKey)
            .filter(Boolean)
    );
    const activeProjectNames = new Set(
        projects
            .filter((p) => matchesJobField(p.jobField, activeJobField))
            .map((p) => p.name ?? "")
    );
    const groups = new Map<string, FlatSkill[]>();
    for (const kw of keywords) {
        const key = kw.workRef || kw.projectRef || "__other__";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(kw);
    }
    return [...groups.entries()]
        .map(([key, skills]) => ({
            key,
            label: key === "__other__" ? "기타" : key,
            isActive: activeWorkKeys.has(key) || activeProjectNames.has(key),
            skills,
        }))
        .sort((a, b) => Number(b.isActive) - Number(a.isActive));
}

interface Props {
    skills: ResumeSkill[];
    activeJobField?: string;
    works: ResumeWork[];
    projects: ResumeProject[];
}

export default function SkillsSection({
    skills,
    activeJobField,
    works,
    projects,
}: Props) {
    const [skillsView, setSkillsView] = useState<
        "by-experience" | "by-category"
    >("by-experience");

    return (
        <section className="mb-10">
            <div className="mb-5 flex items-center justify-between border-b border-(--color-border) pb-1.5">
                <h2 className="text-xl font-bold tracking-widest text-(--color-accent) uppercase">
                    기술
                </h2>
                <select
                    value={skillsView}
                    onChange={(e) =>
                        setSkillsView(
                            e.target.value as "by-experience" | "by-category"
                        )
                    }
                    className="rounded-md border border-(--color-border) bg-(--color-surface-subtle) px-2 py-1 text-xs text-(--color-muted) focus:outline-none"
                >
                    <option value="by-experience">직무별</option>
                    <option value="by-category">카테고리별</option>
                </select>
            </div>
            {skillsView === "by-experience" ? (
                (() => {
                    const flat = flattenKeywords(skills);
                    const groups = groupByExperience(
                        flat,
                        activeJobField ?? "",
                        works,
                        projects
                    );
                    return (
                        <div className="space-y-6">
                            {groups.map((group) => (
                                <div key={group.key}>
                                    <p
                                        className={`mb-2 text-sm font-semibold ${
                                            group.isActive
                                                ? "text-(--color-accent)"
                                                : "text-(--color-muted)"
                                        }`}
                                    >
                                        {group.label}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {group.skills.map((kw, i) => (
                                            <div
                                                key={i}
                                                className="flex flex-col items-center gap-0.5"
                                            >
                                                <SkillBadge
                                                    name={kw.name}
                                                    overrideSlug={kw.iconSlug}
                                                    overrideColor={kw.iconColor}
                                                />
                                                {kw.level && (
                                                    <span className="text-[0.6rem] text-(--color-muted)">
                                                        {kw.level}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })()
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                    {skills.map((skill, idx) => {
                        const icon = skill.iconSlug
                            ? getSimpleIcon(skill.iconSlug)
                            : null;
                        return (
                            <div
                                key={idx}
                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-4 py-3"
                            >
                                {skill.name ? (
                                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-(--color-foreground)">
                                        {icon ? (
                                            <svg
                                                role="img"
                                                viewBox="0 0 24 24"
                                                className="h-4 w-4"
                                                style={{
                                                    fill:
                                                        skill.iconColor ||
                                                        `#${icon.hex}`,
                                                }}
                                                xmlns="http://www.w3.org/2000/svg"
                                            >
                                                <title>{icon.title}</title>
                                                <path d={icon.path} />
                                            </svg>
                                        ) : null}
                                        {skill.name}
                                    </div>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                    {(skill.keywords ?? []).map((kw, kIdx) => (
                                        <div
                                            key={kIdx}
                                            className="flex flex-col items-center gap-0.5"
                                        >
                                            <SkillBadge
                                                name={kw.name}
                                                overrideSlug={kw.iconSlug}
                                                overrideColor={kw.iconColor}
                                            />
                                            {kw.level && (
                                                <span className="text-[0.6rem] text-(--color-muted)">
                                                    {kw.level}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
