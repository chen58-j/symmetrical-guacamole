import { useEffect, useRef, useState } from 'react';
import { IconRuler, IconSparkles } from './Icons';
import type { AppSettings, ConvertResult } from '../types';
import { countMasked } from '../core/backgroundMask';
import './SizePanel.css';

interface SizePanelProps {
  settings: AppSettings; // 全局设置
  onChange: (patch: Partial<AppSettings>) => void; // 设置变更
  result: ConvertResult | null; // 转换结果（数量估算依赖）
  mask: Uint8Array | null; // 背景遮罩
}

// 数字滚动动画组件：数值变化时 300ms 平滑过渡
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 300);
      // 缓出曲线
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{display.toLocaleString('zh-CN')}</>;
}

// 尺寸信息面板：拼豆尺寸预设、成品物理尺寸与数量估算
export default function SizePanel({ settings, onChange, result, mask }: SizePanelProps) {
  const presets = [5, 10];

  // 成品物理尺寸文本（≥100mm 转换为 cm 显示）
  const widthMm = settings.gridW * settings.beadSizeMm;
  const heightMm = settings.gridH * settings.beadSizeMm;
  const formatSize = (mm: number) => (mm >= 100 ? `${(mm / 10).toFixed(1)}cm` : `${mm}mm`);

  // 拼豆总数（排除 mask 标记的边缘外背景格）
  let totalBeads = settings.gridW * settings.gridH;
  let colorKinds = 0;
  if (result) {
    totalBeads = mask ? totalBeads - countMasked(mask) : totalBeads;
    if (mask) {
      // 统计有效颜色种类（排除 mask 标记的颜色）
      colorKinds = result.usedColors.filter((u) => {
        // 检查该颜色是否还有未被 mask 的格子
        const maskedCount = (() => {
          let c = 0;
          for (let i = 0; i < result.grid.length; i++) {
            if (result.grid[i] === u.index && mask[i]) c++;
          }
          return c;
        })();
        return u.count > maskedCount;
      }).length;
    } else {
      colorKinds = result.usedColors.length;
    }
  }

  return (
    <div className="size-panel">
      {/* 拼豆尺寸 */}
      <div className="field-block">
        <span className="field-label">拼豆尺寸</span>
        <div className="bead-size-row">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`pill ${settings.beadSizeMm === p ? 'active' : ''}`}
              onClick={() => onChange({ beadSizeMm: p })}
            >
              {p}mm 标准
            </button>
          ))}
          <div className="number-input bead-size-custom">
            <input
              type="number"
              min={1}
              max={30}
              value={settings.beadSizeMm}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) onChange({ beadSizeMm: Math.max(1, Math.min(30, v)) });
              }}
            />
            <span className="unit">mm</span>
          </div>
        </div>
      </div>

      {/* 成品尺寸 */}
      <div className="info-card">
        <span className="info-icon" style={{ background: 'var(--color-info)' }}>
          <IconRuler size={17} />
        </span>
        <div>
          <p className="info-label">成品物理尺寸</p>
          <p className="info-value">
            {formatSize(widthMm)} × {formatSize(heightMm)}
          </p>
        </div>
      </div>

      {/* 数量估算 */}
      <div className="info-card">
        <span className="info-icon" style={{ background: 'var(--color-primary-grad)' }}>
          <IconSparkles size={17} />
        </span>
        <div>
          <p className="info-label">拼豆总数{result ? '' : '（按当前设置估算）'}</p>
          <p className="info-value">
            <AnimatedNumber value={totalBeads} /> 颗
            {result && <span className="badge" style={{ marginLeft: 8 }}>{colorKinds} 种颜色</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
