import pytest
import os
from unittest.mock import patch
from backend.app.tools.web_search_tool import WebSearchTool


@pytest.mark.asyncio
async def test_web_search_tool_mock_mode():
    with patch.dict(os.environ, {"MOCK_TOOLS": "true"}):
        tool = WebSearchTool()
        response = await tool._run("test query")
        assert "Mock search snippet 1" in response
