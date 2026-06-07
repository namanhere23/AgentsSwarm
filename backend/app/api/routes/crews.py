# STUB — Implemented by: workstream/5b-crew-manager-rollback
from fastapi import APIRouter, Depends
from backend.app.models.crew_definition import CrewDefinition
from backend.app.core.dependencies import get_current_user

router = APIRouter(prefix="/crews", tags=["crews"])


@router.get("", response_model=list[CrewDefinition])
async def list_registered_crews():
    raise NotImplementedError()


@router.post("/validate")
async def validate_crew_definition(
    yaml_content: str, user_id: str = Depends(get_current_user)
):
    raise NotImplementedError()


@router.post("/{id}")
async def save_crew_definition(
    id: str, yaml_content: str, user_id: str = Depends(get_current_user)
):
    raise NotImplementedError()
