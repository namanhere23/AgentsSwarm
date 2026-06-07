# STUB-FILL — Implemented by: workstream/3b-websocket-reports
import os
import subprocess
from datetime import datetime
from backend.app.core.logging import get_logger
from backend.app.core.config import settings

logger = get_logger("report_generator")


def generate_report(swarm_run_id: str, crew_output) -> str:
    """
    Assembles swarm execution task history into a standardized Markdown summary.
    Triggers Pandoc to compile PDF files within the workspace sandbox environment.
    """
    workspace_dir = settings.WORKSPACE_DIR
    os.makedirs(workspace_dir, exist_ok=True)
    md_path = os.path.join(workspace_dir, f"{swarm_run_id}.md")
    pdf_path = os.path.join(workspace_dir, f"{swarm_run_id}.pdf")

    # 1. Compile Markdown structures
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Crew output models expose raw, tasks_output lists in CrewAI
    raw_summary = getattr(crew_output, "raw", str(crew_output))
    tasks_list = getattr(crew_output, "tasks_output", [])

    lines = [
        "# Swarm Run Execution Report",
        f"\n**Report Compiled:** {now_str}",
        f"**Swarm Run Reference ID:** {swarm_run_id}",
        "\n## Executive Summary",
        raw_summary,
        "\n## Detailed Task Audit Log",
    ]

    if tasks_list:
        for idx, task_out in enumerate(tasks_list):
            lines.append(f"\n### Task {idx + 1}")
            lines.append(f"**Agent Role:** {getattr(task_out, 'agent', 'Unknown')}")
            lines.append(f"**Objective:** {getattr(task_out, 'description', 'N/A')}")
            lines.append("\n**Result Outcome:**")
            lines.append(getattr(task_out, "raw", str(task_out)))
            lines.append("\n---")
    else:
        lines.append(
            "\n*No granular task records available. Standard kickoff completed.*"
        )

    # 2. Write Markdown to workspace
    md_content = "\n".join(lines)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    logger.info(f"Markdown report compiled successfully at: {md_path}")

    # 3. Compile PDF using local Pandoc utility
    try:
        subprocess.run(
            ["pandoc", "--from", "markdown", "--to", "pdf", md_path, "-o", pdf_path],
            check=True,
            timeout=30.0,
        )
        logger.info(f"PDF compiled successfully at: {pdf_path}")
    except Exception as e:
        logger.warning(f"Pandoc PDF generation skipped or failed: {str(e)}")

    return md_path
