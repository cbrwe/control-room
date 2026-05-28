# CONTROL ROOM

A control app for the Chilkey ND75 mechanical keyboard. Mac, Windows, Web.

CONTROL ROOM replaces Chilkey's broken official "web driver" with a proper cross-platform tool. It remaps keys, controls RGB, uploads images to the LCD, and turns the screen into a live widget surface for clock, countdown timer, weather, and custom text.

## Why

The ND75 ships great hardware crippled by bad software. The official configurator is Windows-only as a native app, has a web version that doesn't work on macOS for many users, treats the LCD like a battery indicator, and has features that silently fail (the "Time Correction" button has never worked). CONTROL ROOM fixes all of that and gives the community a real tool for this hardware.

## Status

Early development. The protocol has been fully reverse-engineered from Chilkey's official web bundle (see `docs/ND75_PROTOCOL_SPEC.md`). The `protocol` package is the foundation everything else builds on.

## Repo layout

```
packages/
  protocol/     Pure TypeScript HID protocol implementation. No UI, no platform.
  ui/           (planned) Shared React component library.
  web/          (planned) Browser app, deploys to Vercel.
  desktop/      (planned) Tauri 2 wrapper for Mac and Windows.
docs/
  ND75_PROTOCOL_SPEC.md   Complete byte-level protocol reference.
```

## Hacking

```bash
pnpm install
pnpm -F @control-room/protocol test
pnpm -F @control-room/protocol build
```

## License

MIT. See `LICENSE`.

## Acknowledgments

Built by HVW8 Labs. The protocol work was made possible by Chilkey shipping their official web configurator with Chinese debug log strings intact, which acted as a free Rosetta Stone for every command.
