import { Getter } from './getter';
import { IObserver } from './observable';
import {
  IAction,
  IActionHandler,
  IActionHandlerParams,
  ISideEffectHandler
} from './actions';
import { StoreQuery, ObservableWrapper } from './query';

export class Store {
  private _root: ObservableWrapper;
  private _actions: { [name: string]: Function } = {};
  private _dispatchQueue: Array<() => Promise<void>> = [];
  private _isDispatching: boolean = false;

  constructor(
    private _actionHandler: IActionHandler,
    actionNameToType?: { [name: string]: string },
    private _sideEffectHandlers?: { [actionType: string]: ISideEffectHandler[] }
  ) {
    this._root = new ObservableWrapper();

    // create action dispatchers
    if (actionNameToType) {
      Object.keys(actionNameToType).forEach((key: string) => {
        const actionType = actionNameToType[key];
        this._actions[key] = async (payload: any) => {
          await this.dispatch({ type: actionType, payload });
        };
      });
    }
  }

  async init(initialState?: any) {
    this._state = await this._actionHandler({
      state: initialState,
      action: undefined,
      dispatch: (action: IAction | string, payload?: any) =>
        this.dispatch(action, payload)
    });
  }

  // Internal Getter/Setter of Root State
  set _state(val) {
    this._root.observable.next(val);
  }
  get _state() {
    return this._root.observable.value;
  }

  /**
   * get - navigate the state tree to the desired node to subscribe to
   * @param {string} key
   * @returns {object} StoreQuery - used to query the store
   */

  get(key: string | string[] = '', ...rest: string[]) {
    if (!(key instanceof Array)) {
      key = key
        .split('.')
        .map(s => s.trim())
        .filter(s => s !== '');
    }
    return new StoreQuery(this._root, [...key, ...rest]);
  }

  /**
   * getState - alias to value
   * @returns {object} store
   */
  getState() {
    return this.value;
  }

  /**
   * value - gets the value of the store
   * @returns {object} store
   */
  get value() {
    return this._state;
  }

  /**
   * subscribe - subscribe to the root object
   * @param {observer|function} observer
   * @param {function} comparer - function returns a boolean indicating
   *     when the observer should be called. Old and new values of the
   *     property are passed into the comparer.
   */
  subscribe(o: IObserver | Function, shouldUpdate = () => true) {
    return new StoreQuery(this._root).subscribe(o, shouldUpdate);
  }

  /**
   * dispatch - dispatch action to reducers
   * @param {object|string} name of action creator | action
   * @param {any} payload
   */
  async dispatch(action: IAction | string, payload?: any) {
    if (typeof action === 'string') {
      if (this._actions[action]) {
        await this._actions[action](payload);
        return;
      } else {
        throw new Error(`action="${action}" does not exist`);
      }
    }

    // queue up dispatch if we are in the middle of a dispatch
    if (this._isDispatching) {
      return new Promise(resolve => {
        const dispatchFn = async () => {
          await this.dispatch(action, payload);
          resolve();
        };
        this._dispatchQueue.push(dispatchFn);
      });
    }

    return new Promise(async resolve => {
      this._isDispatching = true;
      // side effects
      if (this._sideEffectHandlers && this._sideEffectHandlers[action.type]) {
        this._sideEffectHandlers[action.type].forEach(handler => {
          handler.handler({
            state: new Getter(this.value),
            dispatch: this.dispatch.bind(this)
          });
        });
      }

      // get new state
      this._state = await this._actionHandler({
        state: this._state,
        action,
        dispatch: this.dispatch.bind(this)
      });

      this._isDispatching = false;
      resolve();

      // flush dispatch queue
      if (this._dispatchQueue.length) {
        const next = this._dispatchQueue[0];
        this._dispatchQueue = this._dispatchQueue.slice(1);
        next();
      }
    });
  }

  /**
   * do - invokes actions by their actionName
   *     Alias to the two parameter call on dispatch.
   * @param {string} the name of the action to invoke
   * @param {payload} the payload of the action
   *
   */
  async do(actionName: string, payload?: any) {
    return this.dispatch(actionName, payload);
  }

  /**
   * actions
   * @returns {object} actions - all invokable actions
   */
  get actions() {
    return this._actions;
  }
}

/**
 * CombineActionHandlers - Takes an object where values are ActionHandlers and converts it
 * into a single action handler. Only really used if action handlers are created without
 * the use of the action registry.
 * @param {object} {[key:string]: ActionHandler}
 */
export function combineActionHandlers(actionHandlers: {
  [key: string]: IActionHandler;
}) {
  return function(params: IActionHandlerParams<any>) {
    const { state = {}, action, dispatch } = params;
    Object.keys(actionHandlers).forEach(function(k) {
      state[k] = actionHandlers[k]({ state: state[k], action, dispatch });
    });
    return state;
  };
}
