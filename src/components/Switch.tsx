// Switch 开关组件
interface SwitchProps {
  checked: boolean; // 是否选中
  onChange: (value: boolean) => void; // 切换回调
  label?: string; // 可选文字标签
  disabled?: boolean; // 禁用态
}

// 通用开关：用于网格线显隐等布尔设置
export default function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <span
      className={`switch ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
    </span>
  );
}
