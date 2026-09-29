import type { AppSettings, ConvertResult } from '../types';

// localStorage 存储键名
const SETTINGS_KEY = 'perler.settings.v1';
const RESULT_KEY = 'perler.result.v1';

// 应用设置的合法默认值
export const DEFAULT_SETTINGS: AppSettings = {
  gridW: 48,
  gridH: 48,
  lockRatio: true,
  sourceRatio: null,
  colorCount: 24,
  beadSizeMm: 5,
  showGrid: true,
  showColorCode: true,
  showCoords: false,
  renderStyle: 'round',
  flipH: false,
  flipV: false,
  excludeBackground: false,
  backgroundIdx: -1,
};

// 从 localStorage 读取设置（带字段校验，非法时回退默认值）
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      gridW: clampRange(parsed.gridW, DEFAULT_SETTINGS.gridW, 5, 200),
      gridH: clampRange(parsed.gridH, DEFAULT_SETTINGS.gridH, 5, 200),
      lockRatio:
        typeof parsed.lockRatio === 'boolean' ? parsed.lockRatio : DEFAULT_SETTINGS.lockRatio,
      sourceRatio:
        typeof parsed.sourceRatio === 'number' && Number.isFinite(parsed.sourceRatio) && parsed.sourceRatio > 0
          ? parsed.sourceRatio
          : DEFAULT_SETTINGS.sourceRatio,
      colorCount: clampRange(parsed.colorCount, DEFAULT_SETTINGS.colorCount, 1, 256),
      beadSizeMm: clampRange(parsed.beadSizeMm, DEFAULT_SETTINGS.beadSizeMm, 1, 30),
      showGrid: typeof parsed.showGrid === 'boolean' ? parsed.showGrid : DEFAULT_SETTINGS.showGrid,
      showColorCode:
        typeof parsed.showColorCode === 'boolean' ? parsed.showColorCode : DEFAULT_SETTINGS.showColorCode,
      showCoords: typeof parsed.showCoords === 'boolean' ? parsed.showCoords : DEFAULT_SETTINGS.showCoords,
      renderStyle:
        parsed.renderStyle === 'round' || parsed.renderStyle === 'square'
          ? parsed.renderStyle
          : DEFAULT_SETTINGS.renderStyle,
      flipH: typeof parsed.flipH === 'boolean' ? parsed.flipH : DEFAULT_SETTINGS.flipH,
      flipV: typeof parsed.flipV === 'boolean' ? parsed.flipV : DEFAULT_SETTINGS.flipV,
      excludeBackground:
        typeof parsed.excludeBackground === 'boolean'
          ? parsed.excludeBackground
          : DEFAULT_SETTINGS.excludeBackground,
      backgroundIdx:
        typeof parsed.backgroundIdx === 'number' && Number.isFinite(parsed.backgroundIdx)
          ? Math.round(parsed.backgroundIdx)
          : DEFAULT_SETTINGS.backgroundIdx,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// 数值字段读取辅助：非有限值回退默认值并 clamp 到范围
function clampRange(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

// 保存设置到 localStorage
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 存储空间不足等异常时静默忽略
  }
}

// 保存最近一次转换结果到 localStorage
export function saveResult(result: ConvertResult): void {
  try {
    const payload = {
      gridW: result.gridW,
      gridH: result.gridH,
      grid: Array.from(result.grid),
      usedColors: result.usedColors,
    };
    localStorage.setItem(RESULT_KEY, JSON.stringify(payload));
  } catch {
    // 结果过大或空间不足时静默忽略
  }
}

// 从 localStorage 恢复最近一次转换结果（结构校验失败返回 null）
export function loadResult(): ConvertResult | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      gridW?: number;
      gridH?: number;
      grid?: number[];
      usedColors?: { index: number; count: number }[];
    };
    const gridW = parsed.gridW ?? 0;
    const gridH = parsed.gridH ?? 0;
    if (
      gridW < 5 ||
      gridH < 5 ||
      !Array.isArray(parsed.grid) ||
      parsed.grid.length !== gridW * gridH
    ) {
      return null;
    }
    return {
      gridW,
      gridH,
      grid: Uint16Array.from(parsed.grid),
      usedColors: Array.isArray(parsed.usedColors) ? parsed.usedColors : [],
    };
  } catch {
    return null;
  }
}

// 清除本地保存的转换结果
export function clearResult(): void {
  try {
    localStorage.removeItem(RESULT_KEY);
  } catch {
    // 忽略清除异常
  }
}
