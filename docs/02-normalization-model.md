# Normalization Model

All YAML is parsed into a RawRecipe object with optional fields.

A build-time normalization step:
- Supplies defaults
- Calculates totals
- Ensures arrays exist

Normalized data is the only thing exposed to UI, API, and MCP.
