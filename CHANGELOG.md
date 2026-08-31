# Changelog

## [1.4.1](https://github.com/dtaborda/enterprise-platform-template/compare/v1.4.0...v1.4.1) (2026-08-31)


### 🐛 Bug Fixes

* **ci:** setup pnpm in release workflow ([#145](https://github.com/dtaborda/enterprise-platform-template/issues/145)) ([8bbbca8](https://github.com/dtaborda/enterprise-platform-template/commit/8bbbca8d2309f2ecd788b876f53aaf748e078c46))
* close billing webhook fallback and fix deployment config drift ([#151](https://github.com/dtaborda/enterprise-platform-template/issues/151)) ([f002848](https://github.com/dtaborda/enterprise-platform-template/commit/f002848d48e4bde7e27f0e90012b4819c27ced9f))
* **core:** drop hardcoded Stripe apiVersion literal ([#154](https://github.com/dtaborda/enterprise-platform-template/issues/154)) ([5e9f2d7](https://github.com/dtaborda/enterprise-platform-template/commit/5e9f2d74deb3bc90996e2a10938b0898fcf6f19e))

## [1.4.0](https://github.com/dtaborda/enterprise-platform-template/compare/v1.3.0...v1.4.0) (2026-06-08)


### ✨ Features

* add billing and plans module — subscription lifecycle, payment adapters, and billing UI ([#90](https://github.com/dtaborda/enterprise-platform-template/issues/90)) ([045fb43](https://github.com/dtaborda/enterprise-platform-template/commit/045fb433fa428364711e0a222ed7f2260432344b))
* **auth:** initialize Free plan subscription on signup ([#92](https://github.com/dtaborda/enterprise-platform-template/issues/92)) ([059f71e](https://github.com/dtaborda/enterprise-platform-template/commit/059f71ec3bde1e801f151343d6d1d07eb4d343ce))
* **brand:** add brand config schema, provider, and layout integration ([#114](https://github.com/dtaborda/enterprise-platform-template/issues/114)) ([007bf0b](https://github.com/dtaborda/enterprise-platform-template/commit/007bf0bf3166a232721c7ddf3b7267106d0a0eab))
* **brand:** add BrandLogo, BrandFooter components and E2E tests ([#121](https://github.com/dtaborda/enterprise-platform-template/issues/121)) ([97d62e6](https://github.com/dtaborda/enterprise-platform-template/commit/97d62e6db08e9bbedc09aedb33bd3f8cbd0f8899))
* **brand:** migrate brand source + tests to @enterprise/brand [PR 2/3] ([#126](https://github.com/dtaborda/enterprise-platform-template/issues/126)) ([ba2ba2a](https://github.com/dtaborda/enterprise-platform-template/commit/ba2ba2ad3e784281ec1ebf4fe27db66cb02b634c))
* **brand:** scaffold @enterprise/brand package [PR 1/3] ([#125](https://github.com/dtaborda/enterprise-platform-template/issues/125)) ([3b67b75](https://github.com/dtaborda/enterprise-platform-template/commit/3b67b757a8376815dbb6b3180fd57ba0d4881de7))
* **contracts:** add workspace-admin foundation ([#77](https://github.com/dtaborda/enterprise-platform-template/issues/77)) ([e1fcd79](https://github.com/dtaborda/enterprise-platform-template/commit/e1fcd79c5e080dcaed2922513ff1182d3cfaa0ab))
* **contracts:** tenant-onboarding DTOs + planning docs [1/6] ([#135](https://github.com/dtaborda/enterprise-platform-template/issues/135)) ([4028efb](https://github.com/dtaborda/enterprise-platform-template/commit/4028efb2d1f4b8625f0349bea6e257e86107ebec))
* **core:** add AuthPort, StoragePort, SessionPort interfaces and Supabase adapters ([#116](https://github.com/dtaborda/enterprise-platform-template/issues/116)) ([31d1493](https://github.com/dtaborda/enterprise-platform-template/commit/31d1493db9817208573307bdb6366e7a7cfbb482))
* **core:** wire notification dispatch into billing and team services ([#109](https://github.com/dtaborda/enterprise-platform-template/issues/109)) ([fa82029](https://github.com/dtaborda/enterprise-platform-template/commit/fa8202906c132b086754c06007fc0e86ac89c194))
* **core:** workspace-admin service layer + allow_admin_invites guard [2/4] ([#78](https://github.com/dtaborda/enterprise-platform-template/issues/78)) ([ed82950](https://github.com/dtaborda/enterprise-platform-template/commit/ed829505221518c875ad44f1d256dae40567f090))
* **notifications:** add contracts, schema, adapters, and service layer ([#108](https://github.com/dtaborda/enterprise-platform-template/issues/108)) ([9645273](https://github.com/dtaborda/enterprise-platform-template/commit/9645273818c7196349a7b27386c951867c52d811))
* tenant onboarding flow (db, service, actions, UI, E2E) ([#141](https://github.com/dtaborda/enterprise-platform-template/issues/141)) ([40fdb5b](https://github.com/dtaborda/enterprise-platform-template/commit/40fdb5b35d993a97d565721c1d3cd6e03c0e0aae))
* **ui:** add notification center, preferences page, bell, and Realtime badge ([#111](https://github.com/dtaborda/enterprise-platform-template/issues/111)) ([9a07956](https://github.com/dtaborda/enterprise-platform-template/commit/9a079562faea0df5f6d102e5b66f0fca51c26844))
* **ui:** add notification Server Actions, queries, and route registration ([#110](https://github.com/dtaborda/enterprise-platform-template/issues/110)) ([87133ea](https://github.com/dtaborda/enterprise-platform-template/commit/87133eac3d1b126a84b9fe4d73193ecbfc3212e7))
* **ui:** complete design system consistency ([#103](https://github.com/dtaborda/enterprise-platform-template/issues/103)) ([e33bfd8](https://github.com/dtaborda/enterprise-platform-template/commit/e33bfd884765572a6f66b71a99c3ddf8e2acc85f))
* **ui:** complete platform UX foundations ([#98](https://github.com/dtaborda/enterprise-platform-template/issues/98)) ([556fe23](https://github.com/dtaborda/enterprise-platform-template/commit/556fe23e52877bf1dc43b543e1051257a9e31b98))
* **web:** workspace-admin UI — server actions, components, settings page [3/4] ([#79](https://github.com/dtaborda/enterprise-platform-template/issues/79)) ([e3a6f41](https://github.com/dtaborda/enterprise-platform-template/commit/e3a6f418feb34d3f1d214d51fba93b668846e984))


### 🐛 Bug Fixes

* **e2e:** stabilize team-management specs + resend/cancel UX + CI readiness [e2e-stability 3/3] ([#131](https://github.com/dtaborda/enterprise-platform-template/issues/131)) ([e933a80](https://github.com/dtaborda/enterprise-platform-template/commit/e933a8053a9da7332fc2a7c0d8539478ba6e57bd))
* harden GitHub release automation ([#143](https://github.com/dtaborda/enterprise-platform-template/issues/143)) ([1b2e26c](https://github.com/dtaborda/enterprise-platform-template/commit/1b2e26c25d60d6470325cea885ca76447c57448e))
* **theme:** derive SSR data-theme from brand, fix theme E2E [e2e-stability 1/3] ([#129](https://github.com/dtaborda/enterprise-platform-template/issues/129)) ([0081d06](https://github.com/dtaborda/enterprise-platform-template/commit/0081d06090eab32a1a24e5a2a553385dbf6b9006))


### ♻️ Refactoring

* **brand:** strip brand code from @enterprise/ui [PR 3/3] ([#127](https://github.com/dtaborda/enterprise-platform-template/issues/127)) ([92fcf6b](https://github.com/dtaborda/enterprise-platform-template/commit/92fcf6b0bea972c137675659b2ceac4d68d06f24))
* **core:** migrate auth-service to AuthPort and update middleware/actions ([#122](https://github.com/dtaborda/enterprise-platform-template/issues/122)) ([fe48e50](https://github.com/dtaborda/enterprise-platform-template/commit/fe48e502d2d1b265885d885c5817ead301f3869d))
* restructure routes from /dashboard/* to feature-first top-level segments ([#75](https://github.com/dtaborda/enterprise-platform-template/issues/75)) ([b932728](https://github.com/dtaborda/enterprise-platform-template/commit/b932728485212de7aef46ceef0a9bbd0d5aae9fd))

## [1.3.0](https://github.com/dtaborda/enterprise-platform-template/compare/v1.2.0...v1.3.0) (2026-05-09)


### ✨ Features

* add tenant team contracts, DB schema, and migration ([#71](https://github.com/dtaborda/enterprise-platform-template/issues/71)) ([1f01fa6](https://github.com/dtaborda/enterprise-platform-template/commit/1f01fa69956333cd6fa93a014ef8d5246ca3cbc4))
* **core:** add tenant team service with email adapters ([#72](https://github.com/dtaborda/enterprise-platform-template/issues/72)) ([7d99668](https://github.com/dtaborda/enterprise-platform-template/commit/7d996683e100c02253fec069dcaafd9490268cab))
* **ui:** add tenant team management pages and E2E tests ([#74](https://github.com/dtaborda/enterprise-platform-template/issues/74)) ([cf095b7](https://github.com/dtaborda/enterprise-platform-template/commit/cf095b76a6288e8cd5130f501f265bf5884bd966))


### 🐛 Bug Fixes

* **skills:** resolve scope parsing and action prefix in skill-sync ([#69](https://github.com/dtaborda/enterprise-platform-template/issues/69)) ([d6f7a87](https://github.com/dtaborda/enterprise-platform-template/commit/d6f7a87fc083b215cec9ff07a58b2ea33a36ed06))

## [1.2.0](https://github.com/dtaborda/enterprise-platform-template/compare/v1.1.2...v1.2.0) (2026-05-07)


### ✨ Features

* add JSON-configurable theme system with light/dark mode switching ([24822d3](https://github.com/dtaborda/enterprise-platform-template/commit/24822d3df3d4846bc0c21154dabb281fb55a038a))
* add resources reference module with full CRUD, RLS, and E2E tests ([8e6f13e](https://github.com/dtaborda/enterprise-platform-template/commit/8e6f13e1717f5433fef8fe4840216e17967bb38e))
* add Sentry instrumentation and CI migration deployment ([6a594d3](https://github.com/dtaborda/enterprise-platform-template/commit/6a594d327ac57f7ca843b2c6001263ae8abc197e))
* unified form validation UX system ([#36](https://github.com/dtaborda/enterprise-platform-template/issues/36)) ([8c58f21](https://github.com/dtaborda/enterprise-platform-template/commit/8c58f21f0e11eab8f48fe5f918e919bbf528b247))


### 🐛 Bug Fixes

* align all port references to 55331+ (supabase local isolation) ([18e7ecc](https://github.com/dtaborda/enterprise-platform-template/commit/18e7ecc26ff784dd005dfc79314078f59ddf3648))
* **ci:** disable dependabot for github-actions (SHA-pinned manually) ([#58](https://github.com/dtaborda/enterprise-platform-template/issues/58)) ([bd23506](https://github.com/dtaborda/enterprise-platform-template/commit/bd2350619ee1d5f54acaae03d494b7573c6f9e6d))
* **ci:** ignore major version bumps in dependabot config ([#54](https://github.com/dtaborda/enterprise-platform-template/issues/54)) ([4d546b3](https://github.com/dtaborda/enterprise-platform-template/commit/4d546b36e105623435db23c82dd3bd55c446adab))
* **ci:** improve release-please config and workflow reliability ([#37](https://github.com/dtaborda/enterprise-platform-template/issues/37)) ([2eb0029](https://github.com/dtaborda/enterprise-platform-template/commit/2eb0029dc7e769d6d898356e70df1e24a6d249c2))
* **ci:** use PAT for release-please to trigger CI on release PRs ([#63](https://github.com/dtaborda/enterprise-platform-template/issues/63)) ([b272034](https://github.com/dtaborda/enterprise-platform-template/commit/b272034881d0b89332e7261c7c8f148b6ed00c2d))
* **docs:** replace JSX components with standard markdown and add supabase db reset instructions ([050c2bd](https://github.com/dtaborda/enterprise-platform-template/commit/050c2bd84238cdbb0c09878c5cd9f960449ae266))
* **e2e:** use getByRole heading to avoid strict mode violation on detail page ([8bedc12](https://github.com/dtaborda/enterprise-platform-template/commit/8bedc1228c282803302a992e03ea1167f4592619))
* **e2e:** use getByText.first() for detail page title assertion ([5cfc3f6](https://github.com/dtaborda/enterprise-platform-template/commit/5cfc3f679e4f77ab58410fac1ddda73581cc88d4))
* **release:** remove component from release-please-config to fix PR title mismatch ([7f389ea](https://github.com/dtaborda/enterprise-platform-template/commit/7f389eafebc47daef3d39955871816649f7a65ad))
* **release:** restore manifest to 1.1.2 and sync with missing GitHub tag ([#26](https://github.com/dtaborda/enterprise-platform-template/issues/26)) ([9c73dd0](https://github.com/dtaborda/enterprise-platform-template/commit/9c73dd02f4f8fb8705da7b2fac07aab86606fe25))
* **release:** sync manifest version to last existing tag v1.1.1 ([dda6511](https://github.com/dtaborda/enterprise-platform-template/commit/dda65112310d3c046f85b742c64c52485cffd48c))
* **skills:** add tracking enforcement and commit missing form-validation skill ([#39](https://github.com/dtaborda/enterprise-platform-template/issues/39)) ([20ef402](https://github.com/dtaborda/enterprise-platform-template/commit/20ef402133ce9df2b289603257cad644f2d7baf4))
* **skills:** wire repo-local skills into runtime discovery ([780273c](https://github.com/dtaborda/enterprise-platform-template/commit/780273cda7b0b17592234df80eb9f9094a549712))


### ♻️ Refactoring

* migrate platform services to ServiceResult pattern and centralize auth logic ([#27](https://github.com/dtaborda/enterprise-platform-template/issues/27)) ([29b8e69](https://github.com/dtaborda/enterprise-platform-template/commit/29b8e695f4a84f356efd6c2b829ce4b5ba838e9d))
* normalize RLS claims to app_metadata and redesign docs ([a013e87](https://github.com/dtaborda/enterprise-platform-template/commit/a013e87b5bb7d72faa38c27da3e03c74c477f65d))
* restructure AGENTS.md hierarchy for clarity and reduced duplication ([#28](https://github.com/dtaborda/enterprise-platform-template/issues/28)) ([2f6f184](https://github.com/dtaborda/enterprise-platform-template/commit/2f6f184885f185a06c87911df37fe902e888f03b))

## [1.1.2](https://github.com/dtaborda/enterprise-platform-template/compare/v1.1.1...v1.1.2) (2026-04-21)


### Bug Fixes

* **ci:** grant issues write permission to release workflow ([e26a6fd](https://github.com/dtaborda/enterprise-platform-template/commit/e26a6fda3f75bd4ff46a2dc745c2fd7077781e04))
* **ci:** grant issues write permission to release workflow ([1345e24](https://github.com/dtaborda/enterprise-platform-template/commit/1345e2449bfd97eb0369a5864845817c1fc6aadf))

## [1.1.1](https://github.com/dtaborda/enterprise-platform-template/compare/v1.1.0...v1.1.1) (2026-04-21)


### Bug Fixes

* **release:** restore parseable release-please configuration ([30772f3](https://github.com/dtaborda/enterprise-platform-template/commit/30772f3105d9aacc4f1c74d5a09dac8f4607a709))
* **release:** restore parseable release-please configuration ([56c110a](https://github.com/dtaborda/enterprise-platform-template/commit/56c110afa4efc68440219b3094b671d30ada0aa7))


### Tests

* **auth:** add comprehensive auth and starter coverage ([6436a4b](https://github.com/dtaborda/enterprise-platform-template/commit/6436a4b3ec8e6ba7a8447c640d950ab0f9548703))
* **auth:** add comprehensive auth and starter coverage ([1d12e6c](https://github.com/dtaborda/enterprise-platform-template/commit/1d12e6ccc0570d57a8a41b0ba2355c882bb3c808))
* **tooling:** include web tests in pnpm test ([26a15c5](https://github.com/dtaborda/enterprise-platform-template/commit/26a15c56928e43d243559d6732177d7e644ffa9b))

## [1.1.0](https://github.com/dtaborda/enterprise-platform-template/compare/v1.0.0...v1.1.0) (2026-04-20)


### Features

* initial public starter release ([eb0bffd](https://github.com/dtaborda/enterprise-platform-template/commit/eb0bffd1199ab6c79baa9b1a1816c183c55fa774))


### Bug Fixes

* align public coverage baseline ([aa7c088](https://github.com/dtaborda/enterprise-platform-template/commit/aa7c088f67da00b77900666adbb5d660a8226d0a))
* configure Supabase local, CI env vars, and E2E infrastructure ([e2fe14c](https://github.com/dtaborda/enterprise-platform-template/commit/e2fe14c75806d825d92c2c40e4aa4a7c0452043c), [c2fd28a](https://github.com/dtaborda/enterprise-platform-template/commit/c2fd28a736359a022870cda6fe4ca02346e9e3ce))
* finalize public ci stability ([fb69faa](https://github.com/dtaborda/enterprise-platform-template/commit/fb69faa536d04269b468de70a93235d3a3d767e7))
* finalize public repo health ([fc9017b](https://github.com/dtaborda/enterprise-platform-template/commit/fc9017b7f6e9fead503af54d8f6d839f09a7bd6a))
* remove ALTER TABLE auth.users from seed — let trigger handle onboarding ([5952db6](https://github.com/dtaborda/enterprise-platform-template/commit/5952db696d6b99cb9c74f9dc8dec08a817897a63))
* resolve public CI typecheck blockers ([05f2cda](https://github.com/dtaborda/enterprise-platform-template/commit/05f2cdadcec3d69352ff946f6befc28a7676bdd1))
* unblock public lint and e2e checks ([a9b84e3](https://github.com/dtaborda/enterprise-platform-template/commit/a9b84e352cc434acefe820972f42761646337325))


### Tests

* **web:** add auth callback middleware coverage ([b0ad4ca](https://github.com/dtaborda/enterprise-platform-template/commit/b0ad4ca08f84d98ff065f5749c7caa679dced04e), [52ea756](https://github.com/dtaborda/enterprise-platform-template/commit/52ea7560eff7a6b41e91c3751afeae4a8dd8b631), [3f71961](https://github.com/dtaborda/enterprise-platform-template/commit/3f71961c9f19915c527dddf5d8fcef484beb5ceb))


### Documentation

* add Supabase local setup instructions ([71e4888](https://github.com/dtaborda/enterprise-platform-template/commit/71e4888bd5ee2a008d8df8b45fd61f7fdea42bfa))
* add Supabase local setup instructions and pre-fill .env.example with local defaults ([9b850c2](https://github.com/dtaborda/enterprise-platform-template/commit/9b850c234af2292af497d64493af6c47f0af2739))
