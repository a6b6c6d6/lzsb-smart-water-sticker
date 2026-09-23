// ==UserScript==
// @name         LINUX SB 液态玻璃质感 (Liquid Glassmorphism)
// @namespace    https://linux.sb/
// @version      1.7.5
// @description  液态玻璃质感界面定制视觉脚本。v1.7.5：① 修复 .post-ops 楼层操作按钮的图标整条消失（删除/置顶只剩空壳）——站点图标由 .icon-action::before 的 14px 方块 + mask:url(svg) 绘制，而按钮是定尺的（.icon-action 宽 24px + padding:0）；脚本强加的 padding 4px 14px 让内容盒被压到 0 宽，作为 flex 子项的伪元素随之塌成 0px。现将 .post-ops 的内边距交回站点（脚本只负责上色、圆角与高光），并追加 .icon-action::before 禁止 flex 收缩的兜底；② 保留 v1.7.4 的 fixed 浮层包含块修复（毛玻璃改由 ::before 伪层承载）；③ 保留 v1.7.3 的字体颜色浅色/深色两套自定义与深色默认值；④ 保留 v1.7.2 的编辑器工具栏修复、四个开关即时生效、默认参数调整。
// @author       Antigravity
// @license      MIT
// @homepageURL  https://greasyfork.org/zh-CN/scripts/597069
// @supportURL   https://github.com/Evander-8
// @match        https://linux.sb/*
// @match        http://linux.sb/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================
    // 1. 配置管理与默认配置
    // ==========================================
    const DEFAULT_CONFIG = {
        themeBg: 'aurora',           // aurora | cyber | dawn | minimal | custom
        customBgUrl: '',
        blurLevel: 4,                // 0 ~ 32px
        glassOpacity: 25,            // 0% ~ 100%
        borderRadius: 20,            // 12 ~ 32px (标志性大圆角拟态)
        enableAnimation: true,       // 流体背景动画
        enableFloatingGlow: true,    // 悬浮环境光晕
        enableRefraction: true,      // 核心特色：SVG 液态曲面光线折射滤镜
        enableShimmer: true,         // 悬停动态扫光特效 (Shimmer Light Sweep)
        enableDockHeader: true,      // 胶囊悬浮式顶栏 (Floating Island Dock)
        textColorPrimary: '',        // 浅色模式：正文/主文本颜色（空表示用站点默认）
        textColorTitle: '',          // 浅色模式：帖子与标题颜色
        textColorLink: '',           // 浅色模式：链接与导航颜色
        textColorMuted: '#ff0000',   // 浅色模式：次级与元信息颜色
        textColorBtn: '#0548ff',     // 浅色模式：按钮与胶囊文字颜色
        textColorPrimaryDark: '#ffffff', // 深色模式：正文/主文本颜色
        textColorTitleDark: '#ffffff',   // 深色模式：帖子与标题颜色
        textColorLinkDark: '#ffffff',    // 深色模式：链接与导航颜色
        textColorMutedDark: '#ff0000',   // 深色模式：次级与元信息颜色（默认与浅色一致）
        textColorBtnDark: '#0548ff'      // 深色模式：按钮与胶囊文字颜色（默认与浅色一致）
    };

    const STORAGE_KEY = 'lsb_liquid_glass_config';

    function loadConfig() {
        try {
            if (typeof GM_getValue === 'function') {
                const saved = GM_getValue(STORAGE_KEY);
                if (saved) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
            }
            const localSaved = localStorage.getItem(STORAGE_KEY);
            if (localSaved) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(localSaved));
        } catch (e) {
            console.warn('[Liquid Glass] 加载配置失败，使用默认配置', e);
        }
        return Object.assign({}, DEFAULT_CONFIG);
    }

    function saveConfig(cfg) {
        try {
            const str = JSON.stringify(cfg);
            if (typeof GM_setValue === 'function') {
                GM_setValue(STORAGE_KEY, str);
            }
            try {
                localStorage.setItem(STORAGE_KEY, str);
            } catch (storageErr) {
                console.warn('[Liquid Glass] localStorage 容量受限，已通过油猴 GM_setValue 安全持久化', storageErr);
            }
        } catch (e) {
            console.error('[Liquid Glass] 保存配置失败', e);
        }
    }

    let config = loadConfig();

    // ==========================================
    // 2. 核心 CSS 样式构建与注入
    // ==========================================
    const STYLE_ELEMENT_ID = 'lsb-liquid-glass-styles';

    function getThemeBackgroundCSS(cfg, isDark) {
        if (cfg.themeBg === 'custom' && cfg.customBgUrl) {
            return `background-image: url(${JSON.stringify(cfg.customBgUrl)}) !important;
                    background-size: cover !important;
                    background-position: center center !important;
                    background-repeat: no-repeat !important;
                    background-attachment: fixed !important;`;
        }
        if (cfg.themeBg === 'cyber') {
            return `background: radial-gradient(at 20% 20%, rgba(139, 92, 246, 0.4) 0px, transparent 55%),
                                radial-gradient(at 80% 20%, rgba(236, 72, 153, 0.35) 0px, transparent 50%),
                                radial-gradient(at 50% 80%, rgba(6, 182, 212, 0.36) 0px, transparent 55%),
                                linear-gradient(160deg, #0b0f19 0%, #1e1b4b 100%) !important;
                    background-attachment: fixed !important;`;
        }
        if (cfg.themeBg === 'dawn') {
            if (isDark) {
                return `background: radial-gradient(at 15% 15%, rgba(251, 146, 60, 0.35) 0px, transparent 50%),
                                    radial-gradient(at 85% 25%, rgba(244, 63, 94, 0.32) 0px, transparent 50%),
                                    radial-gradient(at 50% 85%, rgba(147, 51, 234, 0.32) 0px, transparent 55%),
                                    linear-gradient(135deg, #180d16 0%, #0d121f 100%) !important;
                        background-attachment: fixed !important;`;
            }
            return `background: radial-gradient(at 15% 15%, rgba(251, 146, 60, 0.3) 0px, transparent 50%),
                                radial-gradient(at 85% 25%, rgba(244, 63, 94, 0.26) 0px, transparent 50%),
                                radial-gradient(at 50% 85%, rgba(147, 51, 234, 0.25) 0px, transparent 55%),
                                linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%) !important;
                    background-attachment: fixed !important;`;
        }
        if (cfg.themeBg === 'minimal') {
            if (isDark) {
                return `background: radial-gradient(at 30% 30%, rgba(30, 41, 59, 0.7) 0px, transparent 50%),
                                    radial-gradient(at 70% 70%, rgba(15, 23, 42, 0.85) 0px, transparent 50%),
                                    linear-gradient(135deg, #0b0f19 0%, #020617 100%) !important;
                        background-attachment: fixed !important;`;
            }
            return `background: radial-gradient(at 30% 30%, rgba(203, 213, 225, 0.5) 0px, transparent 50%),
                                radial-gradient(at 70% 70%, rgba(226, 232, 240, 0.7) 0px, transparent 50%),
                                linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%) !important;
                        background-attachment: fixed !important;`;
        }
        // Default aurora
        if (isDark) {
            return `background: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.4) 0px, transparent 55%),
                                radial-gradient(at 100% 0%, rgba(56, 189, 248, 0.35) 0px, transparent 50%),
                                radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.3) 0px, transparent 55%),
                                radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.28) 0px, transparent 50%),
                                linear-gradient(135deg, #070b13 0%, #0f172a 100%) !important;
                    background-attachment: fixed !important;`;
        }
        return `background: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.32) 0px, transparent 55%),
                            radial-gradient(at 100% 0%, rgba(56, 189, 248, 0.32) 0px, transparent 50%),
                            radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.28) 0px, transparent 55%),
                            radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.25) 0px, transparent 50%),
                            linear-gradient(135deg, #f8fafc 0%, #e8edf5 100%) !important;
                background-attachment: fixed !important;`;
    }

    // ==========================================
    // 2.1 自定义字体颜色的区域分组（浅色 / 深色共用同一组选择器）
    // ==========================================
    const FONT_COLOR_GROUPS = {
        primary: {
            label: '正文主文字',
            light: 'textColorPrimary',
            dark: 'textColorPrimaryDark',
            selectors: 'body, .main-panel, .post-item, .post-entry, .post-content, .post-text, p, .reply-panel, .form-panel'
        },
        title: {
            label: '帖子与标题',
            light: 'textColorTitle',
            dark: 'textColorTitleDark',
            selectors: '.topic-title, .topic-title a, .daily-hot-topics-card h3, .quick-card h3, .main-panel h1, .main-panel h2, .main-panel h3, .main-panel h4, .main-panel h5, .main-panel h6, .post-entry h1, .post-entry h2, .post-entry h3, .profile-disclosure-heading strong, .profile-account-card>strong'
        },
        link: {
            label: '链接与导航',
            light: 'textColorLink',
            dark: 'textColorLinkDark',
            selectors: 'a, .forum-link, .tab, .forum-enhancements-left-navigation a, .breadcrumb a, .topic-pages a'
        },
        muted: {
            label: '次级元信息',
            light: 'textColorMuted',
            dark: 'textColorMutedDark',
            selectors: '.text-muted, .color-muted, .sub-info, .meta, .post-meta, .topic-meta, .forum-enhancements-left-count, .sub-title, .tip, .help-block, .small'
        },
        btn: {
            label: '按钮与胶囊',
            light: 'textColorBtn',
            dark: 'textColorBtnDark',
            selectors: '.btn, button, input[type="button"], input[type="submit"], [role="button"], .btn-post, .quick-reply-main-action button, button[data-quick-reply-action], .reply-panel button[type="submit"], .reply-panel .btn, .pagination a, .pagination span, .color-scheme-modal-dialog button'
        }
    };

    const FONT_COLOR_KEYS = Object.keys(FONT_COLOR_GROUPS).reduce((acc, key) => {
        acc.push(FONT_COLOR_GROUPS[key].light, FONT_COLOR_GROUPS[key].dark);
        return acc;
    }, []);

    // textColorPrimary  -> lsb-color-primary      / lsb-color-primary-hex
    // textColorPrimaryDark -> lsb-color-primary-dark / lsb-color-primary-dark-hex
    function fontColorControlIds(key) {
        const base = 'lsb-color-' + key.replace(/^textColor/, '').replace(/Dark$/, '-dark').toLowerCase();
        return { picker: base, hex: base + '-hex' };
    }

    // 把一组选择器全部挂到深色模式的两个 html 属性前缀下
    function scopeDarkSelectors(selectors) {
        return selectors
            .split(',')
            .map((sel) => `html[data-dark-mode-theme="dark"] ${sel.trim()}, html[data-color-scheme-dark-mode-theme="dark"] ${sel.trim()}`)
            .join(',\n        ');
    }

    // 为每个区域生成浅色 / 深色两套规则，两套互不串味
    function buildFontColorCSS(cfg) {
        return Object.keys(FONT_COLOR_GROUPS).map((key) => {
            const group = FONT_COLOR_GROUPS[key];
            const blocks = [];
            if (cfg[group.light]) {
                blocks.push(`/* ${group.label} · 浅色 */\n        ${group.selectors} {\n            color: ${cfg[group.light]} !important;\n        }`);
            }
            if (cfg[group.dark]) {
                blocks.push(`/* ${group.label} · 深色 */\n        ${scopeDarkSelectors(group.selectors)} {\n            color: ${cfg[group.dark]} !important;\n        }`);
            }
            return blocks.join('\n');
        }).join('\n');
    }

    function generateCSS(cfg) {
        const blurPx = `${cfg.blurLevel}px`;
        const radiusPx = `${cfg.borderRadius}px`;
        const opacityRatio = (cfg.glassOpacity / 100).toFixed(2);
        const elevatedRatio = Math.min(1.0, (cfg.glassOpacity / 100) * 1.15).toFixed(2);
        const postItemRatio = (cfg.glassOpacity / 100 * 0.35).toFixed(2);
        const darkPostItemRatio = (cfg.glassOpacity / 100 * 0.08).toFixed(2);
        const fontColorCSS = buildFontColorCSS(cfg);

        return `
        /* ===== 基础玻璃化 CSS 变量定义 ===== */
        :root {
            --lsb-blur: ${blurPx};
            --lsb-blur-subtle: calc(var(--lsb-blur) * 0.65);
            --lsb-blur-modal: calc(var(--lsb-blur) * 1.25 + 8px);
            --lsb-radius: ${radiusPx};
            --lsb-glass-bg: rgba(255, 255, 255, ${opacityRatio});
            --lsb-glass-bg-elevated: rgba(255, 255, 255, ${elevatedRatio});
            --lsb-post-item-bg: rgba(255, 255, 255, ${postItemRatio});
            --lsb-glass-border: rgba(255, 255, 255, 0.75);
            --lsb-glass-border-light: rgba(255, 255, 255, 0.45);
            /* 核心双重内发光棱线 (Specular Rims) 与多阶弥散阴影 */
            --lsb-glass-shine: inset 2px 2px 1.5px rgba(255, 255, 255, 0.95), inset -1px -1px 1.5px 1px rgba(255, 255, 255, 0.4);
            --lsb-glass-tint: 0 12px 36px -4px rgba(31, 38, 135, 0.08), 0 4px 14px -2px rgba(0, 0, 0, 0.03), inset 4px 4px 10px rgba(143, 143, 143, 0.1);
            --lsb-post-hover-bg: rgba(255, 255, 255, 0.65);
            --lsb-input-bg: rgba(255, 255, 255, 0.55);
            --lsb-badge-bg: rgba(255, 255, 255, 0.7);
            /* 弹性果冻缓动 */
            --lsb-ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.4);
            --lsb-ease-jelly: cubic-bezier(0.175, 0.885, 0.32, 2.0);

            /* 关键拦截：重定向 linux.sb 官方默认纯白实体变量至液态透光变量 */
            --panel: rgba(255, 255, 255, ${opacityRatio});
            --panel-muted: rgba(255, 255, 255, ${elevatedRatio});
            --bg: rgba(255, 255, 255, ${postItemRatio});
            --line: var(--lsb-glass-border-light);
            --line-soft: var(--lsb-glass-border-light);
            --border: var(--lsb-glass-border-light);

            /* 高对比超清字色与品牌主题色拦截（彻底杜绝原生刺眼实心粉色） */
            --text: ${cfg.textColorPrimary || '#070d1e'};
            --text-muted: ${cfg.textColorMuted || '#1e293b'};
            --text-subtle: #334155;
            --brand: #10b981;
            --brand-soft: rgba(16, 185, 129, 0.15);
        }

        /* 暗色模式适配 (Deep Acrylic Glass) */
        html[data-dark-mode-theme="dark"],
        html[data-color-scheme-dark-mode-theme="dark"] {
            --lsb-glass-bg: rgba(16, 22, 34, ${opacityRatio});
            --lsb-glass-bg-elevated: rgba(24, 32, 48, ${elevatedRatio});
            --lsb-post-item-bg: rgba(255, 255, 255, ${darkPostItemRatio});
            --lsb-glass-border: rgba(255, 255, 255, 0.18);
            --lsb-glass-border-light: rgba(255, 255, 255, 0.09);
            --lsb-glass-shine: inset 2px 2px 8px rgba(255, 255, 255, 0.35), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.55);
            --lsb-glass-tint: 0 16px 48px -6px rgba(0, 0, 0, 0.55), 0 6px 18px -2px rgba(0, 0, 0, 0.3), inset 4px 4px 14px rgba(0, 0, 0, 0.35);
            --lsb-post-hover-bg: rgba(255, 255, 255, 0.08);
            --lsb-input-bg: rgba(255, 255, 255, 0.08);
            --lsb-badge-bg: rgba(255, 255, 255, 0.1);

            /* 暗色模式下的官方实体变量拦截 */
            --panel: rgba(16, 22, 34, ${opacityRatio});
            --panel-muted: rgba(24, 32, 48, ${elevatedRatio});
            --bg: rgba(255, 255, 255, ${darkPostItemRatio});
            --line: var(--lsb-glass-border-light);
            --line-soft: var(--lsb-glass-border-light);
            --border: var(--lsb-glass-border-light);

            --text: ${cfg.textColorPrimaryDark || '#ffffff'};
            --text-muted: ${cfg.textColorMutedDark || '#f1f5f9'};
            --text-subtle: #cbd5e1;
            --brand: #34d399;
            --brand-soft: rgba(52, 211, 153, 0.2);
        }

        /* ===== 0秒抗闪烁底层基座 (Zero-FOUC Frame 0 Canvas) ===== */
        html {
            min-height: 100vh !important;
            background-attachment: fixed !important;
            background-size: cover !important;
            background-position: center center !important;
            background-repeat: no-repeat !important;
            ${getThemeBackgroundCSS(cfg, false)}
        }

        html[data-dark-mode-theme="dark"],
        html[data-color-scheme-dark-mode-theme="dark"] {
            ${getThemeBackgroundCSS(cfg, true)}
        }

        body {
            background: transparent !important;
            min-height: 100vh !important;
        }

        /* 页面加载期过渡锁死：杜绝任何由白到透的350ms抽搐式变形与原UI闪烁 */
        html.lsb-loading *,
        html:not(.lsb-ready) * {
            -webkit-transition: none !important;
            -moz-transition: none !important;
            -o-transition: none !important;
            transition: none !important;
            animation-duration: 0s !important;
        }

        /* 极速滚动时的性能保护层 (120fps Silk Mode) */
        html.lsb-scrolling * {
            pointer-events: none !important;
        }
        html.lsb-scrolling {
            pointer-events: auto !important;
        }

        /* 动态背景画布容器 (仅负责浮光斑与点阵叠加) */
        #lsb-liquid-backdrop-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -9999;
            overflow: hidden;
            pointer-events: none;
            background: transparent !important;
        }

        /* 背景细微立体纹理点阵（使毛玻璃模糊度在浅色模式拥有极佳的透视与消散对比） */
        #lsb-liquid-backdrop-container::after {
            content: "";
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(100, 116, 139, 0.16) 1.2px, transparent 1.2px);
            background-size: 22px 22px;
            opacity: 0.65;
            pointer-events: none;
        }

        html[data-dark-mode-theme="dark"] #lsb-liquid-backdrop-container::after,
        html[data-color-scheme-dark-mode-theme="dark"] #lsb-liquid-backdrop-container::after {
            background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1.2px, transparent 1.2px);
            opacity: 0.6;
        }

        /* 背景风格定义 */
        .lsb-bg-aurora {
            background: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.32) 0px, transparent 55%),
                        radial-gradient(at 100% 0%, rgba(56, 189, 248, 0.32) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.28) 0px, transparent 55%),
                        radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.25) 0px, transparent 50%),
                        linear-gradient(135deg, #f8fafc 0%, #e8edf5 100%);
        }
        html[data-dark-mode-theme="dark"] .lsb-bg-aurora,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-bg-aurora {
            background: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.4) 0px, transparent 55%),
                        radial-gradient(at 100% 0%, rgba(56, 189, 248, 0.35) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.3) 0px, transparent 55%),
                        radial-gradient(at 0% 100%, rgba(16, 185, 129, 0.28) 0px, transparent 50%),
                        linear-gradient(135deg, #070b13 0%, #0f172a 100%);
        }

        .lsb-bg-cyber {
            background: radial-gradient(at 20% 20%, rgba(139, 92, 246, 0.4) 0px, transparent 55%),
                        radial-gradient(at 80% 20%, rgba(236, 72, 153, 0.35) 0px, transparent 50%),
                        radial-gradient(at 50% 80%, rgba(6, 182, 212, 0.36) 0px, transparent 55%),
                        linear-gradient(160deg, #0b0f19 0%, #1e1b4b 100%);
        }

        .lsb-bg-dawn {
            background: radial-gradient(at 15% 15%, rgba(251, 146, 60, 0.3) 0px, transparent 50%),
                        radial-gradient(at 85% 25%, rgba(244, 63, 94, 0.26) 0px, transparent 50%),
                        radial-gradient(at 50% 85%, rgba(147, 51, 234, 0.25) 0px, transparent 55%),
                        linear-gradient(135deg, #fff7ed 0%, #fdf2f8 100%);
        }
        html[data-dark-mode-theme="dark"] .lsb-bg-dawn,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-bg-dawn {
            background: radial-gradient(at 15% 15%, rgba(251, 146, 60, 0.35) 0px, transparent 50%),
                        radial-gradient(at 85% 25%, rgba(244, 63, 94, 0.32) 0px, transparent 50%),
                        radial-gradient(at 50% 85%, rgba(147, 51, 234, 0.32) 0px, transparent 55%),
                        linear-gradient(135deg, #180d16 0%, #0d121f 100%);
        }

        .lsb-bg-minimal {
            background: radial-gradient(at 30% 30%, rgba(203, 213, 225, 0.5) 0px, transparent 50%),
                        radial-gradient(at 70% 70%, rgba(226, 232, 240, 0.7) 0px, transparent 50%),
                        linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }
        html[data-dark-mode-theme="dark"] .lsb-bg-minimal,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-bg-minimal {
            background: radial-gradient(at 30% 30%, rgba(30, 41, 59, 0.7) 0px, transparent 50%),
                        radial-gradient(at 70% 70%, rgba(15, 23, 42, 0.85) 0px, transparent 50%),
                        linear-gradient(135deg, #0b0f19 0%, #020617 100%);
        }

        .lsb-bg-custom {
            background-size: cover !important;
            background-position: center center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
        }
        #lsb-liquid-backdrop-container.lsb-bg-custom::after {
            opacity: 0.15 !important;
        }

        /* 环境流体浮光斑 (柔光球) */
        .lsb-liquid-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(48px);
            opacity: 0.7;
            mix-blend-mode: multiply;
            will-change: transform;
            pointer-events: none;
        }
        html[data-dark-mode-theme="dark"] .lsb-liquid-orb,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-liquid-orb {
            mix-blend-mode: screen;
            opacity: 0.42;
        }

        .lsb-liquid-orb-1 {
            width: 520px;
            height: 520px;
            top: -120px;
            left: -120px;
            background: linear-gradient(135deg, #6366f1, #06b6d4);
            animation: lsb-float-1 22s infinite alternate ease-in-out;
        }
        .lsb-liquid-orb-2 {
            width: 480px;
            height: 480px;
            top: 25%;
            right: -120px;
            background: linear-gradient(135deg, #ec4899, #8b5cf6);
            animation: lsb-float-2 26s infinite alternate ease-in-out;
        }
        .lsb-liquid-orb-3 {
            width: 420px;
            height: 420px;
            bottom: -60px;
            left: 25%;
            background: linear-gradient(135deg, #10b981, #3b82f6);
            animation: lsb-float-3 24s infinite alternate ease-in-out;
        }

        @keyframes lsb-float-1 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(130px, 90px) scale(1.12); }
            100% { transform: translate(50px, 150px) scale(0.95); }
        }
        @keyframes lsb-float-2 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-120px, 100px) scale(1.18); }
            100% { transform: translate(-60px, -70px) scale(0.9); }
        }
        @keyframes lsb-float-3 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(90px, -80px) scale(1.1); }
            100% { transform: translate(-70px, -40px) scale(0.96); }
        }

        ${!cfg.enableAnimation ? `
            .lsb-liquid-orb,
            html[data-lsb-animation="0"] .lsb-liquid-orb {
                animation: none !important;
                transition: none !important;
            }
            html[data-lsb-animation="0"] body::before,
            html[data-lsb-animation="0"] body::after,
            html[data-lsb-animation="0"] .lsb-liquid-backdrop-container {
                animation: none !important;
            }
        ` : `
            html[data-lsb-animation="0"] .lsb-liquid-orb {
                animation: none !important;
            }
        `}

        /* ===== 字体自然清晰渲染与多区域颜色自定义 (Natural Typography & Custom Font Colors) ===== */
        /* 回退至原版自然渲染状态，杜绝白雾发光与过度加粗 */
        body {
            color: var(--text) !important;
        }
        .text-muted, .color-muted, .sub-info, .meta, .forum-enhancements-left-count {
            color: var(--text-muted) !important;
        }

        /* 1~5. 五个区域的自定义颜色：浅色 / 深色各一套，切换模式自动生效 */
        ${fontColorCSS}

        /* ===== 全站通用液态毛玻璃按钮规范 (Universal Liquid Glass Buttons) ===== */
        /* 彻底消除全站实心粉色，全量重塑为透光、晶莹、反光的液态玻璃胶囊 */
        /* 注意：.nb-editor-btn（编辑器工具栏按钮）不在此规则中，见下方专属样式 */
        .btn:not(.nb-editor-btn), button:not(.nb-editor-btn), input[type="button"], input[type="submit"], [role="button"],
        .color-scheme-modal-dialog button:not(.nb-editor-btn), .color-scheme-modal-dialog [role="button"],
        .color-scheme-modal-dialog [class*="button"]:not(.nb-editor-btn), .color-scheme-modal-dialog [class*="item"],
        .color-scheme-modal-dialog [class*="option"], .btn-post,
        .quick-reply-main-action button:not(.nb-editor-btn), button[data-quick-reply-action],
        .reply-panel button[type="submit"]:not(.nb-editor-btn), .reply-panel .btn:not(.nb-editor-btn),
        .form-panel button[type="submit"], .form-panel input[type="submit"], .profile-disclosure button[type="submit"],
        .user-block-search button, .user-block-action button,
        .direct-messages-user-search button, .direct-messages-compose button,
        .attachment-upload-storage-form button, .attachment-upload-batch-form button,
        .attachment-upload-detail-actions button,
        .gacha-pull-btn, .gacha-equip-btn, .gacha-unequip-btn, .gacha-gift-btn, .gacha-result-button,
        .pagination a, .pagination span, .topic-pages a,
        .profile-account-logout .profile-exit-button, .profile-edit-action,
        .avatar-picker button, .avatar-picker .btn, .reply-login-box a,
        .topic-collections-panel-actions .btn, .topic-collections-btn,
        .reply-pin-return-link, .post-ops .btn, .post-ops button:not(.nb-editor-btn),
        .long-content-fold-toggle, .long-content-fold-actions button,
        .donate-entry, .donate-topic-reaction-action, .donate-actions .btn {
            background: rgba(255, 255, 255, 0.42) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            color: var(--text) !important;
            border-radius: 999px !important;
            box-shadow: inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.85), inset -1px -1px 1.5px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04) !important;
            backdrop-filter: blur(10px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(10px) saturate(160%) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            cursor: pointer !important;
            /* 注意：不强制 position/overflow，避免破坏站点原有绝对定位按钮（如编辑器内上传触发按钮） */
        }
        /* 注意：color-scheme-modal-dialog 内的 form.color-scheme-choice 是纯结构容器，
           不在此通用规则里，改为在下方弹窗专属规则中处理其子 button */

        .btn:not(.nb-editor-btn):hover, button:not(.nb-editor-btn):hover, input[type="button"]:hover, input[type="submit"]:hover, [role="button"]:hover,
        .color-scheme-modal-dialog button:not(.nb-editor-btn):hover, .color-scheme-modal-dialog [role="button"]:hover,
        .color-scheme-modal-dialog [class*="button"]:not(.nb-editor-btn):hover, .color-scheme-modal-dialog [class*="item"]:hover,
        .color-scheme-modal-dialog [class*="option"]:hover, .btn-post:hover,
        .quick-reply-main-action button:not(.nb-editor-btn):hover, button[data-quick-reply-action]:hover,
        .reply-panel button[type="submit"]:hover, .reply-panel .btn:not(.nb-editor-btn):hover,
        .form-panel button[type="submit"]:hover, .form-panel input[type="submit"]:hover, .profile-disclosure button[type="submit"]:hover,
        .user-block-search button:hover, .user-block-action button:hover,
        .direct-messages-user-search button:hover, .direct-messages-compose button:hover,
        .attachment-upload-storage-form button:hover,
        .gacha-pull-btn:hover, .gacha-equip-btn:hover, .gacha-unequip-btn:hover, .gacha-gift-btn:hover,
        .pagination a:hover, .topic-pages a:hover,
        .profile-edit-action:hover, .avatar-picker button:hover, .reply-login-box a:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
            transform: translateY(-1.5px) scale(1.02) !important;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }

        .btn:active, button:active, input[type="button"]:active, input[type="submit"]:active, [role="button"]:active {
            transform: translateY(0) scale(0.98) !important;
        }

        /* 选中/激活态高光 (Active Specular Liquid State - 坚决杜绝实心粉色) */
        .color-scheme-modal-dialog button.active,
        .color-scheme-modal-dialog button[aria-pressed="true"],
        .color-scheme-modal-dialog button[aria-selected="true"],
        .pagination .active, .pagination .active a,
        .tab.active, .forum-link.active,
        .forum-enhancements-left-navigation a.active,
        .attachment-upload-filter a.active {
            background: rgba(255, 255, 255, 0.85) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            color: var(--text) !important;
            font-weight: 700 !important;
            box-shadow: 0 4px 16px rgba(255, 255, 255, 0.6), inset 1.5px 1.5px 2px #ffffff !important;
            transform: translateY(-1px) !important;
        }

        /* 暗色模式按钮适配 */
        html[data-dark-mode-theme="dark"] .btn,
        html[data-dark-mode-theme="dark"] button,
        html[data-dark-mode-theme="dark"] input[type="button"],
        html[data-dark-mode-theme="dark"] input[type="submit"],
        html[data-dark-mode-theme="dark"] [role="button"],
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog button,
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog [class*="button"],
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog [class*="item"],
        html[data-dark-mode-theme="dark"] .btn-post,
        html[data-dark-mode-theme="dark"] .pagination a,
        html[data-color-scheme-dark-mode-theme="dark"] .btn,
        html[data-color-scheme-dark-mode-theme="dark"] button,
        html[data-color-scheme-dark-mode-theme="dark"] input[type="button"],
        html[data-color-scheme-dark-mode-theme="dark"] input[type="submit"],
        html[data-color-scheme-dark-mode-theme="dark"] [role="button"],
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog button,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog [class*="button"],
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog [class*="item"],
        html[data-color-scheme-dark-mode-theme="dark"] .btn-post,
        html[data-color-scheme-dark-mode-theme="dark"] .pagination a {
            background: rgba(255, 255, 255, 0.10) !important;
            border: 1px solid rgba(255, 255, 255, 0.20) !important;
            color: #ffffff !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.25), inset -1px -1px 1.5px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }

        html[data-dark-mode-theme="dark"] .btn:hover,
        html[data-dark-mode-theme="dark"] button:hover,
        html[data-dark-mode-theme="dark"] .btn-post:hover,
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog button:hover,
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog [class*="item"]:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .btn:hover,
        html[data-color-scheme-dark-mode-theme="dark"] button:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .btn-post:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog button:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog [class*="item"]:hover {
            background: rgba(255, 255, 255, 0.20) !important;
            border-color: rgba(255, 255, 255, 0.45) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.4) !important;
        }

        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog button.active,
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog .active,
        html[data-dark-mode-theme="dark"] .pagination .active,
        html[data-dark-mode-theme="dark"] .pagination .active a,
        html[data-dark-mode-theme="dark"] .tab.active,
        html[data-dark-mode-theme="dark"] .forum-link.active,
        html[data-dark-mode-theme="dark"] .forum-enhancements-left-navigation a.active,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog button.active,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog .active,
        html[data-color-scheme-dark-mode-theme="dark"] .pagination .active,
        html[data-color-scheme-dark-mode-theme="dark"] .pagination .active a,
        html[data-color-scheme-dark-mode-theme="dark"] .tab.active,
        html[data-color-scheme-dark-mode-theme="dark"] .forum-link.active,
        html[data-color-scheme-dark-mode-theme="dark"] .forum-enhancements-left-navigation a.active {
            background: rgba(255, 255, 255, 0.28) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.55) !important;
            color: #ffffff !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), inset 1px 1px 2px rgba(255, 255, 255, 0.5) !important;
        }

        /* ===== 顶栏：悬浮胶囊码头 (Floating Capsule Dock) ===== */
        ${cfg.enableDockHeader ? `
        .top {
            position: sticky !important;
            top: 10px !important;
            z-index: 100 !important;
            max-width: 1200px !important;
            margin: 8px auto 14px !important;
            border-radius: 999px !important;
            background: var(--lsb-glass-bg-elevated) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(180%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(180%) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            padding: 2px 8px !important;
            transition: all 0.35s var(--lsb-ease-spring) !important;
        }
        @media (max-width: 1240px) {
            .top {
                margin-left: 12px !important;
                margin-right: 12px !important;
            }
        }
        @media (max-width: 720px) {
            .top {
                top: 0 !important;
                margin: 0 !important;
                border-radius: 0 !important;
                border-top: none !important;
                border-left: none !important;
                border-right: none !important;
                padding: 0 !important;
            }
        }
        ` : `
        .top {
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            background: var(--lsb-glass-bg-elevated) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(180%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(180%) !important;
            border-bottom: 1px solid var(--lsb-glass-border) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            transition: background 0.3s ease, border-color 0.3s ease !important;
        }
        `}

        .bar {
            height: 50px !important;
        }

        /* 顶部品牌 LOGO */
        .brand {
            font-weight: 800 !important;
            letter-spacing: -0.3px !important;
            background: linear-gradient(135deg, var(--text) 0%, var(--brand) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            transition: all 0.3s var(--lsb-ease-spring) !important;
        }
        .brand:hover {
            transform: scale(1.04);
            opacity: 0.9;
        }

        /* 顶部版块导航标签 (玻璃按钮) */
        .forum-link, .forum-more-toggle {
            height: 32px !important;
            padding: 0 14px !important;
            border-radius: 999px !important;
            transition: all 0.3s var(--lsb-ease-spring) !important;
            border: 1px solid transparent !important;
            position: relative !important;
            overflow: hidden !important;
        }
        .forum-link:hover, .forum-more-toggle:hover {
            background: rgba(125, 125, 125, 0.12) !important;
            border-color: var(--lsb-glass-border-light) !important;
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 1px 1px 2px rgba(255, 255, 255, 0.6) !important;
        }
        .forum-link.active, .forum-more-toggle[aria-expanded="true"] {
            background: rgba(255, 255, 255, 0.85) !important;
            color: var(--text) !important;
            border-color: rgba(255, 255, 255, 0.98) !important;
            box-shadow: 0 4px 16px rgba(255, 255, 255, 0.55), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
            transform: translateY(-1px);
            font-weight: 700 !important;
        }
        html[data-dark-mode-theme="dark"] .forum-link.active,
        html[data-dark-mode-theme="dark"] .forum-more-toggle[aria-expanded="true"],
        html[data-color-scheme-dark-mode-theme="dark"] .forum-link.active,
        html[data-color-scheme-dark-mode-theme="dark"] .forum-more-toggle[aria-expanded="true"] {
            background: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.4) !important;
        }

        /* 顶部折叠版块区域 */
        .forum-more-region {
            background: var(--lsb-glass-bg-elevated) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            border-bottom: 1px solid var(--lsb-glass-border) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
        }
        .forum-more-link {
            border-radius: 999px !important;
            background: rgba(125, 125, 125, 0.08) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
        }
        .forum-more-link:hover {
            background: rgba(255, 255, 255, 0.6) !important;
            border-color: rgba(255, 255, 255, 0.9) !important;
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06) !important;
        }

        /* 搜索框晶体胶囊 (Search Pill) */
        .search-page-link {
            height: 36px !important;
            border-radius: 999px !important;
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.05), inset -1px -1px 2px rgba(255, 255, 255, 0.5) !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .search-page-link:hover, .search-page-link:focus-within {
            border-color: var(--brand) !important;
            transform: translateY(-1px) scale(1.01);
            box-shadow: 0 4px 16px rgba(46, 204, 113, 0.25), inset 1px 1px 3px rgba(0, 0, 0, 0.04) !important;
            background: rgba(255, 255, 255, 0.8) !important;
        }
        html[data-dark-mode-theme="dark"] .search-page-link:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .search-page-link:hover {
            background: rgba(255, 255, 255, 0.14) !important;
        }

        /* ===== 左侧版块固定导航与卡片 (宽度自适应 + 零截断) ===== */
        .forum-enhancements-left-fixed {
            background: transparent !important;
            width: clamp(160px, calc((100vw - 1220px) / 2 - 14px), 176px) !important;
            box-sizing: border-box !important;
        }

        .forum-enhancements-left-navigation {
            background: var(--lsb-glass-bg) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            padding: 6px !important;
            margin-bottom: 12px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            transition: all 0.35s var(--lsb-ease-spring) !important;
        }

        .forum-enhancements-left-navigation ul {
            list-style: none !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .forum-enhancements-left-navigation li {
            border-bottom: 0 !important;
            margin-bottom: 3px !important;
        }

        .forum-enhancements-left-navigation a {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            border-radius: 12px !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            padding: 6px 10px !important;
            min-height: 32px !important;
            box-sizing: border-box !important;
            background: rgba(255, 255, 255, 0.35) !important;
            border: 1px solid rgba(255, 255, 255, 0.55) !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.8), 0 2px 6px rgba(0, 0, 0, 0.03) !important;
            font-weight: 600 !important;
            color: var(--text) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
        }
        .forum-enhancements-left-navigation a:hover {
            background: rgba(255, 255, 255, 0.68) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            transform: translateX(3px) scale(1.02) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }
        .forum-enhancements-left-navigation a.active {
            background: rgba(255, 255, 255, 0.85) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            color: var(--text) !important;
            font-weight: 700 !important;
            box-shadow: 0 4px 14px rgba(255, 255, 255, 0.5), inset 1px 1px 2px #ffffff !important;
        }
        html[data-dark-mode-theme="dark"] .forum-enhancements-left-navigation a,
        html[data-color-scheme-dark-mode-theme="dark"] .forum-enhancements-left-navigation a {
            background: rgba(255, 255, 255, 0.08) !important;
            border-color: rgba(255, 255, 255, 0.16) !important;
            color: #ffffff !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.2), 0 2px 6px rgba(0, 0, 0, 0.25) !important;
        }
        html[data-dark-mode-theme="dark"] .forum-enhancements-left-navigation a:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .forum-enhancements-left-navigation a:hover {
            background: rgba(255, 255, 255, 0.18) !important;
            border-color: rgba(255, 255, 255, 0.4) !important;
        }
        html[data-dark-mode-theme="dark"] .forum-enhancements-left-navigation a.active,
        html[data-color-scheme-dark-mode-theme="dark"] .forum-enhancements-left-navigation a.active {
            background: rgba(255, 255, 255, 0.25) !important;
            border-color: rgba(255, 255, 255, 0.55) !important;
            color: #ffffff !important;
        }

        .forum-enhancements-left-dot {
            width: 7px !important;
            height: 7px !important;
            flex: 0 0 7px !important;
            border-radius: 50% !important;
            box-shadow: 0 0 6px currentColor !important;
        }

        .forum-enhancements-left-name {
            flex: 1 1 auto !important;
            min-width: 0 !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }

        .forum-enhancements-left-count {
            flex: 0 0 auto !important;
            margin-left: auto !important;
            background: var(--lsb-badge-bg) !important;
            border-radius: 999px !important;
            padding: 0 6px !important;
            font-size: 10px !important;
            line-height: 17px !important;
            height: 17px !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            font-variant-numeric: tabular-nums !important;
            box-sizing: border-box !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.5) !important;
        }

        .forum-enhancements-left-announcements {
            background: var(--lsb-glass-bg) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            margin-top: 12px !important;
            box-sizing: border-box !important;
            transition: all 0.35s var(--lsb-ease-spring) !important;
        }

        /* ===== 页面主骨架与外壳穿透：彻底消除覆盖背景的纯白实体遮罩 ===== */
        .home-shell, .user-shell, .profile-shell, .message-shell, .direct-messages-shell,
        .settings-shell, .gacha-shell, .attachment-shell, .block-shell, .privacy-shell,
        .setting-shell, .topics-shell, .search-shell {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
        }

        .forum-layout {
            gap: 20px !important;
        }

        /* ===== 主容器与列表面板：拟态水滴卡片 ===== */
        /* 注意：backdrop-filter 不写在这个元素上，改由下方 ::before 承载。
           原因：backdrop-filter 会让元素成为后代 position:fixed 的包含块，
           而站点靠 JS 按视口坐标定位 fixed 浮层（如编辑器 .nb-editor-panel），
           一旦被夺走视口包含块就会整体错位、并被 overflow:hidden 裁掉。 */
        .main-panel {
            background: var(--lsb-glass-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            overflow: hidden !important;
            transition: all 0.35s var(--lsb-ease-spring) !important;
            position: relative !important;
            padding: 16px 18px 20px !important;
            box-sizing: border-box !important;
        }

        .main-panel::before {
            content: "" !important;
            position: absolute !important;
            inset: 0 !important;
            border-radius: inherit !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(170%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(170%) !important;
            z-index: -1 !important;
            pointer-events: none !important;
        }

        @media (max-width: 720px) {
            .main-panel {
                padding: 12px 10px 16px !important;
                border-radius: calc(var(--lsb-radius) - 6px) !important;
            }
            .forum-layout {
                gap: 12px !important;
            }
        }

        ${cfg.enableRefraction ? `
        /* 核心特色：SVG 液态曲面光线折射滤镜叠加层 (GPU 局部高光折射与图层隔离) */
        .main-panel::after {
            content: "" !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            height: 420px !important;
            max-height: 50vh !important;
            border-radius: inherit !important;
            pointer-events: none !important;
            filter: url(#lsb-glass-distortion) !important;
            opacity: 0.16 !important;
            z-index: 0 !important;
            mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%) !important;
            -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%) !important;
            contain: strict !important;
            transform: translateZ(0) !important;
            will-change: transform;
        }
        ` : ''}

        /* 分类分段控制胶囊 (Pill Bar) */
        .topic-toolbar {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 0 12px 0 !important;
        }

        .tab-bar {
            display: inline-flex !important;
            background: rgba(125, 125, 125, 0.08) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 999px !important;
            padding: 4px !important;
            gap: 4px !important;
            box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.05), inset -1px -1px 2px rgba(255, 255, 255, 0.5) !important;
        }

        .tab {
            border: 0 !important;
            background: transparent !important;
            border-radius: 999px !important;
            padding: 6px 16px !important;
            font-weight: 500 !important;
            color: var(--text-muted) !important;
            transition: all 0.3s var(--lsb-ease-spring) !important;
            position: relative !important;
            overflow: hidden !important;
        }
        .tab:hover {
            color: var(--text) !important;
            background: rgba(125, 125, 125, 0.12) !important;
            transform: translateY(-1.5px) scale(1.02);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.6) !important;
        }
        .tab.active {
            background: rgba(255, 255, 255, 0.85) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            box-shadow: 0 4px 16px rgba(255, 255, 255, 0.55), inset 1.5px 1.5px 2px #ffffff !important;
            font-weight: 700 !important;
            transform: translateY(-1px);
        }
        html[data-dark-mode-theme="dark"] .tab.active,
        html[data-color-scheme-dark-mode-theme="dark"] .tab.active {
            background: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
            border: 1.5px solid rgba(255, 255, 255, 0.5) !important;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.4) !important;
        }

        /* 悬停扫光高光 (Shimmer Sweep) */
        ${cfg.enableShimmer ? `
        .tab::before, .tab-post::before, .forum-link::before, .post-item::before, .donate-entry::before {
            content: "" !important;
            position: absolute !important;
            top: 0 !important;
            left: -120% !important;
            width: 100% !important;
            height: 100% !important;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent) !important;
            transition: left 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
            pointer-events: none !important;
            opacity: 0 !important;
            z-index: 1 !important;
        }
        .tab:hover::before, .tab-post:hover::before, .forum-link:hover::before, .post-item:hover::before, .donate-entry:hover::before {
            left: 120% !important;
            opacity: 1 !important;
        }
        ` : ''}

        /* 发帖按钮 (液态晶体按钮) */
        .tab-post {
            border-radius: 999px !important;
            box-shadow: 0 4px 16px rgba(46, 204, 113, 0.4), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.7) !important;
            transition: transform 0.3s var(--lsb-ease-spring), box-shadow 0.3s ease !important;
            position: relative !important;
            overflow: hidden !important;
        }
        .tab-post:hover {
            transform: translateY(-2px) scale(1.03);
            box-shadow: 0 6px 22px rgba(46, 204, 113, 0.55), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.9) !important;
        }

        /* ===== 帖子列表条目：悬浮果冻微卡片 ===== */
        .post-list {
            padding: 0 !important;
            margin: 0 !important;
            list-style: none !important;
        }

        .post-item, .post-entry, .topic-post-list > li, .quote-threads-child {
            margin: 0 0 10px 0 !important;
            padding: 13px 16px !important;
            border-radius: calc(var(--lsb-radius) - 4px) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            background: var(--lsb-post-item-bg) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02), inset 1.5px 1.5px 1.5px rgba(255, 255, 255, 0.6) !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
            position: relative !important;
            overflow: hidden !important;
        }
        .post-item:last-child, .post-entry:last-child {
            margin-bottom: 0 !important;
        }
        html[data-dark-mode-theme="dark"] .post-item,
        html[data-dark-mode-theme="dark"] .post-entry,
        html[data-dark-mode-theme="dark"] .topic-post-list > li,
        html[data-color-scheme-dark-mode-theme="dark"] .post-item,
        html[data-color-scheme-dark-mode-theme="dark"] .post-entry,
        html[data-color-scheme-dark-mode-theme="dark"] .topic-post-list > li {
            background: var(--lsb-post-item-bg) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25), inset 1px 1px 2px rgba(255, 255, 255, 0.08) !important;
        }

        .post-item:hover, .post-entry:hover {
            background: var(--lsb-post-hover-bg) !important;
            border-color: var(--lsb-glass-border) !important;
            transform: translateY(-2px) scale(1.006) !important;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08), var(--lsb-glass-shine) !important;
            filter: brightness(1.03) saturate(1.1);
        }

        /* 置顶帖子与置顶高光回复 */
        .post-item.topic-pinned, .post-entry.post-highlight, .reply-pin-pinned, .reply-pin-duplicate {
            background: var(--lsb-post-item-bg) !important;
            border-left: 4px solid var(--brand) !important;
            box-shadow: 0 4px 16px rgba(46, 204, 113, 0.12), inset 1.5px 1.5px 1.5px rgba(255, 255, 255, 0.7) !important;
        }
        .post-item.topic-pinned:hover, .post-entry.post-highlight:hover, .reply-pin-pinned:hover {
            background: var(--lsb-post-hover-bg) !important;
        }

        /* 徽章晶体化 (水晶胶囊标签) */
        .topic-badge, .post-tag, .red-packet-title-status, .virtual-card-title-status {
            border-radius: 999px !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05), inset 1px 1px 1.5px rgba(255, 255, 255, 0.6) !important;
            padding: 2px 9px !important;
            font-size: 11px !important;
        }

        /* 头像光晕与回弹 */
        .avatar-img, .user-avatar-big {
            border-radius: 50% !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12), inset 1px 1px 2px rgba(255, 255, 255, 0.7) !important;
            border: 2px solid var(--lsb-glass-border) !important;
            transition: transform 0.4s var(--lsb-ease-jelly) !important;
        }
        .avatar-profile-link:hover .avatar-img {
            transform: scale(1.14) rotate(4deg);
            box-shadow: 0 8px 24px rgba(46, 204, 113, 0.3) !important;
        }

        /* ===== 右侧边栏卡片及全站通用卡片：玻璃容器 ===== */
        .card, .sidebar-card, .box, .user-header, .user-bio, .modal-panel, .admin-list-panel {
            background: var(--lsb-glass-bg) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            overflow: hidden !important;
            transition: all 0.35s var(--lsb-ease-spring) !important;
        }
        .card:hover, .sidebar-card:hover, .box:hover {
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1), var(--lsb-glass-shine) !important;
        }

        /* 嵌套表格与列表透明穿透 */
        .list, table.list {
            background: transparent !important;
        }
        .list th {
            background: rgba(125, 125, 125, 0.08) !important;
            border-color: var(--lsb-glass-border-light) !important;
        }
        .list td {
            border-color: var(--lsb-glass-border-light) !important;
        }
        .list tr:hover td {
            background: var(--lsb-post-hover-bg) !important;
        }

        .user-card {
            background: var(--lsb-glass-bg-elevated) !important;
        }

        .side-auth a {
            border-radius: 999px !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.5) !important;
        }
        .side-auth a:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
        }

        /* 侧边栏“回帖” / “发帖”按钮 (液态晶体胶囊) */
        .btn-post {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            color: var(--text) !important;
            box-shadow: inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.9), inset -1px -1px 2px rgba(0, 0, 0, 0.05), 0 4px 16px rgba(0, 0, 0, 0.06) !important;
            transition: all 0.3s var(--lsb-ease-spring) !important;
            text-align: center !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            position: relative !important;
            overflow: hidden !important;
            backdrop-filter: blur(10px) !important;
            -webkit-backdrop-filter: blur(10px) !important;
        }
        .btn-post:hover {
            transform: translateY(-2px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), inset 1.5px 1.5px 3px rgba(255, 255, 255, 0.95) !important;
        }
        html[data-dark-mode-theme="dark"] .btn-post,
        html[data-color-scheme-dark-mode-theme="dark"] .btn-post {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.3), 0 4px 16px rgba(0, 0, 0, 0.3) !important;
        }
        html[data-dark-mode-theme="dark"] .btn-post:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .btn-post:hover {
            background: rgba(255, 255, 255, 0.22) !important;
            border-color: rgba(255, 255, 255, 0.5) !important;
        }

        /* 侧边栏“显示广告”按钮 */
        .sidebar-promotions-show {
            background: rgba(255, 255, 255, 0.38) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: 999px !important;
            color: var(--text) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 1px 1px 2px rgba(255, 255, 255, 0.6) !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .sidebar-promotions-show:hover {
            background: rgba(255, 255, 255, 0.7) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
            transform: translateY(-2px) scale(1.02) !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08), inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
        }

        /* 每日热帖与站务公告微条目 */
        .daily-hot-topics-card, .quick-card {
            background: var(--lsb-glass-bg) !important;
        }
        .daily-hot-topics-list a, .quick-links a {
            border-radius: 8px !important;
            padding: 4px 8px !important;
            transition: all 0.2s var(--lsb-ease-spring) !important;
        }
        .daily-hot-topics-list a:hover, .quick-links a:hover {
            background: var(--lsb-post-hover-bg) !important;
            transform: translateX(3px) !important;
        }
        .quick-links li {
            border-bottom: 1px solid var(--lsb-glass-border-light) !important;
        }

        /* 推广/广告卡片晶体微光 */
        .sidebar-promotions-slot-text {
            border-radius: 10px !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
        }
        .sidebar-promotions-slot-text:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.6) !important;
        }

        /* ===== 帖子详情页与回复区 ===== */
        .post-content, .nb-editor-post-content {
            line-height: 1.8 !important;
            font-size: 15px !important;
        }

        .post-content table, .markdown-table-wrap table {
            background: transparent !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 10px !important;
            overflow: hidden !important;
        }
        .post-content th, .markdown-table-wrap th {
            background: rgba(125, 125, 125, 0.08) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
        }
        .post-content td, .markdown-table-wrap td {
            border: 1px solid var(--lsb-glass-border-light) !important;
        }

        /* 淘帖专辑板块 */
        .topic-collections-panel {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04), inset 1.5px 1.5px 1.5px rgba(255, 255, 255, 0.6) !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .topic-collections-head {
            border-bottom: 1px solid var(--lsb-glass-border-light) !important;
        }
        .topic-collections-panel-actions .btn,
        .topic-collections-btn,
        .topic-collections-recommended a,
        .topic-collections-recommended button,
        .topic-collections-login a {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 999px !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.5) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease !important;
            color: var(--text) !important;
            padding: 4px 14px !important;
            text-decoration: none !important;
        }
        .topic-collections-panel-actions .btn:hover,
        .topic-collections-btn:hover,
        .topic-collections-recommended a:hover,
        .topic-collections-login a:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
            transform: translateY(-1.5px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }

        /* 快速回复胶囊输入框与操作条 */
        .quick-reply-main-action input, .quick-reply-home input {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: 999px !important;
            color: var(--text) !important;
            box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.05), inset -1px -1px 2px rgba(255, 255, 255, 0.4) !important;
            transition: transform 0.2s var(--lsb-ease-spring), border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
            padding: 0 16px !important;
            min-height: 38px !important;
        }
        .quick-reply-main-action input:focus, .quick-reply-home input:focus {
            border-color: var(--brand) !important;
            background: rgba(255, 255, 255, 0.85) !important;
            box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.25), inset 1px 1px 3px rgba(0, 0, 0, 0.03) !important;
        }
        html[data-dark-mode-theme="dark"] .quick-reply-main-action input:focus,
        html[data-color-scheme-dark-mode-theme="dark"] .quick-reply-main-action input:focus {
            background: rgba(255, 255, 255, 0.16) !important;
        }
        .quick-reply-main-action button, button[data-quick-reply-action] {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            color: var(--text) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.85) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            cursor: pointer !important;
            padding: 0 20px !important;
            min-height: 38px !important;
            font-weight: 700 !important;
        }
        .quick-reply-main-action button:hover, button[data-quick-reply-action]:hover {
            transform: translateY(-2px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }

        /* 楼层操作、”回到楼层”、以及展开折叠按钮 */
        .reply-pin-return-link, .post-ops .btn, .post-ops button, .long-content-fold-toggle, .long-content-fold-actions button {
            border-radius: 999px !important;
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            color: var(--text-muted) !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.5) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, box-shadow 0.2s ease, border-color 0.18s ease !important;
            font-size: 12px !important;
            text-decoration: none !important;
        }
        /* 内边距只给「回到楼层 / 展开折叠」，不碰 .post-ops：
           .post-ops 里是站点定尺的图标按钮（.icon-action 宽 24px + padding:0），
           图标由 ::before 的 14px + mask 绘制；一旦被强加内边距，内容盒会被压到 0 宽，
           作为 flex 子项的 ::before 随之塌成 0px，图标整条消失（删除 / 置顶 只剩空壳）。
           尺寸交给站点，脚本只负责上色。 */
        .reply-pin-return-link, .long-content-fold-toggle, .long-content-fold-actions button {
            padding: 4px 14px !important;
        }
        /* 站点图标（删除 / 回复 / 编辑等）是 ::before 的 14px + mask 画的，
           作为 .icon-action 的 flex 子项默认 flex-shrink:1——容器内容盒一变窄就被压到 0 宽、图标消失。
           这里禁止收缩，兜住同类回归。 */
        .icon-action::before, .icon-quote::before, .icon-edit::before, .icon-delete::before {
            flex: 0 0 auto !important;
        }
        .reply-pin-return-link:hover, .post-ops .btn:hover, .post-ops button:hover, .long-content-fold-toggle:hover, .long-content-fold-actions button:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
        }

        /* 点赞打赏按钮 */
        .donate-entry, .donate-topic-reaction-action, .donate-actions .btn {
            border-radius: 999px !important;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(217, 119, 6, 0.92)) !important;
            border: 1px solid rgba(255, 255, 255, 0.45) !important;
            color: #fff !important;
            box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35), inset 1px 1px 2px rgba(255, 255, 255, 0.7) !important;
            transition: all 0.3s var(--lsb-ease-spring) !important;
        }
        .donate-entry:hover, .donate-topic-reaction-action:hover, .donate-actions .btn:hover {
            transform: translateY(-2px) scale(1.03) !important;
            box-shadow: 0 6px 22px rgba(245, 158, 11, 0.5), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
        }

        /* 代码块晶莹水晶质感 */
        pre, code {
            border-radius: 12px !important;
            background: rgba(15, 23, 42, 0.06) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            box-shadow: inset 1px 1px 3px rgba(0, 0, 0, 0.05) !important;
        }
        html[data-dark-mode-theme="dark"] pre,
        html[data-dark-mode-theme="dark"] code,
        html[data-color-scheme-dark-mode-theme="dark"] pre,
        html[data-color-scheme-dark-mode-theme="dark"] code {
            background: rgba(0, 0, 0, 0.45) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
        }

        /* 引用块 */
        blockquote {
            border-left: 4px solid var(--brand) !important;
            background: rgba(125, 125, 125, 0.07) !important;
            border-radius: 0 12px 12px 0 !important;
            padding: 12px 18px !important;
        }

        /* 登录回复提示卡片 / 回复面板与编辑器 */
        /* 同上：backdrop-filter 不能直接写在这两个容器上，否则会夺走编辑器
           .nb-editor-panel（position:fixed + JS 视口坐标）的包含块。改由 ::before 承载。 */
        .replies-login-visible-card, .reply-panel, .quick-reply-slot .reply-panel, .reply-edit-panel {
            background: var(--lsb-glass-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            margin: 16px 0 !important;
            position: relative !important;
        }

        .replies-login-visible-card::before,
        .reply-panel::before,
        .quick-reply-slot .reply-panel::before,
        .reply-edit-panel::before {
            content: "" !important;
            position: absolute !important;
            inset: 0 !important;
            border-radius: inherit !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(160%) !important;
            z-index: -1 !important;
            pointer-events: none !important;
        }
        .reply-panel textarea, .nb-editor-field textarea, .notify-form textarea, .settings-form textarea {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            color: var(--text) !important;
            transition: transform 0.2s var(--lsb-ease-spring), border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
        }
        .reply-panel textarea:focus, .nb-editor-field textarea:focus {
            border-color: var(--brand) !important;
            background: rgba(255, 255, 255, 0.85) !important;
            box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.25) !important;
        }
        html[data-dark-mode-theme="dark"] .reply-panel textarea:focus,
        html[data-dark-mode-theme="dark"] .nb-editor-field textarea:focus {
            background: rgba(255, 255, 255, 0.16) !important;
        }
        .nb-editor-bar {
            background: rgba(125, 125, 125, 0.08) !important;
            border-bottom: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) calc(var(--lsb-radius) - 6px) 0 0 !important;
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            padding: 4px 6px !important;
            gap: 2px !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        /* 工具栏按钮：完全重置胶囊玻璃样式，恢复为紧凑小方块图标按钮 */
        .nb-editor-btn,
        .nb-editor .nb-editor-btn,
        .nb-editor-bar .nb-editor-btn,
        .form-panel .nb-editor-btn,
        .reply-panel .nb-editor-btn {
            background: transparent !important;
            border: 1px solid transparent !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 4px 6px !important;
            min-width: 28px !important;
            min-height: 28px !important;
            color: var(--text-muted) !important;
            cursor: pointer !important;
            position: static !important;
            overflow: visible !important;
            transition: all 0.15s ease !important;
            transform: none !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 13px !important;
            font-weight: 500 !important;
        }
        .nb-editor-btn:hover,
        .nb-editor .nb-editor-btn:hover,
        .nb-editor-bar .nb-editor-btn:hover,
        .form-panel .nb-editor-btn:hover,
        .reply-panel .nb-editor-btn:hover {
            background: rgba(255, 255, 255, 0.65) !important;
            border-color: var(--lsb-glass-border-light) !important;
            color: var(--text) !important;
            transform: none !important;
            box-shadow: none !important;
        }
        .nb-editor-panel {
            background: var(--lsb-glass-bg-elevated) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            backdrop-filter: blur(var(--lsb-blur-modal)) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur-modal)) !important;
            border-radius: 12px !important;
        }
        .reply-panel button[type="submit"], .reply-panel .btn {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            color: var(--text) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
            font-weight: 700 !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            cursor: pointer !important;
        }
        .reply-panel button[type="submit"]:hover, .reply-panel .btn:hover {
            transform: translateY(-2px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }

        /* 登录回复提示框 */
        .reply-login-box {
            background: var(--lsb-glass-bg-elevated) !important;
            border: 1.5px dashed var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
        }
        .reply-login-box a {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            color: var(--text) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.7) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            padding: 4px 20px !important;
            font-weight: 700 !important;
        }
        .reply-login-box a:hover {
            transform: translateY(-2px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
        }

        /* 分页器 */
        .pagination a, .pagination span, .topic-pages a {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.42) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            color: var(--text) !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.7), 0 2px 6px rgba(0, 0, 0, 0.03) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
        }
        .pagination a:hover, .topic-pages a:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
        }
        .pagination .active, .pagination .active a {
            background: rgba(255, 255, 255, 0.85) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            color: var(--text) !important;
            box-shadow: 0 3px 12px rgba(255, 255, 255, 0.6), inset 1px 1px 1.5px rgba(255, 255, 255, 0.9) !important;
            font-weight: 700 !important;
        }
        html[data-dark-mode-theme="dark"] .pagination a,
        html[data-color-scheme-dark-mode-theme="dark"] .pagination a {
            background: rgba(255, 255, 255, 0.10) !important;
            border-color: rgba(255, 255, 255, 0.20) !important;
            color: #ffffff !important;
        }
        html[data-dark-mode-theme="dark"] .pagination .active,
        html[data-dark-mode-theme="dark"] .pagination .active a,
        html[data-color-scheme-dark-mode-theme="dark"] .pagination .active,
        html[data-color-scheme-dark-mode-theme="dark"] .pagination .active a {
            background: rgba(255, 255, 255, 0.28) !important;
            border-color: rgba(255, 255, 255, 0.55) !important;
            color: #ffffff !important;
        }

        /* ===== 个人资料与账户设置 (Profile & Account) ===== */
        .profile-account-grid {
            display: grid !important;
            gap: 10px !important;
            margin: 0 0 16px !important;
        }
        .profile-account-card {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            padding: 12px 14px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .profile-account-card:hover {
            transform: translateY(-2px) scale(1.02) !important;
            background: var(--lsb-post-hover-bg) !important;
            border-color: var(--brand) !important;
            box-shadow: 0 8px 24px -4px rgba(46, 204, 113, 0.2), var(--lsb-glass-shine) !important;
        }
        .profile-account-card>span {
            color: var(--text-muted) !important;
            font-size: var(--font-size-sm) !important;
        }
        .profile-account-card>strong {
            color: var(--text) !important;
            font-weight: 700 !important;
        }
        .profile-account-logout .profile-exit-button {
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
        }
        .profile-account-logout .profile-exit-button:hover {
            background: rgba(239, 68, 68, 0.15) !important;
            color: var(--danger) !important;
        }
        .profile-disclosure {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: calc(var(--lsb-radius) - 4px) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            margin-bottom: 12px !important;
            padding: 14px 18px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .profile-disclosure:hover {
            border-color: var(--lsb-glass-border) !important;
            box-shadow: 0 10px 28px -4px rgba(31, 38, 135, 0.1), var(--lsb-glass-shine) !important;
        }
        .profile-disclosure-heading strong {
            color: var(--text) !important;
            font-weight: 600 !important;
        }
        .profile-edit-action {
            border-radius: 999px !important;
            padding: 4px 14px !important;
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            color: var(--text-subtle) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
        }
        .profile-edit-action:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            color: var(--text) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            transform: translateY(-1px) scale(1.04) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
        }
        .profile-avatar-summary {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            box-shadow: var(--lsb-glass-shine) !important;
        }
        .profile-disclosure-detail {
            border-top: 1px solid var(--lsb-glass-border-light) !important;
        }
        .avatar-picker, .avatar-picker-body, .profile-avatar-card {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }
        .avatar-picker button, .avatar-picker .btn {
            border-radius: 999px !important;
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
        }
        .avatar-picker button:hover, .avatar-picker .btn:hover {
            transform: translateY(-1px) scale(1.03) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            background: rgba(255, 255, 255, 0.7) !important;
            color: var(--text) !important;
        }
        .form-panel button, .form-panel input[type="submit"], .profile-disclosure button[type="submit"] {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
            padding: 8px 24px !important;
            font-weight: 700 !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            cursor: pointer !important;
        }
        .form-panel button:hover, .form-panel input[type="submit"]:hover, .profile-disclosure button[type="submit"]:hover {
            transform: translateY(-2px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.95) !important;
        }

        /* ===== 我的隐私设置 (User Privacy) ===== */
        .user-privacy-list, .user-privacy-admin-list {
            background: transparent !important;
        }
        .user-privacy-item {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            padding: 14px 18px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .user-privacy-item:hover {
            background: var(--lsb-post-hover-bg) !important;
            transform: translateY(-2px) scale(1.01) !important;
            box-shadow: 0 10px 28px -4px rgba(31, 38, 135, 0.12), var(--lsb-glass-shine) !important;
            border-color: var(--brand) !important;
        }
        .user-privacy-text strong {
            color: var(--text) !important;
        }
        .user-privacy-track {
            background: rgba(125, 125, 125, 0.22) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            transition: transform 0.22s var(--lsb-ease-spring), background-color 0.2s ease, border-color 0.2s ease !important;
        }
        .user-privacy-track:after {
            background: #ffffff !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.22), inset 1px 1px 1px rgba(255, 255, 255, 0.8) !important;
            transition: transform 0.25s var(--lsb-ease-spring) !important;
        }
        .user-privacy-item input:checked ~ .user-privacy-track {
            background: #10b981 !important;
            box-shadow: 0 0 14px rgba(16, 185, 129, 0.5) !important;
        }
        .user-privacy-notice {
            background: var(--lsb-post-item-bg) !important;
            border: 1.5px dashed var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-shine) !important;
        }
        .user-privacy-admin-item {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
        }

        /* ===== 用户屏蔽管理 (User Block) ===== */
        .user-block-search, .user-block-section {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            padding: 18px 20px !important;
            margin-bottom: 18px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .user-block-search input {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: 999px !important;
            padding: 8px 18px !important;
            color: var(--text) !important;
            transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease !important;
        }
        .user-block-search input:focus {
            background: rgba(255, 255, 255, 0.85) !important;
            border-color: var(--brand) !important;
            box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.25) !important;
        }
        html[data-dark-mode-theme="dark"] .user-block-search input:focus {
            background: rgba(255, 255, 255, 0.16) !important;
        }
        .user-block-search button, .user-block-action button {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.7) !important;
            padding: 6px 20px !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            font-weight: 700 !important;
        }
        .user-block-search button:hover, .user-block-action button:hover {
            transform: translateY(-2px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1), inset 1px 1px 2px rgba(255, 255, 255, 0.9) !important;
        }
        .user-block-row {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            padding: 12px 16px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .user-block-row:hover {
            transform: translateY(-1px) scale(1.01) !important;
            background: var(--lsb-post-hover-bg) !important;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08), var(--lsb-glass-shine) !important;
        }
        .user-block-remove, .btn-cancel-block {
            border-radius: 999px !important;
            padding: 4px 16px !important;
            background: rgba(239, 68, 68, 0.12) !important;
            color: #ef4444 !important;
            border: 1px solid rgba(239, 68, 68, 0.25) !important;
            box-shadow: none !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
        }
        .user-block-remove:hover, .btn-cancel-block:hover {
            background: #ef4444 !important;
            color: #fff !important;
            border-color: #ef4444 !important;
            transform: translateY(-1px) scale(1.03) !important;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35) !important;
        }
        .user-block-hidden-placeholder {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 8px) !important;
        }

        /* ===== 私信与即时通讯 (Direct Messages) ===== */
        .direct-messages-layout {
            background: var(--lsb-glass-bg) !important;
            backdrop-filter: blur(var(--lsb-blur)) saturate(170%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur)) saturate(170%) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            overflow: hidden !important;
        }
        .direct-messages-list {
            background: var(--lsb-post-item-bg) !important;
            border-right: 1px solid var(--lsb-glass-border-light) !important;
        }
        .direct-messages-user-search input {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 999px !important;
            padding: 6px 14px !important;
        }
        .direct-messages-user-search button {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.45) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.75) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 1px 1px 1.5px rgba(255, 255, 255, 0.7) !important;
        }
        .direct-messages-conversation {
            border-top: 1px solid var(--lsb-glass-border-light) !important;
            transition: all 0.2s var(--lsb-ease-spring) !important;
        }
        .direct-messages-conversation:hover {
            background: var(--lsb-post-hover-bg) !important;
            transform: translateX(2px) !important;
        }
        .direct-messages-conversation.is-active {
            background: rgba(255, 255, 255, 0.6) !important;
            border-left: 3px solid #10b981 !important;
        }
        .direct-messages-main {
            background: transparent !important;
        }
        .direct-messages-thread-head {
            background: var(--lsb-post-item-bg) !important;
            border-bottom: 1px solid var(--lsb-glass-border-light) !important;
        }
        .direct-messages-thread {
            background: transparent !important;
        }
        .direct-messages-message {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .direct-messages-message.is-mine {
            background: rgba(16, 185, 129, 0.12) !important;
            border-color: rgba(16, 185, 129, 0.35) !important;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.15), var(--lsb-glass-shine) !important;
        }
        .direct-messages-compose, .direct-messages-blocked-notice {
            background: var(--lsb-post-item-bg) !important;
            border-top: 1px solid var(--lsb-glass-border-light) !important;
        }
        .direct-messages-compose textarea {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: calc(var(--lsb-radius) - 8px) !important;
            color: var(--text) !important;
        }
        .direct-messages-compose textarea:focus {
            border-color: var(--brand) !important;
            box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.25) !important;
        }
        .direct-messages-compose button {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.7) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            font-weight: 700 !important;
        }
        .direct-messages-compose button:hover {
            transform: translateY(-2px) scale(1.04) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1) !important;
        }
        .direct-messages-welcome strong {
            color: var(--text) !important;
        }

        /* ===== 我的附件与存储空间 (Attachments & Storage) ===== */
        .attachment-upload-storage {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            padding: 18px 20px !important;
            margin-bottom: 16px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .attachment-upload-storage-stats>div {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            padding: 10px 14px !important;
            transition: all 0.2s var(--lsb-ease-spring) !important;
        }
        .attachment-upload-storage-stats>div:hover {
            transform: translateY(-2px) scale(1.02) !important;
            background: var(--lsb-post-hover-bg) !important;
            border-color: var(--brand) !important;
        }
        .attachment-upload-storage-meter {
            background: rgba(125, 125, 125, 0.18) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 999px !important;
            height: 10px !important;
        }
        .attachment-upload-storage-meter>span {
            background: linear-gradient(90deg, var(--brand), #10b981) !important;
            box-shadow: 0 0 10px rgba(46, 204, 113, 0.45) !important;
            border-radius: 999px !important;
        }
        .attachment-upload-storage-form button {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.48) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), inset 1px 1px 1.5px rgba(255, 255, 255, 0.7) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            padding: 6px 18px !important;
            font-weight: 700 !important;
        }
        .attachment-upload-storage-form button:hover {
            transform: translateY(-1px) scale(1.03) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1) !important;
        }
        .attachment-upload-filter a {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.35) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            color: var(--text) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
            padding: 4px 14px !important;
        }
        .attachment-upload-filter a:hover {
            background: rgba(255, 255, 255, 0.7) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
        }
        .attachment-upload-filter a.active {
            background: rgba(255, 255, 255, 0.85) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            color: var(--text) !important;
            font-weight: 700 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 3px 10px rgba(255, 255, 255, 0.5) !important;
        }
        .attachment-upload-batch-form {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            padding: 10px 14px !important;
        }
        .attachment-upload-batch-form button {
            border-radius: 999px !important;
            background: rgba(255, 255, 255, 0.45) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.75) !important;
            color: var(--text) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), inset 1px 1px 1.5px rgba(255, 255, 255, 0.7) !important;
            padding: 4px 14px !important;
            font-weight: 700 !important;
        }
        .attachment-upload-detail {
            border-bottom: 1px solid var(--lsb-glass-border-light) !important;
            transition: all 0.2s ease !important;
            padding: 12px 6px !important;
        }
        .attachment-upload-detail:hover {
            background: var(--lsb-post-hover-bg) !important;
            border-radius: 8px !important;
        }
        .attachment-upload-preview-box {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 8px !important;
            box-shadow: var(--lsb-glass-shine) !important;
        }
        .attachment-upload-detail-actions button {
            border-radius: 999px !important;
            transition: all 0.2s var(--lsb-ease-spring) !important;
        }
        .attachment-upload-detail-actions button:hover {
            transform: translateY(-1px) scale(1.04) !important;
        }

        /* ===== 称号中心、抽卡与称号市场 (Gacha & Titles Center) ===== */
        .gacha-center-page, .gacha-profile-page, .gacha-container,
        .gacha-pool-section, .gacha-all-titles, .gacha-forge-panel,
        .gacha-recipe-panel, .gacha-settings-field {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: var(--lsb-glass-tint), var(--lsb-glass-shine) !important;
            margin-bottom: 14px !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .gacha-header-title {
            color: var(--text) !important;
            font-weight: 700 !important;
        }
        .gacha-pool-rarity {
            background: var(--lsb-input-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .gacha-pool-rarity:hover {
            transform: translateY(-3px) scale(1.03) !important;
            box-shadow: 0 10px 24px -4px rgba(0, 0, 0, 0.12), var(--lsb-glass-shine) !important;
        }
        .gacha-pull-btn {
            border-radius: 999px !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15), var(--lsb-glass-shine) !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, filter 0.2s ease, box-shadow 0.2s ease !important;
        }
        .gacha-pull-btn:hover {
            transform: translateY(-2px) scale(1.05) !important;
            filter: brightness(1.08) !important;
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.25), var(--lsb-glass-shine) !important;
        }
        .gacha-pull-10 {
            box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35), var(--lsb-glass-shine) !important;
        }
        .gacha-pull-100 {
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35), var(--lsb-glass-shine) !important;
        }
        .gacha-profile-item, .gacha-pull-10-item, .gacha-pull-100-item, .gacha-result-card, .gacha-recipe-card {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
            transition: transform 0.22s var(--lsb-ease-spring), opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.22s ease, border-color 0.2s ease !important;
        }
        .gacha-profile-item:hover, .gacha-recipe-card:hover {
            transform: translateY(-2px) scale(1.02) !important;
            background: var(--lsb-post-hover-bg) !important;
            box-shadow: 0 8px 24px -4px rgba(31, 38, 135, 0.12), var(--lsb-glass-shine) !important;
        }
        .gacha-profile-item.is-equipped {
            border-color: rgba(16, 185, 129, 0.6) !important;
            background: rgba(16, 185, 129, 0.12) !important;
            box-shadow: 0 0 18px rgba(16, 185, 129, 0.25), var(--lsb-glass-shine) !important;
        }
        .gacha-equip-btn, .gacha-unequip-btn, .gacha-gift-btn, .gacha-result-button {
            border-radius: 999px !important;
            transition: transform 0.2s var(--lsb-ease-spring), opacity 0.18s ease, background-color 0.18s ease, border-color 0.18s ease !important;
        }
        .gacha-equip-btn {
            background: rgba(255, 255, 255, 0.48) !important;
            color: var(--text) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05), inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
            font-weight: 700 !important;
        }
        .gacha-equip-btn:hover {
            transform: translateY(-1px) scale(1.05) !important;
            background: rgba(255, 255, 255, 0.78) !important;
            border-color: #ffffff !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1) !important;
        }
        .gacha-unequip-btn {
            background: rgba(255, 255, 255, 0.35) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            color: var(--text) !important;
        }
        .gacha-unequip-btn:hover {
            border-color: var(--danger) !important;
            background: rgba(239, 68, 68, 0.16) !important;
            color: var(--danger) !important;
            transform: translateY(-1px) scale(1.05) !important;
        }
        .gacha-gift-btn {
            background: rgba(255, 255, 255, 0.35) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            color: var(--text) !important;
        }
        .gacha-gift-btn:hover {
            border-color: rgba(255, 255, 255, 0.95) !important;
            background: rgba(255, 255, 255, 0.7) !important;
            color: var(--text) !important;
            transform: translateY(-1px) scale(1.05) !important;
        }
        .gacha-title-badge {
            border-radius: 999px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), inset 0.5px 0.5px 1px rgba(255, 255, 255, 0.6) !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        }
        .gacha-title-link:hover .gacha-title-badge {
            transform: scale(1.05) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), inset 0.5px 0.5px 1px rgba(255, 255, 255, 0.8) !important;
        }
        .gacha-good-news {
            background: var(--lsb-post-item-bg) !important;
            border: 1px solid var(--lsb-glass-border-light) !important;
            border-radius: 999px !important;
            box-shadow: var(--lsb-glass-shine) !important;
        }
        .gacha-good-news-label {
            border-radius: 999px !important;
        }
        .gacha-banner {
            border-radius: calc(var(--lsb-radius) - 6px) !important;
            box-shadow: var(--lsb-glass-shine) !important;
        }
        .gacha-banner-cta {
            border-radius: 999px !important;
            box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3) !important;
        }

        /* ===== 弹窗与抽屉（Modal & Drawer） ===== */
        .modal-panel, .color-scheme-modal-dialog, .mobile-menu-drawer {
            background: var(--lsb-glass-bg-elevated) !important;
            backdrop-filter: blur(var(--lsb-blur-modal)) saturate(180%) !important;
            -webkit-backdrop-filter: blur(var(--lsb-blur-modal)) saturate(180%) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: var(--lsb-radius) !important;
            box-shadow: 0 28px 72px 0 rgba(0, 0, 0, 0.35), var(--lsb-glass-shine) !important;
        }

        /* 外观设置弹窗深度液态化 v2（精准修复双层白底问题）
         *
         * 真实 DOM 结构（linux.sb /color_scheme）：
         *   日间/黑夜/自动: <a class="color-scheme-choice color-scheme-dark-choice">
         *                     <span class="color-scheme-font-preview"><svg/></span>
         *                     <span class="color-scheme-choice-copy"><strong/><small/></span>
         *                   </a>
         *   字号/宽度/配色: <form class="color-scheme-choice">
         *                     <button type="submit">
         *                       <span class="color-scheme-font-preview|color-scheme-width-preview|color-scheme-preview">
         *                       <span class="color-scheme-choice-copy"><strong/></span>
         *                     </button>
         *                   </form>
         *
         * 白底根因：form.color-scheme-choice 被 [class*="choice"] 赋予玻璃背景，
         *           内部 button 又被站点原生 CSS background:var(--bg) + 我们的
         *           .color-scheme-modal-dialog button 规则叠加 rgba(255,255,255,0.45)，
         *           两层白底堆叠 → 视觉纯白块。
         *
         * 修复策略：
         *   1. form.color-scheme-choice → 透明纯容器（无背景无边框无阴影）
         *   2. form.color-scheme-choice > button → 玻璃胶囊效果（唯一视觉载体）
         *   3. .color-scheme-colors-list 中的 button → 透明（圆球本身是视觉）
         *   4. 所有内层文字/图标 span → 强制透明（消除站点原生白底）
         *   5. a.color-scheme-dark-choice → 直接承载玻璃胶囊（无子按钮）
         */
        .color-scheme-modal-dialog,
        .color-scheme-modal-dialog * {
            box-sizing: border-box !important;
        }

        /* ── 关闭按钮保留玻璃圆形 ── */
        .color-scheme-modal-dialog .color-scheme-modal-close {
            background: rgba(255, 255, 255, 0.5) !important;
            border: 1px solid rgba(255, 255, 255, 0.7) !important;
            border-radius: 50% !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
            color: var(--text) !important;
            transition: all 0.2s ease !important;
        }
        .color-scheme-modal-dialog .color-scheme-modal-close:hover {
            background: rgba(255, 255, 255, 0.85) !important;
            transform: scale(1.1) !important;
        }

        /* ── a.color-scheme-dark-choice（日间/黑夜/自动）── 直接承载玻璃胶囊 */
        .color-scheme-modal-dialog .color-scheme-dark-choice {
            background: rgba(255, 255, 255, 0.42) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: 999px !important;
            box-shadow: inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.85),
                        inset -1px -1px 1.5px rgba(0, 0, 0, 0.04),
                        0 2px 8px rgba(0, 0, 0, 0.04) !important;
            color: var(--text) !important;
            backdrop-filter: blur(8px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(8px) saturate(160%) !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
        }
        .color-scheme-modal-dialog .color-scheme-dark-choice:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            transform: translateY(-1.5px) scale(1.02) !important;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08),
                        inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }
        .color-scheme-modal-dialog .color-scheme-dark-choice.active {
            background: rgba(255, 255, 255, 0.88) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            box-shadow: 0 4px 16px rgba(255, 255, 255, 0.6),
                        inset 1.5px 1.5px 2px #ffffff !important;
            font-weight: 700 !important;
        }

        /* ── form.color-scheme-choice → 纯透明容器，消除外层背景 ── */
        .color-scheme-modal-dialog form.color-scheme-choice {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
        }

        /* ── form > button → 玻璃胶囊（字号 / 宽度 / 配色文字按钮）── */
        .color-scheme-modal-dialog form.color-scheme-choice > button {
            background: rgba(255, 255, 255, 0.42) !important;
            border: 1px solid var(--lsb-glass-border) !important;
            border-radius: 999px !important;
            box-shadow: inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.85),
                        inset -1px -1px 1.5px rgba(0, 0, 0, 0.04),
                        0 2px 8px rgba(0, 0, 0, 0.04) !important;
            color: var(--text) !important;
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 6px 12px !important;
            transition: all 0.25s var(--lsb-ease-spring) !important;
            cursor: pointer !important;
        }
        .color-scheme-modal-dialog form.color-scheme-choice > button:hover {
            background: rgba(255, 255, 255, 0.72) !important;
            border-color: rgba(255, 255, 255, 0.95) !important;
            color: var(--text) !important;
            transform: translateY(-1.5px) scale(1.02) !important;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08),
                        inset 1.5px 1.5px 2px rgba(255, 255, 255, 0.95) !important;
        }
        .color-scheme-modal-dialog form.color-scheme-choice.active > button {
            background: rgba(255, 255, 255, 0.88) !important;
            border: 1.5px solid rgba(255, 255, 255, 0.98) !important;
            color: var(--text) !important;
            box-shadow: 0 4px 16px rgba(255, 255, 255, 0.6),
                        inset 1.5px 1.5px 2px #ffffff !important;
            font-weight: 700 !important;
        }

        /* ── 配色圆球列表：form > button 完全透明（圆球本身是视觉）── */
        .color-scheme-modal-dialog .color-scheme-colors-list form.color-scheme-choice > button,
        .color-scheme-modal-dialog .color-scheme-colors-list form.color-scheme-choice > button:hover {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
            padding: 4px !important;
            width: auto !important;
        }

        /* ── 内层文字/图标 span → 强制透明，消除站点原生白底 ── */
        .color-scheme-modal-dialog .color-scheme-choice-copy,
        .color-scheme-modal-dialog .color-scheme-choice-copy strong,
        .color-scheme-modal-dialog .color-scheme-choice-copy small,
        .color-scheme-modal-dialog .color-scheme-choice-copy span,
        .color-scheme-modal-dialog .color-scheme-font-preview,
        .color-scheme-modal-dialog .color-scheme-width-preview {
            background: transparent !important;
            background-color: transparent !important;
            box-shadow: none !important;
            border: none !important;
        }

        /* ── 配色预览球（三色i标签）保护：保留色彩，不圆化 ── */
        .color-scheme-modal-dialog .color-scheme-preview {
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            gap: 2px !important;
            border-radius: 6px !important;
            overflow: hidden !important;
        }
        .color-scheme-modal-dialog .color-scheme-preview i {
            border-radius: 2px !important;
            flex: 1 !important;
        }

        /* ── 选中配色球的高光环（保留原生效果）── */
        .color-scheme-modal-dialog .color-scheme-colors-list .color-scheme-choice.active button {
            box-shadow: none !important;
        }
        .color-scheme-modal-dialog .color-scheme-colors-list .color-scheme-choice.active .color-scheme-preview {
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 0 0 3.5px var(--brand) !important;
            border-radius: 6px !important;
        }

        /* ── 暗黑模式适配 ── */
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-dark-choice,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-dark-choice {
            background: rgba(255, 255, 255, 0.10) !important;
            border-color: rgba(255, 255, 255, 0.20) !important;
            color: #ffffff !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.25),
                        0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-dark-choice:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-dark-choice:hover {
            background: rgba(255, 255, 255, 0.22) !important;
            border-color: rgba(255, 255, 255, 0.45) !important;
        }
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-dark-choice.active,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-dark-choice.active {
            background: rgba(255, 255, 255, 0.28) !important;
            border-color: rgba(255, 255, 255, 0.55) !important;
        }
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog form.color-scheme-choice > button,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog form.color-scheme-choice > button {
            background: rgba(255, 255, 255, 0.10) !important;
            border-color: rgba(255, 255, 255, 0.20) !important;
            color: #ffffff !important;
            box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.25),
                        0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog form.color-scheme-choice > button:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog form.color-scheme-choice > button:hover {
            background: rgba(255, 255, 255, 0.22) !important;
            border-color: rgba(255, 255, 255, 0.45) !important;
        }
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog form.color-scheme-choice.active > button,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog form.color-scheme-choice.active > button {
            background: rgba(255, 255, 255, 0.28) !important;
            border-color: rgba(255, 255, 255, 0.55) !important;
            color: #ffffff !important;
        }
        html[data-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-modal-close,
        html[data-color-scheme-dark-mode-theme="dark"] .color-scheme-modal-dialog .color-scheme-modal-close {
            background: rgba(255, 255, 255, 0.12) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
            color: rgba(255, 255, 255, 0.85) !important;
        }

        /* ===== 控制面板 UI Widget (水晶悬浮球) ===== */
        #lsb-settings-toggle-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            background: var(--lsb-glass-bg-elevated);
            backdrop-filter: blur(var(--lsb-blur-modal)) saturate(180%);
            -webkit-backdrop-filter: blur(var(--lsb-blur-modal)) saturate(180%);
            border: 1.5px solid var(--lsb-glass-border);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), var(--lsb-glass-shine);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 99999;
            transition: all 0.4s var(--lsb-ease-jelly);
            user-select: none;
            color: var(--text);
        }
        #lsb-settings-toggle-btn:hover {
            transform: scale(1.15) rotate(25deg);
            border-color: rgba(255, 255, 255, 0.95);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), var(--lsb-glass-shine);
        }
        #lsb-settings-toggle-btn svg {
            width: 22px;
            height: 22px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
        }

        #lsb-settings-modal {
            position: fixed;
            bottom: 82px;
            right: 24px;
            width: 330px;
            max-width: calc(100vw - 48px);
            max-height: calc(100vh - 110px);
            overflow-y: auto;
            background: var(--lsb-glass-bg-elevated);
            backdrop-filter: blur(var(--lsb-blur-modal)) saturate(180%);
            -webkit-backdrop-filter: blur(var(--lsb-blur-modal)) saturate(180%);
            border: 1.5px solid var(--lsb-glass-border);
            border-radius: 22px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3), var(--lsb-glass-shine);
            z-index: 99999;
            padding: 20px;
            display: none;
            color: var(--text);
            font-size: 13px;
            animation: lsb-fade-in 0.28s var(--lsb-ease-spring);
        }
        #lsb-settings-modal.active {
            display: block;
        }

        @keyframes lsb-fade-in {
            from { opacity: 0; transform: translateY(16px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .lsb-modal-title {
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--lsb-glass-border-light);
        }
        .lsb-modal-close {
            cursor: pointer;
            opacity: 0.6;
            font-size: 20px;
            line-height: 1;
            padding: 4px;
            transition: opacity 0.2s ease;
        }
        .lsb-modal-close:hover {
            opacity: 1;
        }

        .lsb-setting-row {
            margin-bottom: 14px;
        }
        .lsb-setting-label {
            font-weight: 600;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: var(--text);
        }
        .lsb-setting-hint {
            font-weight: 400;
            color: var(--text-muted);
            font-size: 11px;
        }

        .lsb-theme-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        .lsb-theme-btn {
            padding: 7px 10px;
            border-radius: 10px;
            border: 1px solid var(--lsb-glass-border);
            background: rgba(125, 125, 125, 0.08);
            color: var(--text);
            cursor: pointer;
            font-size: 12px;
            text-align: center;
            transition: all 0.25s var(--lsb-ease-spring);
        }
        .lsb-theme-btn:hover {
            background: rgba(255, 255, 255, 0.65);
            border-color: rgba(255, 255, 255, 0.95);
            transform: translateY(-1px);
        }
        .lsb-theme-btn.active {
            background: rgba(255, 255, 255, 0.85);
            color: var(--text);
            border: 1.5px solid rgba(255, 255, 255, 0.98);
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.6), inset 1px 1px 2px #ffffff;
        }
        html[data-dark-mode-theme="dark"] .lsb-theme-btn.active,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-theme-btn.active {
            background: rgba(255, 255, 255, 0.24);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.5);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 1px 1px 2px rgba(255, 255, 255, 0.3);
        }

        .lsb-slider {
            width: 100%;
            height: 6px;
            border-radius: 3px;
            background: rgba(125, 125, 125, 0.2);
            outline: none;
            -webkit-appearance: none;
            cursor: pointer;
        }
        .lsb-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25), inset 1px 1px 1.5px rgba(255,255,255,0.9);
            border: 1px solid rgba(0, 0, 0, 0.12);
            transition: transform 0.2s var(--lsb-ease-jelly);
        }
        .lsb-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
        }

        .lsb-input-text {
            width: 100%;
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid var(--lsb-glass-border);
            background: var(--lsb-input-bg);
            color: var(--text);
            font-size: 12px;
            box-sizing: border-box;
            outline: none;
            transition: all 0.2s ease;
        }
        .lsb-input-text:focus {
            border-color: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.25);
        }

        /* 本地壁纸上传与预览 */
        .lsb-dropzone {
            border: 1.5px dashed var(--lsb-glass-border);
            border-radius: 14px;
            padding: 12px 10px;
            text-align: center;
            cursor: pointer;
            background: rgba(125, 125, 125, 0.05);
            transition: all 0.25s var(--lsb-ease-spring);
            margin-bottom: 8px;
        }
        .lsb-dropzone:hover, .lsb-dropzone.dragover {
            border-color: rgba(255, 255, 255, 0.85);
            background: rgba(255, 255, 255, 0.15);
            transform: translateY(-1px);
        }
        .lsb-dropzone-icon {
            font-size: 20px;
            line-height: 1.2;
            margin-bottom: 2px;
        }
        .lsb-dropzone-text {
            font-size: 12px;
            font-weight: 600;
            color: var(--text);
        }
        .lsb-dropzone-sub {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 2px;
        }

        .lsb-preview-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 6px 10px;
            border-radius: 12px;
            background: rgba(125, 125, 125, 0.08);
            border: 1px solid var(--lsb-glass-border-light);
            margin-bottom: 8px;
        }
        .lsb-wallpaper-thumb {
            width: 46px;
            height: 30px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid var(--lsb-glass-border);
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .lsb-preview-info {
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .lsb-preview-status {
            font-size: 11px;
            color: #10b981;
            font-weight: 600;
        }
        .lsb-clear-btn {
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid rgba(239, 68, 68, 0.35);
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s ease;
        }
        .lsb-clear-btn:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: #ef4444;
        }

        .lsb-reset-btn {
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid var(--lsb-glass-border);
            background: rgba(125, 125, 125, 0.12);
            color: var(--text-muted);
            cursor: pointer;
            font-size: 11px;
            transition: all 0.2s ease;
        }
        .lsb-reset-btn:hover {
            background: rgba(255, 255, 255, 0.5);
            color: var(--text);
            border-color: rgba(255, 255, 255, 0.85);
        }
        html[data-dark-mode-theme="dark"] .lsb-reset-btn:hover,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-reset-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
        }

        .lsb-color-picker-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
            background: rgba(125, 125, 125, 0.06);
            padding: 10px;
            border-radius: 12px;
            border: 1px solid var(--lsb-glass-border-light);
        }
        .lsb-color-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-size: 12px;
        }
        .lsb-color-label {
            font-weight: 600;
            color: var(--text);
            white-space: nowrap;
            user-select: none;
        }
        .lsb-color-mode-tag {
            flex: 0 0 26px;
            font-size: 11px;
            color: var(--text-muted);
            user-select: none;
        }
        .lsb-color-control {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .lsb-color-control input[type="color"] {
            -webkit-appearance: none;
            border: 1px solid var(--lsb-glass-border);
            border-radius: 6px;
            width: 26px;
            height: 26px;
            padding: 0;
            cursor: pointer;
            background: transparent;
            box-sizing: border-box;
        }
        .lsb-color-control input[type="color"]::-webkit-color-swatch-wrapper {
            padding: 1px;
        }
        .lsb-color-control input[type="color"]::-webkit-color-swatch {
            border: none;
            border-radius: 4px;
        }
        .lsb-color-hex {
            width: 66px;
            padding: 3px 5px;
            border-radius: 6px;
            border: 1px solid var(--lsb-glass-border);
            background: var(--lsb-input-bg);
            color: var(--text);
            font-size: 11px;
            font-family: monospace;
            text-align: center;
            outline: none;
            box-sizing: border-box;
        }
        .lsb-color-hex:focus {
            border-color: rgba(255, 255, 255, 0.95);
        }
        .lsb-color-clear-single {
            border: none;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            font-size: 11px;
            padding: 2px 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
            line-height: 1;
        }
        .lsb-color-clear-single:hover {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.12);
        }

        .lsb-path-notice {
            padding: 8px 10px;
            margin-bottom: 8px;
            border-radius: 10px;
            background: rgba(245, 158, 11, 0.12);
            border: 1px solid rgba(245, 158, 11, 0.35);
            color: #d97706;
            font-size: 11px;
            line-height: 1.5;
        }
        html[data-dark-mode-theme="dark"] .lsb-path-notice,
        html[data-color-scheme-dark-mode-theme="dark"] .lsb-path-notice {
            background: rgba(245, 158, 11, 0.18);
            color: #fbbf24;
        }

        .lsb-switch-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .lsb-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 22px;
        }
        .lsb-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .lsb-switch-slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(125, 125, 125, 0.25);
            transition: .3s var(--lsb-ease-spring);
            border-radius: 22px;
        }
        .lsb-switch-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s var(--lsb-ease-spring);
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .lsb-switch input:checked + .lsb-switch-slider {
            background-color: #10b981;
        }
        .lsb-switch input:checked + .lsb-switch-slider:before {
            transform: translateX(18px);
        }

        /* 滚动条优化 */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(125, 125, 125, 0.25);
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(125, 125, 125, 0.45);
        }
        `;
    }

    // ==========================================
    // 3. SVG 液态光学折射滤镜挂载 (核心秘籍)
    // ==========================================
    const SVG_FILTER_ID = 'lsb-liquid-svg-filters';

    function initSVGFilters() {
        if (document.getElementById(SVG_FILTER_ID)) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = SVG_FILTER_ID;
        svg.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = `
            <defs>
                <filter id="lsb-glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
                    <feTurbulence type="fractalNoise" baseFrequency="0.0012 0.0035" numOctaves="1" seed="17" result="turbulence" />
                    <feComponentTransfer in="turbulence" result="mapped">
                        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
                        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
                        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
                    </feComponentTransfer>
                    <feGaussianBlur in="turbulence" stdDeviation="2.5" result="softMap" />
                    <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lighting-color="white" result="specLight">
                        <fePointLight x="-200" y="-200" z="300" />
                    </feSpecularLighting>
                    <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
                    <feDisplacementMap in="SourceGraphic" in2="softMap" scale="55" xChannelSelector="R" yChannelSelector="G" />
                </filter>
            </defs>
        `;
        (document.body || document.documentElement).appendChild(svg);
    }

    // ==========================================
    // 4. 样式挂载与行内变量同步 (Inline Specificity Override)
    // ==========================================
    function applyInlineVariables(root, cfg) {
        if (!root || !root.style) return;
        const opacityRatio = (cfg.glassOpacity / 100).toFixed(2);
        const elevatedRatio = Math.min(1.0, (cfg.glassOpacity / 100) * 1.15).toFixed(2);
        const postItemRatio = (cfg.glassOpacity / 100 * 0.35).toFixed(2);
        const darkPostItemRatio = (cfg.glassOpacity / 100 * 0.08).toFixed(2);
        const isDark = root.getAttribute('data-dark-mode-theme') === 'dark' ||
                       root.getAttribute('data-color-scheme-dark-mode-theme') === 'dark';

        root.style.setProperty('--lsb-blur', `${cfg.blurLevel}px`);
        root.style.setProperty('--lsb-radius', `${cfg.borderRadius}px`);
        // 自定义字体色分浅色 / 深色两套，各取自己那套；未设时回退该模式的默认色
        root.style.setProperty('--text',
            (isDark ? cfg.textColorPrimaryDark : cfg.textColorPrimary) || (isDark ? '#ffffff' : '#070d1e'));
        root.style.setProperty('--text-muted',
            (isDark ? cfg.textColorMutedDark : cfg.textColorMuted) || (isDark ? '#f1f5f9' : '#1e293b'));

        if (isDark) {
            root.style.setProperty('--lsb-glass-bg', `rgba(16, 22, 34, ${opacityRatio})`);
            root.style.setProperty('--lsb-glass-bg-elevated', `rgba(24, 32, 48, ${elevatedRatio})`);
            root.style.setProperty('--lsb-post-item-bg', `rgba(255, 255, 255, ${darkPostItemRatio})`);
            root.style.setProperty('--panel', `rgba(16, 22, 34, ${opacityRatio})`);
            root.style.setProperty('--panel-muted', `rgba(24, 32, 48, ${elevatedRatio})`);
            root.style.setProperty('--bg', `rgba(255, 255, 255, ${darkPostItemRatio})`);
        } else {
            root.style.setProperty('--lsb-glass-bg', `rgba(255, 255, 255, ${opacityRatio})`);
            root.style.setProperty('--lsb-glass-bg-elevated', `rgba(255, 255, 255, ${elevatedRatio})`);
            root.style.setProperty('--lsb-post-item-bg', `rgba(255, 255, 255, ${postItemRatio})`);
            root.style.setProperty('--panel', `rgba(255, 255, 255, ${opacityRatio})`);
            root.style.setProperty('--panel-muted', `rgba(255, 255, 255, ${elevatedRatio})`);
            root.style.setProperty('--bg', `rgba(255, 255, 255, ${postItemRatio})`);
        }
    }

    function applyStyles() {
        const root = document.documentElement;
        applyInlineVariables(root, config);

        let el = document.getElementById(STYLE_ELEMENT_ID);
        if (!el) {
            el = document.createElement('style');
            el.id = STYLE_ELEMENT_ID;
            const targetParent = document.head || document.documentElement;
            if (targetParent) {
                targetParent.appendChild(el);
            }
        }
        el.textContent = generateCSS(config);
        updateBackdropElement();
    }

    // ==========================================
    // 5. 动态背景 DOM 构建 (仅浮光斑与点阵层)
    // ==========================================
    const BACKDROP_ID = 'lsb-liquid-backdrop-container';

    function initBackdrop() {
        let container = document.getElementById(BACKDROP_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = BACKDROP_ID;
            const parent = document.body || document.documentElement;
            if (parent) parent.prepend(container);
        }
        updateBackdropElement();
    }

    function updateBackdropElement() {
        const container = document.getElementById(BACKDROP_ID);
        if (!container) return;

        // 浮动环境柔光斑 (柔光球)
        if (config.enableFloatingGlow && config.themeBg !== 'minimal' && config.themeBg !== 'custom') {
            if (!container.querySelector('.lsb-liquid-orb-1')) {
                container.innerHTML = `
                    <div class="lsb-liquid-orb lsb-liquid-orb-1"></div>
                    <div class="lsb-liquid-orb lsb-liquid-orb-2"></div>
                    <div class="lsb-liquid-orb lsb-liquid-orb-3"></div>
                `;
            }
        } else {
            container.innerHTML = '';
        }
    }

    // ==========================================
    // 6. 本地壁纸智能读取与 4K 高保真压缩 (防止 localStorage 超限)
    // ==========================================
    function processImageFile(file, onComplete) {
        if (!file || !file.type.startsWith('image/')) {
            alert('请选择有效的图片文件（支持 PNG、JPG、WebP 等格式）');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const rawDataUrl = e.target.result;
            const img = new Image();
            img.onload = function () {
                const MAX_W = 2560; // 适配 2K / 4K Retina 视网膜清晰度
                const MAX_H = 1600;
                let w = img.width;
                let h = img.height;
                let needScale = false;

                if (w > MAX_W || h > MAX_H) {
                    needScale = true;
                    if (w / MAX_W > h / MAX_H) {
                        h = Math.round((h * MAX_W) / w);
                        w = MAX_W;
                    } else {
                        w = Math.round((w * MAX_H) / h);
                        h = MAX_H;
                    }
                }

                // 如果分辨率未超标且原文件体积小于 800KB，直接使用原始 Base64
                if (!needScale && file.size < 800 * 1024) {
                    onComplete(rawDataUrl);
                    return;
                }

                // 使用 Canvas 高保真压缩优化
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);

                    let result = canvas.toDataURL('image/webp', 0.90);
                    if (!result || !result.startsWith('data:image/webp')) {
                        result = canvas.toDataURL('image/jpeg', 0.90);
                    }
                    onComplete(result);
                } catch (err) {
                    console.warn('[Liquid Glass] Canvas 压缩异常，使用原始 DataURL', err);
                    onComplete(rawDataUrl);
                }
            };
            img.onerror = function () {
                onComplete(rawDataUrl);
            };
            img.src = rawDataUrl;
        };
        reader.onerror = function (err) {
            console.error('[Liquid Glass] 读取本地壁纸文件失败', err);
            alert('读取本地图片文件失败，请重试');
        };
        reader.readAsDataURL(file);
    }

    // ==========================================
    // 6. 设置界面 Widget (悬浮齿轮 + 配置弹窗)
    // ==========================================
    function initSettingsWidget() {
        if (document.getElementById('lsb-settings-toggle-btn')) return;

        // 悬浮按钮
        const btn = document.createElement('div');
        btn.id = 'lsb-settings-toggle-btn';
        btn.title = 'LINUX SB 液态玻璃设置';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        `;

        // 设置面板
        const modal = document.createElement('div');
        modal.id = 'lsb-settings-modal';
        modal.innerHTML = `
            <div class="lsb-modal-title">
                <span>✨ 液态玻璃化风格设置</span>
                <span class="lsb-modal-close">&times;</span>
            </div>

            <!-- 背景风格选择 -->
            <div class="lsb-setting-row">
                <div class="lsb-setting-label">背景风格</div>
                <div class="lsb-theme-grid">
                    <button type="button" class="lsb-theme-btn ${config.themeBg === 'aurora' ? 'active' : ''}" data-theme="aurora">🌌 流体极光</button>
                    <button type="button" class="lsb-theme-btn ${config.themeBg === 'cyber' ? 'active' : ''}" data-theme="cyber">🔮 赛博霓光</button>
                    <button type="button" class="lsb-theme-btn ${config.themeBg === 'dawn' ? 'active' : ''}" data-theme="dawn">🌅 晨曦柔光</button>
                    <button type="button" class="lsb-theme-btn ${config.themeBg === 'minimal' ? 'active' : ''}" data-theme="minimal">🤍 极简素雅</button>
                    <button type="button" class="lsb-theme-btn ${config.themeBg === 'custom' ? 'active' : ''}" data-theme="custom" style="grid-column: span 2;">🖼️ 自定义壁纸</button>
                </div>
            </div>

            <!-- 自定义壁纸设置 -->
            <div class="lsb-setting-row" id="lsb-custom-url-row" style="${config.themeBg === 'custom' ? 'display:block;' : 'display:none;'}">
                <div class="lsb-setting-label">
                    <span>🖼️ 自定义壁纸设置</span>
                    <span class="lsb-setting-hint">支持本地文件 & URL</span>
                </div>

                <!-- 本地文件拖拽上传区域 -->
                <div id="lsb-upload-dropzone" class="lsb-dropzone">
                    <input type="file" id="lsb-file-input" accept="image/*" style="display:none;" />
                    <div class="lsb-dropzone-icon">📁</div>
                    <div class="lsb-dropzone-text">点击选择本地壁纸图片</div>
                    <div class="lsb-dropzone-sub">或拖拽图片文件至此 (自动适配 4K/2K)</div>
                </div>

                <!-- 本地壁纸预览/状态条 -->
                <div id="lsb-wallpaper-preview-wrap" class="lsb-preview-wrap" style="${config.customBgUrl ? 'display:flex;' : 'display:none;'}">
                    <img id="lsb-wallpaper-thumb" class="lsb-wallpaper-thumb" src="${config.customBgUrl || ''}" alt="预览" />
                    <div class="lsb-preview-info">
                        <span class="lsb-preview-status">✅ 已加载壁纸</span>
                        <button type="button" id="lsb-clear-bg-btn" class="lsb-clear-btn" title="清空壁纸">🗑️ 清空</button>
                    </div>
                </div>

                <!-- 本地路径智能拦截与指引框 -->
                <div id="lsb-path-notice" class="lsb-path-notice" style="display:none;"></div>

                <!-- 网络图片 URL 备用输入 -->
                <div style="margin-top: 8px;">
                    <div class="lsb-setting-hint" style="margin-bottom: 4px;">或输入网络图片 URL：</div>
                    <input type="text" class="lsb-input-text" id="lsb-custom-url-input" placeholder="https://example.com/wallpaper.jpg" value="${(config.customBgUrl && config.customBgUrl.startsWith('data:')) ? '[已加载本地图片]' : (config.customBgUrl || '')}" />
                </div>
            </div>

            <!-- 毛玻璃模糊度 -->
            <div class="lsb-setting-row">
                <div class="lsb-setting-label">
                    <span>毛玻璃模糊度 (Blur)</span>
                    <span class="lsb-setting-hint" id="lsb-blur-val">${config.blurLevel}px</span>
                </div>
                <input type="range" class="lsb-slider" id="lsb-blur-slider" min="0" max="40" step="1" value="${config.blurLevel}" />
            </div>

            <!-- 玻璃通透度 -->
            <div class="lsb-setting-row">
                <div class="lsb-setting-label">
                    <span>面板不透明度 (Opacity)</span>
                    <span class="lsb-setting-hint" id="lsb-opacity-val">${config.glassOpacity}%</span>
                </div>
                <input type="range" class="lsb-slider" id="lsb-opacity-slider" min="0" max="100" step="1" value="${config.glassOpacity}" />
            </div>

            <!-- 圆角弧度 -->
            <div class="lsb-setting-row">
                <div class="lsb-setting-label">
                    <span>水滴胶囊圆角 (Radius)</span>
                    <span class="lsb-setting-hint" id="lsb-radius-val">${config.borderRadius}px</span>
                </div>
                <input type="range" class="lsb-slider" id="lsb-radius-slider" min="10" max="32" step="2" value="${config.borderRadius}" />
            </div>

            <!-- 字体颜色个性化自定义 -->
            <div class="lsb-setting-row" id="lsb-font-colors-group">
                <div class="lsb-setting-label">
                    <span>🎨 字体颜色自定义</span>
                    <button type="button" id="lsb-reset-font-colors-btn" class="lsb-reset-btn" title="恢复所有区域字体默认颜色">重置默认</button>
                </div>
                <div class="lsb-setting-hint" style="margin-bottom:8px;">每个区域分「浅色 / 深色」两套，切换昼夜模式时自动取对应那套：</div>
                <div class="lsb-color-picker-grid">
                    <!-- 1. 正文主文字 -->
                    <div class="lsb-color-item">
                        <div class="lsb-color-label">📝 正文主文字</div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">浅色</span>
                            <input type="color" id="lsb-color-primary" value="${config.textColorPrimary || '#070d1e'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-primary-hex" value="${config.textColorPrimary || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorPrimary" title="清除浅色自定义">✕</button>
                        </div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">深色</span>
                            <input type="color" id="lsb-color-primary-dark" value="${config.textColorPrimaryDark || '#ffffff'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-primary-dark-hex" value="${config.textColorPrimaryDark || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorPrimaryDark" title="清除深色自定义">✕</button>
                        </div>
                    </div>
                    <!-- 2. 帖子标题 -->
                    <div class="lsb-color-item">
                        <div class="lsb-color-label">📌 帖子与标题</div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">浅色</span>
                            <input type="color" id="lsb-color-title" value="${config.textColorTitle || '#000000'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-title-hex" value="${config.textColorTitle || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorTitle" title="清除浅色自定义">✕</button>
                        </div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">深色</span>
                            <input type="color" id="lsb-color-title-dark" value="${config.textColorTitleDark || '#ffffff'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-title-dark-hex" value="${config.textColorTitleDark || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorTitleDark" title="清除深色自定义">✕</button>
                        </div>
                    </div>
                    <!-- 3. 链接与导航 -->
                    <div class="lsb-color-item">
                        <div class="lsb-color-label">🔗 链接与导航</div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">浅色</span>
                            <input type="color" id="lsb-color-link" value="${config.textColorLink || '#10b981'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-link-hex" value="${config.textColorLink || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorLink" title="清除浅色自定义">✕</button>
                        </div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">深色</span>
                            <input type="color" id="lsb-color-link-dark" value="${config.textColorLinkDark || '#ffffff'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-link-dark-hex" value="${config.textColorLinkDark || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorLinkDark" title="清除深色自定义">✕</button>
                        </div>
                    </div>
                    <!-- 4. 次级元信息 -->
                    <div class="lsb-color-item">
                        <div class="lsb-color-label">⏱️ 次级元信息</div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">浅色</span>
                            <input type="color" id="lsb-color-muted" value="${config.textColorMuted || '#64748b'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-muted-hex" value="${config.textColorMuted || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorMuted" title="清除浅色自定义">✕</button>
                        </div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">深色</span>
                            <input type="color" id="lsb-color-muted-dark" value="${config.textColorMutedDark || '#ff0000'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-muted-dark-hex" value="${config.textColorMutedDark || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorMutedDark" title="清除深色自定义">✕</button>
                        </div>
                    </div>
                    <!-- 5. 按钮文字 -->
                    <div class="lsb-color-item">
                        <div class="lsb-color-label">🔘 按钮与胶囊</div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">浅色</span>
                            <input type="color" id="lsb-color-btn" value="${config.textColorBtn || '#070d1e'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-btn-hex" value="${config.textColorBtn || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorBtn" title="清除浅色自定义">✕</button>
                        </div>
                        <div class="lsb-color-control">
                            <span class="lsb-color-mode-tag">深色</span>
                            <input type="color" id="lsb-color-btn-dark" value="${config.textColorBtnDark || '#0548ff'}" />
                            <input type="text" class="lsb-color-hex" id="lsb-color-btn-dark-hex" value="${config.textColorBtnDark || ''}" placeholder="默认" />
                            <button type="button" class="lsb-color-clear-single" data-target="textColorBtnDark" title="清除深色自定义">✕</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SVG 曲面光学折射 -->
            <div class="lsb-setting-row lsb-switch-row">
                <div class="lsb-setting-label" style="margin-bottom:0;">
                    <div>🌊 SVG 液态曲面折射</div>
                    <div class="lsb-setting-hint">核心折射光影</div>
                </div>
                <label class="lsb-switch">
                    <input type="checkbox" id="lsb-refract-switch" ${config.enableRefraction ? 'checked' : ''}>
                    <span class="lsb-switch-slider"></span>
                </label>
            </div>

            <!-- 悬浮扫光高光 -->
            <div class="lsb-setting-row lsb-switch-row">
                <div class="lsb-setting-label" style="margin-bottom:0;">
                    <div>✨ 悬浮动态扫光高光</div>
                    <div class="lsb-setting-hint">悬停时呈现掠影流光</div>
                </div>
                <label class="lsb-switch">
                    <input type="checkbox" id="lsb-shimmer-switch" ${config.enableShimmer ? 'checked' : ''}>
                    <span class="lsb-switch-slider"></span>
                </label>
            </div>

            <!-- 胶囊悬浮顶栏 -->
            <div class="lsb-setting-row lsb-switch-row">
                <div class="lsb-setting-label" style="margin-bottom:0;">
                    <div>🛸 胶囊悬浮码头顶栏</div>
                    <div class="lsb-setting-hint">现代浮岛 Dock 造型</div>
                </div>
                <label class="lsb-switch">
                    <input type="checkbox" id="lsb-dock-switch" ${config.enableDockHeader ? 'checked' : ''}>
                    <span class="lsb-switch-slider"></span>
                </label>
            </div>

            <!-- 流体动画开关 -->
            <div class="lsb-setting-row lsb-switch-row">
                <div class="lsb-setting-label" style="margin-bottom:0;">
                    <div>流体极光动画</div>
                    <div class="lsb-setting-hint">关闭可节省低配设备能耗</div>
                </div>
                <label class="lsb-switch">
                    <input type="checkbox" id="lsb-anim-switch" ${config.enableAnimation ? 'checked' : ''}>
                    <span class="lsb-switch-slider"></span>
                </label>
            </div>
        `;

        document.body.appendChild(btn);
        document.body.appendChild(modal);

        // 事件交互绑定
        btn.addEventListener('click', () => {
            modal.classList.toggle('active');
        });

        modal.querySelector('.lsb-modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!modal.contains(e.target) && !btn.contains(e.target)) {
                modal.classList.remove('active');
            }
        });

        // 切换背景主题
        modal.querySelectorAll('.lsb-theme-btn').forEach(tBtn => {
            tBtn.addEventListener('click', () => {
                modal.querySelectorAll('.lsb-theme-btn').forEach(b => b.classList.remove('active'));
                tBtn.classList.add('active');
                config.themeBg = tBtn.dataset.theme;

                const customRow = document.getElementById('lsb-custom-url-row');
                if (config.themeBg === 'custom') {
                    customRow.style.display = 'block';
                } else {
                    customRow.style.display = 'none';
                }

                saveConfig(config);
                applyStyles();
            });
        });

        // 辅助更新壁纸 UI 状态
        function updateWallpaperUI(url) {
            const previewWrap = document.getElementById('lsb-wallpaper-preview-wrap');
            const thumbImg = document.getElementById('lsb-wallpaper-thumb');
            const customInput = document.getElementById('lsb-custom-url-input');

            if (url) {
                if (previewWrap) previewWrap.style.display = 'flex';
                if (thumbImg) thumbImg.src = url;
                if (customInput) {
                    customInput.value = url.startsWith('data:') ? '[已加载本地图片]' : url;
                }
            } else {
                if (previewWrap) previewWrap.style.display = 'none';
                if (thumbImg) thumbImg.src = '';
                if (customInput) customInput.value = '';
            }
        }

        // 本地文件上传与拖拽交互
        const dropzone = document.getElementById('lsb-upload-dropzone');
        const fileInput = document.getElementById('lsb-file-input');

        function handleFile(file) {
            if (!file) return;
            const dropText = dropzone ? dropzone.querySelector('.lsb-dropzone-text') : null;
            const originalText = dropText ? dropText.textContent : '点击选择本地壁纸图片';
            if (dropText) dropText.textContent = '⏳ 正在读取并适配 4K 壁纸...';

            processImageFile(file, (dataUrl) => {
                if (dropText) dropText.textContent = originalText;
                config.customBgUrl = dataUrl;
                config.themeBg = 'custom';
                saveConfig(config);
                applyStyles();
                updateWallpaperUI(dataUrl);

                // 激活自定义壁纸按钮高亮
                modal.querySelectorAll('.lsb-theme-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.theme === 'custom');
                });
                const customRow = document.getElementById('lsb-custom-url-row');
                if (customRow) customRow.style.display = 'block';

                const noticeEl = document.getElementById('lsb-path-notice');
                if (noticeEl) noticeEl.style.display = 'none';
            });
        }

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => {
                fileInput.click();
            });

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    handleFile(fileInput.files[0]);
                }
            });
        }

        // 清除壁纸按钮
        const clearBtn = document.getElementById('lsb-clear-bg-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                config.customBgUrl = '';
                saveConfig(config);
                applyStyles();
                updateWallpaperUI('');
                if (fileInput) fileInput.value = '';
            });
        }

        // 自定义 URL 输入与本地路径智能拦截
        const customInput = document.getElementById('lsb-custom-url-input');
        if (customInput) {
            customInput.addEventListener('input', () => {
                const val = customInput.value.trim();
                const noticeEl = document.getElementById('lsb-path-notice');

                // 检测是否输入了本地文件路径 (如 /Users/..., C:\..., file://...)
                const isLocalPath = /^[a-zA-Z]:\\|^\/Users\/|^\/home\/|^\/root\/|^file:\/\//i.test(val) || (val.startsWith('/') && !val.startsWith('//'));

                if (isLocalPath) {
                    if (noticeEl) {
                        noticeEl.innerHTML = `⚠️ <b>浏览器安全策略限制</b><br/>网页在安全沙箱中，无法直接通过路径读取本地磁盘文件（如 <code>/Users/...</code>）。<br/>👉 <b>已为您自动唤起文件选择窗口</b>，请直接在此选取该壁纸文件！`;
                        noticeEl.style.display = 'block';
                    }
                    if (fileInput) fileInput.click();
                    return;
                } else {
                    if (noticeEl) noticeEl.style.display = 'none';
                }

                if (val.startsWith('data:') || val.startsWith('http://') || val.startsWith('https://')) {
                    config.customBgUrl = val;
                    saveConfig(config);
                    applyStyles();
                    updateWallpaperUI(val);
                } else if (val === '') {
                    config.customBgUrl = '';
                    saveConfig(config);
                    applyStyles();
                    updateWallpaperUI('');
                }
            });
        }

        // 模糊度滑动条
        const blurSlider = document.getElementById('lsb-blur-slider');
        const blurVal = document.getElementById('lsb-blur-val');
        blurSlider.addEventListener('input', () => {
            config.blurLevel = parseInt(blurSlider.value, 10);
            blurVal.textContent = `${config.blurLevel}px`;
            const root = document.documentElement;
            if (root && root.style) {
                root.style.setProperty('--lsb-blur', `${config.blurLevel}px`);
            }
            saveConfig(config);
            applyStyles();
        });

        // 不透明度滑动条
        const opacitySlider = document.getElementById('lsb-opacity-slider');
        const opacityVal = document.getElementById('lsb-opacity-val');
        opacitySlider.addEventListener('input', () => {
            config.glassOpacity = parseInt(opacitySlider.value, 10);
            opacityVal.textContent = `${config.glassOpacity}%`;
            const opacityRatio = (config.glassOpacity / 100).toFixed(2);
            const elevatedRatio = Math.min(1.0, (config.glassOpacity / 100) * 1.15).toFixed(2);
            const postItemRatio = (config.glassOpacity / 100 * 0.35).toFixed(2);
            const darkPostItemRatio = (config.glassOpacity / 100 * 0.08).toFixed(2);
            const root = document.documentElement;
            if (root && root.style) {
                const isDark = root.getAttribute('data-dark-mode-theme') === 'dark' ||
                               root.getAttribute('data-color-scheme-dark-mode-theme') === 'dark';
                if (isDark) {
                    root.style.setProperty('--lsb-glass-bg', `rgba(16, 22, 34, ${opacityRatio})`);
                    root.style.setProperty('--lsb-glass-bg-elevated', `rgba(24, 32, 48, ${elevatedRatio})`);
                    root.style.setProperty('--lsb-post-item-bg', `rgba(255, 255, 255, ${darkPostItemRatio})`);
                    root.style.setProperty('--panel', `rgba(16, 22, 34, ${opacityRatio})`);
                    root.style.setProperty('--panel-muted', `rgba(24, 32, 48, ${elevatedRatio})`);
                    root.style.setProperty('--bg', `rgba(255, 255, 255, ${darkPostItemRatio})`);
                } else {
                    root.style.setProperty('--lsb-glass-bg', `rgba(255, 255, 255, ${opacityRatio})`);
                    root.style.setProperty('--lsb-glass-bg-elevated', `rgba(255, 255, 255, ${elevatedRatio})`);
                    root.style.setProperty('--lsb-post-item-bg', `rgba(255, 255, 255, ${postItemRatio})`);
                    root.style.setProperty('--panel', `rgba(255, 255, 255, ${opacityRatio})`);
                    root.style.setProperty('--panel-muted', `rgba(255, 255, 255, ${elevatedRatio})`);
                    root.style.setProperty('--bg', `rgba(255, 255, 255, ${postItemRatio})`);
                }
            }
            saveConfig(config);
            applyStyles();
        });

        // 圆角滑动条
        const radiusSlider = document.getElementById('lsb-radius-slider');
        const radiusVal = document.getElementById('lsb-radius-val');
        radiusSlider.addEventListener('input', () => {
            config.borderRadius = parseInt(radiusSlider.value, 10);
            radiusVal.textContent = `${config.borderRadius}px`;
            const root = document.documentElement;
            if (root && root.style) {
                root.style.setProperty('--lsb-radius', `${config.borderRadius}px`);
            }
            saveConfig(config);
            applyStyles();
        });

        // 字体颜色选择器事件监听与实时同步
        function bindColorControl(propName, pickerId, hexId) {
            const picker = document.getElementById(pickerId);
            const hex = document.getElementById(hexId);
            if (!picker || !hex) return;

            picker.addEventListener('input', () => {
                const val = picker.value;
                hex.value = val;
                config[propName] = val;
                saveConfig(config);
                applyStyles();
            });

            hex.addEventListener('input', () => {
                const val = hex.value.trim();
                if (!val) {
                    config[propName] = '';
                    saveConfig(config);
                    applyStyles();
                    return;
                }
                if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) {
                    config[propName] = val;
                    if (val.length === 4) {
                        picker.value = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
                    } else {
                        picker.value = val;
                    }
                    saveConfig(config);
                    applyStyles();
                } else if (/^[0-9a-fA-F]{6}$/.test(val)) {
                    config[propName] = '#' + val;
                    picker.value = '#' + val;
                    saveConfig(config);
                    applyStyles();
                }
            });
        }

        // 字体颜色控件：浅色 / 深色两套，共 10 组
        FONT_COLOR_KEYS.forEach((key) => {
            const ids = fontColorControlIds(key);
            bindColorControl(key, ids.picker, ids.hex);
        });

        // 单项清除按钮
        modal.querySelectorAll('.lsb-color-clear-single').forEach(cBtn => {
            cBtn.addEventListener('click', () => {
                const targetKey = cBtn.dataset.target;
                if (!targetKey) return;
                config[targetKey] = '';
                saveConfig(config);
                applyStyles();

                const hexEl = document.getElementById(fontColorControlIds(targetKey).hex);
                if (hexEl) hexEl.value = '';
            });
        });

        // 全部重置为默认字体颜色
        const resetColorsBtn = document.getElementById('lsb-reset-font-colors-btn');
        if (resetColorsBtn) {
            resetColorsBtn.addEventListener('click', () => {
                FONT_COLOR_KEYS.forEach((key) => {
                    config[key] = '';
                    const hexEl = document.getElementById(fontColorControlIds(key).hex);
                    if (hexEl) hexEl.value = '';
                });
                saveConfig(config);
                applyStyles();
            });
        }

        // 折射开关（SVG 光学折射滤镜 + 主面板 ::after 叠层）
        const refractSwitch = document.getElementById('lsb-refract-switch');
        refractSwitch.addEventListener('change', () => {
            config.enableRefraction = refractSwitch.checked;
            saveConfig(config);
            // 确保 SVG 滤镜节点在 DOM 中
            const svgEl = document.getElementById(SVG_FILTER_ID);
            if (config.enableRefraction && !svgEl) {
                initSVGFilters();
            } else if (!config.enableRefraction && svgEl) {
                svgEl.remove(); // 关闭时移除 SVG 节点，彻底生效
            }
            // 更新 body 属性方便调试
            document.documentElement.setAttribute('data-lsb-refraction', config.enableRefraction ? '1' : '0');
            applyStyles();
        });

        // 扫光高光开关（悬停掠光）
        const shimmerSwitch = document.getElementById('lsb-shimmer-switch');
        shimmerSwitch.addEventListener('change', () => {
            config.enableShimmer = shimmerSwitch.checked;
            saveConfig(config);
            applyStyles();
            // 若关闭，强制清除已有 ::before 伪元素的 left 过渡效果
            document.documentElement.setAttribute('data-lsb-shimmer', config.enableShimmer ? '1' : '0');
        });

        // 胶囊悬浮码头开关
        const dockSwitch = document.getElementById('lsb-dock-switch');
        dockSwitch.addEventListener('change', () => {
            config.enableDockHeader = dockSwitch.checked;
            saveConfig(config);
            applyStyles();
        });

        // 流体极光动画开关
        const animSwitch = document.getElementById('lsb-anim-switch');
        animSwitch.addEventListener('change', () => {
            config.enableAnimation = animSwitch.checked;
            saveConfig(config);
            // 对浮光球即时应用 animation: none（不等 CSS 热加载）
            const orbs = document.querySelectorAll('.lsb-liquid-orb');
            orbs.forEach(orb => {
                orb.style.animation = config.enableAnimation ? '' : 'none';
            });
            // 同时切换背景渐变伪层动画
            document.documentElement.setAttribute('data-lsb-animation', config.enableAnimation ? '1' : '0');
            applyStyles();
        });
    }

    // ==========================================
    // 8. 零闪烁防白屏与丝滑生命周期调度 (Zero-FOUC & 120fps Engine)
    // ==========================================

    // 1. 0秒立即锁死过渡动画并注入行内优先级变量 (杜绝由白到透的350ms抽搐式变形)
    if (document.documentElement) {
        document.documentElement.classList.add('lsb-loading');
        applyInlineVariables(document.documentElement, config);
    }

    // 2. 立即在 document-start 时注入 CSS (Frame-0 直接挂载壁纸/主题渐变)
    applyStyles();

    // 3. 挂载 SVG 液态光学折射滤镜
    initSVGFilters();

    // 4. 监听暗色模式变化与样式优先级守护
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        const themeObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && (m.attributeName === 'data-dark-mode-theme' || m.attributeName === 'data-color-scheme-dark-mode-theme')) {
                    applyInlineVariables(document.documentElement, config);
                    break;
                }
            }
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-dark-mode-theme', 'data-color-scheme-dark-mode-theme']
        });

        // 确保 <style> 位于 <head> 末尾以获得最高层叠权重
        const headObserver = new MutationObserver(() => {
            const styleEl = document.getElementById(STYLE_ELEMENT_ID);
            const parent = document.head || document.documentElement;
            if (styleEl && parent && parent.lastElementChild !== styleEl) {
                parent.appendChild(styleEl);
            }
        });
        headObserver.observe(document.documentElement, { childList: true, subtree: true });
        window.addEventListener('load', () => {
            setTimeout(() => headObserver.disconnect(), 3000);
        });
    }

    // 5. 注册油猴菜单
    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('⚙️ 打开液态玻璃化设置', () => {
            const modal = document.getElementById('lsb-settings-modal');
            if (modal) modal.classList.toggle('active');
        });
    }

    // 6. 过渡锁解除：双重 rAF 等待首帧渲染完成，杜绝变形闪烁
    function releaseTransitionLock() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (document.documentElement) {
                    document.documentElement.classList.remove('lsb-loading');
                    document.documentElement.classList.add('lsb-ready');
                }
            });
        });
    }

    // 7. 高速滚动 120fps 防卡顿优化
    let scrollTimer = null;
    window.addEventListener('scroll', () => {
        if (!document.documentElement.classList.contains('lsb-scrolling')) {
            document.documentElement.classList.add('lsb-scrolling');
        }
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            document.documentElement.classList.remove('lsb-scrolling');
        }, 120);
    }, { passive: true });

    // 8. DOM 就绪处理
    function onDomReady() {
        initSVGFilters();
        initBackdrop();
        initSettingsWidget();
        releaseTransitionLock();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDomReady);
    } else {
        onDomReady();
    }

    // 9. SPA / PJAX 页面切换无闪烁适配
    function handleNavigation() {
        initSVGFilters();
        initBackdrop();
        applyInlineVariables(document.documentElement, config);
        releaseTransitionLock();
    }
    window.addEventListener('popstate', handleNavigation);
    const origPushState = history.pushState;
    if (origPushState) {
        history.pushState = function (...args) {
            const res = origPushState.apply(this, args);
            handleNavigation();
            return res;
        };
    }

})();
