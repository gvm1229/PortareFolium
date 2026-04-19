"use server";

import { runLightboxSidecarBackfill } from "@/lib/lightbox-sidecars";

// lightbox sidecar backfill 실행
export async function executeLightboxSidecarBackfill() {
    return runLightboxSidecarBackfill();
}
