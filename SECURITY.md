# Security Policy

## Supported versions

The `main` branch (whatever is live on Vercel) is the supported version.

## Reporting a vulnerability

Open a **private** report via GitHub Security Advisories on this repo, or open an issue marked `[security]` with minimal detail and a contact address. Expect a first response within 72 hours.

## Scope notes

- This app only consumes public, keyless feeds (NOAA SWPC, NASA DONKI `DEMO_KEY`). No secrets are stored.
- The risk engine is informational, not safety-critical: it must never be presented as an official alert source.
