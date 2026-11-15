# MEDULA — Autonomous Astronaut Health Intelligence System

[![Deploy MEDULA to GitHub Pages](https://github.com/bhupesh006/Medula/actions/workflows/deploy.yml/badge.svg)](https://github.com/bhupesh006/Medula/actions/workflows/deploy.yml)
[![Tests](https://img.shields.io/badge/tests-116%20passed-brightgreen.svg)]()
[![Offline-First](https://img.shields.io/badge/storage-IndexedDB%20v6%20Dexie-blue.svg)]()
[![NASA HRP](https://img.shields.io/badge/grounding-NASA%20HRP%20%26%20Standard%20Measures-orange.svg)]()

> **MEDULA** is an offline-first autonomous astronaut health intelligence prototype designed for deep-space human exploration missions (e.g., Mars transit and Lunar surface habitat operations) where real-time Earth communication latency and blackout intervals preclude continuous terrestrial clinical monitoring.

---

## 🚀 Key Architectural Highlights

- **100% Offline-First & Standalone**: Operates entirely in-browser using **Dexie IndexedDB (v6)**. Runs standalone without a mandatory backend server and performs atomic offline synchronization when connectivity is available.
- **Robust Aerospace Statistics**: Computes personalized physiological baselines using non-parametric statistics (**Median and Median Absolute Deviation / MAD**) to avoid the false alerts that generic terrestrial reference intervals cause during microgravity adaptation.
- **Cross-Domain Pattern Detection**: Independent pattern detection engines across 5 domains (Cardiovascular, Autonomic, Sleep & Recovery, Physical Performance, and Environmental Multi-Stress) with standardized software states (`NOMINAL`, `WATCH`, `ASSESS`, `ESCALATE`).
- **Contextual Synthesis**: Synthesizes mission activities (EVA, exercise countermeasures, sleep opportunities) and cabin ECLSS conditions (CO₂, temperature, pressure) without making unwarranted causal leaps.
- **Autonomous Clinical Decision Support**: Protocol recommendations, contraindication checks, and intervention tracking derived from NASA spaceflight clinical practice guidelines.
- **NASA Evidence & Standard Measures Grounding**: Structured research evidence layer grounded in the **NASA Five Spaceflight Hazards**, NASA Human Research Program (HRP) risks, verified **NASA Open Science Data Repository (OSDR)** telemetry, and official [NASA Spaceflight Standard Measures](https://www.nasa.gov/reference/standard-measures/).
- **PWA & GitHub Pages Ready**: Built with Vite and configured with relative assets (`base: './'`), client-side service worker caching, and an automated GitHub Actions deployment pipeline.

---

## 🧭 Navigation & Core Modules

The system provides 8 integrated operational views:

1. **Mission Overview (`overview`)**: Integrated flight intelligence cockpit combining active baselines, multi-indicator alerts, clinical directives, latest vitals (HR, HRV, BP, SpO₂, body temp), recent mission events, cabin life support sensors, and demonstration telemetry controls.
2. **Health Assessment (`assessment`)**: Multi-source telemetry ingestion for physiological vitals, subjective clinical ratings (sleep duration, fatigue, mood, stress), operational mission events, and radiation dosimeter readings with real-time schema validation and rejection auditing.
3. **Personal Baseline (`baseline`)**: Calculation, persistence, versioning, and longitudinal trend trajectories for astronaut-specific baseline envelopes.
4. **Health Pattern Analysis (`patterns`)**: Multi-indicator pattern evaluations detecting concurrent indicator deviations across cardiovascular, autonomic, and psychological metrics.
5. **Mission Context (`context`)**: Non-causal operational correlation of scheduled crew activities, EVA tasks, exercise countermeasure logs, and life support environment.
6. **Medical Decision Support (`decision`)**: Actionable clinical protocol directives, contraindications, priority triage (`IMMEDIATE`, `SCHEDULED`, `MONITOR`), and guidance implementation tracking.
7. **Research & Evidence (`research`)**: Scientific evidence repository, 5 hazards explorer, OSDR open science catalogue, and NASA Spaceflight Standard Measures mission cadence timeline (`L-180`, `FD15`, `FD60`, `FD120`, `R-15`, `R+3`, `R+30`).
8. **Mission Data Management (`management`)**: Local IndexedDB browser, pending outbox sync queue management, rejection logs, manual sync triggering, and demonstration data purge.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons
- **Local Storage**: IndexedDB via Dexie.js (Schema version 6 with 11 persistent object stores)
- **Validation**: Zod schema validation for physical bounds, UTC ISO 8601 timestamps, and origin provenance
- **Backend (Optional)**: Node.js, Express, MongoDB (Mongoose)
- **Testing**: Vitest (14 test suites, 116 tests)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) deploying directly to GitHub Pages

---

## 🧪 Testing

Run the automated test suite:

```bash
# Run all Vitest suites
npm test

# or via npx
npx vitest run
```

```
Test Files  14 passed (14)
     Tests  116 passed (116)
```




