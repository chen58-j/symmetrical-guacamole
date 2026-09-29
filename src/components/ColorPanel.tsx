import type { ConvertResult } from '../types';
import { BEAD_PALETTE } from '../core/beadPalette';
import { countMaskedByColor } from '../core/backgroundMask';
import { IconPalette } from './Icons';
import Switch from './Switch';
import './ColorPanel.css';

interface ColorPanelProps {
  result: ConvertResult | null; // 转换结果
  backgroundIdx: number; // 背景色下标（-1 未设置）
  excludeBackground: boolean; // 是否启用背景排除
  mask: Uint8Array | null; // 背景遮罩
  onSetBackground: (idx: number) => void; // 设置背景色下标
  onToggleExcludeBackground: (v: boolean) => void; // 切换背景排除开关
}

// 颜色面板：使用颜色列表 + 占比条 + 背景排除设置
// 背景排除基于边缘洪水填充：只剔除边缘外的背景，主体内同色保留
export default function ColorPanel({
  result,
  backgroundIdx,
  excludeBackground,
  mask,
  onSetBackground,
  onToggleExcludeBackground,
}: ColorPanelProps) {
  const total = result ? result.gridW * result.gridH : 0;

  // 无结果空状态
  if (!result || result.usedColors.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <IconPalette size={32} />
        </span>
        <p className="empty-main">还没有颜色数据</p>
        <p className="empty-sub">生成拼豆图纸后可在此查看颜色清单</p>
      </div>
    );
  }

  // 计算每种颜色被 mask 排除了多少颗（边缘外）
  const maskedByColor = mask ? countMaskedByColor(mask, result.grid) : new Map<number, number>();

  // 有效拼豆数量（排除边缘外背景后的实际数量）
  const maskedCount = mask ? Array.from(maskedByColor.values()).reduce((s, c) => s + c, 0) : 0;
  const effectiveTotal = excludeBackground && mask ? total - maskedCount : total;

  return (
    <div className="color-panel">
      {/* 背景排除设置区（固定在顶部，不参与滚动） */}
      <div className="bg-exclude-section">
        <div className="bg-exclude-header">
          <span className="bg-exclude-title">背景排除（按区域）</span>
          <Switch checked={excludeBackground} onChange={onToggleExcludeBackground} label="开启" />
        </div>
        {excludeBackground && (
          <div className="bg-exclude-body">
            <p className="field-hint">选择背景色，系统将只剔除边缘外的该色格子</p>
            <div className="bg-exclude-row">
              <span className="bg-exclude-label">背景色：</span>
              {result.usedColors.map((used) => {
                const color = BEAD_PALETTE[used.index];
                const isSelected = backgroundIdx === used.index;
                return (
                  <button
                    key={used.index}
                    type="button"
                    className={`bg-color-chip ${isSelected ? 'selected' : ''}`}
                    data-tip={`${color.code} ${color.name} · ${used.count}颗`}
                    style={{ background: color.hex }}
                    onClick={() => onSetBackground(used.index)}
                  />
                );
              })}
            </div>
            {backgroundIdx >= 0 && mask && (
              <p className="field-hint good">
                当前：{BEAD_PALETTE[backgroundIdx].code} {BEAD_PALETTE[backgroundIdx].name}
                {' '}边缘外排除 {maskedByColor.get(backgroundIdx) ?? 0} 颗
                {' · '}主体内保留 {(result.usedColors.find(u => u.index === backgroundIdx)?.count ?? 0) - (maskedByColor.get(backgroundIdx) ?? 0)} 颗
                {' · '}实际拼 {effectiveTotal.toLocaleString('zh-CN')} 颗
              </p>
            )}
          </div>
        )}
      </div>

      {/* 颜色行列表（独立滚动区，默认显示约 5 行） */}
      <div className="color-list-scroll scroll-area">
        {result.usedColors.map((used) => {
          const color = BEAD_PALETTE[used.index];
          // 该颜色被 mask 排除的数量（边缘外）
          const excluded = mask ? maskedByColor.get(used.index) ?? 0 : 0;
          const kept = used.count - excluded;
          const isBackgroundColor = backgroundIdx === used.index && excludeBackground;

          // 占比基于有效总数
          const baseTotal = excludeBackground ? effectiveTotal : total;
          const ratio = baseTotal > 0 ? (used.count / baseTotal) * 100 : 0;

          return (
            <div key={used.index} className="color-row">
              <div className="color-row-main" role="presentation">
                <span className="color-swatch" style={{ background: color.hex }} />
                <span className="color-meta">
                  <span className="color-name">
                    {color.code} {color.name}
                    {isBackgroundColor && excluded > 0 && (
                      <span className="bg-tag">· 边缘外排除{excluded}</span>
                    )}
                    {isBackgroundColor && excluded === 0 && (
                      <span className="bg-tag good">· 仅主体内</span>
                    )}
                  </span>
                  <span className="color-hex">{color.hex}</span>
                </span>
                <span className="color-stats">
                  <span className="badge">
                    {excludeBackground && excluded > 0 ? `${kept}/${used.count}` : used.count.toLocaleString('zh-CN')}
                  </span>
                  <span className="color-ratio-track">
                    <span className="color-ratio-fill" style={{ width: `${ratio}%` }} />
                  </span>
                  <span className="color-ratio-num">{ratio.toFixed(1)}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
