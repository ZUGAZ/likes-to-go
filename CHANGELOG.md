# Changelog

## [2.6.1](https://github.com/ZUGAZ/likes-to-go/compare/likes-to-go-v2.6.0...likes-to-go-v2.6.1) (2026-08-30)


### Bug Fixes

* 🖼️ ship declared mascot web-accessible files from clean builds ([f0d225d](https://github.com/ZUGAZ/likes-to-go/commit/f0d225df480ae7cca7ff85e5008afad604cce18d))


### Performance Improvements

* 🖼️ ship Beat poses as quantized lossless WebP ([a4d6d39](https://github.com/ZUGAZ/likes-to-go/commit/a4d6d39e29b67837bf1cc7958c3036a20022e4f9))

## [2.6.0](https://github.com/ZUGAZ/likes-to-go/compare/likes-to-go-v2.5.0...likes-to-go-v2.6.0) (2026-07-31)


### Features

* ♿ improve popup accessibility ([33a2cc5](https://github.com/ZUGAZ/likes-to-go/commit/33a2cc57d2566ca7a0690e2f0f7c9c2c786253d6))
* ✨ add @effect/language-service for improved TypeScript support and remove obsolete popup tests ([cb1c461](https://github.com/ZUGAZ/likes-to-go/commit/cb1c461eb7b379019b092a4a07a493408e1428c3))
* ✨ add artwork container selector and overlay functionality for scanned cards ([6cc0ca2](https://github.com/ZUGAZ/likes-to-go/commit/6cc0ca2d83eedc322214bb2076e9ee33fa8b650e))
* ✨ add badges view fixture tests and utility for loading HTML fixtures ([d97e7f7](https://github.com/ZUGAZ/likes-to-go/commit/d97e7f73a09b0a52815656567d24a9cd2e0a9fbd))
* ✨ add Beat content overlay on SoundCloud via shadow root UI ([763d9c0](https://github.com/ZUGAZ/likes-to-go/commit/763d9c00c2825dad14dee654a4df071a5ac81588))
* ✨ add Beat persona copy catalog for all popup states ([a191246](https://github.com/ZUGAZ/likes-to-go/commit/a191246d64447c6d38e6e032b0e0ed63af3975a0))
* ✨ add context-aware action icon with per-tab popup override ([715e46d](https://github.com/ZUGAZ/likes-to-go/commit/715e46d1d11ab5f603e026f367ebaa8be662dedf))
* ✨ add create initial tests for PopupView component ([ea29092](https://github.com/ZUGAZ/likes-to-go/commit/ea2909210d094a6524022341a5cb9a8179d65a96))
* ✨ add ErrorBlock component for improved error handling in popup view ([d78750e](https://github.com/ZUGAZ/likes-to-go/commit/d78750e4ec0bb0ae26ce885b4b5de1b2ff36285e))
* ✨ add ErrorBlock component for improved error handling in popup view ([58f29ae](https://github.com/ZUGAZ/likes-to-go/commit/58f29ae47701580dc309f8252be6ae57b7532141))
* ✨ add ESLint check for staged JS/TS files in commit script ([fb73ac5](https://github.com/ZUGAZ/likes-to-go/commit/fb73ac53d917d86afdf9c49a9c0b99f2c4628d45))
* ✨ add html fixtures for better testing scenarios ([16f82f4](https://github.com/ZUGAZ/likes-to-go/commit/16f82f419aa5786a1c4172db834bf44a2c9236f5))
* ✨ add logger infrastructure and wire through background/content layers ([2535158](https://github.com/ZUGAZ/likes-to-go/commit/2535158ca19f69fe6c21e02ce39de395602be0f3))
* ✨ add pre-commit hook and simplify commit script by removing unnecessary echo statements ([509a55b](https://github.com/ZUGAZ/likes-to-go/commit/509a55b70c490cf4b48cb7d5031e42dd8889b47d))
* ✨ add shared Beat mascot component for popup and overlay reuse ([b6fea78](https://github.com/ZUGAZ/likes-to-go/commit/b6fea78ea1f9c7346758db5fe22e797e9b888f1f))
* ✨ add ToggleMascot content-only request message ([01a5757](https://github.com/ZUGAZ/likes-to-go/commit/01a57579a3127bb520d49922ddb4f2c54cfaa7f7))
* ✨ add type checking command and enhance test scripts for improved reliability ([16fa848](https://github.com/ZUGAZ/likes-to-go/commit/16fa848ea1da62ef0758fa093aaa6803806bfb4e))
* ✨ add user_url field to track data structure and update related tests ([43fe5a7](https://github.com/ZUGAZ/likes-to-go/commit/43fe5a7d3c1ddcc7207caa5c524a2eee785cb97b))
* ✨ cancel collection on tab navigation ([9122760](https://github.com/ZUGAZ/likes-to-go/commit/9122760824ca61f07a416d834f9ac882f16e7aac))
* ✨ check login state using cookie ([c3cd1a2](https://github.com/ZUGAZ/likes-to-go/commit/c3cd1a2fc1bb9a2c8d7032c8f28de5869f14e39c))
* ✨ detect collectable SoundCloud pages from DOM ([1ebb150](https://github.com/ZUGAZ/likes-to-go/commit/1ebb150df4e3a6a7da6f6da1f2659846e003b537))
* ✨ enhance collection pipeline tests and logic for final cycle handling ([d05bb64](https://github.com/ZUGAZ/likes-to-go/commit/d05bb6449e4f01df3649ed3265edbe3b9ea20cfe))
* ✨ enhance TrackSchema tests with property-based testing for validation and decoding ([54cbe7f](https://github.com/ZUGAZ/likes-to-go/commit/54cbe7f6f1dd3e25abc21ec568225e1886868863))
* ✨ focus selected tab before collection ([1ead88c](https://github.com/ZUGAZ/likes-to-go/commit/1ead88c1da8700cea7d9f3aef2b7b6098d8b885b))
* ✨ implement inline error handling with retry functionality ([6ca85b8](https://github.com/ZUGAZ/likes-to-go/commit/6ca85b8d54de59c66cc0bca10621ac172d3b0561))
* ✨ implement loading indicator functionality ([cd8f537](https://github.com/ZUGAZ/likes-to-go/commit/cd8f5373da97bb9aed624392300abe4cda1d7b1c))
* ✨ implement login verification flow with cookie checks and error handling ([ece1457](https://github.com/ZUGAZ/likes-to-go/commit/ece1457ecd8872744f2321e41abd39ece8be6d7e))
* ✨ implement user login checks and enhance event handling for login requirements ([89e11e9](https://github.com/ZUGAZ/likes-to-go/commit/89e11e95842f81b1d2940723c16f3a2f1a3d609c))
* ✨ initial public release ([10e79cb](https://github.com/ZUGAZ/likes-to-go/commit/10e79cbabc333a7f7f78cac8ddd381796e45c28b))
* ✨ integrate silent logger  tests and enhance tests ([3679780](https://github.com/ZUGAZ/likes-to-go/commit/3679780bacdfa9c59fc1b2a15351d8610e01ee10))
* ✨ integrate solid-transition-group for enhanced popup animations and add heartbeat effect ([ee01074](https://github.com/ZUGAZ/likes-to-go/commit/ee0107423b34722c7339e6e677802a9064eed15a))
* ✨ introduce loading state in popup view model and enhance UI for loading feedback ([d594042](https://github.com/ZUGAZ/likes-to-go/commit/d594042f0b8a0c79bfbac00aefc08f4325596d60))
* ✨ introduce skippedTrackCount to enhance collection tracking and popup notifications ([7bff4ae](https://github.com/ZUGAZ/likes-to-go/commit/7bff4aedf4d8b04ac5f40720fc4595817b0e6115))
* ✨ refactor login error handling to use centralized message constant and enhance state management ([4ea7645](https://github.com/ZUGAZ/likes-to-go/commit/4ea76451005555f79a6a8782ef26abaab460cf3a))
* ✨ select active SoundCloud tab for collection ([eec2e51](https://github.com/ZUGAZ/likes-to-go/commit/eec2e51dd71bb62b06654df8d22d60d49a46054d))
* ✨ set default GIT_EDITOR to cursor for improved commit message editing ([87abae2](https://github.com/ZUGAZ/likes-to-go/commit/87abae2def1bd640a092c4fbdf50951f50444a28))
* ✨ show source status in popup before collection starts ([f02b9b8](https://github.com/ZUGAZ/likes-to-go/commit/f02b9b8135111445a28874ef13b269c23443ad8f))
* ✨ wire popup to shared Beat mascot and remove legacy card UI ([51b10fb](https://github.com/ZUGAZ/likes-to-go/commit/51b10fb9ade1b8bf323de031a3e2538c9c9eda5d))
* 🎨 add Beat mascot pose assets and web-accessible manifest ([f734c4d](https://github.com/ZUGAZ/likes-to-go/commit/f734c4df526ae6635decf14576ef8a974de0cc79))
* 🎨 align popup theme with SoundCloud ([33253f0](https://github.com/ZUGAZ/likes-to-go/commit/33253f0a2bca7386ce0a40bf2dc2c60e47b92bae))
* 🎯 add selectors for artwork and stats (v1 fields) ([a1b41ac](https://github.com/ZUGAZ/likes-to-go/commit/a1b41ac30055266dc3e13a771ff2779a7dd907cc))
* 👀 dom-reader extracts artwork_url and stats (0.2.0 full metadata) ([e24a63b](https://github.com/ZUGAZ/likes-to-go/commit/e24a63bab25fa728893b1d6c479734507c45aab9))
* 💫 respect reduced motion in popup ([8e13c78](https://github.com/ZUGAZ/likes-to-go/commit/8e13c78976a076b8eaa4815271e00d8cc9204851))
* 📊 add list-only export fields for genre, tags, and counts ([d61b630](https://github.com/ZUGAZ/likes-to-go/commit/d61b630aef191b624f7abb001142b638ab8b74a4))
* 📋 add list layout selectors and core field parsing ([c32cbf2](https://github.com/ZUGAZ/likes-to-go/commit/c32cbf22f6338a24eef1c1bf13bae37d389a9615))
* 📚 add BeatView Storybook catalog for all states ([7f6698e](https://github.com/ZUGAZ/likes-to-go/commit/7f6698ef6832d8917aa17606276e40264604d730))
* 🔌 wire layout context through collection flow ([806389d](https://github.com/ZUGAZ/likes-to-go/commit/806389da569a1efd79c71f6a671ff77b6885d5b8))
* 🔍 add per-layout detection with fail-safe orchestrator ([3a63666](https://github.com/ZUGAZ/likes-to-go/commit/3a63666f730124bd4686a67c9a91349e4ab06d53))
* 🧪 add Playwright extension load fixture ([59fc3ac](https://github.com/ZUGAZ/likes-to-go/commit/59fc3acf11becb520d2423c642bd216e31fad6ae))
* 🧪 add Playwright popup shell smoke tests ([7480e76](https://github.com/ZUGAZ/likes-to-go/commit/7480e764a25646590e98d16ca11f36487ce4281e))
* 🧵 add per-tab cancel collection command ([a37afda](https://github.com/ZUGAZ/likes-to-go/commit/a37afdad0fd472db023ba303172ffb1754abf09d))
* 🛠️ add logging for pipeline final cycle and loading indicator checks ([d018a8c](https://github.com/ZUGAZ/likes-to-go/commit/d018a8c2cc65cd73182180d53e5dedf9f2431a9a))
* 🛡️ harden extension platform behavior ([7c58697](https://github.com/ZUGAZ/likes-to-go/commit/7c58697fa3e05d2b7bc74e9ab50c5a98c7f840e3))
* background service with message handlers and getState ([9c534ec](https://github.com/ZUGAZ/likes-to-go/commit/9c534ece5be22da168911175533f6e13d4f14861))
* document validation pipeline; progress = validated tracks only ([e2b147b](https://github.com/ZUGAZ/likes-to-go/commit/e2b147b9c3a8f7c2ea12e735f18171e31f5505cc))
* export full v1 payload (user + optional track fields) ([e8a21a2](https://github.com/ZUGAZ/likes-to-go/commit/e8a21a2f4c483002ec986c7335ac80e9fb364d84))
* full Track schema with optional v1 metadata fields ([7aa7861](https://github.com/ZUGAZ/likes-to-go/commit/7aa78619541b61282ae42dabc87c90bacfedca81))
* popup, toolbar icon, and JSON export for MVP ([1f4e90e](https://github.com/ZUGAZ/likes-to-go/commit/1f4e90ee9ca06eff5ee491c789bd7de7cc6c42c3))


### Bug Fixes

* ⚡ speed up collection scroll pacing after 1.3.0 regression ([831025a](https://github.com/ZUGAZ/likes-to-go/commit/831025af6c194faacd7d2d7c77e351d181c8811b))
* 🎨 clear resize chroma fringe and tune mouth anchor ([31ffdc4](https://github.com/ZUGAZ/likes-to-go/commit/31ffdc4d8ded67a8b1e2d0924cd07753e5be5c2f))
* 🎨 polish Beat balloon and dark-theme contrast ([bbc7ee3](https://github.com/ZUGAZ/likes-to-go/commit/bbc7ee3e26325b6ef6b32d5ce93b1f61c9363a84))
* 🐛 ensure consistent Beat overlay behavior during transitions ([3fc7511](https://github.com/ZUGAZ/likes-to-go/commit/3fc7511a0e5472e187a7e4fdd1a6e8fdcd8fc9a4))
* 🐛 fail collection when zero tracks are collected ([b2aa2ce](https://github.com/ZUGAZ/likes-to-go/commit/b2aa2ce2341160d587ed09097c6437184bfcc5d8))
* 🐛 guard against empty commit messages in commit-msg hook ([73419a5](https://github.com/ZUGAZ/likes-to-go/commit/73419a573edadfdaa44f7187671681a9ce744aa9))
* 🐛 improve inline error handling by refining retry logic and ensuring proper error indication ([520266a](https://github.com/ZUGAZ/likes-to-go/commit/520266a000c3ba10033cbe4db4a8ca087713f370))
* 🐛 keep Beat visible after popup fade out-in ([1a66806](https://github.com/ZUGAZ/likes-to-go/commit/1a66806a11c42ada3e14842c84133d0945b75578))
* 🐛 pause collection in hidden tabs ([b91978d](https://github.com/ZUGAZ/likes-to-go/commit/b91978d58b76b69d25a65fa761031c933283aee8))
* 🐛 pin action popup width and instrument boot delay ([d8bfe46](https://github.com/ZUGAZ/likes-to-go/commit/d8bfe465073e4c61579e899f7978db54810f1440))
* 🐛 preserve navigation errors and recover on try again ([e216caa](https://github.com/ZUGAZ/likes-to-go/commit/e216caa0c427b073b83916d5ad19a300dfd2f9dc))
* 🐛 route Beat state updates to the active popup or overlay surface ([25fefc1](https://github.com/ZUGAZ/likes-to-go/commit/25fefc19bb37561fe7bbe98ad3095fa26af7ed0e))
* 🐛 select likes tab without reading empty Chrome url ([2bece56](https://github.com/ZUGAZ/likes-to-go/commit/2bece56e65854713d07a0c92fb38653c7f999d16))
* 🐛 start collection without tab-complete delay ([c961edc](https://github.com/ZUGAZ/likes-to-go/commit/c961edc65d8883ba85a958789ecdacde2323ffe7))
* 🐛 stop Vitest @ alias from stealing [@testing-library](https://github.com/testing-library) ([bc3393d](https://github.com/ZUGAZ/likes-to-go/commit/bc3393d814d162eedddf24296e1723c0c878ccbd))
* 🐛 strip full package prefix from release-please tag for zip name ([6047043](https://github.com/ZUGAZ/likes-to-go/commit/6047043f15091ddab1f91291f48241abb8e56c4f))
* 🐛 unblock collection pipeline and polish Beat overlay UX ([bc9ff71](https://github.com/ZUGAZ/likes-to-go/commit/bc9ff71ba6108523b39b05df86bba263e4684940))
* 🐛 update SoundCloud session cookie name and improve error handling for empty likes list ([77e6f18](https://github.com/ZUGAZ/likes-to-go/commit/77e6f1848e8d8da1d9779c43eac373a3db5f1e82))
* 🐛 update tab creation to set active state to true ([c6462e2](https://github.com/ZUGAZ/likes-to-go/commit/c6462e2bf93d6c8ea7952829f4341aedb37a2da3))
* 🐛 use reliable SoundCloud session cookie ([b33b22d](https://github.com/ZUGAZ/likes-to-go/commit/b33b22d89873fa1b6ef2bf4d53748f58d1b63076))
* 💬 align Beat balloon to framed pose mouth ratio ([005b92a](https://github.com/ZUGAZ/likes-to-go/commit/005b92aed1b801cf57a95aa0644a5105ba8b1010))
* 💬 pin balloon tail to mouth and close join gap ([5f82e1f](https://github.com/ZUGAZ/likes-to-go/commit/5f82e1fceac3f741bf6ad44a0986de92033a0c9d))
* 💬 scale Beat mascot and comic CSS speech bubble ([42199f9](https://github.com/ZUGAZ/likes-to-go/commit/42199f92523e539d9b89dff9b14d586e42857008))
* 💬 seat balloon tail on mouth with seamless join ([54fc2b4](https://github.com/ZUGAZ/likes-to-go/commit/54fc2b45fe1bae8d41b76fbd145ee2695be95355))
* 🔧 simplify dev script after devcontainer rollback ([96c520b](https://github.com/ZUGAZ/likes-to-go/commit/96c520b56bf197f8ea634d6016b2eeb760e3286c))
* 🔧 strictPort and WSL devcontainer docs for cross-boundary HMR ([b035c11](https://github.com/ZUGAZ/likes-to-go/commit/b035c11fae6f7db97f01b19137f5f83b2c340fc4))
* 🔧 WXT dev server for cross-boundary HMR in devcontainer ([18b2e5e](https://github.com/ZUGAZ/likes-to-go/commit/18b2e5ec1f4b9b15911b4a81c03e5d47029bcd65))
* 🧪 assert popup path against WXT entrypoint, not build output ([95d4e6e](https://github.com/ZUGAZ/likes-to-go/commit/95d4e6e8c53d9c04b23f50cf9c97a466bb30cd72))
* 🧹 resolve final QA lint warnings ([61cf8c2](https://github.com/ZUGAZ/likes-to-go/commit/61cf8c2537b5269cf59a735cd02c8233edbd29ba))

## [1.3.0](https://github.com/ZUGAZ/likes-to-go/compare/likes-to-go-v1.1.0...likes-to-go-v1.3.0) (2026-06-24)


### Features

* ♿ improve popup accessibility ([33a2cc5](https://github.com/ZUGAZ/likes-to-go/commit/33a2cc57d2566ca7a0690e2f0f7c9c2c786253d6))
* 🎨 align popup theme with SoundCloud ([33253f0](https://github.com/ZUGAZ/likes-to-go/commit/33253f0a2bca7386ce0a40bf2dc2c60e47b92bae))
* 💫 respect reduced motion in popup ([8e13c78](https://github.com/ZUGAZ/likes-to-go/commit/8e13c78976a076b8eaa4815271e00d8cc9204851))
* 📊 add list-only export fields for genre, tags, and counts ([d61b630](https://github.com/ZUGAZ/likes-to-go/commit/d61b630aef191b624f7abb001142b638ab8b74a4))
* 📋 add list layout selectors and core field parsing ([c32cbf2](https://github.com/ZUGAZ/likes-to-go/commit/c32cbf22f6338a24eef1c1bf13bae37d389a9615))
* 🔌 wire layout context through collection flow ([806389d](https://github.com/ZUGAZ/likes-to-go/commit/806389da569a1efd79c71f6a671ff77b6885d5b8))
* 🔍 add per-layout detection with fail-safe orchestrator ([3a63666](https://github.com/ZUGAZ/likes-to-go/commit/3a63666f730124bd4686a67c9a91349e4ab06d53))
* 🛡️ harden extension platform behavior ([7c58697](https://github.com/ZUGAZ/likes-to-go/commit/7c58697fa3e05d2b7bc74e9ab50c5a98c7f840e3))

## [1.1.0](https://github.com/ZUGAZ/likes-to-go/compare/likes-to-go-v1.0.1...likes-to-go-v1.1.0) (2026-05-22)

### Features

- ✨ cancel collection on tab navigation ([9122760](https://github.com/ZUGAZ/likes-to-go/commit/9122760824ca61f07a416d834f9ac882f16e7aac))
- ✨ detect collectable SoundCloud pages from DOM ([1ebb150](https://github.com/ZUGAZ/likes-to-go/commit/1ebb150df4e3a6a7da6f6da1f2659846e003b537))
- ✨ focus selected tab before collection ([1ead88c](https://github.com/ZUGAZ/likes-to-go/commit/1ead88c1da8700cea7d9f3aef2b7b6098d8b885b))
- ✨ select active SoundCloud tab for collection ([eec2e51](https://github.com/ZUGAZ/likes-to-go/commit/eec2e51dd71bb62b06654df8d22d60d49a46054d))
- ✨ show source status in popup before collection starts ([f02b9b8](https://github.com/ZUGAZ/likes-to-go/commit/f02b9b8135111445a28874ef13b269c23443ad8f))
- 🛠️ add logging for pipeline final cycle and loading indicator checks ([d018a8c](https://github.com/ZUGAZ/likes-to-go/commit/d018a8c2cc65cd73182180d53e5dedf9f2431a9a))

### Bug Fixes

- 🐛 fail collection when zero tracks are collected ([b2aa2ce](https://github.com/ZUGAZ/likes-to-go/commit/b2aa2ce2341160d587ed09097c6437184bfcc5d8))
- 🐛 pause collection in hidden tabs ([b91978d](https://github.com/ZUGAZ/likes-to-go/commit/b91978d58b76b69d25a65fa761031c933283aee8))
- 🐛 preserve navigation errors and recover on try again ([e216caa](https://github.com/ZUGAZ/likes-to-go/commit/e216caa0c427b073b83916d5ad19a300dfd2f9dc))
- 🐛 start collection without tab-complete delay ([c961edc](https://github.com/ZUGAZ/likes-to-go/commit/c961edc65d8883ba85a958789ecdacde2323ffe7))
- 🐛 update SoundCloud session cookie name and improve error handling for empty likes list ([77e6f18](https://github.com/ZUGAZ/likes-to-go/commit/77e6f1848e8d8da1d9779c43eac373a3db5f1e82))
- 🐛 use reliable SoundCloud session cookie ([b33b22d](https://github.com/ZUGAZ/likes-to-go/commit/b33b22d89873fa1b6ef2bf4d53748f58d1b63076))

## [1.0.1](https://github.com/ZUGAZ/likes-to-go/compare/likes-to-go-v1.0.0...likes-to-go-v1.0.1) (2026-04-30)

### Bug Fixes

- 🐛 strip full package prefix from release-please tag for zip name ([6047043](https://github.com/ZUGAZ/likes-to-go/commit/6047043f15091ddab1f91291f48241abb8e56c4f))
- 🧹 resolve final QA lint warnings ([61cf8c2](https://github.com/ZUGAZ/likes-to-go/commit/61cf8c2537b5269cf59a735cd02c8233edbd29ba))

## 1.0.0 (2026-04-29)

### Features

- ✨ add @effect/language-service for improved TypeScript support and remove obsolete popup tests ([cb1c461](https://github.com/ZUGAZ/likes-to-go/commit/cb1c461eb7b379019b092a4a07a493408e1428c3))
- ✨ add artwork container selector and overlay functionality for scanned cards ([6cc0ca2](https://github.com/ZUGAZ/likes-to-go/commit/6cc0ca2d83eedc322214bb2076e9ee33fa8b650e))
- ✨ add badges view fixture tests and utility for loading HTML fixtures ([d97e7f7](https://github.com/ZUGAZ/likes-to-go/commit/d97e7f73a09b0a52815656567d24a9cd2e0a9fbd))
- ✨ add create initial tests for PopupView component ([ea29092](https://github.com/ZUGAZ/likes-to-go/commit/ea2909210d094a6524022341a5cb9a8179d65a96))
- ✨ add ErrorBlock component for improved error handling in popup view ([d78750e](https://github.com/ZUGAZ/likes-to-go/commit/d78750e4ec0bb0ae26ce885b4b5de1b2ff36285e))
- ✨ add ErrorBlock component for improved error handling in popup view ([58f29ae](https://github.com/ZUGAZ/likes-to-go/commit/58f29ae47701580dc309f8252be6ae57b7532141))
- ✨ add ESLint check for staged JS/TS files in commit script ([fb73ac5](https://github.com/ZUGAZ/likes-to-go/commit/fb73ac53d917d86afdf9c49a9c0b99f2c4628d45))
- ✨ add html fixtures for better testing scenarios ([16f82f4](https://github.com/ZUGAZ/likes-to-go/commit/16f82f419aa5786a1c4172db834bf44a2c9236f5))
- ✨ add logger infrastructure and wire through background/content layers ([2535158](https://github.com/ZUGAZ/likes-to-go/commit/2535158ca19f69fe6c21e02ce39de395602be0f3))
- ✨ add pre-commit hook and simplify commit script by removing unnecessary echo statements ([509a55b](https://github.com/ZUGAZ/likes-to-go/commit/509a55b70c490cf4b48cb7d5031e42dd8889b47d))
- ✨ add type checking command and enhance test scripts for improved reliability ([16fa848](https://github.com/ZUGAZ/likes-to-go/commit/16fa848ea1da62ef0758fa093aaa6803806bfb4e))
- ✨ add user_url field to track data structure and update related tests ([43fe5a7](https://github.com/ZUGAZ/likes-to-go/commit/43fe5a7d3c1ddcc7207caa5c524a2eee785cb97b))
- ✨ check login state using cookie ([c3cd1a2](https://github.com/ZUGAZ/likes-to-go/commit/c3cd1a2fc1bb9a2c8d7032c8f28de5869f14e39c))
- ✨ enhance collection pipeline tests and logic for final cycle handling ([d05bb64](https://github.com/ZUGAZ/likes-to-go/commit/d05bb6449e4f01df3649ed3265edbe3b9ea20cfe))
- ✨ enhance TrackSchema tests with property-based testing for validation and decoding ([54cbe7f](https://github.com/ZUGAZ/likes-to-go/commit/54cbe7f6f1dd3e25abc21ec568225e1886868863))
- ✨ implement inline error handling with retry functionality ([6ca85b8](https://github.com/ZUGAZ/likes-to-go/commit/6ca85b8d54de59c66cc0bca10621ac172d3b0561))
- ✨ implement loading indicator functionality ([cd8f537](https://github.com/ZUGAZ/likes-to-go/commit/cd8f5373da97bb9aed624392300abe4cda1d7b1c))
- ✨ implement login verification flow with cookie checks and error handling ([ece1457](https://github.com/ZUGAZ/likes-to-go/commit/ece1457ecd8872744f2321e41abd39ece8be6d7e))
- ✨ implement user login checks and enhance event handling for login requirements ([89e11e9](https://github.com/ZUGAZ/likes-to-go/commit/89e11e95842f81b1d2940723c16f3a2f1a3d609c))
- ✨ initial public release ([10e79cb](https://github.com/ZUGAZ/likes-to-go/commit/10e79cbabc333a7f7f78cac8ddd381796e45c28b))
- ✨ integrate silent logger tests and enhance tests ([3679780](https://github.com/ZUGAZ/likes-to-go/commit/3679780bacdfa9c59fc1b2a15351d8610e01ee10))
- ✨ integrate solid-transition-group for enhanced popup animations and add heartbeat effect ([ee01074](https://github.com/ZUGAZ/likes-to-go/commit/ee0107423b34722c7339e6e677802a9064eed15a))
- ✨ introduce loading state in popup view model and enhance UI for loading feedback ([d594042](https://github.com/ZUGAZ/likes-to-go/commit/d594042f0b8a0c79bfbac00aefc08f4325596d60))
- ✨ introduce skippedTrackCount to enhance collection tracking and popup notifications ([7bff4ae](https://github.com/ZUGAZ/likes-to-go/commit/7bff4aedf4d8b04ac5f40720fc4595817b0e6115))
- ✨ refactor login error handling to use centralized message constant and enhance state management ([4ea7645](https://github.com/ZUGAZ/likes-to-go/commit/4ea76451005555f79a6a8782ef26abaab460cf3a))
- ✨ set default GIT_EDITOR to cursor for improved commit message editing ([87abae2](https://github.com/ZUGAZ/likes-to-go/commit/87abae2def1bd640a092c4fbdf50951f50444a28))
- 🎯 add selectors for artwork and stats (v1 fields) ([a1b41ac](https://github.com/ZUGAZ/likes-to-go/commit/a1b41ac30055266dc3e13a771ff2779a7dd907cc))
- 👀 dom-reader extracts artwork_url and stats (0.2.0 full metadata) ([e24a63b](https://github.com/ZUGAZ/likes-to-go/commit/e24a63bab25fa728893b1d6c479734507c45aab9))
- 🧵 add per-tab cancel collection command ([a37afda](https://github.com/ZUGAZ/likes-to-go/commit/a37afdad0fd472db023ba303172ffb1754abf09d))
- background service with message handlers and getState ([9c534ec](https://github.com/ZUGAZ/likes-to-go/commit/9c534ece5be22da168911175533f6e13d4f14861))
- document validation pipeline; progress = validated tracks only ([e2b147b](https://github.com/ZUGAZ/likes-to-go/commit/e2b147b9c3a8f7c2ea12e735f18171e31f5505cc))
- export full v1 payload (user + optional track fields) ([e8a21a2](https://github.com/ZUGAZ/likes-to-go/commit/e8a21a2f4c483002ec986c7335ac80e9fb364d84))
- full Track schema with optional v1 metadata fields ([7aa7861](https://github.com/ZUGAZ/likes-to-go/commit/7aa78619541b61282ae42dabc87c90bacfedca81))
- popup, toolbar icon, and JSON export for MVP ([1f4e90e](https://github.com/ZUGAZ/likes-to-go/commit/1f4e90ee9ca06eff5ee491c789bd7de7cc6c42c3))

### Bug Fixes

- 🐛 guard against empty commit messages in commit-msg hook ([73419a5](https://github.com/ZUGAZ/likes-to-go/commit/73419a573edadfdaa44f7187671681a9ce744aa9))
- 🐛 improve inline error handling by refining retry logic and ensuring proper error indication ([520266a](https://github.com/ZUGAZ/likes-to-go/commit/520266a000c3ba10033cbe4db4a8ca087713f370))
- 🐛 update tab creation to set active state to true ([c6462e2](https://github.com/ZUGAZ/likes-to-go/commit/c6462e2bf93d6c8ea7952829f4341aedb37a2da3))

## Changelog
