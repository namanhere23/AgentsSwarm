# Contributing Guidelines (docs/CONTRIBUTING.md)

## 1. Git Workflow & Branch Naming
- Base all features on the `develop` branch.
- Use scoped branch names for all workstreams:
  - `workstream/0-architect`
  - `workstream/1a-backend-core`
  - `workstream/1b-database-migrations`
  - `workstream/1c-frontend-foundation`
  - `workstream/2a-memory-system`
  - etc.
- Merge into `develop` only after verification gates pass.

## 2. Pre-Commit Hooks
Install pre-commit checks locally:
- Run `black --check backend/` to ensure PEP 8 compliant spacing.
- Run `ruff check backend/` to analyze for linting exceptions or import ordering errors.
- Run type checks in frontend: `cd frontend && npx tsc --noEmit`.

## 3. Adding New Tools
To add a new tool to the system:
1. Subclass the abstract class `SwarmTool` in `backend/app/tools/base.py`.
2. Define the static `name` and `description` string properties.
3. Implement the async `_run(self, input: str) -> str` method.
4. Ensure the `MOCK_TOOLS` guard is declared at the top of the function:
   ```python
   if os.getenv("MOCK_TOOLS") == "true":
       return f"[MOCK] {self.name} called with: {input}"
   ```
5. Place the file inside the `backend/app/tools/` folder. The `importlib` registry scanner will autoload it at next application launch.

## 4. Crew YAML Validation and Hot-Reloading
- Place Crew configurations in `.yaml` files under the `crews/` directory.
- Definitions must comply with `CrewDefinition` Pydantic models.
- Changes made to YAML files are hot-reloaded automatically by a watchdog script, bypassing backend restart.
