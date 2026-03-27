"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
    ReactNodeViewRenderer,
    NodeViewWrapper,
    type ReactNodeViewProps,
} from "@tiptap/react";
import katex from "katex";

// 에디터 내 LaTeX 프리뷰 컴포넌트
function LatexPreview({ node }: ReactNodeViewProps) {
    const src = (node.attrs.src as string) ?? "";
    let html = "";
    let error = "";
    try {
        html = katex.renderToString(src, {
            throwOnError: false,
            displayMode: true,
        });
    } catch (e) {
        error = e instanceof Error ? e.message : "LaTeX 렌더링 실패";
    }

    return (
        <NodeViewWrapper className="my-3">
            {src ? (
                error ? (
                    <div className="rounded-lg border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-500 dark:border-red-700 dark:bg-red-950">
                        {error}
                    </div>
                ) : (
                    <div
                        className="overflow-x-auto py-2 text-center"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )
            ) : (
                <div className="flex min-h-[60px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800">
                    LaTeX 수식 없음
                </div>
            )}
        </NodeViewWrapper>
    );
}

// LaTeX node extension (directive 기반)
export const LatexNode = Node.create({
    name: "latexEmbed",
    group: "block",
    atom: true,
    draggable: true,

    addAttributes() {
        return {
            src: {
                default: "",
                parseHTML: (el) => el.getAttribute("data-latex-src"),
                renderHTML: (attrs) => ({
                    "data-latex-src": attrs.src,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: "div[data-latex-src]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "div",
            mergeAttributes(HTMLAttributes, {
                "data-latex-src": HTMLAttributes["data-latex-src"],
            }),
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(LatexPreview);
    },

    addStorage() {
        return {
            markdown: {
                serialize(
                    state: {
                        write: (s: string) => void;
                        closeBlock: (n: unknown) => void;
                    },
                    node: { attrs: { src: string } }
                ) {
                    const escaped = (node.attrs.src ?? "").replace(/"/g, '\\"');
                    state.write(`::latex{src="${escaped}"}`);
                    state.closeBlock(node);
                },
                parse: {},
            },
        };
    },
});

// markdown 로드 전 ::latex directive -> HTML 변환 (tiptap parseHTML 호환)
export function latexDirectiveToHtml(md: string): string {
    return md.replace(
        /::latex\{src="((?:[^"\\]|\\.)*)"\}/g,
        (_, src) => `<div data-latex-src="${src}"></div>`
    );
}
