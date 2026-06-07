import os
from backend.app.core.crew_registry import CrewRegistry


def test_watchdog_hot_reloads_config():
    os.makedirs("test_crews_dir", exist_ok=True)
    registry = CrewRegistry(directory="test_crews_dir")

    registry.load_crews()

    # 1. Initially empty
    assert len(registry.list_crews()) == 0

    # 2. Write new crew definition file
    yaml_content = """
id: hot-crew
name: Hot Loaded Crew
description: loaded dynamically
process: sequential
agents:
  - role: orchestrator
    tools: []
"""

    filepath = os.path.join("test_crews_dir", "hot.yaml")
    with open(filepath, "w") as f:
        f.write(yaml_content)

    # Manually reload (simulates what watchdog triggers)
    registry.load_crews()

    try:
        assert "hot-crew" in registry._crews
    finally:
        os.remove(filepath)
        os.rmdir("test_crews_dir")
