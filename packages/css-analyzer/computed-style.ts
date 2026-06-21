import type { ResolvedStyles, ComputedStyle } from '@html-native/shared';

function parsePx(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const t = value.trim();
  const m = t.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (m) return parseFloat(m[1]);
  const n = t.match(/^(-?\d+(?:\.\d+)?)$/);
  if (n) return parseFloat(n[1]);
  return undefined;
}

function parseBoxShorthand(value: string): { top: number; right: number; bottom: number; left: number } | undefined {
  const parts = value.split(/\s+/).map(s => parsePx(s)).filter((p): p is number => p !== undefined);
  if (parts.length === 0) return undefined;
  const p = (i: number) => parts[i];
  switch (parts.length) {
    case 1: return { top: p(0), right: p(0), bottom: p(0), left: p(0) };
    case 2: return { top: p(0), right: p(1), bottom: p(0), left: p(1) };
    case 3: return { top: p(0), right: p(1), bottom: p(2), left: p(1) };
    case 4: return { top: p(0), right: p(1), bottom: p(2), left: p(3) };
    default: return undefined;
  }
}

export function computeStyle(styles: ResolvedStyles): ComputedStyle {
  const r: ComputedStyle = {};

  // Margin
  if (styles['margin']) {
    const box = parseBoxShorthand(styles['margin']);
    if (box) Object.assign(r, { marginTop: box.top, marginRight: box.right, marginBottom: box.bottom, marginLeft: box.left });
  }
  if (styles['margin-top']) r.marginTop = parsePx(styles['margin-top']);
  if (styles['margin-right']) r.marginRight = parsePx(styles['margin-right']);
  if (styles['margin-bottom']) r.marginBottom = parsePx(styles['margin-bottom']);
  if (styles['margin-left']) r.marginLeft = parsePx(styles['margin-left']);

  // Padding
  if (styles['padding']) {
    const box = parseBoxShorthand(styles['padding']);
    if (box) Object.assign(r, { paddingTop: box.top, paddingRight: box.right, paddingBottom: box.bottom, paddingLeft: box.left });
  }
  if (styles['padding-top']) r.paddingTop = parsePx(styles['padding-top']);
  if (styles['padding-right']) r.paddingRight = parsePx(styles['padding-right']);
  if (styles['padding-bottom']) r.paddingBottom = parsePx(styles['padding-bottom']);
  if (styles['padding-left']) r.paddingLeft = parsePx(styles['padding-left']);

  // Border
  if (styles['border-width']) r.borderWidth = parsePx(styles['border-width']);
  if (styles['border-color']) r.borderColor = styles['border-color'];
  if (styles['border-radius']) r.borderRadius = parsePx(styles['border-radius']);
  if (styles['box-sizing']) r.boxSizing = styles['box-sizing'];

  // Flexbox
  if (styles['display']) r.display = styles['display'];
  if (styles['flex-direction']) r.flexDirection = styles['flex-direction'];
  if (styles['flex-wrap']) r.flexWrap = styles['flex-wrap'];
  if (styles['justify-content']) r.justifyContent = styles['justify-content'];
  if (styles['align-items']) r.alignItems = styles['align-items'];
  if (styles['align-content']) r.alignContent = styles['align-content'];
  if (styles['gap']) r.gap = parsePx(styles['gap']);
  if (styles['flex']) r.flex = styles['flex'];

  // Typography
  if (styles['font-family']) r.fontFamily = styles['font-family'];
  if (styles['font-size']) r.fontSize = parsePx(styles['font-size']);
  if (styles['font-weight']) r.fontWeight = parseInt(styles['font-weight'], 10) || undefined;
  if (styles['font-style']) r.fontStyle = styles['font-style'];
  if (styles['line-height']) r.lineHeight = parsePx(styles['line-height']);
  if (styles['text-align']) r.textAlign = styles['text-align'];
  if (styles['text-decoration']) r.textDecoration = styles['text-decoration'];
  if (styles['text-transform']) r.textTransform = styles['text-transform'];
  if (styles['letter-spacing']) r.letterSpacing = parsePx(styles['letter-spacing']);
  if (styles['color']) r.color = styles['color'];

  // Color / Background
  if (styles['background-color']) r.backgroundColor = styles['background-color'];
  if (styles['background']) r.background = styles['background'];
  if (styles['opacity']) r.opacity = parseFloat(styles['opacity']) || undefined;

  // Sizing
  if (styles['width']) r.width = styles['width'];
  if (styles['height']) r.height = styles['height'];
  if (styles['min-width']) r.minWidth = styles['min-width'];
  if (styles['max-width']) r.maxWidth = styles['max-width'];
  if (styles['min-height']) r.minHeight = styles['min-height'];
  if (styles['max-height']) r.maxHeight = styles['max-height'];
  if (styles['position']) r.position = styles['position'];

  return r;
}
