const { push } = Array.prototype

const isPromise = value => value != null && typeof value.then === 'function'

const toDecorator = wrap => {
  const decorator = (target, key, descriptor) =>
    key === undefined
      ? wrap(target)
      : {
        ...descriptor,
        value: wrap(descriptor.value)
      }
  Object.assign(decorator, wrap)
  return decorator
}

// -------------------------------------------------------------------

const errorWrapper = { error: null }
const forwardResult = result => {
  if (result === errorWrapper) {
    const { error } = errorWrapper
    errorWrapper.error = null
    throw error
  }
  return result
}
const tryCatch = (fn, thisArg, args) => {
  try {
    return fn.apply(thisArg, args)
  } catch (error) {
    errorWrapper.error = error
    return errorWrapper
  }
}

// ===================================================================

const defaultOnError = error => {
  console.error(error)
}

const makeDefer = (onSuccess, onFailure) => {
  const defer = (fn, onError = defaultOnError) => function () {
    const deferreds = []

    const args = [ deferred => {
      deferreds.push(deferred)
    } ]
    push.apply(args, arguments)
    const result = tryCatch(fn, this, args)

    if (isPromise(result)) {
      const executeAndForward = () => {
        let i = deferreds.length
        const loop = () => i > 0
          ? new Promise(resolve =>
            resolve(deferreds[--i]())
          ).then(loop, reportAndLoop)
          : result
        const reportAndLoop = error => {
          onError(error)
          return loop()
        }

        return loop()
      }
      return result.then(
        onSuccess && executeAndForward,
        onFailure && executeAndForward
      )
    }

    if (result === errorWrapper ? onFailure : onSuccess) {
      let i = deferreds.length
      while (i > 0) {
        try {
          deferreds[--i]()
        } catch (error) {
          onError(error)
        }
      }
    }

    return forwardResult(result)
  }
  defer.onError = cb => toDecorator(fn => defer(fn, cb))
  return defer
}

const defer = toDecorator(makeDefer(true, true))
export { defer as default }

export const onFailure = defer.onFailure = toDecorator(makeDefer(false, true))
export const onSuccess = defer.onSuccess = toDecorator(makeDefer(true, false))
