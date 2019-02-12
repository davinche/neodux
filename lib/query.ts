import { Getter, NoValue } from './getter';
import { Observable, IObserver, isObserver } from './observable';
// determine whether a listener should be updated
export type UpdateComparer = (oldVal: any, newVal: any) => boolean;

interface parentObservable {
  key: string;
  parent: ObservableWrapper;
}

export class ObservableWrapper {
  private _childWrappers: { [key: string]: ObservableWrapper } = {};
  constructor(
    private _observable: Observable = new Observable(undefined, true),
    private _descriptor: parentObservable | undefined = undefined
  ) {
    this.__subscribeToParent = this.__subscribeToParent.bind(this);
    this._observable.onUnSubscribe = this.__checkToDealloc.bind(this);
    if (this._descriptor) {
      this._descriptor.parent.observable.subscribe(this.__subscribeToParent);
    }
  }

  __checkToDealloc() {
    if (!this._observable.length) {
      if (this._descriptor) {
        this._descriptor.parent.observable.unsubscribe(
          this.__subscribeToParent
        );
      }
      this._childWrappers = {};
    }
  }

  __subscribeToParent(val: any) {
    this.observable.next(
      new Getter(val).get((this._descriptor as any).key).value
    );
  }

  /**
   * observable - the observable that is being wrapped
   * @returns {observable}
   */
  get observable() {
    return this._observable;
  }

  /**
   * get - gets a child observable
   * @param {string} key
   * @returns {observable|undefined}
   */
  get(key: string) {
    return this._childWrappers[key];
  }

  upgrade(key: string) {
    // this should never happen
    /* istanbul ignore next */
    if (this.get(key)) {
      return this.get(key);
    }
    const initialValue = this.observable.value !== undefined ?
      this.observable.value[key] :
      undefined;
    const childWrapper = new ObservableWrapper(
      new Observable(initialValue, true),
      { key, parent: this }
    );
    this._childWrappers[key] = childWrapper;
    return childWrapper;
  }
}

/**
 * StateQuery - object to help query the state
 */
export class StoreQuery {
  constructor(
    private _root: ObservableWrapper,
    private _path: Array<string> = []
  ) {}

  // default checker for updating is a strict equality
  public static DEFAULT_SHOULD_UPDATE(oldVal: any, newVal: any): boolean {
    return oldVal !== newVal;
  }

  get(key: string | Array<string>, ...remaining: Array<string>) {
    if (!(key instanceof Array)) {
      if (!remaining.length) {
        key = key.split('.');
      } else {
        key = [key];
      }
    }
    return new StoreQuery(this._root, [...this._path, ...key, ...remaining]);
  }

  get value(): any {
    const getter = new Getter(this._root.observable.value);
    return getter.get(this._path).value;
  }

  /**
   * subscribe - subscribe to an observable in the state tree
   * @param {observer|function} observer
   * @param {function} comparer - function returns a boolean indicating
   *     when the observer should be called. Old and new values of the
   *     property are passed into the comparer.
   */
  subscribe(
    o: IObserver | Function,
    shouldUpdate: UpdateComparer = StoreQuery.DEFAULT_SHOULD_UPDATE
  ) {
    // ------------------------------------------------------------------------
    // SIMPLE STUFF -----------------------------------------------------------
    // ------------------------------------------------------------------------
    // make sure we have an observer
    let observer: IObserver;
    if (isObserver(o)) {
      observer = o;
    } else {
      const bound = o.bind(o);
      observer = {
        next: bound,
        complete: function() {}
      };
    }

    // wrap observer.next and check the `shouldUpdate` condition
    // before passing it down to the observers
    const nextWithCondition = (function() {
      let doneOnce = false;
      let oldVal: any;
      return function(newVal: any) {
        if (shouldUpdate(oldVal, newVal) || !doneOnce) {
          doneOnce = true;
          oldVal = newVal;
          observer.next(newVal);
        }
      };
    })();

    // our fully wrapped observer is READY
    const wrappedObserver: IObserver = {
      next: nextWithCondition,
      complete: observer.complete
    };

    // ------------------------------------------------------------------------
    // HARDER STUFF: finding where to subscribe to-----------------------------
    // ------------------------------------------------------------------------

    // Base Case: subscribing to root object
    if (!this._path.length) {
      return this._root.observable.subscribe(wrappedObserver);
    }

    // ------------------------------------------------------------------------
    // The rest...
    // ------------------------------------------------------------------------
    // Plan:
    //
    // Iterate as far as we can through ObserverableWrappers tree to see if
    // the value we are looking for is part of an observable.
    //
    // If the path to the value we want is a path of Observables,
    // we can subscribe to the last observable immediately.
    //
    // If the path to the value is not a path of observables,
    // we take the value from the last found observable and traverse it
    // (an object probably) and try to get to the nested value that we want.
    //
    // Once we get to the value, we "upgrade" each property in the path
    // that was not an observable into an observable.
    // We then subscribe to the last observable.

    let currWrapper: ObservableWrapper = this._root;
    let startUpgradeIndex: number = 0;
    let isLastFoundAWrapper = true;
    let getter = NoValue;

    for (let i = 0; i < this._path.length; i++) {
      const key: string = this._path[i];
      const wrapper = currWrapper.get(key);
      if (wrapper) {
        currWrapper = wrapper;
      } else {
        isLastFoundAWrapper = false;
        startUpgradeIndex = i;
        // start exploring the properties of the object that is the value
        // of the last wrapper found.
        const g = new Getter(currWrapper.observable.value);
        getter = g.get(this._path.slice(i));
        break;
      }
    }

    // subscribeWrapper will ultimately be the wrapper that contains the
    // observable that we want to subscribe to.
    let subscribeWrapper: ObservableWrapper = currWrapper;
    if (!isLastFoundAWrapper) {
      // If the getter is NoValue, then this value does not
      // exist in the state tree.
      // This is likely a mistake by the developer so we want to error out here.
      // if (getter === NoValue) {
      //   throw new Error(
      //     `[state.${this._path.join('.')}] does not exist on the state tree]`
      //   );
      // }

      // upgrade each node along the object into an observable
      for (let i = startUpgradeIndex; i < this._path.length; i++) {
        const nextWrapper = currWrapper.upgrade(this._path[i]);
        currWrapper = nextWrapper;
      }
    }

    return currWrapper.observable.subscribe(wrappedObserver);
  }
}
