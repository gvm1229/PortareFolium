import sharp from "sharp";
import {
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET } from "@/lib/r2";

const PREFIXES = ["blog/", "portfolio/"] as const;

export type LightboxSidecarBackfillSummary = {
    errors: string[];
    posterCreated: number;
    processed: number;
    skipped: number;
    thumbCreated: number;
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

// thumb buffer 생성
async function createThumb(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer, { animated: true })
        .resize({
            width: 256,
            height: 256,
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toBuffer();
}

// poster buffer 생성
async function createPoster(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer, { animated: true, pages: 1 })
        .resize({
            width: 1280,
            height: 1280,
            fit: "inside",
            withoutEnlargement: true,
        })
        .webp({ quality: 82 })
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
        "posterCreated" | "processed" | "skipped" | "thumbCreated"
    >
> {
    if (!isSupportedImageKey(key) || isSidecarKey(key)) {
        return {
            processed: 0,
            skipped: 1,
            thumbCreated: 0,
            posterCreated: 0,
        };
    }

    const thumbKey = getLightboxSidecarKey(key, "thumb");
    const posterKey = getLightboxSidecarKey(key, "poster");
    const isGif = /\.gif$/i.test(key);

    const thumbExists = await exists(thumbKey);
    const posterExists = isGif ? await exists(posterKey) : true;
    if (thumbExists && posterExists) {
        return {
            processed: 1,
            skipped: 1,
            thumbCreated: 0,
            posterCreated: 0,
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
    let posterCreated = 0;

    if (!thumbExists) {
        const thumbBuffer = await createThumb(buffer);
        await uploadSidecar(thumbKey, thumbBuffer);
        thumbCreated = 1;
    }

    if (isGif && !posterExists) {
        const posterBuffer = await createPoster(buffer);
        await uploadSidecar(posterKey, posterBuffer);
        posterCreated = 1;
    }

    return {
        processed: 1,
        skipped: 0,
        thumbCreated,
        posterCreated,
    };
}

// lightbox sidecar 전체 backfill 실행
export async function runLightboxSidecarBackfill(): Promise<LightboxSidecarBackfillSummary> {
    const summary: LightboxSidecarBackfillSummary = {
        processed: 0,
        skipped: 0,
        thumbCreated: 0,
        posterCreated: 0,
        errors: [],
    };

    for (const prefix of PREFIXES) {
        const keys = await listKeys(prefix);

        for (const key of keys) {
            try {
                const result = await backfillKey(key);
                summary.processed += result.processed;
                summary.skipped += result.skipped;
                summary.thumbCreated += result.thumbCreated;
                summary.posterCreated += result.posterCreated;
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
