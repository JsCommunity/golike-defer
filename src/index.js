const { push } = Array.prototype;

const toDecorator = wrap => (target, key, descriptor) => {
  if (key === undefined) {
    return wrap(target);
  }
  descriptor.value = wrap(descriptor.value);
  return descriptor;
};

// ===================================================================

const defaultOnError = error => {
  console.error(error);
};

const SUCCESS = 1 << 0;
const FAILURE = 1 << 1;

function Deferred(fn, thisArg, args, when) {
  this.args = args;
  this.fn = fn;
  this.thisArg = thisArg;
  this.when = when;
}
Deferred.prototype.run = function(when) {
  if ((when & this.when) !== 0) {
    return this.fn.apply(this.thisArg, this.args);
  }
};

const defer = (fn, onError = defaultOnError) =>
  function() {
    const deferreds = [];
    const makeAddDeferred = when =>
      function $defer(deferred) {
        let args;
        if (typeof deferred !== "function") {
          deferred = this[deferred];
        }
        const nArgs = arguments.length - 1;
        if (nArgs !== 0) {
          args = new Array(nArgs);
          for (let i = 0; i < nArgs; ++i) {
            args[i] = arguments[i + 1];
          }
        }
        deferreds.push(new Deferred(deferred, this, args, when));
      };
    const $defer = makeAddDeferred(FAILURE | SUCCESS);
    $defer.onFailure = makeAddDeferred(FAILURE);
    $defer.onSuccess = makeAddDeferred(SUCCESS);

    const args = [$defer];
    push.apply(args, arguments);
    let hasThrown, result;
    try {
      result = fn.apply(this, args);

      let then;
      if (result != null && typeof (then = result.then) === "function") {
        const executeAndForward = when => {
          let i = deferreds.length;
          const loop = () => {
            if (i === 0) {
              return result;
            }
            try {
              const result = deferreds[--i].run(when);
              let then;
              return result != null &&
                typeof (then = result.then) === "function"
                ? then.call(result, loop, reportAndLoop)
                : loop();
            } catch (error) {
              return reportAndLoop(error);
            }
          };
          const reportAndLoop = error => {
            onError(error);
            return loop();
          };

          return loop();
        };
        return then.call(
          result,
          () => executeAndForward(SUCCESS),
          () => executeAndForward(FAILURE)
        );
      }

      hasThrown = false;
    } catch (error) {
      result = error;
      hasThrown = true;
    }

    const when = hasThrown ? FAILURE : SUCCESS;
    let i = deferreds.length;
    while (i > 0) {
      try {
        deferreds[--i].run(when);
      } catch (error) {
        onError(error);
      }
    }

    if (hasThrown) {
      throw result;
    }
    return result;
  };

const decorator = toDecorator(defer);
export { decorator as default };

decorator.onError = cb => toDecorator(fn => defer(fn, cb));
