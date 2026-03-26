// ============================================================
// URL → Figma Screens — code.js
// Receives extracted page data from ui.html and renders
// editable Figma frames for each page.
// ============================================================

figma.showUI(__html__, { width: 300, height: 380 });

// ── VIEWPORT PRESETS ─────────────────────────────────────────
const VIEWPORTS = {
  mobile:  { w: 390,  h: 844  },
  tablet:  { w: 768,  h: 1024 },
  desktop: { w: 1440, h: 900  },
};

// ── FONTS ────────────────────────────────────────────────────
async function loadFonts() {
  const styles = ['Regular','Medium','Semi Bold','Bold','Extra Bold','Light','Thin'];
  await Promise.all(
    styles.map(style =>
      figma.loadFontAsync({ family: 'Inter', style }).catch(() =>
        figma.loadFontAsync({ family: 'Roboto', style: 'Regular' })
      )
    )
  );
}

// ── COLOR HELPERS ────────────────────────────────────────────
function hexToRgb(hex) {
  if (!hex) return { r: 0.2, g: 0.2, b: 0.2 };
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function parseColor(str) {
  if (!str) return null;
  if (str.startsWith('#')) return hexToRgb(str);
  const m = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) return { r: +m[1]/255, g: +m[2]/255, b: +m[3]/255 };
  return null;
}

function solid(colorStr, fallback = { r: 0.95, g: 0.95, b: 0.97 }) {
  const c = parseColor(colorStr) || fallback;
  return [{ type: 'SOLID', color: c }];
}

function isLight(hex) {
  if (!hex) return true;
  const { r, g, b } = hexToRgb(hex);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 0.5;
}

// ── TEXT HELPER ──────────────────────────────────────────────
function createText(content, styles = {}) {
  const t = figma.createText();
  t.characters = String(content || '').slice(0, 500);
  t.fontSize = styles.fontSize || 14;

  const weightMap = {
    'Thin': 'Thin', 'Light': 'Light', 'Regular': 'Regular',
    'Medium': 'Medium', 'Semi Bold': 'Semi Bold',
    'Bold': 'Bold', 'Extra Bold': 'Extra Bold',
  };
  const style = weightMap[styles.fontWeight] || 'Regular';
  try { t.fontName = { family: 'Inter', style }; } catch (_) {}

  const c = parseColor(styles.color);
  if (c) t.fills = [{ type: 'SOLID', color: c }];
  else t.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.09, b: 0.12 } }];

  if (styles.letterSpacing) {
    t.letterSpacing = { unit: 'PIXELS', value: styles.letterSpacing };
  }

  return t;
}

// ── CARD CONTAINER ───────────────────────────────────────────
function createCard(w, h, bg, radius = 12) {
  const f = figma.createFrame();
  f.resize(w, Math.max(h, 1));
  f.fills = solid(bg, { r: 1, g: 1, b: 1 });
  f.cornerRadius = radius;
  f.strokes = [{ type: 'SOLID', color: { r: 0.91, g: 0.918, b: 0.929 }, opacity: 0.6 }];
  f.strokeWeight = 1;
  f.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.05 },
    offset: { x: 0, y: 2 }, radius: 12, spread: 0,
    visible: true, blendMode: 'NORMAL',
  }];
  return f;
}

// ── ELEMENT RENDERER ─────────────────────────────────────────
// Returns a Figma node from an extracted element.
// frameWidth is used to size containers proportionally.

function renderElement(el, frameWidth, depth = 0) {
  if (!el) return null;

  const maxW = Math.max(frameWidth - depth * 16, 100);

  // ── TEXT ──────────────────────────────────────────────────
  if (el.type === 'text') {
    if (!el.text || el.text.trim() === '') return null;
    const t = createText(el.text, el.styles);
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
    return t;
  }

  // ── BUTTON ───────────────────────────────────────────────
  if (el.type === 'button') {
    const bg = el.styles.bg || '#6366F1';
    const btnW = Math.min(maxW, 200);
    const btn = figma.createFrame();
    btn.name = 'Button';
    btn.resize(btnW, 40);
    btn.fills = solid(bg);
    btn.cornerRadius = el.styles.borderRadius || 10;
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';
    btn.paddingLeft = btn.paddingRight = 16;
    btn.primaryAxisSizingMode = 'FIXED';
    btn.counterAxisSizingMode = 'AUTO';
    const textColor = isLight(bg) ? '#111827' : '#FFFFFF';
    const t = createText(el.text || 'Button', { fontSize: 13, fontWeight: 'Semi Bold', color: textColor });
    btn.appendChild(t);
    return btn;
  }

  // ── IMAGE ────────────────────────────────────────────────
  if (el.type === 'image') {
    // Create a placeholder rect with the image info as a label
    const imgW = Math.min(maxW, 320);
    const imgH = Math.round(imgW * 0.5625); // 16:9
    const grp = figma.createFrame();
    grp.name = 'Image';
    grp.resize(imgW, imgH);
    grp.fills = [{ type: 'SOLID', color: { r: 0.94, g: 0.95, b: 0.96 } }];
    grp.cornerRadius = 8;
    if (el.alt) {
      try {
        const lbl = createText(el.alt, { fontSize: 11, color: '#9CA3AF' });
        lbl.x = 8; lbl.y = imgH / 2 - 8;
        grp.appendChild(lbl);
      } catch (_) {}
    }
    return grp;
  }

  // ── CONTAINER ────────────────────────────────────────────
  if (el.type === 'container') {
    const children = (el.children || [])
      .map(c => renderElement(c, maxW - 24, depth + 1))
      .filter(Boolean);

    if (children.length === 0) return null;

    // Detect if this is a card-like container
    const isCard = el.styles.bg && el.styles.bg !== '#F7F8FA' && el.styles.bg !== '#F9FAFB';
    const isNav  = el.tag === 'nav' || el.role === 'navigation';
    const isHeader = el.tag === 'header';
    const isFooter = el.tag === 'footer';

    const container = figma.createFrame();
    container.name = el.tag + (el.role ? '/' + el.role : '');
    container.layoutMode = 'VERTICAL';
    container.itemSpacing = 8;
    container.paddingTop = container.paddingBottom = el.styles.padding || el.styles.paddingV || (isCard ? 16 : 8);
    container.paddingLeft = container.paddingRight = el.styles.padding || el.styles.paddingH || (isCard ? 16 : 0);
    container.primaryAxisSizingMode = 'AUTO';
    container.counterAxisSizingMode = 'FIXED';
    container.resize(maxW, 1);

    if (isCard) {
      container.fills = solid(el.styles.bg);
      container.cornerRadius = el.styles.borderRadius || 12;
      container.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 2 }, radius: 12, spread: 0,
        visible: true, blendMode: 'NORMAL',
      }];
      container.strokes = [{ type: 'SOLID', color: { r: 0.91, g: 0.918, b: 0.929 }, opacity: 0.6 }];
      container.strokeWeight = 1;
    } else if (isNav || isHeader) {
      container.fills = solid(el.styles.bg || '#FFFFFF');
      container.paddingTop = container.paddingBottom = 12;
      container.paddingLeft = container.paddingRight = 20;
    } else if (isFooter) {
      container.fills = solid(el.styles.bg || '#F9FAFB');
    } else {
      container.fills = el.styles.bg ? solid(el.styles.bg) : [];
    }

    for (const child of children) {
      container.appendChild(child);
    }

    return container;
  }

  return null;
}

// ── PAGE FRAME BUILDER ───────────────────────────────────────
async function buildPageFrame(page, vp, xOffset) {
  const { w, h } = vp;
  const bgColor = '#F7F8FA';

  const frame = figma.createFrame();
  frame.name = `${page.title} — ${new URL(page.url).pathname || '/'}`;
  frame.resize(w, h);
  frame.fills = [{ type: 'SOLID', color: hexToRgb(bgColor) }];
  frame.x = xOffset;
  frame.y = 0;
  frame.clipsContent = true;

  // Use auto-layout (vertical scroll simulation)
  frame.layoutMode = 'VERTICAL';
  frame.itemSpacing = 0;
  frame.paddingTop = 0;
  frame.paddingBottom = 0;
  frame.paddingLeft = 0;
  frame.paddingRight = 0;
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';

  // Inner scroll container
  const inner = figma.createFrame();
  inner.name = '_content';
  inner.layoutMode = 'VERTICAL';
  inner.itemSpacing = 4;
  inner.paddingTop = 16;
  inner.paddingBottom = 48;
  inner.paddingLeft = w > 768 ? 32 : 16;
  inner.paddingRight = w > 768 ? 32 : 16;
  inner.primaryAxisSizingMode = 'AUTO';
  inner.counterAxisSizingMode = 'FIXED';
  inner.resize(w, 1);
  inner.fills = [];

  const contentWidth = w - (w > 768 ? 64 : 32);

  let hasContent = false;
  for (const section of (page.sections || [])) {
    try {
      const node = renderElement(section, contentWidth, 0);
      if (node) {
        inner.appendChild(node);
        hasContent = true;
      }
    } catch (_) {}
  }

  if (!hasContent) {
    // Fallback: title only
    const t = createText(page.title, { fontSize: 24, fontWeight: 'Bold', color: '#111827' });
    inner.appendChild(t);
    const u = createText(page.url, { fontSize: 12, color: '#9CA3AF' });
    inner.appendChild(u);
  }

  frame.appendChild(inner);
  return frame;
}

// ── MAIN MESSAGE HANDLER ─────────────────────────────────────
figma.ui.onmessage = async (msg) => {
  if (msg.type !== 'render') return;

  try {
    await loadFonts();

    const { pages, viewport } = msg;
    const vp = VIEWPORTS[viewport] || VIEWPORTS.desktop;
    const GAP = 80;

    const frames = [];
    let xOffset = 0;

    for (const page of pages) {
      const frame = await buildPageFrame(page, vp, xOffset);
      figma.currentPage.appendChild(frame);
      frames.push(frame);
      xOffset += vp.w + GAP;
    }

    // Label row — add URL labels below each frame
    for (const frame of frames) {
      try {
        const label = createText(
          new URL(frame.name.split(' — ')[1] || '').href || frame.name,
          { fontSize: 11, color: '#9CA3AF' }
        );
        label.x = frame.x;
        label.y = vp.h + 12;
        figma.currentPage.appendChild(label);
      } catch (_) {}
    }

    figma.viewport.scrollAndZoomIntoView(frames);
    figma.ui.postMessage({ type: 'done', count: frames.length });

  } catch (err) {
    figma.ui.postMessage({ type: 'error', message: err.message });
  }
};
