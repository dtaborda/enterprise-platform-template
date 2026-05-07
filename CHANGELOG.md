# Changelog

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
