# BIG R

BIG R is a Discord bot that accepts a source attachment with any filename, or pasted Luau code, validates it through the **official Luau compiler**, runs a conservative and extensible protection pipeline, validates it again, and returns official Luau bytecode output with a SHA-256 integrity value. The uploaded file still needs to contain valid Luau source; arbitrary binary files cannot be compiled as Luau.

## Project layout

```
src/
  bot/                 Discord client and slash command
  luau/                Official compiler adapter, validation, errors
  obfuscator/          Conservative transformation stages and pipeline
test/                  Basic source-preservation tests
temp/ output/          Reserved runtime folders (ignored except .gitkeep)
```

## Requirements and install

- Node.js 20 or newer
- An official `luau-compile` executable built from [luau-lang/luau](https://github.com/luau-lang/luau)
- A Discord application/bot with the `applications.commands` scope

Run `npm install`, copy `.env.example` to `.env`, and set `DISCORD_TOKEN`, `CLIENT_ID`, and `LUAU_COMPILER`. `GUILD_ID` is optional: when supplied the command is registered only in that development guild; otherwise it is registered globally. Set `DISCORD_STATUS_WEBHOOK_URL` only if you want a second, webhook-based status embed after each successful artifact. `RUBIS_API_URL` is optional and defaults to `https://api.rubis.app/v2`.

`LUAU_COMPILER` must be an absolute executable path, such as `C:\\tools\\luau\\build\\Release\\luau-compile.exe` on Windows. BIG R intentionally fails clearly if it is absent or invalid; it never substitutes a TypeScript parser or fake bytecode compiler.

## Run

```
npm install
npm run dev
npm run build
npm start
npm test
```

On startup the bot registers `/obfuscate`. Provide either a file with any filename or the `code` option (maximum 1 MB). Replies are public. The command downloads a file when needed, validates the source with `luau-compile --null --only-parse`, runs the pipeline, revalidates it, captures `luau-compile --binary` output, and sends the bytecode artifact back. Each completed artifact increments `data/stats.json` and the response displays the total in a simple `luau` code block. An optional webhook gets the same refreshed embed.

After successful compilation, BIG R uploads the transformed Luau source to Rubis as a private `text/plain` scrap. The public response includes the Rubis raw URL, view URL, and a populated JavaScript fetch snippet using `raw_with_key` when Rubis returns one.

## Current limitations and future design

Correctness is preferred over aggressive rewriting. Identifier renaming, string/constant rewrites, and control-flow transformation are present as independently testable extension points but are disabled until a genuine Luau AST plus scope/binding analysis layer is integrated. This avoids corrupting comments, literals, properties, table keys, globals, and special Luau syntax. The current safe protection metadata is the SHA-256 integrity hash.
