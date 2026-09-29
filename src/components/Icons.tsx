// 内联 SVG 线性图标组件集（stroke: currentColor，保证离线可用）
import type React from 'react';

// 图标通用属性
export interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// 通用图标包装：统一 viewBox 与描边风格
function Svg({
  size = 20,
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// 上传图标
export function IconUpload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </Svg>
  );
}

// 图片图标
export function IconImage(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-4.5-4.5L6 21" />
    </Svg>
  );
}

// 裁剪图标
export function IconCrop(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M2 6h14a2 2 0 0 1 2 2v14" />
    </Svg>
  );
}

// 向左旋转图标
export function IconRotateLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8a9 9 0 1 1 2.5 6.2" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

// 向右旋转图标
export function IconRotateRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 8a9 9 0 1 0-2.5 6.2" />
      <path d="M21 3v5h-5" />
    </Svg>
  );
}

// 网格图标
export function IconGrid(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </Svg>
  );
}

// 比例锁定图标（链条）
export function IconLink(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 7.07 7.07l1-1" />
    </Svg>
  );
}

// 比例解锁图标（断开的链条）
export function IconUnlink(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-3.54-8.54" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-2 2a5 5 0 0 0 3.54 8.54" />
      <path d="M5 5l14 14" />
    </Svg>
  );
}

// 放大图标
export function IconZoomIn(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </Svg>
  );
}

// 缩小图标
export function IconZoomOut(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M8 11h6" />
    </Svg>
  );
}

// 适应窗口图标
export function IconFit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4" />
      <path d="M15 4h4a1 1 0 0 1 1 1v4" />
      <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
      <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
    </Svg>
  );
}

// 下载图标
export function IconDownload(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </Svg>
  );
}

// 调色板图标
export function IconPalette(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-.7-2-2-2h-1a5 5 0 0 1 0-10h1a9 9 0 0 1 0 0z" />
      <circle cx="8.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// 尺子图标
export function IconRuler(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="9" width="20" height="6" rx="1.5" transform="rotate(-45 12 12)" />
      <path d="M8.5 9.5l1.5 1.5M11.5 6.5l1.5 1.5M14.5 3.5l1.5 1.5" />
    </Svg>
  );
}

// 对勾图标
export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Svg>
  );
}

// 关闭图标
export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

// 信息图标
export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </Svg>
  );
}

// 警告图标
export function IconWarning(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17.5" r="0.5" fill="currentColor" />
    </Svg>
  );
}

// 错误图标
export function IconError(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </Svg>
  );
}

// 刷新/重置图标
export function IconRefresh(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 11A8 8 0 0 0 5.6 6.2L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.4 4.8L20 16" />
      <path d="M20 20v-4h-4" />
    </Svg>
  );
}

// 加号图标
export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

// 减号图标
export function IconMinus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  );
}

// 品牌 logo：拼豆圆点组合
export function IconSparkles(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="7" r="3" />
      <circle cx="17" cy="7" r="3" />
      <circle cx="7" cy="17" r="3" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

// 水平镜像翻转图标
export function IconFlipH(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v18" />
      <path d="M6 8l-3 4 3 4" />
      <path d="M18 8l3 4-3 4" />
    </Svg>
  );
}

// 垂直镜像翻转图标
export function IconFlipV(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 12h18" />
      <path d="M8 6l4-3 4 3" />
      <path d="M8 18l4 3 4-3" />
    </Svg>
  );
}
