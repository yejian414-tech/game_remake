// src/core/GameStory.js
// 游戏剧情管理模块

export class GameStory {
  // 故事内容定义
  static STORIES = {
    INTRO: {
      title: '冒险开始',
      text: '在遥远的森林中，一棵古老的黑暗古树正在侵蚀这片土地。勇士们，你们需要在20回合内探索这片大地，然后前往地图右下角的黑暗古树，击败它以获得翡翠钥匙，拯救这片土地。'
    }
  };

  constructor(ui) {
    this.ui = ui;
    this.currentStory = null;
  }

  /**
   * 显示故事
   * @param {string} storyKey - 故事键名
   * @param {Function} onNext - 故事完成的回调
   */
  showStory(storyKey = 'INTRO', onNext = null) {
    const story = GameStory.STORIES[storyKey];
    if (!story) {
      console.warn(`Story "${storyKey}" not found`);
      if (onNext) onNext();
      return;
    }

    this.currentStory = storyKey;
    this.ui.showStoryScreen(story.title, story.text, onNext);
  }

  /**
   * 隐藏故事
   */
  hideStory() {
    this.ui.hideStoryScreen();
    this.currentStory = null;
  }

  /**
   * 添加新的故事
   * @param {string} key - 故事键名
   * @param {string} title - 故事标题
   * @param {string} text - 故事内容
   */
  static addStory(key, title, text) {
    GameStory.STORIES[key] = { title, text };
  }

  /**
   * 获取所有可用的故事
   */
  static getAvailableStories() {
    return Object.keys(GameStory.STORIES);
  }
}
