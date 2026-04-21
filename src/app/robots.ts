import type { MetadataRoute } from "next";

// robots.txt 생성
export default function robots(): MetadataRoute.Robots {
    const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000");

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/api"],
            },
            // SEO 비공헌 + R2 Class B op 소모 위험 있는 aggressive crawler 차단
            {
                userAgent: [
                    "SemrushBot",
                    "AhrefsBot",
                    "DotBot",
                    "MJ12bot",
                    "PetalBot",
                    "DataForSeoBot",
                    "Bytespider",
                    "GPTBot",
                    "ClaudeBot",
                    "anthropic-ai",
                    "CCBot",
                    "Amazonbot",
                    "meta-externalagent",
                ],
                disallow: "/",
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
