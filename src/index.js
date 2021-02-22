const { push } = Array.prototype;

const toDecorator = wrap => (target, key, descriptor) => {
  if (key === undefined) {
    return wrap(target);
  }
  descriptor.value = wrap(descriptor.value);
  return descriptor;
};

const setFnNameAndLength = (() => {
  const _defineProperties = Object.defineProperties;

  try {
    const f = _defineProperties(function() {}, {
      length: { value: 2 },
      name: { value: "foo" },
    });

    if (f.length === 2 && f.name === "foo") {
      return (fn, name, length) =>
        _defineProperties(fn, {
          length: {
            configurable: true,
            value: length > 0 ? length : 0,
          },
          name: {
            configurable: true,
            value: name,
          },
        });
    }
  } catch (_) {}

  return f => f;
})();

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

function defer(fn, onError = defaultOnError) {
  const wrapper = function() {
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

  return setFnNameAndLength(wrapper, `defer(${fn.name})`, fn.length);
}

const decorator = toDecorator(defer);
decorator.onError = cb => toDecorator(fn => defer(fn, cb));
export { decorator as defer };

// compatibility with previous versions
export { decorator as default };
