// Mermaid theme 설정
// src/styles/global.css color scheme 변수와 동기화

export type ColorScheme = "slate" | "ember" | "circuit" | "phantom";

export interface MermaidThemeVars {
    primaryColor: string;
    primaryTextColor: string;
    primaryBorderColor: string;
    lineColor: string;
    secondaryColor: string;
    secondaryTextColor: string;
    secondaryBorderColor: string;
    tertiaryColor: string;
    tertiaryTextColor: string;
    tertiaryBorderColor: string;
    background: string;
    mainBkg: string;
    textColor: string;
    noteBkgColor: string;
    noteTextColor: string;
}

// 스킴별 테마 (light/dark), global.css 동기화
export const MERMAID_THEMES: Record<
    ColorScheme,
    { light: MermaidThemeVars; dark: MermaidThemeVars }
> = {
    slate: {
        light: {
            primaryColor: "#e6eaf0",
            primaryTextColor: "#141620",
            primaryBorderColor: "#c5cad4",
            lineColor: "#5c6370",
            secondaryColor: "#dbeafe",
            secondaryTextColor: "#141620",
            secondaryBorderColor: "#c5cad4",
            tertiaryColor: "#f3f5f8",
            tertiaryTextColor: "#141620",
            tertiaryBorderColor: "#c5cad4",
            background: "#f3f5f8",
            mainBkg: "#e6eaf0",
            textColor: "#141620",
            noteBkgColor: "#dbeafe",
            noteTextColor: "#141620",
        },
        dark: {
            primaryColor: "#22252e",
            primaryTextColor: "#e4e8f0",
            primaryBorderColor: "#2e3340",
            lineColor: "#8890a0",
            secondaryColor: "#1a2540",
            secondaryTextColor: "#e4e8f0",
            secondaryBorderColor: "#2e3340",
            tertiaryColor: "#1a1c24",
            tertiaryTextColor: "#e4e8f0",
            tertiaryBorderColor: "#2e3340",
            background: "#1a1c24",
            mainBkg: "#22252e",
            textColor: "#e4e8f0",
            noteBkgColor: "#1a2540",
            noteTextColor: "#e4e8f0",
        },
    },
    ember: {
        light: {
            primaryColor: "#f2ede6",
            primaryTextColor: "#2a2118",
            primaryBorderColor: "#ddd5ca",
            lineColor: "#7a6f62",
            secondaryColor: "#ffedd5",
            secondaryTextColor: "#2a2118",
            secondaryBorderColor: "#ddd5ca",
            tertiaryColor: "#faf8f5",
            tertiaryTextColor: "#2a2118",
            tertiaryBorderColor: "#ddd5ca",
            background: "#faf8f5",
            mainBkg: "#f2ede6",
            textColor: "#2a2118",
            noteBkgColor: "#ffedd5",
            noteTextColor: "#2a2118",
        },
        dark: {
            primaryColor: "#28201a",
            primaryTextColor: "#f0ebe4",
            primaryBorderColor: "#3d3228",
            lineColor: "#9a918a",
            secondaryColor: "#2e2010",
            secondaryTextColor: "#f0ebe4",
            secondaryBorderColor: "#3d3228",
            tertiaryColor: "#1c1814",
            tertiaryTextColor: "#f0ebe4",
            tertiaryBorderColor: "#3d3228",
            background: "#1c1814",
            mainBkg: "#28201a",
            textColor: "#f0ebe4",
            noteBkgColor: "#2e2010",
            noteTextColor: "#f0ebe4",
        },
    },
    circuit: {
        light: {
            primaryColor: "#e0f2e8",
            primaryTextColor: "#0f2618",
            primaryBorderColor: "#b0d4be",
            lineColor: "#4a7058",
            secondaryColor: "#dcfce7",
            secondaryTextColor: "#0f2618",
            secondaryBorderColor: "#b0d4be",
            tertiaryColor: "#f2faf5",
            tertiaryTextColor: "#0f2618",
            tertiaryBorderColor: "#b0d4be",
            background: "#f2faf5",
            mainBkg: "#e0f2e8",
            textColor: "#0f2618",
            noteBkgColor: "#dcfce7",
            noteTextColor: "#0f2618",
        },
        dark: {
            primaryColor: "#162018",
            primaryTextColor: "#daf0e2",
            primaryBorderColor: "#1e3828",
            lineColor: "#70a880",
            secondaryColor: "#102818",
            secondaryTextColor: "#daf0e2",
            secondaryBorderColor: "#1e3828",
            tertiaryColor: "#0e1612",
            tertiaryTextColor: "#daf0e2",
            tertiaryBorderColor: "#1e3828",
            background: "#0e1612",
            mainBkg: "#162018",
            textColor: "#daf0e2",
            noteBkgColor: "#102818",
            noteTextColor: "#daf0e2",
        },
    },
    phantom: {
        light: {
            primaryColor: "#ede8f8",
            primaryTextColor: "#1a1030",
            primaryBorderColor: "#c8bce0",
            lineColor: "#665c80",
            secondaryColor: "#ede9fe",
            secondaryTextColor: "#1a1030",
            secondaryBorderColor: "#c8bce0",
            tertiaryColor: "#f8f5ff",
            tertiaryTextColor: "#1a1030",
            tertiaryBorderColor: "#c8bce0",
            background: "#f8f5ff",
            mainBkg: "#ede8f8",
            textColor: "#1a1030",
            noteBkgColor: "#ede9fe",
            noteTextColor: "#1a1030",
        },
        dark: {
            primaryColor: "#1c1828",
            primaryTextColor: "#e8e2f4",
            primaryBorderColor: "#2e2848",
            lineColor: "#8a80a8",
            secondaryColor: "#1e1440",
            secondaryTextColor: "#e8e2f4",
            secondaryBorderColor: "#2e2848",
            tertiaryColor: "#13101c",
            tertiaryTextColor: "#e8e2f4",
            tertiaryBorderColor: "#2e2848",
            background: "#13101c",
            mainBkg: "#1c1828",
            textColor: "#e8e2f4",
            noteBkgColor: "#1e1440",
            noteTextColor: "#e8e2f4",
        },
    },
};

// 현재 스킴과 다크모드에서 Mermaid 설정 생성
export function getMermaidConfig(
    scheme: string | null,
    isDark: boolean
): {
    theme: string;
    themeVariables: Record<string, string | number | boolean>;
} {
    const validScheme: ColorScheme =
        scheme && scheme in MERMAID_THEMES ? (scheme as ColorScheme) : "slate";
    const schemeThemes = MERMAID_THEMES[validScheme];
    const themeVars = isDark ? schemeThemes.dark : schemeThemes.light;
    return {
        theme: "base",
        themeVariables: {
            ...themeVars,
            fontSize: "18px",
            fontFamily: "inherit",
            darkMode: isDark,
        },
    };
}
