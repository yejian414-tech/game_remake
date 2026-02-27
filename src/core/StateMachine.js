// src/core/StateMachine.js
export class StateMachine {
  constructor(initialState) {
    this.currentState = initialState;
    this.states = {};
  }

  addState(name, { enter, exit }) {
    this.states[name] = { enter, exit };
  }

  transition(newState, data) {
    if (this.states[this.currentState] && this.states[this.currentState].exit) {
      this.states[this.currentState].exit();
    }

    console.log(`State Transition: ${this.currentState} -> ${newState}`);
    this.currentState = newState;

    if (this.states[newState] && this.states[newState].enter) {
      this.states[newState].enter(data);
    }
  }
}