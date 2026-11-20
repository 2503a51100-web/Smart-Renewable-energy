
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Device
from backend.schemas import DeviceCreate, DeviceResponse
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/devices",
    tags=["Device Management"]
)


# Add a new device
@router.post("/", response_model=DeviceResponse)
def add_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if device.device_type.lower() not in ["solar", "wind"]:
        raise HTTPException(
            status_code=400,
            detail="Device type must be Solar or Wind"
        )

    new_device = Device(
        device_name=device.device_name,
        device_type=device.device_type.capitalize(),
        location=device.location,
        user_id=current_user.user_id
    )

    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    return new_device


# Get all devices
@router.get("/", response_model=list[DeviceResponse])
def get_devices(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Device)

    # Admin can view all devices
    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    return query.all()


# Get a particular device
@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Device).filter(
        Device.device_id == device_id
    )

    # Viewers can access only their own devices
    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    device = query.first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    return device


# Delete a device
@router.delete("/{device_id}")
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Device).filter(
        Device.device_id == device_id
    )

    # Viewers can delete only their own devices
    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    device = query.first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    db.delete(device)
    db.commit()

    return {"message": "Device deleted successfully"}
