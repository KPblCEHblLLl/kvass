# Technical Design: Recipe Management MVP (Google Drive JSON Storage)

## Architecture Overview

The system is organized into clean, decoupled layers using TypeScript:

```text
┌────────────────────────────────────────────────────────┐
│               Interface / Consumer Layer               │
│                (CLI tool or REST API)                  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Service Layer                       │
│       (RecipeService: business logic, Zod validation)  │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Repository Layer                      │
│        (RecipeRepository / GoogleDriveStorageDriver)   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               Google Drive Client Layer                │
│    (OAuth2Client with Refresh Token + Drive API v3)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Drive API)
┌───────────────────────────▼────────────────────────────┐
│        Google Drive: Remote "recipes.json" File        │
└────────────────────────────────────────────────────────┘
```

---

## 1. Authentication & Google Drive Integration

### OAuth2 Refresh Token Authentication
The application communicates with Google Drive using the official `googleapis` library. It operates in **headless mode** by utilizing an OAuth2 `refresh_token` stored in `.env`.

- **Environment Variables**:
  - `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID (from Google Cloud Console).
  - `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Client Secret.
  - `GOOGLE_REFRESH_TOKEN`: Long-lived refresh token obtained via the setup script.
  - `GOOGLE_DRIVE_FOLDER_ID`: Dedicated Google Drive folder ID (e.g. `17X38Awlouqw7vLFEXTb06l5K2fZnpy10`) containing application data files.
  - `GOOGLE_DRIVE_FILE_ID`: (Optional) ID of existing `recipes.json` file in Google Drive. If omitted, the driver discovers `recipes.json` within `GOOGLE_DRIVE_FOLDER_ID` or creates it inside that folder.

### One-Time Token Generator (`scripts/get-refresh-token.ts`)
A lightweight helper script starts a temporary local HTTP server (`http://localhost:3000/oauth2callback`), opens the Google OAuth consent URL in the default browser with the `https://www.googleapis.com/auth/drive.file` scope, exchanges the authorization code for tokens, and prints the `GOOGLE_REFRESH_TOKEN` to stdout for copying into `.env`.

---

## 2. Storage & Repository Design

### JSON Document Schema (`recipes.json`)
```typescript
export interface RecipeDatabasePayload {
  version: number;
  lastModified: string;
  recipes: Recipe[];
}
```

### Google Drive Storage Driver (`src/db/googleDriveClient.ts` & `src/db/recipeRepository.ts`)
- **Folder Scoping & File Resolution**:
  - Locates `recipes.json` inside dedicated parent folder:
    `q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name = 'recipes.json' and trashed = false``
  - If missing, creates `recipes.json` with `parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]`.
- **Reading Data**:
  - Calls `drive.files.get({ fileId, alt: 'media' })` to download and parse the remote JSON string into memory.
  - Validates payload structure against Zod schemas.
- **Writing Data**:
  - Serializes updated `RecipeDatabasePayload` to JSON.
  - Calls `drive.files.update({ fileId, media: { mimeType: 'application/json', body: streamOrString } })` to update the remote file in place.
- **Pluggable Interface**:
  - The repository accepts a storage interface (`StorageDriver`), allowing mock in-memory or local-file storage drivers during automated testing without calling Google APIs.

---

## 3. Data Flow & Service Layer

```text
User / CLI ──► RecipeService.create(input)
                  │
                  ├──► Zod Schema Validation
                  ├──► Generate ID (UUID) & Timestamps (ISO 8601)
                  ├──► RecipeRepository.getAll()
                  ├──► Append new recipe to array
                  └──► RecipeRepository.saveAll(updatedPayload) ──► Google Drive API
```

---

## 4. Technical Decisions & Trade-offs

| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Persistence Engine** | Google Drive Raw JSON (`recipes.json`) | Zero database infrastructure required; single portable source of truth accessible from any machine. |
| **Auth Mechanism** | OAuth2 with Refresh Token | Allows headless background execution on any machine; access tokens are automatically rotated by `googleapis`. |
| **OAuth Scope** | `https://www.googleapis.com/auth/drive.file` | Least-privilege security principle: grants access only to files created or opened by this application. |
| **Schema Validation** | `zod` | Single source of truth for runtime validation, API safety, and TypeScript type inference. |
| **Testing Strategy** | Vitest with Mock / Memory Driver | Allows instant, offline test suite execution ($<50\text{ms}$) without real Google network requests or API quota consumption. |
