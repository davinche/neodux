# Neodux

Neodux is a state container for JavaScript.

Inspired by [Redux][redux-github], Neodux aims to be quite similar for those
who are already using Redux, but proposes a (subjectively) simpler and easier
to use API for those who are new to state management.

## Motivation - Comparing Neodux/Redux

### Similarities

Neodux borrows a lot of the same definitions from Redux (or flux general).
Things like **dispatching** an **action** in Redux/flux is exactly what you
would expect in Neodux.

In Redux, you have **Reducers** that change the state tree. In Neodux we have
**Action Handlers** that change the state tree. Both takes in the current state
and optionally a payload and returns a new state.

In the grand scheme of things, the two are identical. In fact, existing Redux
users can build `Action Handlers` in almost the same way `Reducers` are built.
There is even a utility function in the library called `combineActionHandlers`!


### Differences

#### 1. Subscribe to anything

Any data in the state tree can be subscribed to. This is achieved by adding an
additional layer of observables on top of the state tree. The state object
iself is a **plain-old-javascript-object**, but an observerables is what you
interface with when you want to subscribe to data changes. This additional
layer makes it possible for subscribers to only be called only when relevant
data in the state tree has changed.

#### 2. Async by default

Sometimes there are things happening in an app that is just async in nature. In
Neodux, when an action handler returns a promise, the store waits for the data
to be resolved before an update is considered complete.

This probably raises some questions:

> What about API calls that are asynchronous but the result of the call needs
> to be added to state tree? Won't waiting for this call result in unwanted
> side effects?

For action handlers that do not directly affect what is on the state tree, you
can register them as "sideEffects". A **side effect** is just an action handler
where the return value is ignored by state tree. Side effects has full access
to the data in the state tree and should dispatch additional actions if it
needs to mutate it.

#### 3. Less boilerplate code

We think that action handlers created in the preferred way will  result in less
boilerplate code when compared to equivalent action/reducer code in a Redux
implementation.

More detail on this thought can be found in the documentation.

## Neodux in Action

Below is an example of a simple stop watch app built with Neodux. The example
below demonstrates the preferred way of doing state management with Neodux.

A Neodux and Redux implementation comparison can be found here:
<https://github.com/davinche/neodux-test>

```javascript
 import {actions} from './dist/index.es.js';
 /**
 * This is an action handler. Note that the section of the state tree
 * it will be changing is indicated by the "selector" property.
 *
 * For existing Redux users: notice the lack of "switching" on action.type.
 * Under the hood this is still happening, but when actions and reducers
 * are "1-to-1", this process has been abstracted away. 
 *
 * You can still define an "action.type" via the three argument version
 * of `actions.register`.
 */
actions.register('incrementSec', {
  selector: 'clock.sec',
  handler: async function({state, dispatch}) {
    // initial value
    if (state === undefined) {
      return 0
    }
    // increment seconds
    const next = (state + 1) % 60;
    // increment minute after rollover
    if (next === 0) {
      dispatch('incrementMin');
    }
    return next;
  }
});

actions.register('incrementMin', 'INCREMENT_MIN', {
  selector: 'clock.min',
  handler: function({state}) {
    // initial value
    if (state === undefined) {
      return 0;
    }
    // increment minute
    return state + 1;
  }
});

actions.register('resetClock', {
  selector: 'clock',
  handler: function() {
    return {
      min: 0,
      sec: 0
    }
  }
});

document.addEventListener('DOMContentLoaded', async function() {
  const store = await actions.createStore();
  const sec = document.getElementById('sec');
  const min = document.getElementById('min');
  const start = document.getElementById('start');
  const reset = document.getElementById('reset');

  // the subscribers is only notified when `clock.sec` changes
  store.get('clock.sec').subscribe(function(val) {
    sec.textContent = pad(val);
  });

  store.get('clock.min').subscribe(function(val) {
    min.textContent = pad(val);
  });

  let interval;
  // incrementSec and resetClock (as defined through the registration process above)
  // are functions you can pull off of `store.actions`.
  // Calling these functions is equivalent to calling
  // store.dispatch() with the proper action/type.
  // Optionally, passing an argument into these calls populates
  // the `payload` field of the action dispatched.
  //
  // `incrementMin` was created using the three argument variant of the
  // register method.
  // The `action.type` for incrementMin is "INCREMENT_MIN".
  //
  // If you were to call `store.action.incrementMin(1)`,
  // this would be equivalent to:
  //
  // `store.dispatch({type: 'INCREMENT_MIN', payload: 1});`
  const {incrementSec, resetClock} = store.actions;
  start.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    start.disabled = true;
    interval = setInterval(incrementSec, 1000);
  });

  reset.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    start.disabled = false;
    clearInterval(interval);
    resetClock();
  });
});

```
## LICENSE

MIT

[redux-github]:https://github.com/reduxjs/redux
