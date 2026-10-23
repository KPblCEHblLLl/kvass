# Change Proposal: Recipe Management MVP (Google Drive JSON Persistence)

## Problem Statement
Solo developers and home cooks need an efficient, structured mechanism to store, retrieve, update, and manage cooking recipes across devices without running a dedicated database server or relying on closed third-party SaaS platforms.

## Proposed Solution
Implement a lightweight, cloud-persisted CRUD (Create, Read, Update, Delete) recipe management application in TypeScript. 
Data is persisted remotely as a structured `recipes.json` file inside a dedicated Google Drive folder (`GOOGLE_DRIVE_FOLDER_ID`), accessed headlessly via the official **Google Drive API v3** using **OAuth 2.0 with a persistent Refresh Token**. 

The application includes:
- Runtime schema validation with Zod.
- A one-time CLI script to authenticate and obtain the OAuth refresh token.
- A repository layer to fetch, cache, and atomically write JSON data inside the dedicated Google Drive folder.
- A complete service layer for CRUD operations with filtering and search.
- An automated test suite using Vitest with mockable storage drivers.

## Scope
- **In Scope**:
  - Strongly typed Recipe domain models and runtime validation schemas (Zod).
  - Google Drive storage client (`googleapis`) configured with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `GOOGLE_DRIVE_FOLDER_ID`.
  - Dedicated Google Drive folder scoping for all file lookups and writes.
  - Initial authorization helper script (`scripts/get-refresh-token.ts`) to easily obtain the refresh token via a local browser loopback callback.
  - Remote JSON storage repository managing the `recipes.json` payload on Google Drive.
  - Complete CRUD service and repository methods:
    - Create recipe with validation and ID generation.
    - Read recipe by ID and list/filter recipes by keywords or tags.
    - Update existing recipes with timestamp tracking.
    - Delete recipes by ID.
  - Interface layer (CLI commands or REST endpoints) for interaction.
  - Automated unit and integration test suite with mocked Google Drive interactions.
- **Out of Scope**:
  - Multi-tenant multi-user authentication (single-user personal Google Drive storage).
  - Binary image/media file hosting (image URLs allowed as string metadata).
  - Complex multi-client concurrency conflict resolution (last-write-wins for single user).

## Success Metrics
- Seamless headless execution on any machine providing the `.env` credentials without interactive login prompts.
- 100% automated test pass rate for all CRUD repository and service methods.
- Persistent data integrity across runs verified against Google Drive JSON schema.
- Zero TypeScript compilation errors on clean builds (`npm run build`).
