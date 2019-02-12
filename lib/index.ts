import { combineActionHandlers, Store } from './store';
import { ActionsRegistry } from './actions';

// default actions registry
const actions = new ActionsRegistry();
export { Store, combineActionHandlers, ActionsRegistry, actions };
export default actions;
