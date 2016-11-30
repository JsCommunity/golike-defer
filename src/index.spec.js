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
})
