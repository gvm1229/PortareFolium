import sharp from "sharp";
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";

const PREFIXES = ["blog/", "portfolio/"] as const;

export type LightboxSidecarBackfillSummary = {
    deletedPoster: number;
    errors: string[];
    processed: number;
    rewrittenThumb: number;
    skipped: number;
    thumbCreated: number;
};

type BackfillProgress = {
    currentKey: string;
    prefix: string;
    processed: number;
    total: number;
};

// 지원 확장자 판별
function isSupportedImageKey(key: string): boolean {
    return /\.(gif|png|jpe?g|webp|avif|svg)$/i.test(key);
}

// sidecar key 판별
function isSidecarKey(key: string): boolean {
    return /\.(thumb|poster)\.webp$/i.test(key);
}

// sidecar key 생성
export function getLightboxSidecarKey(
    key: string,
    suffix: "poster" | "thumb"
): string {
    return key.replace(/\.[^./]+$/, `.${suffix}.webp`);
}

// object body를 buffer로 변환
async function toBuffer(body: unknown): Promise<Buffer> {
    if (!body || typeof body !== "object") {
        throw new Error("Body 없음");
    }

    const stream = body as {
        transformToByteArray?: () => Promise<Uint8Array>;
    };

    if (typeof stream.transformToByteArray === "function") {
        const bytes = await stream.transformToByteArray();
        return Buffer.from(bytes);
    }

    throw new Error("지원하지 않는 Body 형식");
}

// sidecar 존재 여부 확인
async function exists(key: string): Promise<boolean> {
    try {
        await r2Client.send(
            new HeadObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
            })
        );
        return true;
    } catch {
        return false;
    }
}

// GIF thumb가 animated인지 확인
async function isAnimatedThumb(key: string): Promise<boolean> {
    const object = await r2Client.send(
        new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        })
    );
    const buffer = await toBuffer(object.Body);
    const metadata = await sharp(buffer, { animated: true }).metadata();
    return (metadata.pages ?? 1) > 1;
}

// thumb buffer 생성
async function createThumb(buffer: Buffer, isGif: boolean): Promise<Buffer> {
    return sharp(buffer, {
        animated: isGif,
        pages: isGif ? 1 : undefined,
        limitInputPixels: false,
    })
        .resize({
            width: 256,
            height: 256,
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer();
}

// sidecar 업로드
async function uploadSidecar(key: string, buffer: Buffer): Promise<void> {
    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: "image/webp",
        })
    );
}

// sidecar 삭제
async function deleteSidecar(key: string): Promise<void> {
    await r2Client.send(
        new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        })
    );
}

// prefix 아래 key 순회
async function listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let token: string | undefined;

    do {
        const result = await r2Client.send(
            new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: prefix,
                ContinuationToken: token,
            })
        );

        (result.Contents ?? []).forEach((item) => {
            if (item.Key) keys.push(item.Key);
        });

        token = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (token);

    return keys;
}

// 단일 key sidecar 생성
async function backfillKey(
    key: string
): Promise<
    Pick<
        LightboxSidecarBackfillSummary,
        | "deletedPoster"
        | "processed"
        | "rewrittenThumb"
        | "skipped"
        | "thumbCreated"
    >
> {
    if (!isSupportedImageKey(key) || isSidecarKey(key)) {
        return {
            deletedPoster: 0,
            processed: 0,
            rewrittenThumb: 0,
            skipped: 1,
            thumbCreated: 0,
        };
    }

    const thumbKey = getLightboxSidecarKey(key, "thumb");
    const posterKey = getLightboxSidecarKey(key, "poster");
    const isGif = /\.gif$/i.test(key);

    const thumbExists = await exists(thumbKey);
    const posterExists = await exists(posterKey);
    const needsThumbRewrite =
        isGif && thumbExists ? await isAnimatedThumb(thumbKey) : false;
    if (thumbExists && !posterExists && !needsThumbRewrite) {
        return {
            deletedPoster: 0,
            processed: 1,
            rewrittenThumb: 0,
            skipped: 1,
            thumbCreated: 0,
        };
    }

    const object = await r2Client.send(
        new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        })
    );
    const buffer = await toBuffer(object.Body);

    let thumbCreated = 0;
    let deletedPoster = 0;
    let rewrittenThumb = 0;

    if (!thumbExists || needsThumbRewrite) {
        const thumbBuffer = await createThumb(buffer, isGif);
        await uploadSidecar(thumbKey, thumbBuffer);
        if (thumbExists) {
            rewrittenThumb = 1;
        } else {
            thumbCreated = 1;
        }
    }

    if (posterExists) {
        await deleteSidecar(posterKey);
        deletedPoster = 1;
    }

    return {
        deletedPoster,
        processed: 1,
        rewrittenThumb,
        skipped: 0,
        thumbCreated,
    };
}

// lightbox sidecar 전체 backfill 실행
export async function runLightboxSidecarBackfill(
    onProgress?: (progress: BackfillProgress) => void
): Promise<LightboxSidecarBackfillSummary> {
    const summary: LightboxSidecarBackfillSummary = {
        deletedPoster: 0,
        processed: 0,
        rewrittenThumb: 0,
        skipped: 0,
        thumbCreated: 0,
        errors: [],
    };
    const prefixKeys = await Promise.all(
        PREFIXES.map((prefix) => listKeys(prefix))
    );
    const total = prefixKeys.reduce((acc, keys) => acc + keys.length, 0);
    let processedCount = 0;

    for (let prefixIndex = 0; prefixIndex < PREFIXES.length; prefixIndex += 1) {
        const prefix = PREFIXES[prefixIndex];
        const keys = prefixKeys[prefixIndex] ?? [];

        for (const key of keys) {
            processedCount += 1;
            onProgress?.({
                total,
                processed: processedCount,
                prefix,
                currentKey: key,
            });
            try {
                const result = await backfillKey(key);
                summary.deletedPoster += result.deletedPoster;
                summary.processed += result.processed;
                summary.rewrittenThumb += result.rewrittenThumb;
                summary.skipped += result.skipped;
                summary.thumbCreated += result.thumbCreated;
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                summary.errors.push(`${key}: ${message}`);
                console.error(
                    `[lightbox-sidecars.ts::runLightboxSidecarBackfill] ${key}: ${message}`
                );
            }
        }
    }

    return summary;
}
