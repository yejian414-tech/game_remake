// src/core/GameController.js
import { GameState, TurnPhase } from './Constants.js';
import { StateMachine } from './StateMachine.js';

export class GameController {
  constructor(map, player, uiManager) {
    this.map = map;
    this.player = player;
    this.ui = uiManager;

    this.fsm = new StateMachine(GameState.INITIALIZING);
    this.currentPhase = TurnPhase.START;

    // 选角结果，由 CHARACTER_SELECT 状态填入
    // 格式：[{ id, name, hp, ... }, { id, name, hp, ... }]
    this.selectedHeroes = [];

    this.setupStates();
  }

  setupStates() {

    // ── 选择英雄 ──────────────────────────────────────────
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => {
        // 把"确认选择"的回调交给 UI 层
        // UI 收集好两个英雄后调用 onConfirm(heroes)
        this.ui.showCharacterSelect((selectedHeroes) => {
          this.selectedHeroes = selectedHeroes;
          this.fsm.transition(GameState.MAP_GENERATION);
        });
      },
      exit: () => {
        this.ui.hideCharacterSelect();
      }
    });

    // ── 生成地图 ──────────────────────────────────────────
    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => {
        // 把已选英雄传给 UI，让它能展示"正在为 xx 和 xx 生成地图…"之类的提示
        this.ui.showMapGeneration(this.selectedHeroes, () => {
          // TODO: 这里可以触发程序化地图生成逻辑（换种子、选难度等）
          // 目前地图已在 HexMap 构造时生成，直接跳过
          this.fsm.transition(GameState.MAP_EXPLORATION);
        });
      },
      exit: () => {
        this.ui.hideMapGeneration();
      }
    });

    // ── 大地图探索 ────────────────────────────────────────
    this.fsm.addState(GameState.MAP_EXPLORATION, {
      enter: () => {
        this.ui.showMapUI();
        this.startTurn();
      }
    });

    // ── 战斗 ─────────────────────────────────────────────
    this.fsm.addState(GameState.COMBAT, {
      enter: (enemyData) => {
        // onCombatEnd 由 CombatManager（未来实现）在战斗结算后调用
        // result: 'victory' | 'defeat' | 'flee'
        this.ui.showCombatUI(enemyData, (result) => {
          console.log(`[Combat] 结果: ${result}`);
          this.fsm.transition(GameState.MAP_EXPLORATION);
        });
      },
      exit: () => {
        this.ui.hideCombatUI();
      }
    });

    // ── 随机事件 ──────────────────────────────────────────
    this.fsm.addState(GameState.RANDOM_EVENT, {
      enter: (eventData) => {
        this.ui.showEventModal(eventData, () => {
          this.endTurn();
        });
      }
    });
  }

  // ── 回合流程 ─────────────────────────────────────────────

  startTurn() {
    this.currentPhase = TurnPhase.START;
    console.log('Phase: Turn Start');

    const roll = Math.floor(Math.random() * 5) + 2;
    this.player.movementPoints = roll;

    this.ui.updateMovementUI(roll);
    this.currentPhase = TurnPhase.PLAYER_MOVE;
  }

  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;
    if (this.currentPhase !== TurnPhase.PLAYER_MOVE) return;
    if (this.player.movementPoints <= 0) return;

    this.player.setGridPos(q, r, this.map); // 修复：传入 map
    this.player.movementPoints--;
    this.ui.updateMovementUI(this.player.movementPoints);

    this.evaluateTile(q, r);
  }

  evaluateTile(q, r) {
    this.currentPhase = TurnPhase.EVALUATE;
    const tile = this.map.getTile(q, r);
    if (!tile) return; // 边界保护

    console.log(`Evaluating Tile: ${tile.type.name}`);

    if (tile.content && tile.content.type === 'enemy') {
      this.fsm.transition(GameState.COMBAT, tile.content);
    } else {
      if (this.player.movementPoints > 0) {
        this.currentPhase = TurnPhase.PLAYER_MOVE;
      }
    }
  }

  onEndTurnBtnClick() {
    if (
      this.currentPhase !== TurnPhase.PLAYER_MOVE &&
      this.currentPhase !== TurnPhase.EVALUATE
    ) return;
    this.checkRandomEvents();
  }

  checkRandomEvents() {
    const hasEvent = Math.random() > 0.7;
    if (hasEvent) {
      this.fsm.transition(GameState.RANDOM_EVENT, '你遇到了一阵迷雾，丢失了方向...');
    } else {
      this.endTurn();
    }
  }

  endTurn() {
    console.log('Phase: Turn End');
    this.fsm.transition(GameState.MAP_EXPLORATION);
  }
}