import httpx
import asyncio
from backend.app.core.config import settings

async def test():
    client = httpx.AsyncClient()
    try:
        r1 = await client.get(f'{settings.SUPABASE_URL}/rest/v1/', headers={'apikey': settings.SUPABASE_SERVICE_KEY})
        print('DB:', r1.status_code)
    except Exception as e:
        print('DB Error:', e)
        
    try:
        r2 = await client.head('https://generativelanguage.googleapis.com/v1beta/openai/', timeout=3.0)
        print('Gemini:', r2.status_code)
    except Exception as e:
        print('Gemini Error:', e)
    
    await client.aclose()

asyncio.run(test())
