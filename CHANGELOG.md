# Changelog

All notable changes to this repository are documented here. This is the **repository's** publication record, maintained by the author.

It is distinct from the playbook's own **in-scenario version history** (§0 of the document), which is part of the fictional Meridian Digital Assets governance narrative and runs from an internal draft (v0.1) to v1.2. The version numbers are kept aligned so the two ledgers never diverge: the public release below is v1.2 because that is the document's current version.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

- Consolidation of external practitioner feedback into repository issues, to ship as **v1.3** (see the exposure plan). Contributors who identify substantive issues will be credited here and in the document's version history.

## [1.2] — 2026-07-23

First public release.

### Playbook
- Full incident lifecycle: detection & intake, triage & severity classification, escalation & notification, containment, root cause analysis, remediation, and post-incident review.
- Two-axis taxonomy: seven incident categories (C1–C7) scored independently against a four-level severity scale, with a calibration worksheet as a tie-breaker.
- Explicit crosswalk to NIST AI RMF functions and ISO/IEC 42001 controls (§2).
- Roles, RACI matrix, and a declaration & decision-authority table (§3).
- Declaration authority, containment SLAs, chain-of-custody evidence handling, communication matrix, closure/reopening rules, and severity-driven risk-register linkage — added when incorporating an external AI-governance review (captured in the document's in-scenario version history through v1.2).
- Templates: incident report, RCA, and post-incident review (Appendices A–C); on-call severity quick-reference card (Appendix D); tooling reference (Appendix E); and a C1 runbook exemplar (Appendix F).

### Repository
- Markdown source (renders the workflow diagram inline) plus a formatted Word document.
- README with workflow diagram, design-decision summary, and companion-project note.
- Portfolio disclaimer clarifying that Meridian Digital Assets and all document-control metadata are a fictional scenario.
- Licensed under CC BY 4.0.

[Unreleased]: https://github.com/bsgon/ai-incident-response-playbook/compare/v1.2...HEAD
[1.2]: https://github.com/bsgon/ai-incident-response-playbook/releases/tag/v1.2
