import { IconPlus, IconMinus, IconGrid, IconSparkles, IconLink, IconUnlink } from './Icons';
import type { AppSettings } from '../types';
import { clampGridSize } from '../utils/imageUtils';
import './ConvertPanel.css';

interface ConvertPanelProps {
  settings: AppSettings; // 全局设置
  onChange: (patch: Partial<AppSettings>) => void; // 设置变更
  hasPhoto: boolean; // 是否已有照片
  converting: boolean; // 转换中
  progress: { phase: string; value: number } | null; // 进度
  onConvert: () => void; // 触发转换
  onCancel: () => void; // 取消转换
}

// 数字步进输入器（5-200 范围校验）
function NumberStepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const invalid = value < min || value > max || Number.isNaN(value);

  // 步进调整并收敛范围
  const step = (delta: number) => {
    const next = clampGridSize((Number.isNaN(value) ? min : value) + delta);
    onChange(next);
  };

  return (
    <div className="stepper-field">
      <span className="stepper-label">{label}</span>
      <div className={`number-input ${invalid ? 'error' : ''}`}>
        <button type="button" className="stepper-btn" onClick={() => step(-1)} disabled={value <= min}>
          <IconMinus size={14} />
        </button>
        <input
          type="number"
          value={Number.isNaN(value) ? '' : value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          onBlur={(e) => {
            // 失焦时收敛非法值
            const v = clampGridSize(Number(e.target.value));
            onChange(v);
          }}
        />
        <button type="button" className="stepper-btn" onClick={() => step(1)} disabled={value >= max}>
          <IconPlus size={14} />
        </button>
      </div>
    </div>
  );
}

// 转换设置面板：模块尺寸、颜色数、生成按钮与进度
export default function ConvertPanel({
  settings,
  onChange,
  hasPhoto,
  converting,
  progress,
  onConvert,
  onCancel,
}: ConvertPanelProps) {
  // 颜色数快捷预设
  const presets = [8, 12, 20, 24, 36];
  // 正方形尺寸快捷预设（强制正方形，不看图片比例）
  const sizePresets = [29, 52, 78, 104];
  const sliderProgress = ((settings.colorCount - 1) / 255) * 100;

  // 锁定比例时修改宽度 → 自动计算高度
  const handleWidthChange = (w: number) => {
    if (settings.lockRatio && settings.sourceRatio && settings.sourceRatio > 0) {
      const h = clampGridSize(Math.round(w / settings.sourceRatio));
      onChange({ gridW: w, gridH: h });
    } else {
      onChange({ gridW: w });
    }
  };

  // 锁定比例时修改高度 → 自动计算宽度
  const handleHeightChange = (h: number) => {
    if (settings.lockRatio && settings.sourceRatio && settings.sourceRatio > 0) {
      const w = clampGridSize(Math.round(h * settings.sourceRatio));
      onChange({ gridW: w, gridH: h });
    } else {
      onChange({ gridH: h });
    }
  };

  // 切换锁定：锁定时以当前 W/H 计算比例存为 sourceRatio；解锁清除
  const handleToggleLock = () => {
    if (!settings.lockRatio) {
      // 锁定：以当前 gridW/gridH 作为锁定比例
      onChange({
        lockRatio: true,
        sourceRatio: settings.gridW / settings.gridH,
      });
    } else {
      // 解锁
      onChange({ lockRatio: false, sourceRatio: null });
    }
  };

  return (
    <div className="convert-panel">
      {/* 快捷尺寸预设（正方形） */}
      <div className="convert-size-presets">
        <span className="field-label" style={{ marginBottom: 0 }}>
          快捷尺寸
        </span>
        <div className="convert-presets">
          {sizePresets.map((s) => (
            <button
              key={s}
              type="button"
              className={`segmented-item ${settings.gridW === s && settings.gridH === s ? 'active' : ''}`}
              onClick={() => onChange({ gridW: s, gridH: s, lockRatio: false, sourceRatio: null })}
              title="强制正方形（解锁比例）"
            >
              {s}×{s}
            </button>
          ))}
        </div>
      </div>

      <div className="convert-grid-row">
        <NumberStepper
          label="宽（格）"
          value={settings.gridW}
          min={5}
          max={200}
          onChange={handleWidthChange}
        />
        {/* 比例锁定按钮：点击切换 lockRatio */}
        <button
          type="button"
          className={`ratio-lock-btn ${settings.lockRatio ? 'locked' : ''}`}
          onClick={handleToggleLock}
          data-tip={settings.lockRatio ? '已锁定比例，点击解锁' : '未锁定，点击锁定当前比例'}
        >
          {settings.lockRatio ? <IconLink size={16} /> : <IconUnlink size={16} />}
        </button>
        <NumberStepper
          label="高（格）"
          value={settings.gridH}
          min={5}
          max={200}
          onChange={handleHeightChange}
        />
      </div>

      {/* 锁定比例时显示当前比例信息 */}
      {settings.lockRatio && settings.sourceRatio && (
        <p className="field-hint" style={{ marginTop: -4, marginBottom: 4 }}>
          🔗 当前宽高比 ≈ 1 : {(1 / settings.sourceRatio).toFixed(2)}
        </p>
      )}

      <div className="convert-color-field">
        <div className="convert-color-head">
          <span className="field-label" style={{ marginBottom: 0 }}>
            保留颜色数
          </span>
          <span className="badge">{settings.colorCount} 色</span>
        </div>
        <input
          type="range"
          className="slider"
          min={1}
          max={256}
          value={settings.colorCount}
          style={{ '--slider-progress': `${sliderProgress}%` } as React.CSSProperties}
          onChange={(e) => onChange({ colorCount: Number(e.target.value) })}
        />
        <div className="convert-presets">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              className={`segmented-item ${settings.colorCount === p ? 'active' : ''}`}
              onClick={() => onChange({ colorCount: p })}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {converting ? (
        <div className="convert-progress">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.round((progress?.value ?? 0) * 100)}%` }}
            />
          </div>
          <div className="convert-progress-meta">
            <span>
              {progress?.phase ?? '准备中'} · {Math.round((progress?.value ?? 0) * 100)}%
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-lg btn-block"
          onClick={onConvert}
          disabled={!hasPhoto}
          title={hasPhoto ? '生成拼豆模块图' : '请先上传照片'}
        >
          <IconSparkles size={18} />
          生成拼豆图纸
        </button>
      )}
      {!hasPhoto && (
        <p className="field-hint" style={{ textAlign: 'center' }}>
          <IconGrid size={12} style={{ verticalAlign: -2 }} /> 请先在上方上传照片
        </p>
      )}
    </div>
  );
}
