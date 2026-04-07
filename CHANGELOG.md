
# Changelog

## [Unreleased] - 2026-03-09

### Visual Improvements
- **Invite Member Modal**:
  - Updated color scheme to use high-contrast grays and blues.
  - Replaced low-contrast placeholders with `placeholder:text-gray-400`.
  - Improved button styling with distinct primary/secondary actions.
  - Added role icons for "VENTAS" and "CONTABILIDAD" (previously missing/default).

### Role Management
- **Database Cleanup**:
  - Merged duplicate roles: "SELLER" -> "VENTAS", "FINANCE" -> "CONTABILIDAD".
  - Standardized role names to Spanish across the application.
  - Removed redundant English role definitions from the database.
- **Validation**:
  - Implemented backend script `fix_roles.py` to ensure role uniqueness and data integrity.

### Membership
- **Access Control**:
  - Restricted "Membresía" tab visibility in Settings to only the Business Owner (checked against `activeBusiness.user_id`).
  - Hides the tab for Team Members (Admins, Sellers, Accountants) even if the business is on a PRO plan.

### Technical
- Added `tests/test_roles_cleanup.py` for role validation logic.
- Standardized backend port to 5000 and frontend proxy to match.
