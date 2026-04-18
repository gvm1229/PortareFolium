"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type LightboxImage = {
    src: string;
    alt: string;
};

type ImageLightboxProps = {
    contentSelector: string;
};

const FILMSTRIP_RADIUS = 5;
const FILMSTRIP_WINDOW = FILMSTRIP_RADIUS * 2 + 1;

// 본문 이미지 lightbox — contentSelector 하위 img 스캔 후 click wiring
export default function ImageLightbox({ contentSelector }: ImageLightboxProps) {
    const [images, setImages] = useState<LightboxImage[]>([]);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [fullLoaded, setFullLoaded] = useState(false);
    const mountedRef = useRef(false);

    // 본문 img 스캔 + 각 img에 click handler 부착
    const scanImages = useCallback(() => {
        const root = document.querySelector(contentSelector);
        if (!root) return;
        const imgs = Array.from(
            root.querySelectorAll<HTMLImageElement>("img")
        ).filter((el) => el.src);

        const list: LightboxImage[] = imgs.map((el) => ({
            src: el.src,
            alt: el.alt ?? "",
        }));
        setImages(list);

        imgs.forEach((el, idx) => {
            el.style.cursor = "zoom-in";
            el.dataset.lightboxIdx = String(idx);
        });

        if (!mountedRef.current) {
            mountedRef.current = true;
            root.addEventListener("click", handleContentClick);
        }
    }, [contentSelector]);

    // click delegation — 이벤트 재부착 없이 root 한 곳만 listener 유지
    const handleContentClick = useCallback((e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "IMG") return;
        const idxAttr = target.dataset.lightboxIdx;
        if (idxAttr == null) return;
        e.preventDefault();
        const idx = Number(idxAttr);
        if (!Number.isFinite(idx)) return;
        setOpenIndex(idx);
        setFullLoaded(false);
    }, []);

    useEffect(() => {
        scanImages();
        const root = document.querySelector(contentSelector);
        if (!root) return;

        const observer = new MutationObserver(() => scanImages());
        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src"],
        });

        return () => {
            observer.disconnect();
            root.removeEventListener("click", handleContentClick);
            mountedRef.current = false;
        };
    }, [contentSelector, scanImages, handleContentClick]);

    const close = useCallback(() => setOpenIndex(null), []);

    const goPrev = useCallback(() => {
        setOpenIndex((i) => (i == null || i <= 0 ? i : i - 1));
        setFullLoaded(false);
    }, []);

    const goNext = useCallback(() => {
        setOpenIndex((i) => (i == null || i >= images.length - 1 ? i : i + 1));
        setFullLoaded(false);
    }, [images.length]);

    // keyboard + body scroll lock
    useEffect(() => {
        if (openIndex == null) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") goPrev();
            else if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [openIndex, close, goPrev, goNext]);

    if (openIndex == null || images.length === 0) return null;
    if (typeof document === "undefined") return null;

    const current = images[openIndex];
    if (!current) return null;

    const atFirst = openIndex <= 0;
    const atLast = openIndex >= images.length - 1;

    // filmstrip window — 고정 11개, ends에서 window 고정 (사용자 결정 4-A)
    const total = images.length;
    let winStart = openIndex - FILMSTRIP_RADIUS;
    let winEnd = openIndex + FILMSTRIP_RADIUS + 1;
    if (winStart < 0) {
        winEnd += -winStart;
        winStart = 0;
    }
    if (winEnd > total) {
        winStart -= winEnd - total;
        winEnd = total;
    }
    winStart = Math.max(0, winStart);
    const filmstrip = images.slice(winStart, winEnd);
    const shouldShowFilmstrip = total > 1;

    const caption = current.alt?.trim() || "";

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="이미지 확대 보기"
            className="fixed inset-0 z-[120] flex flex-col bg-black/80 backdrop-blur-sm"
            onClick={close}
        >
            {/* Close button */}
            <button
                type="button"
                aria-label="닫기"
                onClick={(e) => {
                    e.stopPropagation();
                    close();
                }}
                className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Prev button */}
            <button
                type="button"
                aria-label="이전 이미지"
                disabled={atFirst}
                onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                }}
                className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-opacity hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
                <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Next button */}
            <button
                type="button"
                aria-label="다음 이미지"
                disabled={atLast}
                onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                }}
                className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-opacity hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            >
                <ChevronRight className="h-6 w-6" />
            </button>

            {/* Image area */}
            <div
                className="flex flex-1 items-center justify-center px-16 py-8"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative flex max-h-[80vh] max-w-[80vw] items-center justify-center">
                    {/* blur-up 배경 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={current.src}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full scale-110 object-contain blur-xl"
                    />
                    {/* full-res 이미지 */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        key={current.src}
                        src={current.src}
                        alt={current.alt}
                        onLoad={() => setFullLoaded(true)}
                        className={`relative max-h-[80vh] max-w-[80vw] object-contain transition-opacity duration-300 ${fullLoaded ? "opacity-100" : "opacity-0"}`}
                    />
                </div>
            </div>

            {/* Caption */}
            {caption && (
                <div
                    className="px-8 pb-2 text-center text-sm text-white/80"
                    onClick={(e) => e.stopPropagation()}
                >
                    {caption}
                </div>
            )}

            {/* Counter */}
            <div
                className="px-8 pb-3 text-center text-xs text-white/60"
                onClick={(e) => e.stopPropagation()}
            >
                {openIndex + 1} / {total}
            </div>

            {/* Filmstrip */}
            {shouldShowFilmstrip && (
                <div
                    className="flex justify-center gap-2 px-4 pb-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    {filmstrip.map((img, i) => {
                        const realIdx = winStart + i;
                        const active = realIdx === openIndex;
                        return (
                            <button
                                key={realIdx}
                                type="button"
                                aria-label={`${realIdx + 1}번 이미지로 이동`}
                                aria-current={active ? "true" : undefined}
                                onClick={() => {
                                    setOpenIndex(realIdx);
                                    setFullLoaded(false);
                                }}
                                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all ${active ? "scale-110 border-(--color-accent)" : "border-white/20 opacity-60 hover:opacity-100"}`}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img.src}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>,
        document.body
    );
}
