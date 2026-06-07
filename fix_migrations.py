import os
import glob

migrations_dir = r"c:\Users\uadit\Desktop\Swarm\backend\migrations"
supabase_migrations_dir = r"c:\Users\uadit\Desktop\Swarm\supabase\migrations"

for path in glob.glob(os.path.join(migrations_dir, "*.sql")):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # user.id in 001_users.sql
    if "001_users.sql" in path:
        content = content.replace(
            "id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),",
            "id VARCHAR(255) NOT NULL PRIMARY KEY,"
        )

    # user_id in other files
    content = content.replace("user_id UUID NOT NULL", "user_id VARCHAR(255) NOT NULL")
    
    # In some policies, it casts user_id::text or id::text. We can remove ::text, or just let PostgreSQL cast varchar::text which is a no-op.
    # Leaving ::text is perfectly fine for VARCHAR.

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    # Copy to supabase/migrations
    basename = os.path.basename(path)
    with open(os.path.join(supabase_migrations_dir, basename), "w", encoding="utf-8") as f:
        f.write(content)

# Delete 014_grants.sql and 015_alter_user_id.sql from supabase/migrations
for extra in ["014_grants.sql", "015_alter_user_id.sql"]:
    p = os.path.join(supabase_migrations_dir, extra)
    if os.path.exists(p):
        os.remove(p)

print("Migrations rewritten successfully.")
