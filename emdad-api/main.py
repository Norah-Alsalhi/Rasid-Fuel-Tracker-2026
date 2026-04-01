import os, uuid, datetime, traceback
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from supa import get_client
from models import (
    ManagerLoginIn, LoginResponse, ManagerOut, ManagerMeOut,
    EmailExistsOut, DriverLookupOut, FuelEntryOut,
    DriverLoginIn, DriverMeOut,
)
from auth import make_token, verify_token, verify_driver_token

load_dotenv()
app = FastAPI(title="Rasid API")

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # ضيّقيها على النطاق لاحقاً
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helpers ───────────────────────────────────────────
def iso_to_dt(s: str) -> datetime.datetime:
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))

def _num(x):
    try:
        return float(x) if x is not None else None
    except Exception:
        return None

def _raise_500(tag: str, ex: Exception):
    print(f"[{tag}] ERROR:", type(ex).__name__, str(ex))
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=f"{tag}: {type(ex).__name__}: {ex}")

def _norm_email(email: str) -> str:
    return (email or "").strip().lower()

# ═══════════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════════
@app.get("/ping")
def ping():
    return {"ok": True}

@app.get("/_diag")
def diag():
    return {
        "has_url": bool(os.getenv("SUPABASE_URL")),
        "has_service_key": bool(os.getenv("SUPABASE_SERVICE_KEY")),
        "bucket": os.getenv("SUPABASE_BUCKET"),
    }

# ═══════════════════════════════════════════════════════
#  MANAGER — AUTH
# ═══════════════════════════════════════════════════════

@app.get("/api/manager/email-exists", response_model=EmailExistsOut)
def manager_email_exists(email: str):
    em = _norm_email(email)
    if not em or "@" not in em:
        raise HTTPException(status_code=400, detail="Invalid email")
    try:
        s = get_client()
        res = s.table("managers").select("id").eq("email", em).limit(1).execute()
        return EmailExistsOut(email=em, exists=bool(res.data))
    except Exception as ex:
        _raise_500("manager_email_exists", ex)


@app.post("/api/manager/login", response_model=LoginResponse)
def manager_login(body: ManagerLoginIn):
    try:
        s = get_client()
    except Exception as ex:
        _raise_500("supabase_client_error", ex)

    email = _norm_email(body.email)
    try:
        res = s.table("managers").select("email,password_hash").eq("email", email).limit(1).execute()
        rows = res.data or []
    except Exception as ex:
        _raise_500("supabase_query_error(managers.select)", ex)

    if not rows or rows[0].get("password_hash") != body.password:
        raise HTTPException(status_code=401, detail="بيانات الدخول غير صحيحة")

    token = make_token(email, role="manager")
    return LoginResponse(access_token=token, manager=ManagerOut(email=email))


@app.get("/api/manager/me", response_model=ManagerMeOut)
def manager_me(user: str = Depends(verify_token)):
    return ManagerMeOut(email=user)


@app.post("/api/manager/forgot-password")
def forgot_password(body: dict):
    # MVP: نرجع 200 دائماً (ما نكشف إذا الإيميل موجود)
    return {"ok": True}


# ═══════════════════════════════════════════════════════
#  MANAGER — DATA
# ═══════════════════════════════════════════════════════

@app.get("/api/manager/drivers")
def list_drivers(user: str = Depends(verify_token)):
    """كل السائقين مع إجماليات الوقود"""
    try:
        s = get_client()
        drivers = s.table("drivers").select("*").order("name").execute().data or []
        entries = s.table("fuel_entries").select("employee_id,liters,total_price").execute().data or []

        # احسب الإجماليات لكل سائق
        totals: dict = {}
        for e in entries:
            eid = e["employee_id"]
            if eid not in totals:
                totals[eid] = {"total_liters": 0.0, "total_cost": 0.0, "fill_count": 0}
            totals[eid]["total_liters"] += _num(e.get("liters")) or 0
            totals[eid]["total_cost"]   += _num(e.get("total_price")) or 0
            totals[eid]["fill_count"]   += 1

        result = []
        for d in drivers:
            eid = d["employee_id"]
            t = totals.get(eid, {"total_liters": 0, "total_cost": 0, "fill_count": 0})
            result.append({**d, **t})

        return {"drivers": result}
    except Exception as ex:
        _raise_500("list_drivers", ex)


@app.get("/api/manager/drivers/{employee_id}/entries")
def driver_entries(
    employee_id: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: str = Depends(verify_token),
):
    """سجل تعبئات سائق محدد"""
    try:
        s = get_client()
        q = (
            s.table("fuel_entries")
            .select("*")
            .eq("employee_id", employee_id)
            .order("fill_datetime", desc=True)
        )
        if date_from:
            q = q.gte("fill_datetime", date_from)
        if date_to:
            q = q.lte("fill_datetime", date_to + "T23:59:59")

        data = q.execute().data or []
        return {"entries": data}
    except Exception as ex:
        _raise_500("driver_entries", ex)


@app.get("/api/fuel_entries")
def list_all_entries(
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    page: int = 1,
    user: str = Depends(verify_token),
):
    try:
        s = get_client()
        q = s.table("fuel_entries").select("*").order("fill_datetime", desc=True)
        if status:
            q = q.eq("status", status)
        if employee_id:
            q = q.eq("employee_id", employee_id)
        if date_from:
            q = q.gte("fill_datetime", date_from)
        if date_to:
            q = q.lte("fill_datetime", date_to + "T23:59:59")

        start = (page - 1) * limit
        data = q.range(start, start + limit - 1).execute().data or []
        return {"items": data, "page": page, "limit": limit}
    except Exception as ex:
        _raise_500("list_all_entries", ex)


@app.put("/api/fuel_entries/{entry_id}/status")
def set_entry_status(entry_id: str, status: str, user: str = Depends(verify_token)):
    if status not in ("approved", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")
    try:
        s = get_client()
        s.table("fuel_entries").update({"status": status}).eq("id", entry_id).execute()
        return {"ok": True, "status": status}
    except Exception as ex:
        _raise_500("set_entry_status", ex)


# ═══════════════════════════════════════════════════════
#  DRIVER — AUTH
# ═══════════════════════════════════════════════════════

@app.post("/api/driver/login")
def driver_login(body: DriverLoginIn):
    """
    السائق يدخل برقمه الوظيفي + كلمة المرور.
    MVP: password_hash مقارنة مباشرة (غيّريها لـ bcrypt لاحقاً)
    """
    try:
        s = get_client()
        res = (
            s.table("drivers")
            .select("id,employee_id,name,plate,phone,active,password_hash")
            .eq("employee_id", body.employee_id.strip())
            .limit(1)
            .execute()
        )
        rows = res.data or []
    except Exception as ex:
        _raise_500("driver_login", ex)

    if not rows:
        raise HTTPException(status_code=401, detail="رقم الموظف أو كلمة المرور غير صحيحة")

    row = rows[0]
    if row.get("password_hash") != body.password:
        raise HTTPException(status_code=401, detail="رقم الموظف أو كلمة المرور غير صحيحة")

    if not row.get("active", True):
        raise HTTPException(status_code=403, detail="الحساب غير نشط")

    token = make_token(row["employee_id"], role="driver")
    return {
        "access_token": token,
        "driver": {
            "employee_id": row["employee_id"],
            "name": row["name"],
            "plate": row.get("plate", ""),
            "phone": row.get("phone", ""),
        }
    }


@app.get("/api/driver/me", response_model=DriverMeOut)
def driver_me(employee_id: str = Depends(verify_driver_token)):
    try:
        s = get_client()
        res = s.table("drivers").select("employee_id,name,plate,phone").eq("employee_id", employee_id).limit(1).execute()
        row = (res.data or [None])[0]
    except Exception as ex:
        _raise_500("driver_me", ex)

    if not row:
        raise HTTPException(status_code=404, detail="السائق غير موجود")

    return DriverMeOut(
        employee_id=row["employee_id"],
        name=row["name"],
        plate=row.get("plate", ""),
        phone=row.get("phone", ""),
    )


# ═══════════════════════════════════════════════════════
#  DRIVER — FUEL ENTRY (إرسال تعبئة)
# ═══════════════════════════════════════════════════════

@app.post("/api/driver/fuel-record")
async def driver_fuel_record(
    station:         str            = Form(...),
    date:            str            = Form(...),   # YYYY-MM-DD
    time:            str            = Form(...),   # HH:MM
    liters:          float          = Form(...),
    price_per_liter: float          = Form(...),
    total_cost:      float          = Form(...),
    odometer:        str            = Form(...),
    photo_odometer:  Optional[UploadFile] = File(None),
    photo_plate:     Optional[UploadFile] = File(None),
    photo_receipt:   Optional[UploadFile] = File(None),
    employee_id:     str            = Depends(verify_driver_token),
):
    try:
        s = get_client()
    except Exception as ex:
        _raise_500("supabase_client_error", ex)

    # جلب بيانات السائق
    try:
        dr_res = s.table("drivers").select("id,name,plate").eq("employee_id", employee_id).limit(1).execute()
        dr = (dr_res.data or [None])[0]
    except Exception as ex:
        _raise_500("driver_lookup", ex)

    if not dr:
        raise HTTPException(status_code=404, detail="السائق غير موجود")

    # تجميع datetime
    fill_dt = f"{date}T{time}:00"

    # إنشاء سجل التعبئة
    entry = {
        "driver_id":       dr["id"],
        "employee_id":     employee_id,
        "driver_name":     dr["name"],
        "license_plate":   dr.get("plate", ""),
        "station_name":    station,
        "fill_datetime":   fill_dt,
        "liters":          liters,
        "price_per_liter": price_per_liter,
        "total_price":     total_cost,
        "odometer_reading": odometer,
        "status":          "pending",
    }

    try:
        ins = s.table("fuel_entries").insert(entry).execute()
        entry_id = ins.data[0]["id"]
    except Exception as ex:
        _raise_500("fuel_entries.insert", ex)

    # رفع الصور
    bucket = os.getenv("SUPABASE_BUCKET", "fuel-photos")
    photos = [
        ("odometer", photo_odometer),
        ("plate",    photo_plate),
        ("receipt",  photo_receipt),
    ]

    for kind, photo in photos:
        if photo is None:
            continue
        try:
            _, ext = os.path.splitext(photo.filename or "photo.jpg")
            ext = (ext or ".jpg").lower()
            path = f"{employee_id}/{entry_id}/{kind}_{uuid.uuid4().hex}{ext}"
            content = await photo.read()
            s.storage.from_(bucket).upload(
                path=path,
                file=content,
                file_options={"content-type": photo.content_type or "image/jpeg"},
            )
            url = s.storage.from_(bucket).get_public_url(path)
            s.table("fuel_photos").insert({
                "entry_id": entry_id,
                "kind": kind,
                "url": url,
            }).execute()
        except Exception as ex:
            # لا نوقف العملية كلها بسبب فشل رفع صورة واحدة
            print(f"[photo_upload:{kind}] WARNING:", ex)

    return {"ok": True, "entry_id": entry_id}


# ═══════════════════════════════════════════════════════
#  DRIVER — سجل تعبئاته
# ═══════════════════════════════════════════════════════

@app.get("/api/driver/my-entries")
def driver_my_entries(employee_id: str = Depends(verify_driver_token)):
    try:
        s = get_client()
        data = (
            s.table("fuel_entries")
            .select("*")
            .eq("employee_id", employee_id)
            .order("fill_datetime", desc=True)
            .limit(50)
            .execute()
            .data or []
        )
        return {"entries": data}
    except Exception as ex:
        _raise_500("driver_my_entries", ex)


# ═══════════════════════════════════════════════════════
#  MANAGER — Add Driver
# ═══════════════════════════════════════════════════════

@app.post("/api/manager/drivers")
def add_driver(body: dict, user: str = Depends(verify_token)):
    required = ["name", "employee_id", "password_hash"]
    for f in required:
        if not body.get(f):
            raise HTTPException(status_code=400, detail=f"الحقل مطلوب: {f}")
    try:
        s = get_client()
        # تحقق من عدم تكرار الرقم الوظيفي
        exists = s.table("drivers").select("id").eq("employee_id", body["employee_id"]).execute()
        if exists.data:
            raise HTTPException(status_code=409, detail="الرقم الوظيفي مستخدم مسبقاً")

        row = {
            "name":          body["name"].strip(),
            "employee_id":   body["employee_id"].strip(),
            "password_hash": body["password_hash"],
            "plate":         body.get("plate", ""),
            "phone":         body.get("phone", ""),
            "active":        body.get("active", True),
        }
        s.table("drivers").insert(row).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as ex:
        _raise_500("add_driver", ex)
