# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0](https://github.com/samfoy/pi-provider-kiro/compare/v0.2.2...v0.3.0) (2026-04-19)


### Features

* add getKiroCliCredentialsAllowExpired for expired token refresh ([ceb9add](https://github.com/samfoy/pi-provider-kiro/commit/ceb9add00db3db7176214502a64f18ad007bd16a))
* auto-refresh expired tokens via kiro-cli ([3b46ae0](https://github.com/samfoy/pi-provider-kiro/commit/3b46ae0b5bffa1bb3c4a29dc223473ad7b92e245))
* auto-refresh expired tokens via kiro-cli ([8f010f8](https://github.com/samfoy/pi-provider-kiro/commit/8f010f8bc279e81d31ffe7b8f32356a883bb4360))
* cap system prompt and derive history budget from context window ([b67e991](https://github.com/samfoy/pi-provider-kiro/commit/b67e99117fd7dccb6a20730f2fa67f9896a9525d))
* **models:** filter available models by API region ([454d85a](https://github.com/samfoy/pi-provider-kiro/commit/454d85adb32e1ac883e477c1920531497cefd583))
* social login via kiro-cli, fix context percentage tracking ([7afbd08](https://github.com/samfoy/pi-provider-kiro/commit/7afbd08ac46813719299dabe6c5ad38ac81f6192))
* use expired kiro-cli credentials as fallback in OAuth refresh cascade ([187221b](https://github.com/samfoy/pi-provider-kiro/commit/187221bd4570e2bd81daf70e7b354f38a8406fc9))
* use expired kiro-cli creds as fallback in oauth refresh cascade ([6d5e82d](https://github.com/samfoy/pi-provider-kiro/commit/6d5e82d7cea2b61b0798f320533e41a793c18b23))


### Bug Fixes

* add non-retryable error patterns and lower max backoff to 10s ([a5d21bf](https://github.com/samfoy/pi-provider-kiro/commit/a5d21bfad8a12bf4ced58ab519cd8e6473f77b8f))
* add version to user-agent to bypass 198 message limit + overflow error formatting ([c8fb8b6](https://github.com/samfoy/pi-provider-kiro/commit/c8fb8b6d56bd5112327dab249275b7ff1883cdc6))
* biome lint (import order, missing semicolons) ([145705b](https://github.com/samfoy/pi-provider-kiro/commit/145705b38c5deff50ac7e283b41be878e5d01c30))
* detect truncated tool preambles to prevent session stalls ([1bd40a3](https://github.com/samfoy/pi-provider-kiro/commit/1bd40a3c7b80100712ce23eefd5d353dcc762698))
* drop empty assistant messages from history sanitization ([b432dca](https://github.com/samfoy/pi-provider-kiro/commit/b432dca405920043bc642c6c13b4abd4ec2dbda0))
* drop empty assistant messages from history sanitization ([9ef247d](https://github.com/samfoy/pi-provider-kiro/commit/9ef247da5a18ff1b91db22236889d16c56deafe2))
* handle error events mid-stream and reset idle timer on meaningful events ([e776dd0](https://github.com/samfoy/pi-provider-kiro/commit/e776dd06091d6827f0c53583f4bb50e4d88ee549))
* improve stream reliability — 403 token refresh and error event handling ([8feb9d1](https://github.com/samfoy/pi-provider-kiro/commit/8feb9d1d122701bd6bb7a08f693e51ee707f1a3e))
* increase idle timeout from 120s to 300s to match kiro-cli ([d903b1e](https://github.com/samfoy/pi-provider-kiro/commit/d903b1edf3e122f61324c888f63591af63488c1e))
* increase idle timeout from 30s to 120s ([15cb6af](https://github.com/samfoy/pi-provider-kiro/commit/15cb6afd4f5300ca194c8a67bfb6cb518fb0c23e))
* increase idle timeout from 30s to 120s ([7053c08](https://github.com/samfoy/pi-provider-kiro/commit/7053c08e086f9fb72129b02055ca54bcc32e3b31))
* make retry delays abort-signal-aware ([72c96c4](https://github.com/samfoy/pi-provider-kiro/commit/72c96c4c747d2b3d6e943c40e508bdc0bc90dc1b))
* **models:** map EU SSO regions to eu-central-1 API endpoint ([49c42a2](https://github.com/samfoy/pi-provider-kiro/commit/49c42a26545542b54e115043cfde6a52a2357c0d))
* **models:** map EU SSO regions to eu-central-1 API endpoint ([4e84e5d](https://github.com/samfoy/pi-provider-kiro/commit/4e84e5d6f92080a016a642d05b7b652ba9187cc1))
* oauth refresh race, event parser trim, tool-pair truncation ([84c4905](https://github.com/samfoy/pi-provider-kiro/commit/84c4905d8c7cb944feddee0f3a92b656461818cb))
* read snake_case device registration credentials from kiro-cli ([a1584c9](https://github.com/samfoy/pi-provider-kiro/commit/a1584c98a2df942908fdaa5585dac7aaa94f3453))
* read snake_case device registration credentials from kiro-cli ([afb5ec5](https://github.com/samfoy/pi-provider-kiro/commit/afb5ec5a0c863dce23aea11dab24d1267dc0e2c4))
* read snake_case device registration credentials from kiro-cli ([1a5442d](https://github.com/samfoy/pi-provider-kiro/commit/1a5442d9f195a3791350ede14af25dd7ff2e7bee))
* refresh token from kiro-cli on 403 before retrying ([2b7290e](https://github.com/samfoy/pi-provider-kiro/commit/2b7290e0c94d3bad338ce4429bab781f88d760fa))
* replace shell-interpolated execSync with execFileSync in kiro-cli DB access ([99298a1](https://github.com/samfoy/pi-provider-kiro/commit/99298a1f4f053bfe7262e08b4e281134b8e5eeba))
* resolve all lint errors (noExplicitAny, noNonNullAssertion, noNestedPromises, unused vars, import order) ([e483e20](https://github.com/samfoy/pi-provider-kiro/commit/e483e20924ee09aa83a8ca38032de04fe4ac2f1a))
* retry reliability + system prompt cap + model-aware history budget ([4427b13](https://github.com/samfoy/pi-provider-kiro/commit/4427b1330e21f675db909fb99cf148831f03d9f9))
* stream kiro text and tool calls without tail lag ([ddfdbab](https://github.com/samfoy/pi-provider-kiro/commit/ddfdbabff4bccbdd799b4e112e2f1c9931463658))
* **stream:** add version to KiroIDE user-agent to bypass 198 message limit ([95ffcfb](https://github.com/samfoy/pi-provider-kiro/commit/95ffcfb846ca866c7dc6ae2414c0fda1a81abdfb))
* **stream:** format overflow errors to trigger pi-ai auto-compaction ([fd4bf72](https://github.com/samfoy/pi-provider-kiro/commit/fd4bf728997d0bfbca3a1ecc1daa6539507f1ef7))
* **stream:** format overflow errors to trigger pi-ai auto-compaction ([e1239e7](https://github.com/samfoy/pi-provider-kiro/commit/e1239e783c931a664aca0531a1a11ca0d41d67e7))
* **stream:** format overflow errors to trigger pi-ai auto-compaction ([ecb1176](https://github.com/samfoy/pi-provider-kiro/commit/ecb11763591b6e9c5f5fef69785bd6cefe47fc4c))
* **stream:** prevent agent loop stall on empty/malformed tool calls ([f71721f](https://github.com/samfoy/pi-provider-kiro/commit/f71721ff529eeeb069beb261b6d34bdf45f4c6d7))
* **stream:** prevent agent loop stall on empty/malformed tool calls ([41e8999](https://github.com/samfoy/pi-provider-kiro/commit/41e8999b5eba580cff4a963b23af2a07437dda38))

## [0.4.2] - 2026-03-20

### Fixed

- Preserve non-Kiro provider models when applying region-based Kiro model filtering in `modifyModels()`

## [0.4.1] - 2026-03-19

### Changed

- Delegate generic HTTP `429` / `5xx` retry behavior to `pi-coding-agent` instead of retrying them inside the provider

### Fixed

- Prevent `pi-coding-agent` outer auto-retry from misclassifying Kiro `MONTHLY_REQUEST_COUNT` and `INSUFFICIENT_MODEL_CAPACITY` errors as generic retryable `429`s

## [0.4.0] - 2026-03-15

### Added

- Google and GitHub social login support via kiro-cli delegation
- `getKiroCliSocialToken()` to prefer social credentials when available
- OAuth name updated to "Kiro (Builder ID / Google / GitHub)" to reflect all auth methods

### Changed

- `loginKiro()` now prefers social tokens from kiro-cli if available
- `refreshKiroToken()` checks social tokens first to respect user's chosen login method
- Social login requires kiro-cli to be installed (delegates browser/PKCE flow)

### Fixed

- Pass through raw `contextUsagePercentage` as `usage.contextPercent` so UIs display accurate context usage instead of back-calculating from input tokens (which the usage event can overwrite with raw counts exceeding the context window)

## [0.3.0] - 2026-03-05

### Added

- Cap system prompt at 4096 tokens before sending to Kiro API
- Model-aware history byte budget derived from context window (70% × 4 bytes/token)
- `MONTHLY_REQUEST_COUNT` and `INSUFFICIENT_MODEL_CAPACITY` as non-retryable error patterns (kiro-cli parity)
- Abortable retry delays — abort signal cancels in-progress backoff waits
- Expired kiro-cli credential fallback in OAuth refresh cascade

### Changed

- Lower max retry backoff from 30s to 10s
- Increase idle timeout from 120s to 300s to match kiro-cli behavior
- Read snake_case device registration credentials from kiro-cli

### Fixed

- Drop empty assistant messages from history sanitization
- Handle error events mid-stream and reset idle timer on meaningful events
- Refresh token from kiro-cli on 403 before retrying

## [0.2.2] - 2026-02-26

### Added

- 4-layer auth refresh with kiro-cli sync: IDC token refresh, desktop token refresh, kiro-cli DB sync, and OAuth device code flow fallback

### Fixed

- Skip malformed tool calls instead of crashing; retry on idle timeout
- Biome formatting in event-parser test

## [0.2.1] - 2026-02-26

### Added

- Desktop auth method with region-aware token refresh via `prod.{region}.auth.desktop.kiro.dev`
- Error handling, retry logic (up to 3 retries with 0.7x reduction factor on 413), and history truncation

### Fixed

- Response validation, error tests, template syntax, and stream safety net

## [0.1.1] - 2026-02-19

### Added

- Initial release: 17 models across 7 families, OAuth device code flow, kiro-cli SQLite credential fallback, streaming pipeline with thinking tag parser

[0.4.2]: https://github.com/mikeyobrien/pi-provider-kiro/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/mikeyobrien/pi-provider-kiro/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/mikeyobrien/pi-provider-kiro/compare/v0.3.2...v0.4.0
[0.3.0]: https://github.com/mikeyobrien/pi-provider-kiro/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/mikeyobrien/pi-provider-kiro/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/mikeyobrien/pi-provider-kiro/compare/v0.1.1...v0.2.1
[0.1.1]: https://github.com/mikeyobrien/pi-provider-kiro/releases/tag/v0.1.1
