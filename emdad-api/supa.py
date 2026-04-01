# supa.py
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(f"Missing Supabase config. url={bool(url)} key={bool(key)}")
    return create_client(url, key)
