import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from "@/lib/r2";

// Supabase 세션으로 admin 인증
async function getAuthUser(req: NextRequest) {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    const client = createClient(url, anon);
    const { data } = await client.auth.getUser(token);
    return data?.user ?? null;
}

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req);
    if (!user) {
        return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file || !path) {
        return NextResponse.json({ error: "file, path 필수" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client.send(
        new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: path,
            Body: buffer,
            ContentType: file.type || "application/octet-stream",
        })
    );

    return NextResponse.json({ url: `${R2_PUBLIC_URL}/${path}` });
}
