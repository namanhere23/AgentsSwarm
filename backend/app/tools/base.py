"""
SwarmTool — Abstract Base Class for all Agent Swarms tools.
Every tool must:
  1. Inherit from SwarmTool
  2. Define `name`, `description`
  3. Implement `_run()` with the MOCK_TOOLS guard
"""

from abc import ABC, abstractmethod


class SwarmTool(ABC):
    """Abstract base class enforcing the Agent Swarms tool contract."""

    name: str = ""
    description: str = ""

    # MOCK_TOOLS guard — must appear at the top of every _run() implementation:
    # if os.getenv("MOCK_TOOLS") == "true":
    #     return f"[MOCK] {self.name} called with: {input}"
    MOCK_TOOLS_ENV = "MOCK_TOOLS"

    @abstractmethod
    async def _run(self, input: str) -> str:
        """
        Execute the tool with the given string input.

        All implementations MUST include the MOCK_TOOLS guard:
            if os.getenv('MOCK_TOOLS') == 'true':
                return f'[MOCK] {self.name} called with: {input}'

        Returns:
            str: Tool output, or mock string in test environments.
        """
        raise NotImplementedError

    def to_dict(self) -> dict:
        """Serialize tool metadata for the tool registry."""
        return {
            "name": self.name,
            "description": self.description,
            "class": self.__class__.__name__,
        }

    def __repr__(self) -> str:
        return f"<SwarmTool name={self.name!r}>"
