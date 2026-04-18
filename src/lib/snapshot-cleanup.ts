// editor_states snapshot 조회 및 snapshot 삭제 + true-orphan cleanup wrapper
import { browserClient } from "@/lib/supabase";
import { cleanupTrueOrphans, type CleanupArgs } from "@/lib/orphan-cleanup";

// 해당 entity의 모든 snapshot content 로드 (Initial + Auto-save + Bookmark)
export async function loadSnapshotsContent(
    entityType: string,
    entitySlug: string
): Promise<string[]> {
    if (!browserClient) return [];
    try {
        const { data } = await browserClient
            .from("editor_states")
            .select("content")
            .eq("entity_type", entityType)
            .eq("entity_slug", entitySlug);
        return (data ?? [])
            .map((r) => r.content as string | null)
            .filter((c): c is string => typeof c === "string" && c.length > 0);
    } catch {
        return [];
    }
}

// snapshot ids 삭제 후 true-orphan cleanup — 6개 진입점 통합 wrapper
// candidates는 삭제 직전 snapshot content에서 추출한 base key 목록
export async function deleteSnapshotsAndCleanup(
    ids: string[],
    args: CleanupArgs
): Promise<void> {
    if (!browserClient || ids.length === 0) return;
    try {
        await browserClient.from("editor_states").delete().in("id", ids);
    } catch (e) {
        console.error(
            `[snapshot-cleanup::deleteSnapshotsAndCleanup] snapshot delete 실패`,
            e
        );
        return;
    }
    cleanupTrueOrphans(args).catch((e) => {
        console.error(
            `[snapshot-cleanup::deleteSnapshotsAndCleanup] cleanup 실패`,
            e
        );
    });
}
