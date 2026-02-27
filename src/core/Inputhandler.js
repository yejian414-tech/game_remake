// src/core/InputHandler.js
export class InputHandler {
  constructor(canvas, camera, getMap, gameController) {
    this.canvas = canvas;
    this.camera = camera;
    // 支持传入函数以获取最新 map（地图在游戏过程中可能被替换）
    this.getMap = typeof getMap === 'function' ? getMap : () => getMap;
    this.gameController = gameController;

    this.mouseDownPos = { x: 0, y: 0 };
    this.DRAG_THRESHOLD = 5;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onEndTurn = this._onEndTurn.bind(this);
  }

  bind(endTurnBtn) {
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);

    if (endTurnBtn) {
      this.endTurnBtn = endTurnBtn;
      endTurnBtn.addEventListener('click', this._onEndTurn);
    }
  }

  unbind() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);

    if (this.endTurnBtn) {
      this.endTurnBtn.removeEventListener('click', this._onEndTurn);
    }
  }

  _onMouseDown(e) {
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
    this.camera.startDragging(e.clientX, e.clientY);
  }

  _onMouseMove(e) {
    if (this.camera.isDragging) {
      this.camera.drag(e.clientX, e.clientY);
    }
  }

  _onMouseUp(e) {
    const dx = e.clientX - this.mouseDownPos.x;
    const dy = e.clientY - this.mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.camera.stopDragging();

    // 移动距离未超过阈值才视为点击
    if (dist < this.DRAG_THRESHOLD) {
      const map = this.getMap();
      const world = this.camera.screenToWorld(e.clientX, e.clientY);
      const { q, r } = map.pixelToHex(world.x, world.y);
      if (map.getTile(q, r)) {
        this.gameController.movePlayer(q, r);
      }
    }
  }

  _onEndTurn() {
    this.gameController.onEndTurnBtnClick();
  }
}