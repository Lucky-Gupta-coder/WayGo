# Ownership and Attribution

## 1. Upstream Project & Original Work

- **Original Project / Upstream Authorship**: Developed by Sujal Kumar Ghosh (sujalkrghosh@gmail.com / GitHub: sujalkrghosh), previously committed under the project name Ocar / cardevelopment01-tech.
- **License**: MIT License indicated in the project repository and README documentation:
  MIT © Sujal Kr Ghosh
- **Original Architecture**: 12-module modular architecture encompassing Express + TypeScript API, PostgreSQL/PostGIS raw query layer, Redis/BullMQ background queues, Socket.IO real-time location/ride streaming, and three frontend portals (Passenger, Driver, and Admin).

## 2. WayGo Modifications & Adaptations

The repository has been rebranded and adapted into **WayGo** by Lucky Gupta (Lucky-Gupta-coder):
- **Branding & Identifiers**: Rebranded from Ocar to WayGo across portals, dashboards, configurations, and documentation.
- **Ride Flow & Geo Verification**: End-to-end ride workflow fixes, driver daily verification, geo-matching, and local scenario test tooling (pi/src/scripts/run-scenario.ts, pi/src/scripts/test-geo.ts).
- **Driver Portal Connectivity**: Configuration of local and deployment API URLs for Driver authentication/OTP flows.
- **Render Deployment Preparation**: Render configuration guidelines, environment variable schemas, and build/runtime specifications.

## 3. Contribution Breakdown

- **Inherited Components**:
  - Core Express backend architecture, PostGIS geospatial queries, database migrations (pi/src/db/migrations/), and schema definitions.
  - BullMQ job queue definitions and background workers (gps-flush, 
otifications, cleanup, settlements, scheduler).
  - Next.js and Vite client application scaffolds, component foundations, and design tokens.
  - Terraform infrastructure templates and monitoring definitions (infra/).
- **Original WayGo Contributions**:
  - Specific bug fixes in the end-to-end ride lifecycle, OTP routing, and rate card/fare resolution.
  - Scenario simulation test runners and local end-to-end development verification scripts.
  - Deployment configuration documentation and operational runbooks for cloud deployment (e.g. Render).

## 4. Licensing Status & Human Review

- The inherited code remains governed by the original MIT license terms granted by the original author.
- WayGo modifications are maintained under the same compatible MIT open-source terms.
- **Review Notice**: If full formal copyright transfer or dual-licensing agreements exist with the original author, appropriate formal headers can be appended without modifying historical Git commits or removing original attribution notices.
