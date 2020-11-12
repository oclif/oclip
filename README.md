# crane

## API Documentation

```
Defined in file:///Users/jdxcode/src/crane/crane.ts:33:0 

function command<A extends arg.List, R>(options: Options<A, R>): Command<R>
  Defines a CLI command

Defined in file:///Users/jdxcode/src/crane/crane.ts:12:0 

class Command<R>

  constructor(options: Options<any, R>)
  readonly description?: string
  readonly args: arg.List
  async exec(argv): Promise<R>

Defined in file:///Users/jdxcode/src/crane/crane.ts:6:0 

interface Options<A extends arg.List, R>

  args?: A
  description?: string
  run: RunFn<A, R>

Defined in file:///Users/jdxcode/src/crane/crane.ts:5:0 

type RunFn<A, R> = (args: arg.ListToResults<A>) => Promise<R> | R


```
Made by Jeff Dickey
