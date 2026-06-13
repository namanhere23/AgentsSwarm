# STUB-FILL — Implemented by: workstream/2c-crew-registry-ingestion
import os
import yaml
from typing import Dict, List, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from backend.app.models.crew_definition import CrewDefinition
from backend.app.core.logging import get_logger

logger = get_logger("crew_registry")


class CrewRegistry:
    def __init__(self, directory: str = "crews"):
        self.directory = directory
        self._crews: Dict[str, CrewDefinition] = {}
        self.observer = None

    def load_crews(self) -> Dict[str, CrewDefinition]:
        """Scans the crews directory and compiles valid YAML templates."""
        if not os.path.exists(self.directory):
            logger.warning(f"Crews directory '{self.directory}' does not exist.")
            return self._crews

        new_crews = {}
        for filename in os.listdir(self.directory):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                filepath = os.path.join(self.directory, filename)
                try:
                    with open(filepath, "r") as f:
                        data = yaml.safe_load(f)

                    # Validate parsed data with Pydantic Schema
                    crew_def = CrewDefinition(**data)
                    new_crews[crew_def.id] = crew_def
                except Exception as e:
                    logger.warning(f"Crew YAML {filename} failed validation: {str(e)}")

        self._crews = new_crews
        return self._crews

    def get_crew(self, crew_id: str) -> Optional[CrewDefinition]:
        return self._crews.get(crew_id)

    def list_crews(self) -> List[CrewDefinition]:
        return list(self._crews.values())

    def start_hot_reload(self):
        """Initializes a background filesystem watcher on the crews directory."""
        if not os.path.exists(self.directory):
            return

        class CrewsChangeHandler(FileSystemEventHandler):
            def __init__(self, registry):
                self.registry = registry

            def on_modified(self, event):
                if event.src_path.endswith(".yaml") or event.src_path.endswith(".yml"):
                    logger.info(
                        "Hot-reloading crews configuration due to file changes."
                    )
                    self.registry.load_crews()

        event_handler = CrewsChangeHandler(self)
        self.observer = Observer()
        self.observer.schedule(event_handler, path=self.directory, recursive=False)
        self.observer.start()

    def stop_hot_reload(self):
        if self.observer:
            self.observer.stop()
            self.observer.join()


# Singleton registry initialization
_registry = CrewRegistry()


def load_crews() -> Dict[str, CrewDefinition]:
    _registry.load_crews()
    # Auto-start directory watch dog
    _registry.start_hot_reload()
    return _registry._crews


def get_crew(crew_id: str) -> Optional[CrewDefinition]:
    return _registry.get_crew(crew_id)


def list_crews() -> List[CrewDefinition]:
    return _registry.list_crews()
