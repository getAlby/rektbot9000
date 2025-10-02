# REKT BOT 9000

Alby Hackday project at bitcoin++ Berlin 2025

This bot will use multiple MCPs together to open trades on LNMarkets, shitpost about its trades and earn money via zaps.

## Requirements

- Goose with MCPs:
  - [Memory MCP](https://block.github.io/goose/docs/mcp/memory-mcp) (Goose built in extension)
  - [Alby MCP](https://github.com/getAlby/mcp) connected to a lightning wallet with NWC
  - [LNMarkets MCP](https://sup3r.cool/ln-markets/)
  - [Nostr MCP](https://github.com/AbdelStark/nostr-mcp/) (with env variables for NOSTR_RELAYS and NOSTR_NSEC_KEY for the bot account)

## Run the bot

```bash
yarn install
yarn build
yarn start
```
