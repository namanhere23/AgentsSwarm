import os
import sys
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# 1. Startup Secret Validation
REQUIRED_SECRETS = [
    "SECRET_KEY",
    "FIREBASE_PROJECT_ID",
    "SUPABASE_JWT_SECRET",
    "GEMINI_API_KEY",
    "SERPER_API_KEY",
]
for secret in REQUIRED_SECRETS:
    val = os.getenv(secret)
    if not val:
        print(
            f"CRITICAL ERROR: Missing required environment variable: {secret}",
            file=sys.stderr,
        )
        sys.exit(1)

# Import stubs (configuration settings loaded after validating environment)
from backend.app.core.config import settings  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Firebase Admin SDK
    import firebase_admin
    from firebase_admin import credentials

    # In production/docker context, credentials load from local service account or environment settings
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(
        cred,
        {
            "projectId": settings.FIREBASE_PROJECT_ID,
        },
    )

    from backend.app.services.scheduler import SwarmScheduler

    scheduler = SwarmScheduler()
    scheduler.start()

    yield
    # Cleanup logic (if any) goes here
    scheduler.shutdown()


from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Agent Swarms API",
    description="Backend coordinator for the Agent Swarms multi-agent OS",
    version="1.0.0",
    lifespan=lifespan,
)

# 2. CORS Policy Implementation
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount public directories
app.mount("/cli", StaticFiles(directory="backend/public/cli"), name="cli")

# Include API Routers (STUB references)
from backend.app.api.routes import (  # noqa: E402
    health,
    swarms,
    swarms_voice,
    websocket,
    approvals,
    memory,
    crews,
    audit,
    schedules,
    briefings,
)

app.include_router(health.router)
app.include_router(swarms.router)
app.include_router(swarms_voice.router)
app.include_router(websocket.router)
app.include_router(approvals.router)
app.include_router(memory.router)
app.include_router(crews.router)
app.include_router(audit.router)
app.include_router(schedules.router)
app.include_router(briefings.router)
