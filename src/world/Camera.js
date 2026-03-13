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
  }

  stopDragging() {
    this.isDragging = false;
  }

  /**
   * 以屏幕中心为锚点缩放
   * @param {number} screenCenterX - 屏幕中心 X（canvas.width / 2）
   * @param {number} screenCenterY - 屏幕中心 Y（canvas.height / 2）
   * @param {number} delta         - 正值放大，负值缩小
   */
  zoomAt(screenCenterX, screenCenterY, delta) {
    const factor = delta > 0 ? 1.1 : 0.9;
    const newZoom = Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, this.zoom * factor));
    // 保持屏幕中心对应的世界坐标不变
    this.x = screenCenterX - (screenCenterX - this.x) * (newZoom / this.zoom);
    this.y = screenCenterY - (screenCenterY - this.y) * (newZoom / this.zoom);
    this.zoom = newZoom;
  }

  // 将屏幕坐标转为相对于地图中心的世界坐标（考虑缩放）
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.x) / this.zoom,
      y: (screenY - this.y) / this.zoom,
    };
  }
}