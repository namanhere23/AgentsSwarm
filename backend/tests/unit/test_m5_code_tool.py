import pytest
import os
import json
from unittest.mock import patch
from backend.app.tools.code_execution_tool import CodeExecutionTool


@pytest.mark.asyncio
async def test_code_execution_rejects_import_os():
    tool = CodeExecutionTool()

    # Run with mock tools disabled to test local blacklist logic
    with patch.dict(os.environ, {"MOCK_TOOLS": "false"}):
        res = await tool._run("import os\nprint(os.getcwd())")
        data = json.loads(res)
        assert "Security check failed" in data["error"]


@pytest.mark.asyncio
async def test_code_execution_valid_expression():
    tool = CodeExecutionTool()
    with patch.dict(os.environ, {"MOCK_TOOLS": "false"}):
        res = await tool._run("print(2+2)")
        data = json.loads(res)
        assert data["stdout"].strip() == "4"
        assert data["exit_code"] == 0
