"use client";

import {
    Fragment,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type PointerEvent as ReactPointerEvent,
    type WheelEvent,
} from "react";
import {
    Download,
    FileUp,
    RefreshCw,
    Trash2,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { browserClient } from "@/lib/supabase";
import {
    buildGanttTimeline,
    countTaskDays,
    getGanttArchiveTitle,
    normalizeStoredGanttTasks,
    parseGanttCsv,
    type GanttChartTask,
} from "@/lib/gantt-chart";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type GanttChartColorSchemeId = "emerald" | "blue" | "amber" | "rose" | "slate";
type GanttChartBarStyle = "rounded" | "square";

type GanttColorScheme = {
    label: string;
    bar: string;
    barSoft: string;
    barText: string;
    barMuted: string;
    track: string;
    weekend: string;
    grid: string;
    axis: string;
};

type GanttChartArchiveRow = {
    id: string;
    title: string;
    source_filename: string;
    csv_content: string;
    tasks: unknown;
    color_scheme: string | null;
    bar_style: string | null;
    created_at: string;
    updated_at: string;
};

type GanttChartArchive = {
    id: string;
    title: string;
    sourceFilename: string;
    csvContent: string;
    tasks: GanttChartTask[];
    colorScheme: GanttChartColorSchemeId;
    barStyle: GanttChartBarStyle;
    createdAt: string;
    updatedAt: string;
};

type StatusMessage = {
    ok: boolean;
    text: string;
};

type GanttChartArchiveDraft = {
    title: string;
    colorScheme: GanttChartColorSchemeId;
    barStyle: GanttChartBarStyle;
};

const ARCHIVE_SELECT_FIELDS =
    "id, title, source_filename, csv_content, tasks, color_scheme, bar_style, created_at, updated_at";
const DAY_WIDTH = 44;
const BAR_TEXT_MIN_WIDTH = 96;
const BAR_DAY_COUNT_MIN_WIDTH = 152;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2.5;
const DEFAULT_COLOR_SCHEME: GanttChartColorSchemeId = "emerald";
const DEFAULT_BAR_STYLE: GanttChartBarStyle = "rounded";

const GANTT_COLOR_SCHEMES: Record<GanttChartColorSchemeId, GanttColorScheme> = {
    emerald: {
        label: "Emerald",
        bar: "#059669",
        barSoft: "rgba(5, 150, 105, 0.18)",
        barText: "#ffffff",
        barMuted: "#d1fae5",
        track: "#f8fafc",
        weekend: "#f1f5f9",
        grid: "#e2e8f0",
        axis: "#64748b",
    },
    blue: {
        label: "Blue",
        bar: "#2563eb",
        barSoft: "rgba(37, 99, 235, 0.18)",
        barText: "#ffffff",
        barMuted: "#dbeafe",
        track: "#f8fafc",
        weekend: "#eff6ff",
        grid: "#dbeafe",
        axis: "#64748b",
    },
    amber: {
        label: "Amber",
        bar: "#d97706",
        barSoft: "rgba(217, 119, 6, 0.18)",
        barText: "#ffffff",
        barMuted: "#fef3c7",
        track: "#fffdf7",
        weekend: "#fef3c7",
        grid: "#fde68a",
        axis: "#78716c",
    },
    rose: {
        label: "Rose",
        bar: "#e11d48",
        barSoft: "rgba(225, 29, 72, 0.18)",
        barText: "#ffffff",
        barMuted: "#ffe4e6",
        track: "#fffafc",
        weekend: "#fff1f2",
        grid: "#fecdd3",
        axis: "#6b7280",
    },
    slate: {
        label: "Slate",
        bar: "#334155",
        barSoft: "rgba(51, 65, 85, 0.18)",
        barText: "#ffffff",
        barMuted: "#e2e8f0",
        track: "#f8fafc",
        weekend: "#f1f5f9",
        grid: "#cbd5e1",
        axis: "#64748b",
    },
};

const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("ko-KR");
const formatDateLabel = (value: string) => value.replace(/-/g, ".");
const buildDownloadName = (title: string) => {
    const normalized = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return normalized || "gantt-chart";
};
const normalizeColorScheme = (
    value: string | null
): GanttChartColorSchemeId => {
    if (!value) return DEFAULT_COLOR_SCHEME;
    return value in GANTT_COLOR_SCHEMES
        ? (value as GanttChartColorSchemeId)
        : DEFAULT_COLOR_SCHEME;
};
const normalizeBarStyle = (value: string | null): GanttChartBarStyle =>
    value === "square" ? "square" : DEFAULT_BAR_STYLE;
const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const mapArchiveRow = (row: GanttChartArchiveRow): GanttChartArchive => ({
    id: row.id,
    title: row.title,
    sourceFilename: row.source_filename,
    csvContent: row.csv_content,
    tasks: normalizeStoredGanttTasks(row.tasks),
    colorScheme: normalizeColorScheme(row.color_scheme),
    barStyle: normalizeBarStyle(row.bar_style),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const toArchiveDraft = (
    archive: Pick<GanttChartArchive, "title" | "colorScheme" | "barStyle">
): GanttChartArchiveDraft => ({
    title: archive.title,
    colorScheme: archive.colorScheme,
    barStyle: archive.barStyle,
});

const GanttChartPreview = ({ archive }: { archive: GanttChartArchive }) => {
    const { days, months } = buildGanttTimeline(archive.tasks);
    const dayIndexMap = new Map(days.map((day, index) => [day.key, index]));
    const timelineWidth = days.length * DAY_WIDTH;
    const theme = GANTT_COLOR_SCHEMES[archive.colorScheme];

    return (
        <div className="min-w-max rounded-[2rem] bg-white p-8 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-8 space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">
                    {archive.title}
                </h3>
                <p className="text-sm" style={{ color: theme.axis }}>
                    {archive.tasks.length}개 task ·{" "}
                    {formatDateLabel(days[0]?.key ?? "")} -{" "}
                    {formatDateLabel(days[days.length - 1]?.key ?? "")}
                </p>
            </div>
            <div className="grid grid-cols-[18rem_minmax(0,1fr)] items-start gap-x-6 gap-y-4">
                <div className="space-y-1 pt-2">
                    <p
                        className="text-xs font-semibold tracking-[0.24em] uppercase"
                        style={{ color: theme.axis }}
                    >
                        Tasks
                    </p>
                    <p className="text-sm" style={{ color: theme.axis }}>
                        전체 기간 {days.length}일
                    </p>
                </div>
                <div className="space-y-3">
                    <div className="flex items-end">
                        {months.map((month) => (
                            <div
                                key={month.key}
                                className="text-sm font-semibold"
                                style={{
                                    width: month.span * DAY_WIDTH,
                                    color: theme.axis,
                                }}
                            >
                                {month.label}
                            </div>
                        ))}
                    </div>
                    <div className="relative" style={{ width: timelineWidth }}>
                        <div className="flex">
                            {days.map((day) => (
                                <div
                                    key={day.key}
                                    className="text-center"
                                    style={{ width: DAY_WIDTH }}
                                >
                                    <p className="text-xs font-semibold text-slate-700">
                                        {day.dayNumber}
                                    </p>
                                    <p
                                        className="text-[10px]"
                                        style={{ color: theme.axis }}
                                    >
                                        {day.weekdayLabel}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div
                            className="pointer-events-none absolute inset-x-0 top-[calc(100%+0.75rem)] h-px"
                            style={{ backgroundColor: theme.grid }}
                        />
                    </div>
                </div>
                {archive.tasks.map((task) => {
                    const startIndex = dayIndexMap.get(task.startDate) ?? 0;
                    const endIndex =
                        dayIndexMap.get(task.endDate) ?? startIndex;
                    const barWidth = (endIndex - startIndex + 1) * DAY_WIDTH;
                    const showBarText = barWidth >= BAR_TEXT_MIN_WIDTH;
                    const showDayCount = barWidth >= BAR_DAY_COUNT_MIN_WIDTH;
                    const taskDays = countTaskDays(task);

                    return (
                        <Fragment
                            key={`${archive.id}-${task.taskName}-${task.startDate}`}
                        >
                            <div className="space-y-1 py-2">
                                <p className="text-sm font-semibold text-slate-900">
                                    {task.taskName}
                                </p>
                                <p
                                    className="text-xs"
                                    style={{ color: theme.axis }}
                                >
                                    {formatDateLabel(task.startDate)} -{" "}
                                    {formatDateLabel(task.endDate)} ({taskDays}
                                    일)
                                </p>
                                <p className="text-xs leading-5 text-slate-400">
                                    {task.comment || "No comment"}
                                </p>
                            </div>
                            <div
                                className={`relative overflow-hidden ${
                                    archive.barStyle === "square"
                                        ? "rounded-md"
                                        : "rounded-2xl"
                                }`}
                                style={{
                                    width: timelineWidth,
                                    height: 64,
                                    backgroundColor: theme.track,
                                }}
                            >
                                {days.map((day, index) => (
                                    <div
                                        key={`${task.taskName}-${day.key}`}
                                        className="absolute inset-y-0"
                                        style={{
                                            left: index * DAY_WIDTH,
                                            width: DAY_WIDTH,
                                            borderRight: `1px solid ${theme.grid}`,
                                            backgroundColor: day.isWeekend
                                                ? theme.weekend
                                                : "transparent",
                                        }}
                                    />
                                ))}
                                <div
                                    className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2"
                                    style={{ backgroundColor: theme.grid }}
                                />
                                <div
                                    className={`absolute top-1/2 flex h-10 -translate-y-1/2 items-center px-4 text-sm font-semibold whitespace-nowrap shadow-[0_10px_24px_rgba(15,23,42,0.18)] ${
                                        archive.barStyle === "square"
                                            ? "rounded-md"
                                            : "rounded-full"
                                    }`}
                                    style={{
                                        left: startIndex * DAY_WIDTH + 2,
                                        width: Math.max(
                                            barWidth - 4,
                                            DAY_WIDTH - 4
                                        ),
                                        backgroundColor: theme.bar,
                                        color: theme.barText,
                                    }}
                                >
                                    {showBarText && (
                                        <>
                                            <span className="truncate">
                                                {task.taskName}
                                            </span>
                                            {showDayCount && (
                                                <span
                                                    className="ml-auto pl-3 text-xs"
                                                    style={{
                                                        color: theme.barMuted,
                                                    }}
                                                >
                                                    {taskDays}d
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
};

const GanttChartPanel = () => {
    const { confirm } = useConfirmDialog();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<HTMLDivElement | null>(null);
    const shouldFitRef = useRef(true);
    const userZoomedRef = useRef(false);
    const dragStateRef = useRef<{
        pointerId: number;
        clientX: number;
        clientY: number;
    } | null>(null);

    const [archives, setArchives] = useState<GanttChartArchive[]>([]);
    const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(
        null
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [draftsById, setDraftsById] = useState<
        Record<string, GanttChartArchiveDraft>
    >({});
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });
    const [fitZoom, setFitZoom] = useState(1);
    const [zoom, setZoom] = useState(1);

    const selectedArchive =
        archives.find((archive) => archive.id === selectedArchiveId) ?? null;
    const selectedDraft =
        selectedArchive &&
        (draftsById[selectedArchive.id] ?? toArchiveDraft(selectedArchive));
    const allSelected =
        archives.length > 0 &&
        archives.every((archive) => selectedIds.has(archive.id));
    const isSettingsDirty =
        !!selectedArchive &&
        !!selectedDraft &&
        (selectedDraft.title.trim() !== selectedArchive.title ||
            selectedDraft.colorScheme !== selectedArchive.colorScheme ||
            selectedDraft.barStyle !== selectedArchive.barStyle);

    const syncArchiveList = (
        nextArchives: GanttChartArchive[],
        nextSelectedArchiveId?: string | null
    ) => {
        setArchives(nextArchives);
        setDraftsById((current) => {
            const next: Record<string, GanttChartArchiveDraft> = {};

            for (const archive of nextArchives) {
                next[archive.id] =
                    current[archive.id] ?? toArchiveDraft(archive);
            }

            return next;
        });
        setSelectedArchiveId(
            nextSelectedArchiveId ??
                (nextArchives.some(
                    (archive) => archive.id === selectedArchiveId
                )
                    ? selectedArchiveId
                    : (nextArchives[0]?.id ?? null))
        );
        setSelectedIds(
            (current) =>
                new Set(
                    [...current].filter((id) =>
                        nextArchives.some((archive) => archive.id === id)
                    )
                )
        );
    };

    const updateSelectedDraft = (patch: Partial<GanttChartArchiveDraft>) => {
        if (!selectedArchive) return;

        setDraftsById((current) => ({
            ...current,
            [selectedArchive.id]: {
                ...(current[selectedArchive.id] ??
                    toArchiveDraft(selectedArchive)),
                ...patch,
            },
        }));
    };

    const loadArchives = async () => {
        if (!browserClient) {
            setStatus({
                ok: false,
                text: "Supabase browserClient가 설정되지 않았습니다",
            });
            setLoading(false);
            return;
        }
        setLoading(true);
        setStatus(null);
        const { data, error } = await browserClient
            .from("gantt_chart_archives")
            .select(ARCHIVE_SELECT_FIELDS)
            .order("created_at", { ascending: false });
        if (error) {
            setStatus({ ok: false, text: error.message });
            setLoading(false);
            return;
        }
        try {
            syncArchiveList(
                ((data ?? []) as GanttChartArchiveRow[]).map(mapArchiveRow)
            );
        } catch (error) {
            setStatus({
                ok: false,
                text:
                    error instanceof Error
                        ? error.message
                        : "Gantt Chart archive 파싱 오류",
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        void loadArchives();
    }, []);
    useEffect(() => {
        if (!selectedArchive) return;
        shouldFitRef.current = true;
        userZoomedRef.current = false;
    }, [selectedArchive]);

    useEffect(() => {
        const viewport = viewportRef.current;
        const chart = chartRef.current;
        if (!viewport || !chart || !selectedArchive) return;
        const updateSize = () => {
            const nextWidth = Math.ceil(chart.scrollWidth);
            const nextHeight = Math.ceil(chart.scrollHeight);
            const nextFitZoom =
                nextWidth > 0
                    ? Math.min(1, viewport.clientWidth / nextWidth)
                    : 1;
            setChartSize({ width: nextWidth, height: nextHeight });
            setFitZoom(nextFitZoom);
            if (shouldFitRef.current || !userZoomedRef.current) {
                setZoom(nextFitZoom);
                requestAnimationFrame(() => {
                    viewport.scrollLeft = 0;
                    viewport.scrollTop = 0;
                });
                shouldFitRef.current = false;
            }
        };
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(viewport);
        resizeObserver.observe(chart);
        updateSize();
        return () => resizeObserver.disconnect();
    }, [selectedArchive]);

    const applyZoom = (nextZoom: number, markManual: boolean) => {
        const viewport = viewportRef.current;
        const clamped = clampZoom(nextZoom);
        if (markManual) userZoomedRef.current = true;
        else {
            userZoomedRef.current = false;
            shouldFitRef.current = false;
        }
        if (!viewport || zoom === clamped) {
            setZoom(clamped);
            return;
        }
        const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
        const centerY = viewport.scrollTop + viewport.clientHeight / 2;
        const ratio = clamped / zoom;
        setZoom(clamped);
        requestAnimationFrame(() => {
            viewport.scrollLeft = Math.max(
                0,
                centerX * ratio - viewport.clientWidth / 2
            );
            viewport.scrollTop = Math.max(
                0,
                centerY * ratio - viewport.clientHeight / 2
            );
        });
    };

    const handleFitZoom = () => {
        const viewport = viewportRef.current;
        userZoomedRef.current = false;
        shouldFitRef.current = false;
        setZoom(fitZoom);
        if (viewport)
            requestAnimationFrame(() => {
                viewport.scrollLeft = 0;
                viewport.scrollTop = 0;
            });
    };

    const handleViewportWheel = (event: WheelEvent<HTMLDivElement>) => {
        if (!selectedArchive) return;
        event.preventDefault();
        const viewport = viewportRef.current;
        if (!viewport || zoom <= 0) return;
        const rect = viewport.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;
        const focusX = viewport.scrollLeft + offsetX;
        const focusY = viewport.scrollTop + offsetY;
        const nextZoom = clampZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9));
        const ratio = nextZoom / zoom;
        userZoomedRef.current = true;
        setZoom(nextZoom);
        requestAnimationFrame(() => {
            viewport.scrollLeft = Math.max(0, focusX * ratio - offsetX);
            viewport.scrollTop = Math.max(0, focusY * ratio - offsetY);
        });
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!selectedArchive || event.button !== 0) return;
        dragStateRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const dragState = dragStateRef.current;
        const viewport = viewportRef.current;
        if (!dragState || !viewport) return;
        viewport.scrollLeft -= event.clientX - dragState.clientX;
        viewport.scrollTop -= event.clientY - dragState.clientY;
        dragStateRef.current = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
        };
    };
    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragStateRef.current) return;
        dragStateRef.current = null;
        setIsDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    const handleFileSelect = () => fileInputRef.current?.click();
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !browserClient) return;
        setUploading(true);
        setStatus(null);
        try {
            const csvContent = await file.text();
            const tasks = parseGanttCsv(csvContent);
            const title = getGanttArchiveTitle(file.name);
            const { data, error } = await browserClient
                .from("gantt_chart_archives")
                .insert({
                    title,
                    source_filename: file.name,
                    csv_content: csvContent,
                    tasks,
                    color_scheme: DEFAULT_COLOR_SCHEME,
                    bar_style: DEFAULT_BAR_STYLE,
                })
                .select(ARCHIVE_SELECT_FIELDS)
                .single();
            if (error) throw new Error(error.message);
            const nextArchive = mapArchiveRow(data as GanttChartArchiveRow);
            syncArchiveList([nextArchive, ...archives], nextArchive.id);
            setStatus({
                ok: true,
                text: `${file.name} 업로드 및 archive 저장 완료`,
            });
        } catch (error) {
            setStatus({
                ok: false,
                text:
                    error instanceof Error ? error.message : "CSV 업로드 오류",
            });
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    };

    const handleExportImage = async () => {
        if (!selectedArchive || !chartRef.current) return;
        setExporting(true);
        setStatus(null);
        try {
            const { default: html2canvas } = await import("html2canvas-pro");
            const target = chartRef.current;
            const width = Math.ceil(target.scrollWidth);
            const height = Math.ceil(target.scrollHeight);
            const canvas = await html2canvas(target, {
                backgroundColor: "#ffffff",
                scale: 2,
                useCORS: true,
                width,
                height,
                windowWidth: width,
                windowHeight: height,
                scrollX: 0,
                scrollY: 0,
            });
            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/jpeg", 0.92)
            );
            if (!blob) throw new Error("JPG export blob 생성 실패");
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${buildDownloadName(selectedArchive.title)}.jpg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setStatus({
                ok: true,
                text: `${selectedArchive.title}.jpg 다운로드 시작`,
            });
        } catch (error) {
            setStatus({
                ok: false,
                text:
                    error instanceof Error ? error.message : "JPG export 오류",
            });
        } finally {
            setExporting(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!selectedArchive || !selectedDraft || !browserClient) return;
        const nextTitle = selectedDraft.title.trim();
        if (!nextTitle) {
            setStatus({ ok: false, text: "차트 제목은 비워둘 수 없습니다" });
            return;
        }
        setSavingSettings(true);
        setStatus(null);
        const { data, error } = await browserClient
            .from("gantt_chart_archives")
            .update({
                title: nextTitle,
                color_scheme: selectedDraft.colorScheme,
                bar_style: selectedDraft.barStyle,
            })
            .eq("id", selectedArchive.id)
            .select(ARCHIVE_SELECT_FIELDS)
            .single();
        setSavingSettings(false);
        if (error) {
            setStatus({ ok: false, text: error.message });
            return;
        }
        const nextArchive = mapArchiveRow(data as GanttChartArchiveRow);
        syncArchiveList(
            archives.map((archive) =>
                archive.id === nextArchive.id ? nextArchive : archive
            ),
            nextArchive.id
        );
        setStatus({ ok: true, text: "차트 설정 저장 완료" });
    };

    const handleDeleteArchives = async (ids: string[]) => {
        if (!browserClient || ids.length === 0) return;
        const targets = archives.filter((archive) => ids.includes(archive.id));
        const ok = await confirm({
            title:
                ids.length === 1
                    ? "Gantt Chart 삭제"
                    : `선택한 ${ids.length}개 Gantt Chart 삭제`,
            description:
                ids.length === 1
                    ? `${targets[0]?.title ?? "선택 항목"}를 삭제하시겠습니까?`
                    : `${ids.length}개 archive를 삭제하시겠습니까?`,
            confirmText: "삭제",
            cancelText: "취소",
            variant: "destructive",
        });
        if (!ok) return;
        setDeletingIds(new Set(ids));
        setStatus(null);
        const { error } = await browserClient
            .from("gantt_chart_archives")
            .delete()
            .in("id", ids);
        setDeletingIds(new Set());
        if (error) {
            setStatus({ ok: false, text: error.message });
            return;
        }
        syncArchiveList(
            archives.filter((archive) => !ids.includes(archive.id))
        );
        setStatus({
            ok: true,
            text:
                ids.length === 1
                    ? "Gantt Chart 삭제 완료"
                    : `${ids.length}개 Gantt Chart 삭제 완료`,
        });
    };

    const toggleSelect = (id: string) =>
        setSelectedIds((current) => {
            const next = new Set(current);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const toggleSelectAll = () =>
        setSelectedIds(
            allSelected
                ? new Set()
                : new Set(archives.map((archive) => archive.id))
        );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 bg-(--color-surface) pt-1 pb-4">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-(--color-foreground)">
                        Gantt Chart
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => void loadArchives()}
                            disabled={
                                loading ||
                                uploading ||
                                exporting ||
                                savingSettings ||
                                deletingIds.size > 0
                            }
                            className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                            <RefreshCw
                                className={`mr-1.5 h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`}
                            />
                            <span className="whitespace-nowrap">
                                {loading ? "새로고침 중..." : "새로고침"}
                            </span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleFileSelect}
                            disabled={
                                uploading ||
                                loading ||
                                exporting ||
                                savingSettings ||
                                deletingIds.size > 0
                            }
                            className="bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        >
                            <FileUp className="mr-1.5 h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">
                                {uploading ? "업로드 중..." : "CSV 업로드"}
                            </span>
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => void handleExportImage()}
                            disabled={!selectedArchive || exporting || loading}
                            className="bg-(--color-accent) text-(--color-on-accent) hover:opacity-90"
                        >
                            <Download className="mr-1.5 h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">
                                {exporting ? "JPG 생성 중..." : "JPG export"}
                            </span>
                        </Button>
                    </div>
                </div>
                <div className="space-y-1 text-sm text-(--color-muted)">
                    <p>
                        CSV 헤더는{" "}
                        <code>task name,start date,end date,comment</code>{" "}
                        순서를 따라야 합니다.
                    </p>
                    <p>
                        preview는 기본적으로 전체 폭 fit 상태로 열리며, wheel로
                        zoom, drag로 pan 이동이 가능합니다.
                    </p>
                </div>
                {status && (
                    <p
                        className={`mt-3 text-sm font-medium ${status.ok ? "text-green-600" : "text-red-500"}`}
                    >
                        {status.text}
                    </p>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => void handleFileChange(event)}
                />
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                <div className="laptop:grid-cols-[20rem_minmax(0,1fr)] grid h-full min-h-0 gap-4">
                    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
                        <div className="border-b border-(--color-border) px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-(--color-foreground)">
                                        Archive
                                    </h3>
                                    <p className="mt-1 text-xs text-(--color-muted)">
                                        저장된 chart {archives.length}개
                                    </p>
                                </div>
                                {selectedIds.size > 0 && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void handleDeleteArchives([
                                                ...selectedIds,
                                            ])
                                        }
                                        disabled={deletingIds.size > 0}
                                        className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            선택 삭제
                                        </span>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="border-b border-(--color-border) px-4 py-2.5">
                            <label className="flex items-center gap-2 text-sm text-(--color-muted)">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 cursor-pointer rounded"
                                />
                                <span>전체 선택</span>
                            </label>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-3">
                            {!loading && archives.length === 0 && (
                                <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-4 py-6">
                                    <p className="text-sm text-(--color-muted)">
                                        저장된 Gantt Chart archive가 없습니다
                                    </p>
                                </div>
                            )}
                            <div className="space-y-2">
                                {archives.map((archive) => {
                                    const isSelectedArchive =
                                        archive.id === selectedArchiveId;
                                    const isChecked = selectedIds.has(
                                        archive.id
                                    );
                                    const isDeleting = deletingIds.has(
                                        archive.id
                                    );
                                    return (
                                        <div
                                            key={archive.id}
                                            className={[
                                                "rounded-xl border px-4 py-3 transition-colors",
                                                isSelectedArchive
                                                    ? "border-(--color-accent) bg-(--color-accent)/10"
                                                    : "border-(--color-border) bg-(--color-surface-subtle)",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() =>
                                                        toggleSelect(archive.id)
                                                    }
                                                    className="mt-1 h-4 w-4 cursor-pointer rounded"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedArchiveId(
                                                            archive.id
                                                        )
                                                    }
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    GANTT_COLOR_SCHEMES[
                                                                        archive
                                                                            .colorScheme
                                                                    ].bar,
                                                            }}
                                                        />
                                                        <p className="truncate text-sm font-semibold text-(--color-foreground)">
                                                            {archive.title}
                                                        </p>
                                                    </div>
                                                    <p className="mt-1 truncate text-xs text-(--color-muted)">
                                                        {archive.sourceFilename}
                                                    </p>
                                                    <p className="mt-1 text-xs text-(--color-muted)">
                                                        task{" "}
                                                        {archive.tasks.length}개
                                                    </p>
                                                    <p className="text-xs text-(--color-muted)">
                                                        {formatDateTime(
                                                            archive.createdAt
                                                        )}
                                                    </p>
                                                </button>
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        void handleDeleteArchives(
                                                            [archive.id]
                                                        )
                                                    }
                                                    disabled={isDeleting}
                                                    className="bg-red-600 px-2.5 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface)">
                        {!selectedArchive ? (
                            <div className="flex min-h-0 flex-1 items-center justify-center px-6">
                                <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-6 py-8 text-center">
                                    <p className="text-base font-semibold text-(--color-foreground)">
                                        Gantt Chart 프리뷰 없음
                                    </p>
                                    <p className="mt-2 text-sm text-(--color-muted)">
                                        CSV를 업로드하거나 archive에서 chart를
                                        선택하세요
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-(--color-border) px-4 py-3">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                Chart Title
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    selectedDraft?.title ?? ""
                                                }
                                                onChange={(event) =>
                                                    updateSelectedDraft({
                                                        title: event.target
                                                            .value,
                                                    })
                                                }
                                                className="w-full rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent)/40 focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                Color Scheme
                                            </label>
                                            <select
                                                value={
                                                    selectedDraft?.colorScheme ??
                                                    DEFAULT_COLOR_SCHEME
                                                }
                                                onChange={(event) =>
                                                    updateSelectedDraft({
                                                        colorScheme: event
                                                            .target
                                                            .value as GanttChartColorSchemeId,
                                                    })
                                                }
                                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:outline-none"
                                            >
                                                {(
                                                    Object.entries(
                                                        GANTT_COLOR_SCHEMES
                                                    ) as Array<
                                                        [
                                                            GanttChartColorSchemeId,
                                                            GanttColorScheme,
                                                        ]
                                                    >
                                                ).map(([id, scheme]) => (
                                                    <option key={id} value={id}>
                                                        {scheme.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-semibold tracking-[0.2em] text-(--color-muted) uppercase">
                                                Bar Shape
                                            </label>
                                            <select
                                                value={
                                                    selectedDraft?.barStyle ??
                                                    DEFAULT_BAR_STYLE
                                                }
                                                onChange={(event) =>
                                                    updateSelectedDraft({
                                                        barStyle: event.target
                                                            .value as GanttChartBarStyle,
                                                    })
                                                }
                                                className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:outline-none"
                                            >
                                                <option value="rounded">
                                                    Rounded
                                                </option>
                                                <option value="square">
                                                    Square
                                                </option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={handleFitZoom}
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                Fit
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    applyZoom(zoom / 1.15, true)
                                                }
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                <ZoomOut className="h-3.5 w-3.5 shrink-0" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    applyZoom(zoom * 1.15, true)
                                                }
                                                className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                            >
                                                <ZoomIn className="h-3.5 w-3.5 shrink-0" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    void handleSaveSettings()
                                                }
                                                disabled={
                                                    !isSettingsDirty ||
                                                    savingSettings
                                                }
                                                className="bg-green-600 text-white hover:bg-green-500 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                                            >
                                                <span className="whitespace-nowrap">
                                                    {savingSettings
                                                        ? "저장 중..."
                                                        : "설정 저장"}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-(--color-muted)">
                                        zoom {(zoom * 100).toFixed(0)}% · drag로
                                        이동 · wheel로 확대/축소
                                    </p>
                                </div>
                                <div
                                    ref={viewportRef}
                                    onWheel={handleViewportWheel}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                    className={`min-h-0 flex-1 overflow-auto bg-(--color-surface-subtle) p-4 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                                >
                                    <div
                                        style={{
                                            width: Math.max(
                                                chartSize.width * zoom,
                                                1
                                            ),
                                            height: Math.max(
                                                chartSize.height * zoom,
                                                1
                                            ),
                                        }}
                                    >
                                        <div
                                            ref={chartRef}
                                            className="inline-block origin-top-left"
                                            style={{
                                                transform: `scale(${zoom})`,
                                            }}
                                        >
                                            <GanttChartPreview
                                                archive={{
                                                    ...selectedArchive,
                                                    title: selectedDraft?.title.trim()
                                                        ? selectedDraft.title.trim()
                                                        : selectedArchive.title,
                                                    colorScheme:
                                                        selectedDraft?.colorScheme ??
                                                        selectedArchive.colorScheme,
                                                    barStyle:
                                                        selectedDraft?.barStyle ??
                                                        selectedArchive.barStyle,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GanttChartPanel;
