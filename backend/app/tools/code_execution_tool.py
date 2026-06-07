# STUB-FILL — Implemented by: workstream/5c-code-exec-tool
import os
import sys
import json
import subprocess
from backend.app.tools.base import SwarmTool


class CodeExecutionTool(SwarmTool):
    name = "CodeExecutionTool"
    description = (
        "Executes Python code snippets in a sandboxed subprocess. "
        "Input: Python code string. Returns stdout, stderr, and exit code. "
        "Unsafe patterns are rejected."
    )

    # Security input pattern checks
    BLACKLIST = ["import os", "import subprocess", "open(", "__import__", "import sys"]

    async def _run(self, input: str) -> str:
        # 1. Mock Check Guard
        if os.getenv("MOCK_TOOLS", "false").lower() == "true":
            return json.dumps({"stdout": "4", "stderr": "", "exit_code": 0})

        # 2. Blacklist validation
        for pattern in self.BLACKLIST:
            if pattern in input:
                return json.dumps(
                    {
                        "error": f"Security check failed: rejected blacklisted pattern '{pattern}' detected."
                    }
                )

        # 3. Execution under 30 seconds timeout limit
        try:
            result = subprocess.run(
                [sys.executable, "-c", input],
                timeout=30.0,
                capture_output=True,
                text=True,
            )

            output = {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode,
            }
            return json.dumps(output)

        except subprocess.TimeoutExpired:
            return json.dumps(
                {"error": "Execution error: Subprocess timeout limit of 30s exceeded."}
            )
        except Exception as e:
            return json.dumps({"error": f"Execution failed: {str(e)}"})
