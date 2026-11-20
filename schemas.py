
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# Device Schemas
class DeviceCreate(BaseModel):
    device_name: str
    device_type: str
    location: str | None = None
    user_id: int | None = None


class DeviceResponse(BaseModel):
    device_id: int
    device_name: str
    device_type: str
    location: str | None
    status: str

    model_config = ConfigDict(from_attributes=True)


# Energy Record Schemas
class EnergyRecordCreate(BaseModel):
    device_id: int
    energy_generated: float
    energy_consumed: float = 0.0


class EnergyRecordResponse(BaseModel):
    record_id: int
    device_id: int
    energy_generated: float
    energy_consumed: float
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# Alert Schemas
class AlertCreate(BaseModel):
    device_id: int
    alert_type: str
    message: str



class AlertResponse(BaseModel):
    alert_id: int
    device_id: int
    device_name: str
    alert_type: str
    message: str
    is_resolved: bool
    is_read: bool
    is_acknowledged: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)