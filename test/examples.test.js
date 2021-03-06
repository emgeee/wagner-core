var assert = require('assert');

var wagner = require('../');

/* `invokeAsync()` is the primary function you will use to execute
 * async code with Wagner. It takes as arguments a function that
 * takes an error and a list of parameters, and a map of *locals*. */
describe('`wagner.invokeAsync()`', function() {
  /* Wagner's most basic functionality is to register an async
   * task by name, and then utilize the value computed by the
   * async task in subsequent tasks. */
  it('allows you to execute async tasks based on parameter names', function(done) {
    wagner.task('eggs', function(callback) {
      setTimeout(function() {
        callback(null, 'done cooking!');
      }, 5);
    });

    wagner.invokeAsync(function(error, eggs) {
      assert.ok(!error);
      assert.equal(eggs, 'done cooking!');
      done();
    }, {});
  });

  /* *locals* are values specific to a particular execution of
   * `invokeAsync()`. They may be utilized by any task in the
   * task graph. */
  it('allows you to use locals', function(done) {
    wagner.task('eggs', function(number, callback) {
      setTimeout(function() {
        callback(null, 'finished making ' + number + ' eggs');
      }, 5);
    });

    wagner.invokeAsync(function(error, eggs) {
      assert.ok(!error);
      assert.equal(eggs, 'finished making 4 eggs');
      done();
    }, { number: 4 });
  });

  /* Tasks can rely on each other, and each task is executed as soon
   * as all its dependencies are met. */
  it('executes tasks with maximum parallelization', function(done) {
    var executed = {};

    wagner.task('pan', function(callback) {
      setTimeout(function() {
        executed['pan'] = true;
        callback(null, 'finished heating pan');
      }, 5);
    });

    wagner.task('eggs', function(counts, pan, callback) {
      assert.ok(!executed['bacon']);
      setTimeout(function() {
        executed['eggs'] = true;
        callback(null, 'finished making ' + counts.eggs + ' eggs');
      }, 5);
    });

    wagner.task('bacon', function(counts, pan, callback) {
      assert.ok(!executed['eggs']);
      setTimeout(function() {
        executed['bacon'] = true;
        callback(null, 'finished making ' + counts.bacon + ' bacon strips');
      }, 5);
    });

    wagner.invokeAsync(
      function(error, eggs, bacon) {
        assert.ok(!error);
        assert.ok(executed['pan']);
        assert.equal(eggs, 'finished making 4 eggs');
        assert.equal(bacon, 'finished making 3 bacon strips');
        done();
      },
      { counts: { eggs: 4, bacon: 3 } });
  });

  /* If any task in the execution tree returns an error, execution
   * is stopped immediately and the function is called with the error
   * as the first parameter. */
  it('bubbles up the first error', function(done) {
    wagner.task('eggs', function(callback) {
      setTimeout(function() {
        callback('no eggs left!');
      }, 5);
    });

    wagner.task('bacon', function(callback) {
      setTimeout(function() {
        callback('no bacon left!');
      }, 25);
    });

    wagner.invokeAsync(
      function(error, eggs, bacon) {
        assert.equal(error, 'no eggs left!');
        assert.ok(!eggs);
        assert.ok(!bacon);
        done();
      },
      {});
  });

  /* For compatibility with the `yield` keyword, as well as chaining,
   * `invokeAsync()` returns a
   * [bluebird](https://www.npmjs.org/package/bluebird) promise that is
   * rejected if an error occurs in any of the tasks, or fulfilled with
   * the return value of the provided function otherwise. */
  it('returns an Promises/A+ conformant promise', function(done) {
    wagner.task('valkyrie', function(callback) {
      setTimeout(function() {
        callback(null, 'valkyrie');
      }, 0);
    });

    var promise = wagner.invokeAsync(function(error, valkyrie) {
      return valkyrie;
    }, {});

    promise.then(function(v) {
      assert.equal(v, 'valkyrie');
      done();
    });
  });
});

/* `invoke()` is the synchronous version of `invokeAsync()`. It will
 * *only* execute sync tasks (tasks that don't take a parameter named
 * 'callback' or 'cb') and throw an error if there are any async tasks. */
describe('`wagner.invoke()`', function() {
  it('executes sync tasks and returns the return value of the provided function', function() {
    wagner.task('tristan', function() {
      return 'tristan';
    });

    wagner.task('isolde', function() {
      return 'isolde';
    });

    var e;
    var t;
    var i;
    var returnValue = wagner.invoke(function(error, tristan, isolde) {
      e = error;
      t = tristan;
      i = isolde;

      return 'done';
    });

    assert.ok(!e);
    assert.equal(t, 'tristan');
    assert.equal(i, 'isolde');
    assert.equal(returnValue, 'done');
  });
});

/* For convenience, Wagner includes its own `.parallel()` function for
 * executing a collection of async functions in parallel. */
describe('`wagner.parallel()`', function() {
  it('takes a map and executes a function for all key/value pairs', function(done) {
    wagner.parallel(
      { first: 'eggs', second: 'bacon' },
      function(value, key, callback) {
        callback(null, value.toUpperCase());
      },
      function(error, results) {
        assert.ok(!error);
        assert.equal(results.first.result, 'EGGS');
        assert.equal(results.second.result, 'BACON');
        done();
      });
  });
});