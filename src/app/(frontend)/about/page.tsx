import type { Metadata } from "next";
import { serverClient } from "@/lib/supabase";
import AboutView from "@/components/AboutView";
import type { AboutData } from "@/components/AboutView";

export const revalidate = false;

export const metadata: Metadata = {
    title: "About me",
    description: "개발자 소개",
};

export default async function AboutPage() {
    let aboutData: AboutData | null = null;
    let profileImage: string | null = null;

    if (serverClient) {
        const [aboutRes, resumeRes] = await Promise.all([
            serverClient.from("about_data").select("data").limit(1).single(),
            serverClient
                .from("resume_data")
                .select("data")
                .eq("lang", "ko")
                .single(),
        ]);

        if (aboutRes.data?.data) {
            aboutData = aboutRes.data.data as AboutData;
        }

        if (resumeRes.data?.data) {
            const basics = (
                resumeRes.data.data as { basics?: { image?: string } }
            ).basics;
            const img = basics?.image?.trim();
            if (img) profileImage = img;
        }
    }

    if (!aboutData) {
        return (
            <div className="py-12">
                <p className="text-sm text-red-500">
                    About 데이터를 불러오지 못했습니다
                </p>
            </div>
        );
    }

    return <AboutView data={aboutData} profileImage={profileImage} />;
}
