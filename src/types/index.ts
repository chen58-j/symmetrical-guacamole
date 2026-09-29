// 应用全局类型定义

// 应用设置
export interface AppSettings {
  gridW: number; // 模块宽度（拼豆格数，5-200）
  gridH: number; // 模块高度（拼豆格数，5-200）
  lockRatio: boolean; // 是否锁定宽高比例（改一边自动算另一边）
  sourceRatio: number | null; // 源图宽高比（上传图片时记录，用于比例锁定）
  colorCount: number; // 保留颜色数（1-256）
  beadSizeMm: number; // 单颗拼豆物理尺寸（毫米）
  showGrid: boolean; // 预览是否显示网格线
  showColorCode: boolean; // 预览是否显示色号编码
  showCoords: boolean; // 预览是否显示坐标标注
  renderStyle: 'round' | 'square'; // 渲染样式：圆点/方块
  flipH: boolean; // 水平镜像翻转
  flipV: boolean; // 垂直镜像翻转
  excludeBackground: boolean; // 是否排除背景色（不拼）
  backgroundIdx: number; // 被排除的背景色在 BEAD_PALETTE 中的下标（-1 表示未设置）
}

// 拼豆颜色定义
export interface BeadColor {
  code: string; // 颜色编码，如 H01
  name: string; // 中文颜色名
  hex: string; // 十六进制色值 #RRGGBB
  group: string; // 色系分组（中文）
}

// 已使用的颜色统计项
export interface UsedColor {
  index: number; // 在 BEAD_PALETTE 中的下标
  count: number; // 使用数量
}

// 转换结果
export interface ConvertResult {
  gridW: number;
  gridH: number;
  grid: Uint16Array; // 每格对应的 BEAD_PALETTE 下标，长度 gridW*gridH
  usedColors: UsedColor[]; // 按数量降序
}
