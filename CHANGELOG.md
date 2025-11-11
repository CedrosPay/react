# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2025-11-10

### Changed
- Updated React peer dependency to support both React 18 and 19 (`"react": "^18.0.0 || ^19.0.0"`)
- Updated React DOM peer dependency to support both React 18 and 19 (`"react-dom": "^18.0.0 || ^19.0.0"`)

## [1.0.2] - 2025-11-10

### Fixed
- Fixed CSS export path in package.json (changed from `./dist/style.css` to `./dist/pay-react.css` to match actual build output)
- Fixed React UMD global error in examples/basic/App.tsx by adding explicit React import
- Fixed TypeScript error for `import.meta.env` in examples by using type assertion

## [1.0.1] - 2025-11-10

### Changed
- Updated README with landing page messaging and clearer value proposition
- Improved Quick Start section with 3-step integration guide
- Restructured Key Features section to match landing page presentation
- Added "How It Works (x402)" section with visual flow diagram
- Simplified example code snippets for better readability

### Added
- Added "stablecoins" keyword to package.json for better npm discoverability

## [1.0.0] - 2025-11-10

### Added
- Initial stable release
- Full Stripe + Solana x402 payment integration
- Multi-item cart support with ceiling-rounded pricing
- Two-phase coupon system (catalog-level and checkout-level)
- Internationalization (i18n) with English and Spanish translations
- Comprehensive error telemetry with PII sanitization
- Token mint validation to prevent fund loss
- CSP helper utilities for production deployment
- Type versioning with v1 namespace
- Refund system with signature verification
- Theme customization and unstyled mode
- Production-ready security features
