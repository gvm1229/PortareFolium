// 기존 blog/portfolio 이미지 sidecar backfill
// 실행: pnpm backfill:lightbox-sidecars

import { config } from "dotenv";
config({ path: ".env.local" });
import { runLightboxSidecarBackfill } from "../src/lib/lightbox-sidecars";

async function main() {
    const result = await runLightboxSidecarBackfill();
    console.log(
        `processed=${result.processed} skipped=${result.skipped} thumb=${result.thumbCreated} rewrittenThumb=${result.rewrittenThumb} deletedPoster=${result.deletedPoster} errors=${result.errors.length}`
    );

    if (result.errors.length > 0) {
        console.error(result.errors.join("\n"));
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("[backfill-lightbox-sidecars] 실패", error);
    process.exit(1);
});
