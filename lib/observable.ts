function noop() {}

export interface IObserver {
  next: (data?: any) => void;
  complete: () => void;
}

export function isObserver(obs: any): obs is IObserver {
  return obs.next !== undefined || obs.complete !== undefined;
}

export class Observable {
  private _isComplete: boolean = false;
  private _observers: Array<IObserver> = [];
  private _oncomplete: Array<Function> = [];
  private _onsubscribe: Array<Function> = [];
  private _onunsubscribe: Array<Function> = [];
  /**
   * Observable - create a new observable
   * @param {any} initial value
   * @param {bool} shouldEmitOnSubscribe
   */
  constructor(
    private _value: any = undefined,
    private _shouldEmitOnSubscribe: boolean = false
  ) {
    // bound
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
    this.next = this.next.bind(this);
    this.complete = this.complete.bind(this);
  }

  /**
   * subscribe
   * @param {observable|function}
   * @returns {function} unsubscribe
   */
  subscribe(observer: IObserver | Function) {
    let obs: IObserver;
    if (isObserver(observer)) {
      obs = observer;
    } else {
      const bound = observer.bind(observer);
      obs = {
        next: bound,
        complete: noop
      };
      // let's save the original function so we can use it to unsubscribe
      (obs as any).__orig = observer;
    }
    this._observers.push(obs);
    if (this._shouldEmitOnSubscribe) {
      obs.next(this.value);
    }
    this._onsubscribe.forEach(function(s) {
      s(obs);
    });
    return () => {
      this.unsubscribe(obs);
    };
  }

  /**
   * unsubscribe
   * @param {observer | function}
   */
  unsubscribe(observer: IObserver | Function) {
    const origLength = this._observers.length;
    // observer case
    if (isObserver(observer)) {
      this._observers = this._observers.filter(o => o !== observer);
      return;
    }
    // function case
    this._observers = this._observers.filter(function(o) {
      return !(o as any).__orig || (o as any).__orig !== observer;
    });

    if (this._observers.length !== origLength) {
      this._onunsubscribe.forEach(function(s) {
        s();
      });
    }
  }

  /**
   * next - emit data to the observers
   * @param {any} data
   */
  next(data?: any) {
    if (this._isComplete) {
      return;
    }
    this._value = data;
    this._observers.forEach(o => o.next(data));
  }

  /**
   * complete - complete the observable
   */
  complete() {
    if (this._isComplete) {
      return;
    }
    this._isComplete = true;
    this._observers.forEach(o => o.complete());
    this._oncomplete.forEach(f => f());
    this._observers = [];
    this._oncomplete = [];
    this._onsubscribe = [];
    this._onunsubscribe = [];
  }

  /**
   * onComplete - used by external to receive a notification when the observable is complete
   * @param {function} callback
   */
  set onComplete(f: Function) {
    if (this._isComplete) {
      f();
      return;
    }
    this._oncomplete.push(f);
  }

  set onSubscribe(f: Function) {
    if (this._isComplete) {
      return;
    }
    this._onsubscribe.push(f);
  }

  set onUnSubscribe(f: Function) {
    if (this._isComplete) {
      return;
    }
    this._onunsubscribe.push(f);
  }

  /**
   * value - the last value emitted by the observable
   */
  get value(): any {
    return this._value;
  }

  /**
   * length is the number of subscribers
   */
  get length() {
    return this._observers.length;
  }
}
export default Observable;
