#!/usr/bin/env python3
"""Quick Supabase connectivity test. Run from backend/: python scripts/test_supabase.py"""
import sys
from pathlib import Path

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def main():
    from app.config import settings

    url = settings.supabase_url
    key = settings.supabase_service_role_key

    print("Supabase config:")
    print(f"  URL: {url or '(empty)'}")
    print(f"  Key: {'(set)' if key else '(empty)'}")
    print()

    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local")
        sys.exit(1)

    # 1. Test REST API reachability (health endpoint)
    try:
        import httpx
        health_url = url.rstrip("/") + "/rest/v1/"
        resp = httpx.get(health_url, headers={"apikey": key, "Authorization": f"Bearer {key}"}, timeout=10)
        print(f"1. REST API reachability: {resp.status_code}")
        if resp.status_code == 200:
            print("   OK - Supabase REST API is reachable")
        else:
            print(f"   Warning: Unexpected status {resp.status_code}")
    except Exception as e:
        print(f"1. REST API reachability: FAILED - {e}")
        print("   Possible causes: network/firewall, wrong URL, DNS")
        sys.exit(1)

    # 2. Test Supabase client - list caregivers (small table)
    try:
        from supabase import create_client
        sb = create_client(url, key)
        res = sb.table("caregivers").select("id", count="exact").limit(1).execute()
        print(f"2. Database query (caregivers): OK - {res.count or 0} row(s)")
    except Exception as e:
        print(f"2. Database query: FAILED - {e}")
        print("   Possible causes: tables not created (run supabase_schema.sql), RLS, network")
        sys.exit(1)

    # 3. Test Auth health
    try:
        base = url.rstrip("/")
        auth_resp = httpx.get(f"{base}/auth/v1/health", timeout=10)
        print(f"3. Auth health: {auth_resp.status_code}")
    except Exception as e:
        print(f"3. Auth health: {e}")

    print("\nAll critical checks passed. Supabase connectivity looks OK.")

if __name__ == "__main__":
    main()
