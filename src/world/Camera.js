// src/world/Camera.js
export class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
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

  // 将屏幕坐标转为相对于地图中心的坐标
  screenToWorld(screenX, screenY) {
    return {
      x: screenX - this.x,
      y: screenY - this.y
    };
  }
}