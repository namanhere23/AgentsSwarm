import os
from unittest.mock import MagicMock
from backend.app.services.report_generator import generate_report
from backend.app.core.config import settings


def test_report_generator_markdown_output():
    # Setup temp path mocks
    workspace_dir = settings.WORKSPACE_DIR
    os.makedirs(workspace_dir, exist_ok=True)
    run_id = "test_run_9999"

    # Mock CrewAI output structure
    mock_output = MagicMock()
    mock_output.raw = "This is the final outcome result summary text."

    task_mock = MagicMock()
    task_mock.agent = "Researcher"
    task_mock.description = "Scrape Google"
    task_mock.raw = "Successfully scraped content results"
    mock_output.tasks_output = [task_mock]

    try:
        report_path = generate_report(run_id, mock_output)
        assert os.path.exists(report_path)

        with open(report_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "# Swarm Run Execution Report" in content
        assert "test_run_9999" in content
        assert "This is the final outcome result summary text." in content
        assert "Researcher" in content
    finally:
        # Cleanup
        if os.path.exists(report_path):
            os.remove(report_path)
