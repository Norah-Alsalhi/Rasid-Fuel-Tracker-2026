import os, datetime, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET      = os.getenv("JWT_SECRET", "CHANGE_ME")
ALG         = os.getenv("JWT_ALG", "HS256")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "12"))

bearer = HTTPBearer(auto_error=False)

def make_token(sub: str, role: str = "manager") -> str:
    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=EXPIRE_HOURS)
    return jwt.encode({"sub": sub, "role": role, "exp": exp}, SECRET, algorithm=ALG)

def _decode(credentials: HTTPAuthorizationCredentials) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        return jwt.decode(credentials.credentials, SECRET, algorithms=[ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """للمدير فقط"""
    payload = _decode(credentials)
    if payload.get("role") != "manager":
        raise HTTPException(status_code=403, detail="Manager access required")
    return payload["sub"]

def verify_driver_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """للسائق فقط"""
    payload = _decode(credentials)
    if payload.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Driver access required")
    return payload["sub"]