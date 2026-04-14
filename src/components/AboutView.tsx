// AboutView — About 페이지 렌더러 (Server Component)
// about_data + resume_data를 서버에서 받아 렌더링

export interface AboutData {
    name?: string;
    description?: string;
    descriptionSub?: string;
    contacts?: {
        email?: string;
        github?: string;
        linkedin?: string;
    };
    sections?: Record<string, string[]>;
    competencySections?: Record<string, string[]>;
}

const PLACEHOLDER_IMAGE =
    "https://urqqfjxocxfrvuozgobi.supabase.co/storage/v1/object/public/images/legacy/avatar-placeholder-c9516fa9.svg";

interface Props {
    data: AboutData;
    profileImage: string | null;
}

export default function AboutView({ data, profileImage }: Props) {
    const resolvedProfileImage = profileImage || PLACEHOLDER_IMAGE;
    const contacts = data.contacts ?? {};
    const sections = data.sections ?? {};
    const competencySections = data.competencySections ?? {};

    const contactEntries = [
        {
            label: "Email",
            value: contacts.email?.trim(),
            href: contacts.email ? `mailto:${contacts.email}` : undefined,
        },
        {
            label: "GitHub",
            value: contacts.github?.trim(),
            href: contacts.github || undefined,
        },
        {
            label: "LinkedIn",
            value: contacts.linkedin?.trim(),
            href: contacts.linkedin || undefined,
        },
    ].filter((e) => e.value);

    const sectionEntries = Object.entries(sections).filter(
        ([, items]) => Array.isArray(items) && items.length > 0
    );
    const competencyEntries = Object.entries(competencySections).filter(
        ([, items]) => Array.isArray(items) && items.length > 0
    );

    return (
        <article className="py-12">
            {/* 프로필 섹션 */}
            <div className="tablet:flex-row tablet:items-start tablet:gap-12 flex flex-col gap-8">
                {/* 프로필 이미지 */}
                <div className="shrink-0">
                    <div className="relative h-36 w-36">
                        <div
                            className="absolute inset-0 rounded-full bg-(--color-accent) opacity-20 blur-xl"
                            aria-hidden="true"
                        />
                        <img
                            src={resolvedProfileImage}
                            alt="프로필 사진"
                            width={144}
                            height={144}
                            className="relative h-36 w-36 rounded-full object-cover ring-4 ring-(--color-accent)/30"
                        />
                    </div>
                </div>

                {/* 이름 + 소개 */}
                <div className="min-w-0 flex-1">
                    <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                        About me
                    </p>
                    {data.name && (
                        <h1 className="mb-4 text-4xl font-black tracking-tight text-(--color-foreground)">
                            {data.name}
                        </h1>
                    )}
                    {data.description && (
                        <p className="mb-3 text-lg leading-relaxed text-(--color-foreground)">
                            {data.description}
                        </p>
                    )}
                    {data.descriptionSub && (
                        <p className="text-sm leading-relaxed text-(--color-muted)">
                            {data.descriptionSub}
                        </p>
                    )}

                    {/* 연락처 grid */}
                    {contactEntries.length > 0 && (
                        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-(--color-border) bg-(--color-border)">
                            {contactEntries.map(({ label, value, href }) =>
                                href ? (
                                    <a
                                        key={label}
                                        href={href}
                                        className="flex flex-col bg-(--color-surface-subtle) px-4 py-3 transition-colors hover:bg-(--color-surface)"
                                        target={
                                            href.startsWith("http")
                                                ? "_blank"
                                                : undefined
                                        }
                                        rel={
                                            href.startsWith("http")
                                                ? "noopener noreferrer"
                                                : undefined
                                        }
                                    >
                                        <span className="mb-0.5 text-[10px] font-bold tracking-wider text-(--color-muted) uppercase">
                                            {label}
                                        </span>
                                        <span className="text-sm font-medium text-(--color-foreground)">
                                            {value}
                                        </span>
                                    </a>
                                ) : (
                                    <div
                                        key={label}
                                        className="flex flex-col bg-(--color-surface-subtle) px-4 py-3"
                                    >
                                        <span className="mb-0.5 text-[10px] font-bold tracking-wider text-(--color-muted) uppercase">
                                            {label}
                                        </span>
                                        <span className="text-sm font-medium text-(--color-foreground)">
                                            {value}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 경험 유형별 섹션 */}
            {sectionEntries.length > 0 && (
                <div className="mt-14 border-t border-(--color-border) pt-10">
                    <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                        Experience
                    </p>
                    <h2 className="mb-7 text-2xl font-black tracking-tight text-(--color-foreground)">
                        경험 유형별 리스트
                    </h2>
                    <div className="space-y-4">
                        {sectionEntries.map(([category, items]) => (
                            <div
                                key={category}
                                className="rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-6"
                            >
                                <h3 className="mb-4 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                    {category}
                                </h3>
                                <ul className="space-y-2">
                                    {items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="flex items-start gap-2.5 text-sm text-(--color-foreground)"
                                        >
                                            <span
                                                className="mt-0.5 shrink-0 leading-relaxed font-bold text-(--color-accent)"
                                                aria-hidden="true"
                                            >
                                                ✓
                                            </span>
                                            <span className="leading-relaxed whitespace-pre-line">
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 역량 키워드별 섹션 */}
            {competencyEntries.length > 0 && (
                <div className="mt-14 border-t border-(--color-border) pt-10">
                    <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-(--color-accent) uppercase">
                        Competencies
                    </p>
                    <h2 className="mb-7 text-2xl font-black tracking-tight text-(--color-foreground)">
                        역량 키워드별 리스트
                    </h2>
                    <div className="space-y-6">
                        {competencyEntries.map(([category, items]) => (
                            <div key={category}>
                                <h3 className="mb-3 text-xs font-bold tracking-[0.12em] text-(--color-muted) uppercase">
                                    {category}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {items.map((item, i) => (
                                        <span
                                            key={i}
                                            className="rounded-lg bg-(--color-tag-bg) px-4 py-1.5 text-sm font-medium text-(--color-tag-fg)"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </article>
    );
}
