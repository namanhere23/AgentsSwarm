"""
Core application configuration.
Loads settings from environment variables with validation.
"""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Agent Swarms API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = Field("development", env="ENVIRONMENT")

    # Security
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    FIREBASE_PROJECT_ID: str = Field(..., env="FIREBASE_PROJECT_ID")
    SUPABASE_JWT_SECRET: str = Field(..., env="SUPABASE_JWT_SECRET")

    # Supabase
    SUPABASE_URL: str = Field(..., env="SUPABASE_URL")
    SUPABASE_SERVICE_KEY: str = Field(..., env="SUPABASE_SERVICE_KEY")

    # LLM Providers
    GEMINI_API_KEY: str = Field(..., env="GEMINI_API_KEY")
    GROQ_API_KEY: str = Field("", env="GROQ_API_KEY")
    OPENROUTER_API_KEY: str = Field("", env="OPENROUTER_API_KEY")
    ELEVENLABS_API_KEY: str = Field("", env="ELEVENLABS_API_KEY")

    # Search
    SERPER_API_KEY: str = Field(..., env="SERPER_API_KEY")

    # Redis
    REDIS_URL: str = Field("redis://localhost:6379", env="REDIS_URL")

    # ChromaDB
    CHROMA_HOST: str = Field("localhost", env="CHROMA_HOST")
    CHROMA_PORT: int = Field(8001, env="CHROMA_PORT")

    # CORS
    FRONTEND_ORIGIN: str = Field("http://localhost:5173", env="FRONTEND_ORIGIN")

    # Workers
    CREW_STREAM: str = Field("crew:jobs", env="CREW_STREAM")
    VOICE_STREAM: str = Field("voice:jobs", env="VOICE_STREAM")
    TTS_STREAM: str = Field("tts:jobs", env="TTS_STREAM")

    # Feature Flags
    MOCK_TOOLS: bool = Field(False, env="MOCK_TOOLS")
    REQUIRE_APPROVAL_RISK_LEVELS: list[str] = Field(
        default_factory=lambda: ["high", "medium"], env="REQUIRE_APPROVAL_RISK_LEVELS"
    )

    # Rate Limits Config
    RATE_LIMITS_CONFIG_PATH: str = Field(
        "config/rate_limits.yaml", env="RATE_LIMITS_CONFIG_PATH"
    )

    # Workspace
    WORKSPACE_DIR: str = Field("workspace", env="WORKSPACE_DIR")

    class Config:
        env_file = (".env", "../.env")  # repo root or backend/ subdirectory
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
