# STUB-FILL — Implemented by: workstream/2b-llm-adapter-tools
import os
import inspect
import importlib.util
from typing import Dict, List
from backend.app.tools.base import SwarmTool


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, SwarmTool] = {}

    def scan_and_register(self):
        """Scans backend/app/tools/ and tools/ for SwarmTool subclasses."""
        paths = ["backend/app/tools", "tools"]
        for path in paths:
            if not os.path.exists(path):
                continue
            for filename in os.listdir(path):
                if (
                    filename.endswith(".py")
                    and filename != "base.py"
                    and not filename.startswith("__")
                ):
                    module_name = f"{path.replace('/', '.')}.{filename[:-3]}"
                    file_path = os.path.join(path, filename)

                    # Import module dynamically
                    spec = importlib.util.spec_from_file_location(
                        module_name, file_path
                    )
                    if spec and spec.loader:
                        module = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module)

                        # Find subclass attributes
                        for name, obj in inspect.getmembers(module):
                            if (
                                inspect.isclass(obj)
                                and issubclass(obj, SwarmTool)
                                and obj is not SwarmTool
                            ):
                                tool_instance = obj()
                                self._tools[tool_instance.name] = tool_instance

    def get_tool(self, name: str) -> SwarmTool:
        return self._tools.get(name)

    def list_tools(self) -> List[dict]:
        return [
            {"name": t.name, "description": t.description} for t in self._tools.values()
        ]


# Singleton instance
_registry = ToolRegistry()


def register_tools() -> dict:
    _registry.scan_and_register()
    return _registry._tools


def get_tool(name: str) -> SwarmTool:
    return _registry.get_tool(name)


def list_tools() -> List[dict]:
    return _registry.list_tools()
