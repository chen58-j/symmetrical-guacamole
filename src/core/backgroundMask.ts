// 背景区域遮罩计算：从网格边缘出发 BFS 洪水填充
// 只标记与边缘连通的、颜色等于 backgroundIdx 的格子为"需排除"
// 主体内部的同色格子（如白色眼睛）因为不与边缘连通，不会被标记

/**
 * 计算背景遮罩：从网格四条边缘出发，沿 backgroundIdx 颜色的格子做 BFS
 * @param grid 拼豆颜色索引数组（Uint16Array）
 * @param gridW 网格宽度
 * @param gridH 网格高度
 * @param backgroundIdx 背景色在 BEAD_PALETTE 中的下标
 * @returns Uint8Array，长度 gridW*gridH；1=边缘外背景（排除），0=保留
 */
export function computeBackgroundMask(
  grid: Uint16Array,
  gridW: number,
  gridH: number,
  backgroundIdx: number
): Uint8Array {
  const len = gridW * gridH;
  const mask = new Uint8Array(len); // 0=保留，1=排除

  // 边缘 BFS 队列（用两个数组模拟环形队列避免 shift 性能问题）
  // 每个元素编码为 index = y * gridW + x
  const queue = new Int32Array(len);
  let head = 0;
  let tail = 0;

  // 从四条边缘的 backgroundIdx 格子出发
  // 上边缘 (y=0)
  for (let x = 0; x < gridW; x++) {
    const idx = x;
    if (grid[idx] === backgroundIdx && mask[idx] === 0) {
      mask[idx] = 1;
      queue[tail++] = idx;
    }
  }
  // 下边缘 (y=gridH-1)
  for (let x = 0; x < gridW; x++) {
    const idx = (gridH - 1) * gridW + x;
    if (grid[idx] === backgroundIdx && mask[idx] === 0) {
      mask[idx] = 1;
      queue[tail++] = idx;
    }
  }
  // 左边缘 (x=0, 排除已检查的首尾)
  for (let y = 1; y < gridH - 1; y++) {
    const idx = y * gridW;
    if (grid[idx] === backgroundIdx && mask[idx] === 0) {
      mask[idx] = 1;
      queue[tail++] = idx;
    }
  }
  // 右边缘 (x=gridW-1)
  for (let y = 1; y < gridH - 1; y++) {
    const idx = y * gridW + (gridW - 1);
    if (grid[idx] === backgroundIdx && mask[idx] === 0) {
      mask[idx] = 1;
      queue[tail++] = idx;
    }
  }

  // BFS 洪水填充：向四个方向扩展
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % gridW;
    const cy = (cur - cx) / gridW;

    // 四个邻居
    // 上 (y-1)
    if (cy > 0) {
      const ni = cur - gridW;
      if (grid[ni] === backgroundIdx && mask[ni] === 0) {
        mask[ni] = 1;
        queue[tail++] = ni;
      }
    }
    // 下 (y+1)
    if (cy < gridH - 1) {
      const ni = cur + gridW;
      if (grid[ni] === backgroundIdx && mask[ni] === 0) {
        mask[ni] = 1;
        queue[tail++] = ni;
      }
    }
    // 左 (x-1)
    if (cx > 0) {
      const ni = cur - 1;
      if (grid[ni] === backgroundIdx && mask[ni] === 0) {
        mask[ni] = 1;
        queue[tail++] = ni;
      }
    }
    // 右 (x+1)
    if (cx < gridW - 1) {
      const ni = cur + 1;
      if (grid[ni] === backgroundIdx && mask[ni] === 0) {
        mask[ni] = 1;
        queue[tail++] = ni;
      }
    }
  }

  return mask;
}

/**
 * 统计 mask 中被排除的格子数量
 */
export function countMasked(mask: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < mask.length; i++) {
    count += mask[i];
  }
  return count;
}

/**
 * 统计 mask 中被排除的格子数量（按颜色分组）
 * 返回 Map<colorIdx, excludedCount>
 */
export function countMaskedByColor(
  mask: Uint8Array,
  grid: Uint16Array
): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      const idx = grid[i];
      map.set(idx, (map.get(idx) ?? 0) + 1);
    }
  }
  return map;
}
