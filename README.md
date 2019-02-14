# Neodux

Neodux is a state container for JavaScript.

Inspired by [Redux][redux-github], Neodux aims to be quite similar for those
who are already using Redux, but proposes a (subjectively) simpler and easier
to use API for those who are new to state management.

## Installation

> npm install neodux

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
  handler: function({state, dispatch}) {
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
  const store = actions.createStore();
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

Redux is hard to use ouside of a react/view framework because the diffing of
data is done by react/view framework. This makes it so non-framework users have
to implement their own diffing for every subscription they make to the redux
store. Fundamentally, we believe that the diffing of data should exist in the
data layer hence Neodux takes a different approach by providing you with a
layer of observables on top of your state tree. The state itself is still a
*plain-old-javascript-object*, but through interfacing with observables, you
are given the ability to subscribe to any piece of data on the state tree and
be notified only when it changes.

#### 2. Hierarchies automatically generated

Most of the time when you're reading data off of the state tree, the
information that you want are usually the values in the "leaf" nodes. For
example, with the the stop watch app, the data we  need are the values of "min"
and "sec".

```
{
  "clock": {
    "min": 1,
    "sec": 45
  }
}
```

Given that "min" and "sec" are the only values we care about, why even define a
"clock" object? The state tree could have easily been:

```
{
  "min": 1,
  "sec": 45
}
```

The obvious answer is that "clock" is useful for providing context to the
values. Generalizing, hierarchies are important because it is an important
classification tool and provides context to the underlying data.

In Redux, in order to build these hierarchical data structures, you create
reducers that serve only as a intermediary for other reducers.

In Neodux, You define where data lives in the hierarchy first via the
`selector` field. When all of the data is defined, Neodux takes care of
generating the propery hierarchy for you. Overall, we believe it is less code
you have to write because you don't/shouldn't have to think about writing
intermediary reducers.

## LICENSE

MIT

[redux-github]:https://github.com/reduxjs/redux
