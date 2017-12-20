/* eslint-env jest */

import defer from './'

const waitATurn = () => new Promise(resolve => setTimeout(resolve, 0))

describe('defer()', () => {
  it('works with normal termination', () => {
    let i = 0
    const fn = defer($defer => {
      i += 2
      $defer(() => { i -= 2 })

      i *= 2
      $defer(() => { i /= 2 })

      return i
    })

    expect(fn()).toBe(4)
    expect(i).toBe(0)
  })

  it('works with exception', () => {
    let i = 0
    const fn = defer($defer => {
      i += 2
      $defer(() => { i -= 2 })

      i *= 2
      $defer(() => { i /= 2 })

      throw i
    })

    try {
      fn()
      expect(true).toBe(false)
    } catch (value) {
      expect(value).toBe(4)
    }
    expect(i).toBe(0)
  })

  it('works with promise resolution', () => {
    let i = 0
    const fn = defer($defer => {
      i += 2
      $defer(() => { i -= 2 })

      i *= 2
      $defer(() => { i /= 2 })

      return waitATurn().then(() => i)
    })

    return fn().then(result => {
      expect(result).toBe(4)
      expect(i).toBe(0)
    })
  })

  it('works with promise rejection', () => {
    let i = 0
    const fn = defer($defer => waitATurn().then(() => {
      i += 2
      $defer(() => { i -= 2 })

      i *= 2
      $defer(() => { i /= 2 })
    }).then(() => waitATurn()).then(() => {
      throw i
    }))

    return fn().catch(result => {
      expect(result).toBe(4)
      expect(i).toBe(0)
    })
  })

  it('should log exceptions from deferreds', () => {
    const e1 = new Error('e1')
    const e2 = new Error('e2')
    const onError = jest.fn()
    const fn = defer.onError(onError)($defer => {
      $defer(() => { throw e1 })
      $defer(() => { throw e2 })
    })

    fn()

    expect(onError.mock.calls).toEqual([
      [ e2 ],
      [ e1 ],
    ])
  })

  it('should log exceptions/rejections from deferreds', () => {
    const e1 = new Error('e1')
    const e2 = new Error('e2')
    const onError = jest.fn()
    const fn = defer.onError(onError)($defer => {
      $defer(() => { throw e1 })
      $defer(() => Promise.reject(e2))

      return Promise.resolve()
    })

    return fn().then(() => {
      expect(onError.mock.calls).toEqual([
        [ e2 ],
        [ e1 ],
      ])
    })
  })

  it('accepts optional context and arguments', () => {
    const deferred = jest.fn()
    defer($defer => {
      $defer.call('foo', deferred, 'bar', 'baz')
    })()
    expect(deferred.mock.instances).toEqual([ 'foo' ])
    expect(deferred.mock.calls).toEqual([ [ 'bar', 'baz' ] ])
  })

  it('accepts a context and a method name', () => {
    const foo = jest.fn()
    const obj = { foo }
    defer($defer => {
      $defer.call(obj, 'foo', 'bar', 'baz')
    })()
    expect(foo.mock.instances).toEqual([ obj ])
    expect(foo.mock.calls).toEqual([ [ 'bar', 'baz' ] ])
  })
})

describe('lifecycle', () => {
  let always, failure, fn, success
  beforeEach(() => {
    always = jest.fn()
    failure = jest.fn()
    success = jest.fn()

    fn = (class {
      @defer
      static fn ($defer, resultFn) {
        $defer(always)
        $defer.onFailure(failure)
        $defer.onSuccess(success)

        return resultFn()
      }
    }).fn
  })

  it('sync failure', () => {
    expect(() => fn(() => {
      throw new Error()
    })).toThrow()

    expect(always.mock.calls.length).toBe(1)
    expect(failure.mock.calls.length).toBe(1)
    expect(success.mock.calls.length).toBe(0)
  })

  it('sync success', () => {
    expect(fn(() => 42)).toBe(42)

    expect(always.mock.calls.length).toBe(1)
    expect(failure.mock.calls.length).toBe(0)
    expect(success.mock.calls.length).toBe(1)
  })

  it('async failure', async () => {
    await expect(fn(() => Promise.reject(new Error()))).rejects.toThrow()

    expect(always.mock.calls.length).toBe(1)
    expect(failure.mock.calls.length).toBe(1)
    expect(success.mock.calls.length).toBe(0)
  })

  it('async success', async () => {
    expect(await fn(() => Promise.resolve(42))).toBe(42)

    expect(always.mock.calls.length).toBe(1)
    expect(failure.mock.calls.length).toBe(0)
    expect(success.mock.calls.length).toBe(1)
  })
})
