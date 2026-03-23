import { cache } from "react";
import { serverClient } from "@/lib/supabase";

// request 단위 포스트 조회 캐싱 (generateMetadata + page 컴포넌트 중복 DB 호출 제거)
export const getPost = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .single();
    return data;
});

// request 단위 포트폴리오 아이템 조회 캐싱
export const getPortfolioItem = cache(async (slug: string) => {
    if (!serverClient) return null;
    const { data } = await serverClient
        .from("portfolio_items")
        .select("*")
        .eq("slug", slug)
        .single();
    return data;
});

// 전체 site_config 조회 캐싱 (root layout, frontend layout, 페이지 간 중복 제거)
export const getSiteConfig = cache(async () => {
    if (!serverClient) return [] as { key: string; value: unknown }[];
    const { data } = await serverClient
        .from("site_config")
        .select("key, value");
    return (data ?? []) as { key: string; value: unknown }[];
});

// tags 전체 조회 캐싱
export const getTags = cache(async () => {
    if (!serverClient)
        return [] as { slug: string; name: string; color: string | null }[];
    const { data } = await serverClient
        .from("tags")
        .select("slug, name, color");
    return (data ?? []) as {
        slug: string;
        name: string;
        color: string | null;
    }[];
});
