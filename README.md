# javascript-helpers
Misc javascript files for inclusion in personal projects.
Some may find themselves in their own repositories on reaching utility sufficiency.

### timers.js
Create nested timers that pause on _another's_ pause somewhere up the parent chain.  Also an experiment in defineProperty usage.

The `Clock` is where the recursive complexity lies, here.  Pausing and unpausing a Clock higher in the Clock tree affects the time on all child Clock nodes.

The `Timer` sits atop a Clock's emulated time.  If a Clock is paused, as far as the Timer is concerned, time simply hasn't passed.

#### Objects
**Clock**
- pause
  - pause Clock
- unpause
  - unpause Clock
- paused
  - get whether paused
- pauseTotal
  - get total time paused, recursing the parent chain
- time
  - get time, recursing the parent chain

**Timer**
- millis
  - get duration of Timer in milliseconds
- start
  - start the Timer, according to parent clock time
- startTime
  - get start time
- rawProgress
  - get decimal value beginning at 0, where 1 is intended stop time, and values > 1 are that far beyond
    - loop holds no bearing, here
- progress
  - get decimal value between 0-1, between start and intended stop time
    - if loop has been specified, will return value according to cycle

### itertools.js
Mirror python's itertools module's functionaility in javascript.  An experiment in javascript's yield statements.

### helpers.js
Helper functions used for typing brevity and general convenience, a number of which are experimental, untested, or unfinished.

### drag.js
A simple (enough) means of tracking mouse-drag behavior on an object.  An old experiment, refined over time and use.  Also commits the sin of extending the DOM.
