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

    it('allows registering multiple actions that dispatch a certain action type', () => {
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
      let state = await actionHandler({
        state: undefined,
        action: undefined,
        dispatch
      });
      expect(state).toEqual(expectedResult);
      state = await actionHandler({
        state,
        action: { type: 'SET_HOUR', payload: 13 },
        dispatch
      });
      expect(state.clock.hour).toBe(13);
    });
  });

  describe('createStore', () => {
    it('(clock example) creates a store based on the registered actions', async () => {
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

      const store = await registry.createStore();
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
      expect(min).toHaveBeenCalledWith(1);
      await store.do('resetClock');
      expect(sec).toHaveBeenCalledWith(0);
      expect(min).toHaveBeenCalledWith(0);
    });

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
      const store = await registry.createStore();
      const shouldThrow = function() {
        store.dispatch('foo');
      };
      expect(shouldThrow).toThrow();
    });
  });

  fdescribe('sideEffect', () => {
    it('affects state change indirectly', async () => {
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

      registry.register('setMin', {
        selector: 'clock.min',
        handler: <Handler>function({ state, payload }) {
          if (state === undefined) {
            return 0;
          }
          return payload;
        }
      });

      // Register our side effect that monitor seconds and dispatches set min
      registry.sideEffect({
        actionType: 'INC_SEC',
        handler: <Handler>async function({ state, dispatch }) {
          const sec = state.get('clock.sec').value;
          const min = state.get('clock.min').value;
          if (sec && sec + 1 >= 60) {
            await dispatch('setMin', min + 1);
            expect(state.get('clock.min').value).toBe(1);
          }
        }
      });

      const store = await registry.createStore();
      for (let i = 0; i < 59; i++) {
        await store.do('incrementSec');
      }
      expect(store.get('clock.sec').value).toBe(59);
      expect(store.get('clock.min').value).toBe(0);
      await store.do('incrementSec');
    });
  });
});
