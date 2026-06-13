import os
import sys
import asyncio
from dotenv import load_dotenv

load_dotenv()

# Configure litellm to drop unsupported parameters for Groq
import litellm
litellm.drop_params = True
# Additional litellm configuration to prevent cache-related parameters
os.environ["LITELLM_CACHE"] = "false"
os.environ["LITELLM_DROP_PARAMS"] = "true"
litellm.set_verbose = False

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
    from backend.app.core.crew_registry import load_crews
    from backend.workers.crew_consumer import main as crew_consumer_main
    from backend.app.core.logging import get_logger

    logger = get_logger("lifespan")

    # Load crews into registry
    load_crews()

    scheduler = SwarmScheduler()
    scheduler.start()

    # Start crew consumer as background task with error handling
    async def crew_consumer_wrapper():
        try:
            await crew_consumer_main()
        except asyncio.CancelledError:
            logger.info("Crew consumer cancelled during shutdown")
            raise
        except Exception as e:
            logger.error(f"Crew consumer crashed: {e}", exc_info=True)

    crew_consumer_task = asyncio.create_task(crew_consumer_wrapper())

    yield
    # Cleanup logic (if any) goes here
    logger.info("Shutting down services...")
    
    # Cancel crew consumer and wait for graceful shutdown
    crew_consumer_task.cancel()
    try:
        await crew_consumer_task
    except asyncio.CancelledError:
        pass
    
    await scheduler.shutdown()


from fastapi.staticfiles import StaticFiles

app = FastAPI(
    title="Agent Swarms API",
    description="Backend coordinator for the Agent Swarms multi-agent OS",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if settings.ENVIRONMENT == "production" else "/openapi.json",
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
    test_ws_route,
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
app.include_router(test_ws_route.router)
