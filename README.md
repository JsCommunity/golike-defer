# golike-defer [![Build Status](https://travis-ci.org/JsCommunity/golike-defer.png?branch=master)](https://travis-ci.org/JsCommunity/golike-defer)

> go's defer statement in JavaScript

`defer()` is a function decorator which injects a `$defer()` function
as a first parameter.

This injected function can be used to register *deferreds*, functions
which will be executed at the end of the decorated function execution,
no matter how it ended (via a `return` or a `throw`).

> Note: the deferreds are executed in the reverse order of their
> declarations.

## Install

Installation of the [npm package](https://npmjs.org/package/golike-defer):

```
> npm install --save golike-defer
```

## Usage

```js
const fn = defer(
  // Works both with sync and async functions
  async function ($defer, ...args) {
    $defer(() => {
      console.log('always called at the function')
    })

    $defer.onFailure(() => {
      console.log('called at the function only on failure')
    })

    $defer.onSuccess(() => {
      console.log('called at the function only on success')
    })
  }
)
```

Context and arguments can be passed to the deferred function:

- `$defer(cb)`: called without context nor arguments
- `$defer(cb, arg1, arg2)`: called with arguments `arg1` and `arg2`
- `$defer.call(thisArg, cb)`: called with context `thisArg`
- `$defer.call(thisArg, 'method')`: `thisArg.method` called with context `thisArg`

## Example

```js
import defer from 'golike-defer'
import fs from 'fs'

const readFileSync = defer(($defer, path) => {
  const fd = fs.openSync(path, 'r')

  // The file will be automatically closed at the end of the function,
  // whether it succeed or failed.
  $defer(fs.closeSync, fd)

  const { size } = fs.statSync(path)

  const buffer = Buffer.allocUnsafe(size)
  fs.readSync(fd, buffer, 0, buffer.length)

  return buffer
})

// Helper to promisify a function call.
const fromCallback = fn => new Promise((resolve, reject) => {
  fn((error, result) => error ? reject(error) : resolve(result))
})

const readFile = defer(async ($defer, path) => {
  const fd = await fromCallback(cb => fs.open(path, 'r', cb))

  // The file will be automatically closed at the end of the function,
  // whether it succeed or failed.
  $defer(() => fromCallback(cb => fs.close(fd, cb)))

  const { size } = await fromCallback(cb => fs.stat(path, cb))

  const buffer = Buffer.allocUnsafe((size)
  await fromCallback(cb => fs.read(fd, buffer, 0, buffer.length, cb))

  return buffer
})
```

### On error

Exceptions (or rejected promises) thrown in deferred are caught and
printed on the console.

This can be customized with the `onError()` method:

```js
const myDefer = defer.onError(error => {
  log(error)
})

const fn = myDefer(($defer, arg1, arg2) => {
  // ...
})
```

## Development

```
# Install dependencies
> yarn

# Run the tests
> yarn test

# Continuously compile
> yarn dev

# Continuously run the tests
> yarn dev-test

# Build for production (automatically called by npm install)
> yarn build
```

## Contributions

Contributions are *very* welcomed, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/JsCommunity/golike-defer/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](https://github.com/julien-f)
