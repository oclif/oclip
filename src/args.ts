import { Command } from './command'
import { RequiredArgsError, UnexpectedArgsError } from './errors'
import { Context } from './context'

export interface Arg<T> {
  id: number
  name?: string
  description?: string
  required: boolean
  rest?: boolean
  hidden?: boolean;
  parse(input: string): T
  choices?: string[] | (() => string[] | Promise<string[]>)
  default?: () => Promise<T>
  /**
   * display the argument for help or error messages
   * @param settings.usage alternate output for inline in usage strings
   */
  toString(settings?: {usage?: boolean}): string
}
export type RestArg<T> = Arg<T> & {rest: true, required: false}
export type OptionalArg<T> = Arg<T> & {required: false}
export type RequiredArg<T> = Arg<T> & {required: true}

export type Args = Arg<any>[]

export interface ArgOpts<T> {
  description?: string
  parse?: (input: string) => T | Promise<T>
  choices?: string[] | (() => string[] | Promise<string[]>)
  default?: T | (() => T) | (() => Promise<T>)
}

export interface ArgBuilder<U=string> {
  <T=U>(name: string, description: string, options?: ArgOpts<T>): Arg<T>
  <T=U>(name: string, options?: ArgOpts<T>): Arg<T>
  <T=U>(options?: ArgOpts<T>): Arg<T>

  required <T=U>(name: string, description: string, options?: ArgOpts<T>): RequiredArg<T>
  required <T=U>(name: string, options?: ArgOpts<T>): RequiredArg<T>
  required <T=U>(options?: ArgOpts<T>): RequiredArg<T>

  optional <T=U>(name: string, description: string, options?: ArgOpts<T>): OptionalArg<T>
  optional <T=U>(name: string, options?: ArgOpts<T>): OptionalArg<T>
  optional <T=U>(options?: ArgOpts<T>): OptionalArg<T>

  rest <T=U>(name: string, description: string, options?: ArgOpts<T>): RestArg<T>
  rest <T=U>(name: string, options?: ArgOpts<T>): RestArg<T>
  rest <T=U>(options?: ArgOpts<T>): RestArg<T>

  extend <T=U>(options?: ArgOpts<T>): ArgBuilder<T>
}

const getParams = (name?: string | ArgOpts<any>, description?: string | ArgOpts<any>, options?: ArgOpts<any>): [string | undefined, string | undefined, ArgOpts<any>] => {
  if (typeof name === 'object') return [undefined, undefined, name]
  if (typeof description === 'object') return [name, undefined, description]
  return [name, description, options || {}]
}

function argBuilder<T>(defaultOptions: ArgOpts<T> & {parse: (input: string) => T}): ArgBuilder<T> {
  const arg: ArgBuilder = (name?: string | ArgOpts<any>, description?: string | ArgOpts<any>, options: ArgOpts<any> = {}): Arg<any> => {
    [name, description, options] = getParams(name, description, options)
    const arg: Arg<T> = {
      toString({usage = false}: {usage?: boolean} = {}) {
        let s = ''
        if (this.hidden) return s
        if (this.name) {
          s += `${this.name.toUpperCase()}`
        }
        if (!usage) return s
        s = '<' + (s || 'UNKNOWN ARGUMENT') + '>'
        if (!this.required) s = `[${s}]`
        return s
      },
      ...defaultOptions,
      required: true,
      description,
      ...options,
      name,
      id: -1,
    }
    if ('default' in arg && typeof arg['default'] !== 'function') {
      const val = arg['default']
      arg['default'] = async () => val as any
    }
    return arg
  }

  arg.required = (name?: any, description?: any, options: any = {}) => {
    [name, description, options] = getParams(name, description, options)
    return arg(name, {...defaultOptions, description, ...options, required: true}) as any
  }
  arg.optional = (name?: any, description?: any, options: any = {}) => {
    [name, description, options] = getParams(name, description, options)
    return arg(name, {...defaultOptions, description, ...options, required: false}) as any
  }
  arg.rest = (name?: any, description?: any, options: any = {}): RestArg<any> => {
    [name, description, options] = getParams(name, description, options)
    return arg(name, {...defaultOptions, description, ...options, required: false, rest: true}) as any
  }
  arg.extend = (options: any = {}) => argBuilder({...defaultOptions, ...options})

  return arg
}

export const arg = argBuilder({parse: (s: string) => s})

const addIdToArgs = (args: Arg<any>[]) => {
  for (let i=0; i<args.length; i++) {
    args[i].id = i
  }
}

const validateNothingRequiredAfterOptional = (defs: Arg<any>[]) => {
  let state: 'required' | 'optional' | 'rest' = 'required'
  for (const def of defs) {
    switch(state) {
    case 'required':
      if (def.rest) state = 'rest'
      else if (!def.required) state = 'optional'
      break
    case 'optional':
      if (def.required) throw new Error('required arguments may not follow optional arguments')
      if (def.rest === true) state = 'rest'
      break
    case 'rest':
      throw new Error('rest args must be the last ones defined')
    }
  }
}

// const numRequiredArgs = (args: Arg<any>[]) => args.reduce((total, arg) => arg.required ? total+1 : total, 0)
const numOptionalArgs = (args: Arg<any>[]) => args.reduce((total, arg) => arg.rest ? -1 : total + 1, 0)

export const validateArgDefs = (argDefs: Args) => {
  validateNothingRequiredAfterOptional(argDefs)
}

export const validateArgs = async (ctx: Context, defs: Args, args: any[]) => {
  addIdToArgs(defs)
  let maxArgs = numOptionalArgs(defs)

  let subcommand: Command | undefined

  for (let def of defs.slice(0, args.length)) {
    const input = args[def.id]
    if (def.choices) {
      const choices = (typeof def.choices === 'function' ? await def.choices() : def.choices)
      if (!choices.includes(input)) {
        throw new Error(`Expected "${input}" to be one of:\n${choices.join('\n')}`)
      }
    }
    args[def.id] = def.parse(input)
  }

  const missingArgs = defs.slice(args.length)

  for (const def of missingArgs) {
    const arg = def.default && await def.default()
    if (arg === undefined) continue
    args[def.id] = arg
  }

  const missingRequiredArgs = defs.filter(a => a.required && !args[a.id])
  if (missingRequiredArgs.length) {
    throw new RequiredArgsError({args: missingRequiredArgs})
  }

  if (maxArgs !== -1 && args.length > maxArgs) {
    throw new UnexpectedArgsError({args: args.slice(maxArgs)})
  }
  return {subcommand}
}
