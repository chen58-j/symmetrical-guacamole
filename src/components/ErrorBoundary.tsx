import React from 'react';
import { IconError } from './Icons';

interface ErrorBoundaryState {
  hasError: boolean; // 是否捕获到错误
  message: string; // 错误摘要
}

// 全局错误边界：捕获子树渲染异常并显示中文兜底界面
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  // 构造函数：初始化错误状态
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  // 派生错误状态
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  // 记录错误信息（控制台输出便于排查）
  componentDidCatch(error: Error): void {
    console.error('应用发生异常：', error);
  }

  // 渲染兜底界面
  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <IconError size={44} />
          <h2>页面出现了一点问题</h2>
          <p>{this.state.message || '未知错误'}</p>
          <button type="button" className="btn btn-primary btn-md" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
