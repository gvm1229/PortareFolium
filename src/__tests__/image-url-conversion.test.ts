import { describe, it, expect } from "vitest";
import {
    bareImageUrlsToMarkdown,
    repairDoubleWrappedImages,
} from "@/extensions/ImageDropPaste";

describe("bareImageUrlsToMarkdown", () => {
    it("wraps standalone URL", () => {
        expect(bareImageUrlsToMarkdown("https://example.com/foo.png")).toBe(
            "![](https://example.com/foo.png)"
        );
    });

    it("wraps URL with text around", () => {
        expect(
            bareImageUrlsToMarkdown("see https://example.com/foo.png for more")
        ).toBe("see ![](https://example.com/foo.png) for more");
    });

    it("does NOT re-wrap URL already inside markdown image", () => {
        const original = "![](https://example.com/foo.png)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("does NOT re-wrap multiple consecutive markdown images", () => {
        const original =
            "![](https://example.com/a.png)![](https://example.com/b.webp)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("does NOT re-wrap markdown image with alt text", () => {
        const original = "![alt](https://example.com/foo.png)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("does NOT wrap URL inside parentheses", () => {
        const original = "(https://example.com/foo.png)";
        expect(bareImageUrlsToMarkdown(original)).toBe(original);
    });

    it("supports webp/jpg/gif/svg/avif", () => {
        for (const ext of ["webp", "jpg", "jpeg", "gif", "svg", "avif"]) {
            const url = `https://example.com/foo.${ext}`;
            expect(bareImageUrlsToMarkdown(url)).toBe(`![](${url})`);
        }
    });

    it("ignores non-image URLs", () => {
        expect(bareImageUrlsToMarkdown("https://example.com/page.html")).toBe(
            "https://example.com/page.html"
        );
    });
});

describe("repairDoubleWrappedImages", () => {
    it("unwraps ![](![](url))", () => {
        expect(
            repairDoubleWrappedImages("![](![](https://example.com/foo.webp))")
        ).toBe("![](https://example.com/foo.webp)");
    });

    it("unwraps ![](![]\\(url\\)) with escaped parens", () => {
        expect(
            repairDoubleWrappedImages(
                "![](![]\\(https://example.com/foo.webp\\))"
            )
        ).toBe("![](https://example.com/foo.webp)");
    });

    it("leaves clean markdown unchanged", () => {
        const clean =
            "![](https://example.com/a.png)![](https://example.com/b.webp)";
        expect(repairDoubleWrappedImages(clean)).toBe(clean);
    });
});
