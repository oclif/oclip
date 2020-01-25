import { Arg, RestArg, validateArgDefs, } from './args'
import { Flags } from './flags'
import parse from './parse'
import { VersionSignal } from './version'
import { Context } from './context'

export class Command<F extends Flags, R> {
  constructor(options: Options<any, F, R, []>) {
    this.options = {
      args: [],
      flags: {} as F,
      ...options,
    }
    this.runOrSubcommandsCheck()
    validateArgDefs(this.options)
  }
  readonly options: FullOptions<any, F, R, []>

  async exec(argv = process.argv.slice(2)) {
    try {
      const {args, flags, subcommand} = await parse(this.options, argv)
      const ctx = new Context(this)
      if (subcommand) {
        const result: any = await subcommand.exec(args)
        return result
      }
      if (this.options.run) {
        const result: any = await this.options.run({args: args as any, flags, ctx})
        return result
      }
    } catch (err) {
      if (err instanceof VersionSignal) {
        console.log(err.render())
        return
      }
      throw err
    }
  }

  private runOrSubcommandsCheck() {
    if (this.options.subcommands && this.options.run) throw new Error('command may have subcommands OR a run function but not both.')
    if (!this.options.subcommands && !this.options.run) throw new Error('command must have subcommands OR a run function')
  }
}

export const oclip: Oclip = <O extends Options<any, any, any, any>>(options: O) => new Command(options) as any

export type ArgVal<A extends Arg<any>> = A extends {required: false} ? ReturnType<A['parse']> | undefined : ReturnType<A['parse']>

export interface Oclip {
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, A3 extends Arg<any>, A4 extends Arg<any>, A5 extends RestArg<any>, R>(options: Options<[A1, A2, A3, A4, A5], F, R, [ArgVal<A1>, ArgVal<A2>, ArgVal<A3>, ArgVal<A4>, ...ArgVal<A5>[]]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, A3 extends Arg<any>, A4 extends Arg<any>, A5 extends Arg<any>, R>(options: Options<[A1, A2, A3, A4, A5], F, R, [ArgVal<A1>, ArgVal<A2>, ArgVal<A3>, ArgVal<A4>, ArgVal<A5>]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, A3 extends Arg<any>, A4 extends RestArg<any>, R>(options: Options<[A1, A2, A3, A4], F, R, [ArgVal<A1>, ArgVal<A2>, ArgVal<A3>, ...ArgVal<A4>[]]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, A3 extends Arg<any>, A4 extends Arg<any>, R>(options: Options<[A1, A2, A3, A4], F, R, [ArgVal<A1>, ArgVal<A2>, ArgVal<A3>, ArgVal<A4>]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, A3 extends RestArg<any>, R>(options: Options<[A1, A2, A3], F, R, [ArgVal<A1>, ArgVal<A2>, ...ArgVal<A3>[]]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, A3 extends Arg<any>, R>(options: Options<[A1, A2, A3], F, R, [ArgVal<A1>, ArgVal<A2>, ArgVal<A3>]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends RestArg<any>, R>(options: Options<[A1, A2], F, R, [ArgVal<A1>, ...ArgVal<A2>[]]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, A2 extends Arg<any>, R>(options: Options<[A1, A2], F, R, [ArgVal<A1>, ArgVal<A2>]>): Command<F, R>
  <F extends Flags, A1 extends RestArg<any>, R>(options: Options<[A1], F, R, ArgVal<A1>[]>): Command<F, R>
  <F extends Flags, A1 extends Arg<any>, R>(options: Options<[A1], F, R, [ArgVal<A1>]>): Command<F, R>
  <F extends Flags, R>(options?: Options<[], F, R, []>): Command<F, R>
  <F extends Flags, A extends Arg<any>, R>(options?: Options<A[], F, R, ArgVal<A>[]>): Command<F, R>
}

export type Options<A extends Arg<any>[], F extends Flags, R, AParams extends any[]> =
  | Partial<FullOptions<A, F, R, AParams>> & {subcommands: {[id: string]: Command<any, any>}}
  | Partial<FullOptions<A, F, R, AParams>> & {run: RunFunc<AParams, F, R>}

export interface FullOptions<A extends Arg<any>[], F extends Flags, R, AParams extends any[]> {
  args: A
  flags: F
  run?: RunFunc<AParams, F, R>
  subcommands?: {[id: string]: Command<any, any>}
}

export interface RunFunc<AParams extends any[], F extends Flags, R> {
  (params: RunParams<AParams, F, R>): Promise<R> | R
}
export interface RunParams<TArgs extends any[], F extends Flags, R> {
  args: TArgs
  flags: {}
  ctx: Context<F, R>
}
