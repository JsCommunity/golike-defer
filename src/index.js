const { push } = Array.prototype

const isPromise = value => value != null && typeof value.then === 'function'

const toDecorator = wrap => (target, key, descriptor) => {
  if (key === undefined) {
    return wrap(target)
  }

  return {
    ...descriptor,
    value: wrap(descriptor.value)
  }
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

const makeDefer = (onSuccess, onFailure) => fn => function () {
  const deferreds = []

  const args = [ deferred => {
    deferreds && deferreds.push(deferred)
  } ]
  push.apply(args, arguments)
  const result = tryCatch(fn, this, args)

  if (isPromise(result)) {
    const executeAndForward = () => {
      let i = deferreds.length
      const loop = () => i > 0
        ? Promise.resolve(deferreds[--i]()).then(loop)
        : result

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
      deferreds[--i]()
    }
  }

  return forwardResult(result)
}

const defer = toDecorator(makeDefer(true, true))
export { defer as default }

export const onFailure = defer.onFailure = toDecorator(makeDefer(false, true))
export const onSuccess = defer.onSuccess = toDecorator(makeDefer(true, false))
