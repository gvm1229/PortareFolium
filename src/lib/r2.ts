import { S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 S3 호환 client (Vercel 서버 런타임 전용)
export const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
});

export const R2_BUCKET = process.env.R2_BUCKET ?? "gvm1229-portfolio-images";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";
