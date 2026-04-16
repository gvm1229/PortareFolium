"use client";

const GanttChartPanel = () => {
    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 bg-(--color-surface) pt-1 pb-4">
                <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-(--color-foreground)">
                        Gantt Chart
                    </h2>
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <div className="rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-subtle) px-4 py-6">
                    <p className="text-sm text-(--color-muted)">
                        아직 구성되지 않은 패널
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GanttChartPanel;
