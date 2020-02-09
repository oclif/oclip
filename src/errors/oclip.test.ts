import {OclipError, unhandledRejectionHandler} from './oclip'

class TestError extends OclipError {
  render() { return 'foo' }
}

describe('unhandledRejectionHandler', () => {
  test('handles ocliperror', () => {
    jest.spyOn(process, 'exit').mockImplementationOnce(() => {throw new Error('xxx')})
    expect(() => unhandledRejectionHandler(new TestError({message: 'foobar'})))
      .toThrowError('xxx')
  })
  test('emits other errors', () => {
    expect(() => unhandledRejectionHandler(new Error('foobar')))
      .toThrowError('foobar')
  })
})
