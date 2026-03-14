// src/world/Camera.js

export class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.zoom = 1.0;
    this.MIN_ZOOM = 0.3;
    this.MAX_ZOOM = 3.0;

    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };

    // 可选边界（世界坐标），由 setBounds() 设置
    this._bounds = null;
    this._canvasW = canvasWidth;
    this._canvasH = canvasHeight;
  }

  /**
   * 设置相机可移动的世界坐标边界。
   * HexMap 生成后调用一次即可。
   *
   * @param {number} minX  世界左边界
   * @param {number} minY  世界上边界
   * @param {number} maxX  世界右边界
   * @param {number} maxY  世界下边界
   */
  setBounds(minX, minY, maxX, maxY) {
    this._bounds = { minX, minY, maxX, maxY };
    this._clamp();
  }

  startDragging(x, y) {
    this.isDragging = true;
    this.lastMousePos = { x, y };
  }

  drag(x, y) {
    if (!this.isDragging) return;
    const dx = x - this.lastMousePos.x;
    const dy = y - this.lastMousePos.y;
    this.x += dx;
    this.y += dy;
    this.lastMousePos = { x, y };
    this._clamp();
  }

  stopDragging() {
    this.isDragging = false;
  }

  /**
   * 以鼠标位置为锚点缩放。
   * @param {number} pivotX  屏幕锚点 X（通常为鼠标 X）
   * @param {number} pivotY  屏幕锚点 Y（通常为鼠标 Y）
   * @param {number} delta   正值放大，负值缩小
   */
  zoomAt(pivotX, pivotY, delta) {
    const factor = delta > 0 ? 1.1 : 0.9;
    const newZoom = Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, this.zoom * factor));
    const ratio = newZoom / this.zoom;

    // 保持锚点对应的世界坐标不变
    this.x = pivotX - (pivotX - this.x) * ratio;
    this.y = pivotY - (pivotY - this.y) * ratio;
    this.zoom = newZoom;
    this._clamp();
  }

  /** 屏幕坐标 → 世界坐标（考虑平移 + 缩放） */
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom,
    };
  }

  /** 世界坐标 → 屏幕坐标 */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.x,
      y: worldY * this.zoom + this.y,
    };
  }

  // ── 内部：将相机位置钳位在边界内 ─────────────────────────────────
  _clamp() {
    if (!this._bounds) return;
    const { minX, minY, maxX, maxY } = this._bounds;
    const z = this.zoom;
    const w = this._canvasW;
    const h = this._canvasH;

    // 相机 x 使得世界 [minX, maxX] 始终覆盖屏幕
    // screen = world * zoom + camera  =>  camera = screen - world * zoom
    const xMax = -minX * z + w * 0.15;          // 左边不露出边界
    const xMin = -maxX * z + w * 0.85;          // 右边不露出边界
    const yMax = -minY * z + h * 0.15;
    const yMin = -maxY * z + h * 0.85;

    // 只有边界有意义时才钳位（地图比屏幕小则不限制）
    if (xMin < xMax) this.x = Math.min(xMax, Math.max(xMin, this.x));
    if (yMin < yMax) this.y = Math.min(yMax, Math.max(yMin, this.y));
  }
}