# Capability: Recipe Management

## Overview
Provides cloud-backed persistent storage (Google Drive JSON), schema validation, and CRUD operations for culinary recipes.

## Requirements

### REQ-001: Khlebets Data Model & Schema
- **Description**: The system must enforce a structured schema for all `Khlebets` recipe iteration records.
- **Fields**:
  - `iteration`: number (iteration counter).
  - `oven`: Enum with value `"Mine"`.
  - `perBake`: number.
  - `flower`: number (flour weight).
  - `flowerType`: Enum with value `"Rye2000"`.
  - `water`: number.
  - `sugar`: optional number.
  - `isSnack`: boolean.
  - `sesame`: optional number.
  - `sunflower`: optional number.
  - `flax`: optional number.
  - `baking`: array of baking step objects:
    - `temperature`: number.
    - `duration`: number.
    - `fan`: boolean.

### REQ-002: Storage Schema & Remote Persistence
- **Description**: Persist all `Khlebets` items in a JSON array file (`khlebets.json`) stored in the dedicated Google Drive folder referenced by `GOOGLE_DRIVE_FOLDER_ID`.
- **Document Structure**:
  ```json
  []
  ```
- **Acceptance Criteria**:
  - The repository authenticates via OAuth2 Refresh Token without requiring interactive browser logins during normal operations.
  - File queries and writes are strictly scoped to the parent folder specified in `GOOGLE_DRIVE_FOLDER_ID` (`'${folderId}' in parents and trashed = false`).
  - If `khlebets.json` does not exist in the dedicated folder, the system creates `khlebets.json` under that folder with an empty array `[]`.
  - Remote reads and writes serialize and deserialize data adhering to the `Khlebets` interface schema.

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
