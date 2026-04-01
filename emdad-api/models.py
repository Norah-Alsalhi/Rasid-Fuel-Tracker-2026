from pydantic import BaseModel
from typing import Optional, List

# ── Manager ───────────────────────────────────────────
class ManagerLoginIn(BaseModel):
    email: str
    password: str

class ManagerOut(BaseModel):
    email: str

class LoginResponse(BaseModel):
    access_token: str
    manager: ManagerOut

class ManagerMeOut(BaseModel):
    email: str

class EmailExistsOut(BaseModel):
    email: str
    exists: bool

# ── Driver ────────────────────────────────────────────
class DriverLoginIn(BaseModel):
    employee_id: str
    password: str

class DriverMeOut(BaseModel):
    employee_id: str
    name: str
    plate: str = ""
    phone: str = ""

class DriverLookupOut(BaseModel):
    id: str
    employee_id: str
    name: str
    active: bool = True

# ── Fuel ─────────────────────────────────────────────
class FuelEntryIn(BaseModel):
    employee_id: str
    driver_name: str
    station_name: str
    fill_datetime: str
    liters: float
    total_price: float
    price_per_liter: Optional[float] = None
    odometer_reading: Optional[str] = None
    license_plate: Optional[str] = None

class FuelEntryOut(FuelEntryIn):
    id: str

class FuelPhotoIn(BaseModel):
    kind: Optional[str] = None
    url: str

class PagedEntries(BaseModel):
    items: List[FuelEntryOut]
    next_cursor: Optional[str] = None
