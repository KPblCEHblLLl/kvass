# Capability: Recipe Management

## Overview
Provides cloud-backed persistent storage (Google Drive JSON), schema validation, and CRUD operations for culinary recipes.

## Requirements

### REQ-001: Recipe Data Model & Validation
- **Description**: The system must enforce a structured schema for all recipe records.
- **Fields**:
  - `id`: Unique identifier (UUID string).
  - `title`: Required non-empty string (1–150 characters).
  - `description`: Optional text summary.
  - `servings`: Positive integer (> 0).
  - `prepTimeMinutes`: Non-negative integer ($\ge 0$).
  - `cookTimeMinutes`: Non-negative integer ($\ge 0$).
  - `ingredients`: Array of ingredient objects:
    - `name`: Required string.
    - `quantity`: Required number or string (e.g. `2`, `1.5`, `"1/2"`).
    - `unit`: Optional string (e.g. `"cups"`, `"tbsp"`, `"g"`).
    - `notes`: Optional string (e.g. `"finely chopped"`).
  - `instructions`: Array of ordered step strings (minimum 1 step).
  - `tags`: Array of string category tags (e.g. `["breakfast", "quick", "vegetarian"]`).
  - `createdAt`: ISO 8601 string timestamp.
  - `updatedAt`: ISO 8601 string timestamp.

### REQ-002: Storage Schema & Remote Persistence
- **Description**: Persist all recipes in a structured JSON document (`recipes.json`) stored in a dedicated Google Drive folder referenced by `GOOGLE_DRIVE_FOLDER_ID`.
- **Document Structure**:
  ```json
  {
    "version": 1,
    "lastModified": "2026-10-21T18:00:00.000Z",
    "recipes": []
  }
  ```
- **Acceptance Criteria**:
  - The repository authenticates via OAuth2 Refresh Token without requiring interactive browser logins during normal operations.
  - File queries and writes are strictly scoped to the parent folder specified in `GOOGLE_DRIVE_FOLDER_ID` (`'${folderId}' in parents and trashed = false`).
  - If `recipes.json` does not exist in the dedicated folder, the system creates `recipes.json` under that folder with an empty payload.
  - Remote reads and writes serialize and deserialize data adhering to the Zod domain schema.

### REQ-003: Recipe Creation (Create)
- **Description**: Add a new recipe to persistent Google Drive JSON storage.
- **Acceptance Criteria**:
  - Valid input data generates an ID and timestamps, appends the record to `recipes.json`, writes to Google Drive, and returns the full recipe object.
  - Invalid inputs (e.g. missing title, empty instructions, invalid servings) are rejected with clear validation error messages before making any network requests.

### REQ-004: Recipe Retrieval (Read)
- **Description**: Retrieve a single recipe by its ID or list recipes with optional search and tag filtering.
- **Acceptance Criteria**:
  - `getById(id)` returns the exact recipe object if it exists.
  - `getById(id)` returns `null` or a not-found error if the ID does not exist.
  - `list(options)` returns an array of recipes, supporting optional case-insensitive keyword search across `title` and filtering by `tags`.

### REQ-005: Recipe Modification (Update)
- **Description**: Update fields of an existing recipe in Google Drive storage.
- **Acceptance Criteria**:
  - Partial or full updates are validated and committed to `recipes.json` on Google Drive.
  - `updatedAt` timestamp is updated to the current ISO timestamp.
  - Attempting to update a non-existent recipe ID returns a not-found error.

### REQ-006: Recipe Deletion (Delete)
- **Description**: Remove an existing recipe from storage.
- **Acceptance Criteria**:
  - Deleting an existing recipe removes the record from `recipes.json`, persists the update to Google Drive, and returns confirmation.
  - Subsequent retrieval calls for the deleted ID return not found.
  - Deleting a non-existent recipe ID gracefully reports a not-found error.
