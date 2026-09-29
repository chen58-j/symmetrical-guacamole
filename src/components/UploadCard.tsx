import { useRef, useState } from 'react';
import { IconUpload, IconWarning, IconClose } from './Icons';
import { loadImageFile } from '../utils/imageUtils';
import './UploadCard.css';

// 支持的文件类型与最大尺寸
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

interface UploadCardProps {
  onLoaded: (image: ImageData, name: string) => void; // 加载完成回调
  hasPhoto: boolean; // 是否已有照片（影响空态展示）
}

// 上传卡片：拖放 + 文件选择 + 校验与错误提示
export default function UploadCard({ onLoaded, hasPhoto }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 校验文件合法性
  const validate = (file: File): string | null => {
    const typeOk =
      ACCEPTED.includes(file.type) ||
      ACCEPTED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!typeOk) return '仅支持 JPG、PNG、WEBP 格式';
    if (file.size > MAX_BYTES) return '文件大小超过 10MB 限制';
    return null;
  };

  // 处理单个文件
  const handleFile = async (file: File) => {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    setProgress(10);
    try {
      // 分阶段模拟进度反馈（实际加载在 loadImageFile 内完成）
      setProgress(35);
      const image = await loadImageFile(file);
      setProgress(100);
      onLoaded(image, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片加载失败');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // 防止默认拖放行为
  const preventDefault = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 拖放相关事件处理
  const onDragEnter = (e: React.DragEvent) => {
    preventDefault(e);
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    preventDefault(e);
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    preventDefault(e);
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  // 文件选择
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // 清空 value 允许重复选择同一文件
    e.target.value = '';
  };

  return (
    <div className={`upload-card ${dragging ? 'dragging' : ''} ${hasPhoto ? 'compact' : 'empty'}`}>
      <div
        className="upload-drop"
        onDragEnter={onDragEnter}
        onDragOver={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXT.join(',')}
          className="sr-only"
          onChange={onInputChange}
        />
        {loading ? (
          <div className="upload-loading">
            <div className="progress-ring" />
            <p>{progress < 100 ? `正在加载… ${progress}%` : '即将完成…'}</p>
          </div>
        ) : (
          <>
            <span className="upload-illustration">
              <IconUpload size={hasPhoto ? 22 : 40} />
            </span>
            <p className="upload-main">{hasPhoto ? '点击或拖入更换照片' : '拖放照片到此处'}</p>
            <p className="upload-sub">或点击选择文件</p>
            <p className="upload-hint">支持 JPG / PNG / WEBP · 单张 ≤ 10MB</p>
          </>
        )}
      </div>
      {error && (
        <div className="error-banner" style={{ marginTop: 8 }}>
          <IconWarning size={16} className="error-icon" />
          <span>{error}</span>
          <button type="button" className="error-close" onClick={() => setError(null)}>
            <IconClose size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
