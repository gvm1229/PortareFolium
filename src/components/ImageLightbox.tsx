"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";

type LightboxImage = {
    alt: string;
    src: string;
    type: "image";
};

type LightboxYoutube = {
    thumbnailSrc: string;
    title: string;
    type: "youtube";
    videoId: string;
};

type LightboxMedia = LightboxImage | LightboxYoutube;

type ImageLightboxProps = {
    contentSelector: string;
};

const FILMSTRIP_RADIUS = 5;
const FILMSTRIP_WINDOW = FILMSTRIP_RADIUS * 2 + 1;
const MAX_SCALE = 4;
const MIN_SCALE = 1;
const SCALE_STEP = 0.25;
const SWIPE_THRESHOLD = 50;

// filmstrip sidecar path 계산
function replaceWithSidecar(src: string, suffix: "poster" | "thumb"): string {
    const url = new URL(src, window.location.origin);
    const pathname = url.pathname.replace(/\.[^./?#]+$/, `.${suffix}.webp`);
    url.pathname = pathname;
    return url.toString();
}

// gif 판별
function isGifSource(src: string): boolean {
    return /\.gif(?:[?#]|$)/i.test(src);
}

// YouTube thumbnail path 생성
function getYoutubeThumbnail(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// 값 clamp
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

type FilmstripThumbnailProps = {
    active: boolean;
    media: LightboxMedia;
    onSelect: () => void;
};

// filmstrip candidate 목록 계산
function getImageFilmstripCandidates(src: string): string[] {
    const list = [replaceWithSidecar(src, "thumb")];
    if (isGifSource(src)) {
        list.push(replaceWithSidecar(src, "poster"));
    }
    return list;
}

// filmstrip thumbnail 렌더
function FilmstripThumbnail({
    active,
    media,
    onSelect,
}: FilmstripThumbnailProps) {
    const candidates = useMemo(() => {
        if (media.type === "youtube") return [media.thumbnailSrc];
        return getImageFilmstripCandidates(media.src);
    }, [media]);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const thumbSrc = candidates[candidateIndex] ?? "";

    useEffect(() => {
        setCandidateIndex(0);
    }, [candidates]);

    return (
        <button
            type="button"
            aria-label="filmstrip 이미지로 이동"
            aria-current={active ? "true" : undefined}
            onClick={onSelect}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                active
                    ? "scale-110 border-(--color-accent)"
                    : "border-white/20 opacity-60 hover:opacity-100"
            }`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={thumbSrc}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => {
                    const nextIndex = candidateIndex + 1;
                    if (nextIndex < candidates.length) {
                        setCandidateIndex(nextIndex);
                    }
                }}
                className="h-full w-full object-cover"
            />
            {media.type === "youtube" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="h-5 w-5 fill-white text-white" />
                </span>
            )}
        </button>
    );
}

// 본문 media 스캔
function collectMedia(root: Element): LightboxMedia[] {
    const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("img, .youtube-embed-wrapper")
    );
    const media: LightboxMedia[] = [];

    nodes.forEach((node) => {
        if (node.matches("img")) {
            const image = node as HTMLImageElement;
            if (!image.src) return;
            media.push({
                type: "image",
                src: image.src,
                alt: image.alt ?? "",
            });
            return;
        }

        if (node.matches(".youtube-embed-wrapper")) {
            const videoId = node.getAttribute("data-youtube-id")?.trim();
            if (!videoId) return;
            media.push({
                type: "youtube",
                videoId,
                title: "YouTube video",
                thumbnailSrc: getYoutubeThumbnail(videoId),
            });
        }
    });

    return media;
}

// 본문 이미지 lightbox — contentSelector 하위 media 스캔 후 click wiring
export default function ImageLightbox({ contentSelector }: ImageLightboxProps) {
    const [media, setMedia] = useState<LightboxMedia[]>([]);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const mountedRef = useRef(false);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const pinchRef = useRef<{ distance: number; startScale: number } | null>(
        null
    );
    const panRef = useRef<{
        startTranslateX: number;
        startTranslateY: number;
        x: number;
        y: number;
    } | null>(null);
    const mediaFrameRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const clampTranslate = useCallback(
        (nextScale: number, nextTranslate: { x: number; y: number }) => {
            const frame = mediaFrameRef.current;
            if (!frame || nextScale <= 1) return { x: 0, y: 0 };

            const { width, height } = frame.getBoundingClientRect();
            const maxX = (width * nextScale - width) / 2;
            const maxY = (height * nextScale - height) / 2;

            return {
                x: clamp(nextTranslate.x, -maxX, maxX),
                y: clamp(nextTranslate.y, -maxY, maxY),
            };
        },
        []
    );

    const resetImageTransform = useCallback(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setIsDragging(false);
        swipeStartRef.current = null;
        pinchRef.current = null;
        panRef.current = null;
    }, []);

    const applyScale = useCallback(
        (updater: number | ((currentScale: number) => number)) => {
            setScale((currentScale) => {
                const rawScale =
                    typeof updater === "function"
                        ? updater(currentScale)
                        : updater;
                const nextScale = clamp(rawScale, MIN_SCALE, MAX_SCALE);
                setTranslate((currentTranslate) =>
                    clampTranslate(nextScale, currentTranslate)
                );
                return nextScale;
            });
        },
        [clampTranslate]
    );

    // 본문 media 스캔 + click target index 부여
    const scanMedia = useCallback(() => {
        const root = document.querySelector(contentSelector);
        if (!root) return;

        const nextMedia = collectMedia(root);
        setMedia(nextMedia);

        let currentIndex = 0;
        root.querySelectorAll<HTMLElement>(
            "img, .youtube-embed-wrapper"
        ).forEach((node) => {
            if (node.matches("img")) {
                const image = node as HTMLImageElement;
                if (!image.src) return;
                image.style.cursor = "zoom-in";
                image.dataset.lightboxIdx = String(currentIndex);
                currentIndex += 1;
                return;
            }

            if (node.matches(".youtube-embed-wrapper")) {
                const videoId = node.getAttribute("data-youtube-id")?.trim();
                if (!videoId) return;
                node.setAttribute("data-lightbox-idx", String(currentIndex));
                const trigger = node.querySelector<HTMLElement>(
                    '[data-lightbox-open="youtube"]'
                );
                if (trigger) {
                    trigger.dataset.lightboxIdx = String(currentIndex);
                }
                currentIndex += 1;
            }
        });

        if (!mountedRef.current) {
            mountedRef.current = true;
            root.addEventListener("click", handleContentClick);
        }
    }, [contentSelector]);

    // click delegation
    const handleContentClick = useCallback((e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const imageTarget = target.closest<HTMLImageElement>(
            "img[data-lightbox-idx]"
        );
        const youtubeTrigger = target.closest<HTMLElement>(
            '[data-lightbox-open="youtube"][data-lightbox-idx]'
        );
        const source = imageTarget ?? youtubeTrigger;
        if (!source) return;

        const idxAttr = source.dataset.lightboxIdx;
        if (idxAttr == null) return;

        e.preventDefault();
        const idx = Number(idxAttr);
        if (!Number.isFinite(idx)) return;
        setOpenIndex(idx);
        setPlayingVideoId(null);
    }, []);

    useEffect(() => {
        scanMedia();
        const root = document.querySelector(contentSelector);
        if (!root) return;

        const observer = new MutationObserver(() => scanMedia());
        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src", "data-youtube-id"],
        });

        return () => {
            observer.disconnect();
            root.removeEventListener("click", handleContentClick);
            mountedRef.current = false;
        };
    }, [contentSelector, scanMedia, handleContentClick]);

    const close = useCallback(() => {
        setOpenIndex(null);
        setPlayingVideoId(null);
        resetImageTransform();
    }, [resetImageTransform]);

    const goPrev = useCallback(() => {
        setOpenIndex((i) => (i == null || i <= 0 ? i : i - 1));
        setPlayingVideoId(null);
        resetImageTransform();
    }, [resetImageTransform]);

    const goNext = useCallback(() => {
        setOpenIndex((i) => (i == null || i >= media.length - 1 ? i : i + 1));
        setPlayingVideoId(null);
        resetImageTransform();
    }, [media.length, resetImageTransform]);

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

    useEffect(() => {
        if (openIndex == null) return;
        setPlayingVideoId(null);
        resetImageTransform();
    }, [openIndex, resetImageTransform]);

    if (openIndex == null || media.length === 0) return null;
    if (typeof document === "undefined") return null;

    const current = media[openIndex];
    if (!current) return null;

    const atFirst = openIndex <= 0;
    const atLast = openIndex >= media.length - 1;
    const total = media.length;

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
    const filmstrip = media.slice(winStart, winEnd);
    const shouldShowFilmstrip = total > 1;
    const caption =
        current.type === "image" ? current.alt?.trim() || "" : current.title;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="이미지 확대 보기"
            className="fixed inset-0 z-[120] flex flex-col bg-black/80 backdrop-blur-sm"
            onClick={close}
        >
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

            {current.type === "image" && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <button
                        type="button"
                        aria-label="축소"
                        onClick={(e) => {
                            e.stopPropagation();
                            applyScale(
                                (currentScale) => currentScale - SCALE_STEP
                            );
                        }}
                        className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/25"
                    >
                        -
                    </button>
                    <button
                        type="button"
                        aria-label="확대"
                        onClick={(e) => {
                            e.stopPropagation();
                            applyScale(
                                (currentScale) => currentScale + SCALE_STEP
                            );
                        }}
                        className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/25"
                    >
                        +
                    </button>
                    <button
                        type="button"
                        aria-label="확대 초기화"
                        onClick={(e) => {
                            e.stopPropagation();
                            resetImageTransform();
                        }}
                        className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/25"
                    >
                        Reset
                    </button>
                </div>
            )}

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

            <div
                className="flex flex-1 items-center justify-center px-16 py-8"
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => {
                    if (current.type !== "image") return;
                    e.preventDefault();
                    applyScale(
                        (currentScale) =>
                            currentScale +
                            (e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP)
                    );
                }}
                onTouchStart={(e) => {
                    if (current.type !== "image") {
                        const touch = e.touches[0];
                        if (!touch) return;
                        swipeStartRef.current = {
                            x: touch.clientX,
                            y: touch.clientY,
                        };
                        return;
                    }

                    if (e.touches.length === 2) {
                        const [a, b] = [e.touches[0], e.touches[1]];
                        if (!a || !b) return;
                        const distance = Math.hypot(
                            a.clientX - b.clientX,
                            a.clientY - b.clientY
                        );
                        pinchRef.current = {
                            distance,
                            startScale: scale,
                        };
                        swipeStartRef.current = null;
                        panRef.current = null;
                        return;
                    }

                    const touch = e.touches[0];
                    if (!touch) return;

                    if (scale > 1) {
                        panRef.current = {
                            x: touch.clientX,
                            y: touch.clientY,
                            startTranslateX: translate.x,
                            startTranslateY: translate.y,
                        };
                        setIsDragging(true);
                        return;
                    }

                    swipeStartRef.current = {
                        x: touch.clientX,
                        y: touch.clientY,
                    };
                }}
                onTouchMove={(e) => {
                    if (current.type !== "image") return;

                    if (e.touches.length === 2 && pinchRef.current) {
                        const [a, b] = [e.touches[0], e.touches[1]];
                        if (!a || !b) return;
                        const distance = Math.hypot(
                            a.clientX - b.clientX,
                            a.clientY - b.clientY
                        );
                        const nextScale =
                            pinchRef.current.startScale *
                            (distance / pinchRef.current.distance);
                        applyScale(nextScale);
                        return;
                    }

                    if (e.touches.length === 1 && panRef.current && scale > 1) {
                        const touch = e.touches[0];
                        if (!touch) return;
                        const nextTranslate = {
                            x:
                                panRef.current.startTranslateX +
                                (touch.clientX - panRef.current.x),
                            y:
                                panRef.current.startTranslateY +
                                (touch.clientY - panRef.current.y),
                        };
                        setTranslate(clampTranslate(scale, nextTranslate));
                    }
                }}
                onTouchEnd={(e) => {
                    if (current.type === "image" && e.touches.length === 0) {
                        pinchRef.current = null;
                        panRef.current = null;
                        setIsDragging(false);
                    }

                    const touch = e.changedTouches[0];
                    const start = swipeStartRef.current;
                    swipeStartRef.current = null;
                    if (!touch || !start) return;

                    if (current.type === "image" && scale > 1) return;

                    const deltaX = touch.clientX - start.x;
                    const deltaY = touch.clientY - start.y;

                    if (
                        Math.abs(deltaX) < SWIPE_THRESHOLD ||
                        Math.abs(deltaX) <= Math.abs(deltaY)
                    ) {
                        return;
                    }

                    if (deltaX > 0) {
                        goPrev();
                        return;
                    }

                    goNext();
                }}
            >
                <div
                    ref={mediaFrameRef}
                    className="relative flex max-h-[80vh] max-w-[80vw] items-center justify-center"
                >
                    {current.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={current.src}
                            src={current.src}
                            alt={current.alt}
                            draggable={false}
                            onMouseDown={(e) => {
                                if (scale <= 1) return;
                                panRef.current = {
                                    x: e.clientX,
                                    y: e.clientY,
                                    startTranslateX: translate.x,
                                    startTranslateY: translate.y,
                                };
                                setIsDragging(true);
                            }}
                            onMouseMove={(e) => {
                                if (
                                    !isDragging ||
                                    !panRef.current ||
                                    scale <= 1
                                )
                                    return;
                                const nextTranslate = {
                                    x:
                                        panRef.current.startTranslateX +
                                        (e.clientX - panRef.current.x),
                                    y:
                                        panRef.current.startTranslateY +
                                        (e.clientY - panRef.current.y),
                                };
                                setTranslate(
                                    clampTranslate(scale, nextTranslate)
                                );
                            }}
                            onMouseUp={() => {
                                panRef.current = null;
                                setIsDragging(false);
                            }}
                            onMouseLeave={() => {
                                panRef.current = null;
                                setIsDragging(false);
                            }}
                            className={`relative max-h-[80vh] max-w-[80vw] object-contain select-none ${
                                scale > 1
                                    ? isDragging
                                        ? "cursor-grabbing"
                                        : "cursor-grab"
                                    : ""
                            }`}
                            style={{
                                transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                                transformOrigin: "center center",
                            }}
                        />
                    ) : playingVideoId === current.videoId ? (
                        <div className="relative aspect-video w-[80vw] max-w-[1280px] overflow-hidden rounded-2xl bg-black">
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1&rel=0`}
                                title={current.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 h-full w-full border-0"
                            />
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setPlayingVideoId(current.videoId)}
                            className="group relative overflow-hidden rounded-2xl"
                            aria-label="영상 재생"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={current.thumbnailSrc}
                                alt={current.title}
                                className="max-h-[80vh] max-w-[80vw] object-contain"
                            />
                            <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
                            <span className="absolute inset-0 flex items-center justify-center">
                                <span className="rounded-full bg-red-600 p-4 text-white shadow-2xl transition-transform group-hover:scale-105">
                                    <Play className="h-8 w-8 fill-white text-white" />
                                </span>
                            </span>
                        </button>
                    )}
                </div>
            </div>

            {caption && (
                <div
                    className="px-8 pb-2 text-center text-sm text-white/80"
                    onClick={(e) => e.stopPropagation()}
                >
                    {caption}
                </div>
            )}

            <div
                className="px-8 pb-3 text-center text-xs text-white/60"
                onClick={(e) => e.stopPropagation()}
            >
                {openIndex + 1} / {total}
            </div>

            {shouldShowFilmstrip && (
                <div
                    className="flex justify-center gap-2 px-4 pb-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    {filmstrip.map((item, i) => {
                        const realIdx = winStart + i;
                        const active = realIdx === openIndex;
                        return (
                            <FilmstripThumbnail
                                key={realIdx}
                                media={item}
                                active={active}
                                onSelect={() => {
                                    setOpenIndex(realIdx);
                                    setPlayingVideoId(null);
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>,
        document.body
    );
}
