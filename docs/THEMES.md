# 🎨 Thematic Palettes & Visual Architecture

> **Document:** `docs/THEMES.md`  
> **Classification:** Design System & UI Specification  
> **Audience:** Frontend Developers, Operators, Designers  

---

## 1. What is this Document?

This specification details the **9 visual themes** implemented in Port Inventory. The system provides three distinct ergonomic groups:
1. **3 Light Themes**: Optimized for high-ambient-light daylight environments.
2. **3 Dark Themes**: Optimized for nighttime operations and low-light control rooms.
3. **3 Light-Dark Hybrid Themes**: Balanced palettes engineered to reduce eye strain.

All themes switch instantaneously without full-page reloads and persist across sessions via `localStorage`.

---

## 2. Palette Catalog & Color Tokens

### Category A: 3 Light Themes

#### 1. Arctic Snow (`arctic-snow`)
- **Intent**: Clinical, modern, ultra-clean white canvas with iced slate accents.
- **Background**: `#f8fafc` (Canvas) | `#ffffff` (Card Surface)
- **Primary Accent**: `#2563eb` (Cobalt Blue)
- **Secondary Accent**: `#0284c7` (Iced Cyan)
- **Text**: `#0f172a` (Deep Slate)
- **Best For**: Bright office environments and high-contrast monitors.

#### 2. Paper Sand (`paper-sand`)
- **Intent**: Editorial sepia parchment with natural terracotta and warm oak tones.
- **Background**: `#fbf7ee` (Warm Sand) | `#ffffff` (Card Surface)
- **Primary Accent**: `#b45309` (Warm Amber)
- **Secondary Accent**: `#c2410c` (Terracotta)
- **Text**: `#292524` (Charcoal Umber)
- **Best For**: Long reading sessions, documentation review, and warm displays.

#### 3. Pastel Mint (`pastel-mint`)
- **Intent**: Calming sage and botanical mint daylight tones.
- **Background**: `#f0fdf4` (Pale Mint) | `#ffffff` (Card Surface)
- **Primary Accent**: `#059669` (Botanical Emerald)
- **Secondary Accent**: `#0d9488` (Teal)
- **Text**: `#064e3b` (Forest Green)
- **Best For**: Relaxing daylight diagnostics with reduced blue-light exposure.

---

### Category B: 3 Dark Themes

#### 4. Midnight Obsidian (`midnight-obsidian`)
- **Intent**: Deep OLED pitch-black void with vibrant electric cyan telemetry glow.
- **Background**: `#09090b` (Obsidian Black) | `#18181f` (Dark Slab)
- **Primary Accent**: `#38bdf8` (Electric Sky Cyan)
- **Secondary Accent**: `#818cf8` (Indigo)
- **Text**: `#f4f4f5` (Crisp Zinc White)
- **Best For**: OLED monitors, server room control consoles, and dark environments.

#### 5. Cyber Synthwave (`cyber-synthwave`)
- **Intent**: Retro-futuristic cyberpunk violet with hot magenta and electric cyan highlights.
- **Background**: `#0f0728` (Cosmic Violet) | `#20134a` (Neon Surface)
- **Primary Accent**: `#ec4899` (Hot Magenta)
- **Secondary Accent**: `#06b6d4` (Cyan)
- **Text**: `#fdf4ff` (Neon White)
- **Best For**: Cyberpunk aesthetics, high-energy operations, and retro consoles.

#### 6. Charcoal Slate (`charcoal-slate`)
- **Intent**: Matte studio graphite and industrial steel for non-distracting work.
- **Background**: `#18181b` (Matte Charcoal) | `#27272a` (Titanium Gray)
- **Primary Accent**: `#94a3b8` (Brushed Slate)
- **Secondary Accent**: `#64748b` (Industrial Steel)
- **Text**: `#e4e4e7` (Light Gray)
- **Best For**: Professional enterprise workstations and minimal visual distraction.

---

### Category C: 3 Light-Dark Hybrid Themes

#### 7. Solar Eclipse (`solar-eclipse`)
- **Intent**: Pitch-dark telemetry control deck paired with a daylight reading canvas.
- **Header / Nav Deck**: `#0f172a` (Dark Slate)
- **Main Canvas**: `#f1f5f9` (Light Slate) | `#ffffff` (Cards)
- **Primary Accent**: `#0f172a` (Deep Slate)
- **Text**: `#0f172a` (High Contrast Black)
- **Best For**: Users who enjoy dark navigation chrome with crisp daylight tables.

#### 8. Nordic Twilight (`nordic-twilight`)
- **Intent**: Balanced Scandinavian blue-gray twilight; neither bright nor pitch black.
- **Background**: `#242933` (Polar Twilight) | `#3b4252` (Nord Card)
- **Primary Accent**: `#88c0d0` (Frost Cyan)
- **Secondary Accent**: `#5e81ac` (Glacier Blue)
- **Text**: `#eceff4` (Snow White)
- **Best For**: Twilight and evening auditing without harsh contrast shocks.

#### 9. OLED Mono Duo (`oled-mono-duo`)
- **Intent**: Stark architectural high-contrast monochrome duo-tone split.
- **Background**: `#000000` (True Absolute Black) | `#121212` (Monochrome Card)
- **Primary Accent**: `#ffffff` (Pure White)
- **Secondary Accent**: `#aaaaaa` (Mid Gray)
- **Text**: `#ffffff` (True White)
- **Best For**: Maximum typographic legibility, accessibility, and minimalist purists.

---

## 3. CSS Variable Architecture

Every theme defines identical semantic CSS token names in `client/src/styles/themes.css`:

```css
[data-theme="theme-id"] {
  --bg-app: #...;                /* Main viewport background */
  --bg-surface: #...;            /* Navigation header and controls */
  --bg-card: #...;               /* Data tables and telemetry cards */
  --bg-card-hover: #...;         /* Hover feedback state */
  --bg-badge: #...;              /* Tag and badge background */
  --text-main: #...;             /* Primary headings and port numbers */
  --text-muted: #...;            /* Secondary labels and descriptions */
  --text-faint: #...;            /* Subdued timestamps and hints */
  --border-subtle: #...;         /* Card outlines and table separators */
  --border-focus: #...;          /* Input active state */
  --accent-primary: #...;        /* Brand accent and primary buttons */
  --accent-secondary: #...;      /* Secondary highlights */
  --color-listening: #...;       /* Active socket indicator */
  --color-listening-bg: #...;    /* Listening badge background */
  --color-warning: #...;         /* Personal use warning accent */
  --color-danger: #...;          /* Privileged / restricted badge */
}
```

---

## 4. State Persistence & Instant Switching

Theme selection is handled by `client/src/context/ThemeContext.tsx`:
- When a user chooses a theme, the React context sets `document.documentElement.setAttribute('data-theme', themeId)`.
- The choice is saved under `localStorage.setItem('port_inventory_theme_v1', themeId)`.
- On subsequent visits, the saved theme is restored before first render to eliminate visual flashes.
