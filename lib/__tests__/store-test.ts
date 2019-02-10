import { Store, combineActionHandlers } from '../store';

describe('Store', () => {
  describe('constructor', () => {
    it('takes in an actionHandler and builds a new state from it', async () => {
      const ah = function() {
        return {
          counter: 0
        };
      };
      const myStore = new Store(ah);
      myStore.init();
      expect(myStore.getState()).toEqual({ counter: 0 });
    });
  });

  describe('dispatch', () => {
    it('dispatches actions to my actionHandler', async () => {
      const actionHandler = jest.fn();
      const myStore = new Store(actionHandler);
      const action = {
        type: 'foo'
      };
      await myStore.dispatch(action);
      expect(actionHandler).toHaveBeenCalled();
      expect(actionHandler.mock.calls[0][0]['action']).toBe(action);
    });
  });

  describe('get', () => {
    const actionHandler = function() {
      return {
        foo: { bar: { baz: 'foobarbaz' } }
      };
    };

    const myStore = new Store(actionHandler);
    beforeAll(async () => {
      myStore.init();
    });
    it('returns the value from a deeply nested object', () => {
      [
        myStore
          .get('foo')
          .get('bar')
          .get('baz').value,
        myStore.get('foo').get('bar', 'baz').value,
        myStore.get(['foo', 'bar']).get('baz').value,
        myStore.get(['foo', 'bar']).get(['baz']).value
      ].forEach(expected => expect(expected).toBe('foobarbaz'));
    });

    it('returns undefined when accessing nested objects that do not exist', () => {
      expect(
        myStore
          .get('does')
          .get('not')
          .get('exist').value
      ).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('throws an error when trying to listen to something non-existant', async () => {
      const actionHandler = function() {
        return { foo: 'bar' };
      };
      const store = new Store(actionHandler);
      store.init();
      const observer = {
        next: jest.fn(),
        complete: function() {}
      };
      const shouldThrow = function() {
        store
          .get('this')
          .get('does')
          .get('not')
          .get('exist')
          .subscribe(observer);
      };
      expect(shouldThrow).toThrow();
    });

    it('calls the observers when there is a on the the state tree ', async () => {
      const fooActionHandler = () => 'bar';
      const barActionHandler = ({ state }: { state: any }) => {
        if (state === undefined) {
          return { baz: 42 };
        }
        return { baz: state.baz + 1 };
      };

      const store = new Store(
        combineActionHandlers({ foo: fooActionHandler, bar: barActionHandler })
      );
      store.init();
      const observer1 = jest.fn();
      const observer2 = jest.fn();
      const observer3 = jest.fn();

      store.get('foo').subscribe(observer1);

      store.get(['bar', 'baz']).subscribe(observer2);

      expect(observer1).toHaveBeenCalledWith('bar');
      expect(observer2).toHaveBeenCalledWith(42);
      expect(observer3).not.toHaveBeenCalled();

      store.get('bar', 'baz').subscribe(observer3);

      [observer1, observer2, observer3].forEach(l => l.mockClear());
      await store.dispatch({ type: 'bar' });
      expect(observer1).not.toHaveBeenCalled();
      expect(observer2).toHaveBeenCalledWith(43);
      expect(observer3).toHaveBeenCalledWith(43);
    });

    it('allows subscription on the root object', async () => {
      const actionHandler = function() {
        return {
          counter: 0
        };
      };

      const expectedState = {
        counter: 0
      };

      const store = new Store(actionHandler);
      store.init();
      const observer = jest.fn();
      store.subscribe(observer);
      expect(observer).toHaveBeenCalledWith(expectedState);
      observer.mockClear();
      expect(observer).not.toHaveBeenCalled();
      await store.dispatch({ type: 'whatever' });
      expect(observer).toHaveBeenCalledWith(expectedState);
    });
  });

  describe('getState', () => {
    it('returns the state of the store', async () => {
      const fooactionHandler = () => 'bar';
      const baractionHandler = ({ state }: { state: any }) => {
        if (state === undefined) {
          return { baz: 42 };
        }
        return { baz: state.baz + 1 };
      };
      const store = new Store(
        combineActionHandlers({ foo: fooactionHandler, bar: baractionHandler })
      );
      store.init();
      expect(store.getState()).toEqual({
        foo: 'bar',
        bar: {
          baz: 42
        }
      });
    });
  });
});
