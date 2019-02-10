import { ActionsRegistry, Handler } from '../actions';

describe('ActionsRegistry', () => {
  describe('register', () => {
    it('adds an action to the registry', () => {
      const registry = new ActionsRegistry();
      const shouldNotThrow = function() {
        registry.register('increment', 'INCREMENT', {
          selector: 'counter',
          handler: <Handler>function({ state }) {
            return state + 1;
          }
        });

        registry.register('decrement', {
          selector: 'counter',
          handler: <Handler>function({ state }) {
            return state - 1;
          }
        });
      };
      expect(shouldNotThrow).not.toThrow();
    });

    it('throws when trying to register an existing action', () => {
      const registry = new ActionsRegistry();
      const toRegister = {
        selector: 'counter',
        handler: <Handler>function({ state }) {
          return state + 1;
        }
      };
      registry.register('increment', 'SOMETHING ELSE', toRegister);
      const shouldThrow = function() {
        registry.register('increment', 'INCREMENT', toRegister);
      };
      expect(shouldThrow).toThrow();
    });

    it('allows registering multiple handlers that dispatch a certain action type', () => {
      const registry = new ActionsRegistry();
      const toRegister = {
        selector: 'counter',
        handler: <Handler>function({ state }) {
          return state + 1;
        }
      };

      const shouldNotThrow = function() {
        registry.register('addOne', 'increment', toRegister);
        registry.register('plusOne', 'increment', toRegister);
      };

      expect(shouldNotThrow).not.toThrow();
    });
  });

  describe('createActionHandler', () => {
    it('creates a reducer that produces a new state', async () => {
      const dispatch = jest.fn();
      const expectedResult = {
        foo: 'bar',
        clock: {
          hour: 12,
          min: 45
        }
      };

      const registry = new ActionsRegistry();
      registry.register('setHour', 'SET_HOUR', {
        selector: 'clock.hour',
        handler: <Handler>function({ state, payload }) {
          if (state === undefined) {
            return 12;
          }
          return payload;
        }
      });

      registry.register('setMinute', 'SET_MINUTE', {
        selector: 'clock.min',
        handler: <Handler>function(state: any) {
          return 45;
        }
      });

      registry.register('setBar', 'SET_BAR', {
        selector: 'foo',
        handler: function(state: any) {
          return 'bar';
        }
      });

      const actionHandler = registry.createActionHandler();
      let state = actionHandler({
        state: undefined,
        action: undefined,
        dispatch
      });
      expect(state).toEqual(expectedResult);
      state = actionHandler({
        state,
        action: { type: 'SET_HOUR', payload: 13 },
        dispatch
      });
      expect(state.clock.hour).toBe(13);
    });
  });

  describe('createStore', () => {
    it('throws when dispatching an unknown action', async () => {
      const registry = new ActionsRegistry();
      registry.register('incrementSec', {
        selector: 'clock.sec',
        handler: <Handler>function({ state, dispatch }) {
          if (state === undefined) {
            return 0;
          }
          return (state + 1) % 60;
        }
      });
      const store = registry.createStore();
      let error;
      try {
        await store.dispatch('foo');
      } catch(e) { error = e;}
      expect(error).toBeDefined();
    });

    describe('do', () => {
      it('handles the three parameter registration cases correctly', async () => {
        const registry = new ActionsRegistry();
        const toRegister = {
          selector: 'counter',
          handler: <Handler>function({ state=0, type}) {
            switch(type) {
              case 'increment':
                return state + 1;
              case 'decrement':
                return state - 1;
              default:
                return state;
            }
          }
        };


        const cb = jest.fn();
        registry.register('changeCounter', ['increment', 'decrement'], toRegister);
        const store = registry.createStore();
        store.get('counter').subscribe(cb);
        await store.do('changeCounter', 'increment');
        expect(cb).toHaveBeenCalledWith(1);
        await store.do('changeCounter', 'decrement');
        expect(cb).toHaveBeenCalledWith(0);

        let err;
        try {
          await store.do('changeCounter', 'not-registered-type');
        } catch(e) {
          err = e;
        }
        expect(err).toBeDefined();
      });
    });
  });

  describe('sideEffect', () => {
    it('is notified when registered actions are dispatched', async () => {
      const registry = new ActionsRegistry();
      registry.register('incrementSec', 'INC_SEC', {
        selector: 'clock.sec',
        handler: <Handler>function({ state, dispatch }) {
          if (state === undefined) {
            return 0;
          }
          return (state + 1) % 60;
        }
      });

      registry.register('incrementMin', 'INC_MIN', {
        selector: 'clock.min',
        handler: <Handler>function({ state}) {
          if (state === undefined) {
            return 0;
          }
          return state + 1;
        }
      });

      // Register our side effect that monitor the number of times
      // incsec and incmin is dispatched
      let countMin = 0;
      let countSec = 0;
      registry.sideEffect({
        actionType: ['INC_SEC', 'INC_MIN'],
        handler: <Handler>function({ type }) {
          switch(type) {
            case 'INC_SEC':
              countSec++;
              break;
            case 'INC_MIN':
              countMin++;
              break;
          }
        }
      });

      const store = registry.createStore();
      const {incrementMin, incrementSec} = store.actions;
      incrementMin();
      incrementSec();
      expect(countMin).toBe(1);
      expect(countSec).toBe(1);
    });
  });

  describe('clock example', () => {
    it ('passes', async () => {
      const registry = new ActionsRegistry();
      registry.register('incrementSec', {
        selector: 'clock.sec',
        handler: <Handler>function({ state, dispatch }) {
          if (state === undefined) {
            return 0;
          }
          const result = state + 1;
          if (result >= 60) {
            dispatch({ type: 'INCREMENT_MIN' });
          }
          return result % 60;
        }
      });

      registry.register('incrementMin', 'INCREMENT_MIN', {
        selector: 'clock.min',
        handler: <Handler>function({ state, dispatch }) {
          if (state === undefined) {
            return 0;
          }
          return state + 1;
        }
      });

      registry.register('resetClock', {
        selector: 'clock',
        handler: <Handler>function() {
          return {
            sec: 0,
            min: 0
          };
        }
      });

      const store = registry.createStore();
      const sec = jest.fn();
      const min = jest.fn();
      store.get('clock', 'sec').subscribe(sec);
      store.get('clock', 'min').subscribe(min);
      expect(sec).toHaveBeenCalledWith(0);
      expect(min).toHaveBeenCalledWith(0);
      for (let i = 0; i < 59; i++) {
        await store.do('incrementSec');
      }
      expect(sec).toHaveBeenCalledWith(59);
      expect(min).toHaveBeenCalledWith(0);
      await store.do('incrementSec');
      // flush dispatch queue for testing);
      await new Promise((resolve) => setImmediate(resolve));
      expect(min).toHaveBeenCalledWith(1);
      await store.do('resetClock');
      expect(sec).toHaveBeenCalledWith(0);
      expect(min).toHaveBeenCalledWith(0);
    });
  });

  describe('counter example', () => {
    it('passes', async () => {
      const registry = new ActionsRegistry();
      registry.register('increment', {
        selector: 'counter',
        handler: <Handler>function({ state }) {
          if (state === undefined) {
            return 0;
          }
          return state + 1;
        }
      });
      registry.register('decrement', {
        selector: 'counter',
        handler: <Handler>function({ state }) {
          if (state === undefined) {
            return 0;
          }
          return state - 1;
        }
      });

      const sub = jest.fn();
      const store = registry.createStore();
      const {increment, decrement} = store.actions;
      store.get('counter').subscribe(sub);
      expect(sub).toBeCalledWith(0);
      await increment();
      expect(sub).toBeCalledWith(1);
      await increment();
      expect(sub).toBeCalledWith(2);
      await decrement();
      await decrement();
      await decrement();
      expect(sub).toBeCalledWith(-1);
    });
  });
});
