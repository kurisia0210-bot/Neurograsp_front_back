# Database layer

This package is the backend-only data access layer. Keep business logic in `service/` or `agent/`.

Notes:
- Do not store PHI directly in the vector store. Store only IDs/metadata.
- Apply access control in the service layer before reading patient data.
- Prefer environment variables for connection strings.
