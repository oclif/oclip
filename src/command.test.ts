import {oclip} from '.'

const argv = process.argv

describe('run', () => {
  afterEach(() => { process.argv = argv })

  test('runs with no arguments', () => {
    process.argv = ['node', './script']
    return oclip().parse()
  })

  test('runs with just a run function', async () => {
    process.argv = ['node', './script']
    const fn = jest.fn()
    await oclip({
      run: () => fn('abc')
    }).parse()
    expect(fn).toBeCalledWith('abc')
  })

  test('passes through return value', () => {
    return expect(oclip({
      run: () => 123
    }).parse([])).resolves.toEqual(123)
  })

  test('gets homedir', () => {
    return oclip({
      run: ({ctx}) => expect(ctx.dirs.home).toMatch(/^\//)
    }).parse([])
  })
})
