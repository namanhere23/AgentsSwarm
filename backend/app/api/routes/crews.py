# STUB-FILL — Implemented by: workstream/5b-crew-manager-rollback
import yaml
from fastapi import APIRouter, Depends, HTTPException
from backend.app.models.crew_definition import CrewDefinition
from backend.app.core.dependencies import get_current_user
from backend.app.core.crew_registry import _registry

router = APIRouter(prefix="/crews", tags=["crews"])


@router.get("", response_model=list[CrewDefinition])
async def list_registered_crews():
    return _registry.list_crews()


@router.post("/validate")
async def validate_crew_definition(
    payload: dict, user_id: str = Depends(get_current_user)
):
    """Validates input YAML strings against Pydantic Crew schemas without saving."""
    yaml_content = payload.get("yaml_content", "")
    try:
        data = yaml.safe_load(yaml_content)
        CrewDefinition(**data)
        return {"valid": True}
    except yaml.YAMLError as e:
        return {
            "valid": False,
            "errors": [
                {"field": "yaml_syntax", "message": f"YAML Syntax Error: {str(e)}"}
            ],
        }
    except Exception as e:
        # Pydantic validation errors extraction
        from pydantic import ValidationError

        if isinstance(e, ValidationError):
            errs = [
                {"field": str(err["loc"][0]), "message": err["msg"]}
                for err in e.errors()
            ]
            return {"valid": False, "errors": errs}
        return {"valid": False, "errors": [{"field": "schema", "message": str(e)}]}


@router.post("/{id}")
async def save_crew_definition(
    id: str, payload: dict, user_id: str = Depends(get_current_user)
):
    """Validates and writes configuration files to crews/ directories."""
    yaml_content = payload.get("yaml_content", "")

    # 1. First run validation checks
    val_res = await validate_crew_definition({"yaml_content": yaml_content}, user_id)
    if not val_res["valid"]:
        raise HTTPException(
            status_code=400, detail=f"Validation failed: {val_res['errors']}"
        )

    # 2. Write file
    filepath = f"crews/{id}.yaml"
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(yaml_content)

        # 3. Manually trigger hot-reload compile
        _registry.load_crews()
        return {"status": "saved", "crew_id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")
