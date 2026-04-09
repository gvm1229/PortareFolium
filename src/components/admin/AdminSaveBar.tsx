"use client";

// 어드민 패널 공통 sticky 저장 바 래퍼
export default function AdminSaveBar({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="tablet:-mx-6 laptop:-mx-8 sticky bottom-0 z-50 -mx-4 border-t border-(--color-border) bg-(--color-surface)/90 px-6 py-3 backdrop-blur-sm">
            <div className="mx-auto flex items-center justify-between gap-3">
                {children}
            </div>
        </div>
    );
}
