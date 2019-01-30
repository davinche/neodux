import { Observable } from '../observable';

describe('observable', () => {
  describe('constructor', () => {
    it('allows the observable to be set with an initial value', () => {
      const obs = new Observable();
      const obs2 = new Observable('foo');
      expect(obs.value).toBeUndefined();
      expect(obs2.value).toBe('foo');
    });
  });
  describe('next', () => {
    it('calls all of the subscribers with the passed in data', () => {
      const obs = new Observable();
      const myObserver = {
        next: jest.fn(),
        complete: jest.fn()
      };
      obs.subscribe(myObserver);
      obs.next('foo');
      expect(myObserver.next).toHaveBeenCalledWith('foo');
    });
  });

  describe('subscribe', () => {
    it('can accept both an observable and a function', () => {
      const fn = jest.fn();
      const myObserver = {
        next: jest.fn(),
        complete: jest.fn()
      };
      const obs = new Observable();
      const shouldNotThrow = function() {
        obs.subscribe(fn);
        obs.subscribe(myObserver);
      };
      expect(shouldNotThrow).not.toThrow();
    });

    it('returns an unsubscribe function', () => {
      const obs = new Observable();
      const myObserver = {
        next: jest.fn(),
        complete: jest.fn()
      };
      const fn = jest.fn();
      const unsub1 = obs.subscribe(myObserver);
      const unsub2 = obs.subscribe(fn);
      [unsub1, unsub2].forEach(f => {
        expect(f).toBeDefined();
        expect(typeof f).toBe('function');
        f();
      });
      obs.next('foo');
      expect(myObserver.next).not.toHaveBeenCalled();
      expect(fn).not.toHaveBeenCalled();
    });

    it('returns calls the observer immediately if the observable is set to retain the last value', () => {
      const obs1 = new Observable(undefined, true);
      const obs2 = new Observable('bar', true);
      obs1.next('foo');
      const l1 = jest.fn();
      const l2 = jest.fn();
      obs1.subscribe(l1);
      obs2.subscribe(l2);
      expect(l1).toHaveBeenCalledWith('foo');
      expect(l2).toHaveBeenCalledWith('bar');
    });

    it('calls external onsubscribe callbacks', () => {
      const obs1 = new Observable();
      const cb = jest.fn();
      const sub = jest.fn();
      obs1.onSubscribe = cb;
      obs1.subscribe(sub);
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes my observer', () => {
      const fn = jest.fn();
      const myObserver = {
        next: jest.fn(),
        complete: jest.fn()
      };
      const obs = new Observable();
      obs.subscribe(fn);
      obs.subscribe(myObserver);
      obs.unsubscribe(fn);
      obs.unsubscribe(myObserver);
      obs.next('foo');
      expect(fn).not.toHaveBeenCalled();
      expect(myObserver.next).not.toHaveBeenCalled();
    });

    it('calls external onsubscribe callbacks', () => {
      const obs1 = new Observable();
      const cb = jest.fn();
      const sub = jest.fn();
      obs1.onUnSubscribe = cb;
      obs1.subscribe(sub);
      expect(cb).not.toHaveBeenCalled();
      obs1.unsubscribe(sub);
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('calls complete on my observer only once', () => {
      const myObserver = {
        next: jest.fn(),
        complete: jest.fn()
      };
      const obs = new Observable();
      obs.subscribe(myObserver);
      obs.complete();
      obs.complete();
      expect(myObserver.next).not.toHaveBeenCalled();
      expect(myObserver.complete).toHaveBeenCalled();
      obs.next('foo');
      expect(myObserver.next).not.toHaveBeenCalled();
      expect(myObserver.complete.mock.calls.length).toBe(1);
    });
  });

  describe('oncomplete', () => {
    it('allows an external callback to know when an observable is complete', () => {
      const obs = new Observable();
      const observer = {
        next: function() {},
        complete: jest.fn()
      };
      const cb = jest.fn();
      obs.subscribe(observer);
      obs.onComplete = cb;
      obs.complete();
      obs.complete();
      expect(observer.complete).toHaveBeenCalled();
      expect(cb).toHaveBeenCalled();
      expect(observer.complete).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('calls the callback immediately if it is already complete', () => {
      const cb = jest.fn();
      const obs = new Observable();
      obs.complete();
      obs.onComplete = cb;
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('value', () => {
    it('retains the data from the last call to `next`', () => {
      const obs = new Observable('foo');
      expect(obs.value).toBe('foo');
      obs.next('bar');
      expect(obs.value).toBe('bar');
    });
  });

  describe('length', () => {
    it('returns the number', () => {
      const obs = new Observable();
      expect(obs.length).toBe(0);
      obs.subscribe(function() {});
      expect(obs.length).toBe(1);
    });
  });
});
