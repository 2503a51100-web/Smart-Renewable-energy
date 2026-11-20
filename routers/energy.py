
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import EnergyRecord, Device
from backend.schemas import EnergyRecordCreate, EnergyRecordResponse
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/energy",
    tags=["Energy Monitoring"]
)


# Add a new energy record
@router.post("/", response_model=EnergyRecordResponse)
def add_energy_record(
    record: EnergyRecordCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    device = db.query(Device).filter(
        Device.device_id == record.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    # Check device ownership
    if (
        current_user.role != "Admin"
        and device.user_id != current_user.user_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot add records to another user's device"
        )

    if record.energy_generated < 0 or record.energy_consumed < 0:
        raise HTTPException(
            status_code=400,
            detail="Energy values cannot be negative"
        )

    new_record = EnergyRecord(
        device_id=record.device_id,
        energy_generated=record.energy_generated,
        energy_consumed=record.energy_consumed
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return new_record


# Get all energy records
@router.get("/", response_model=list[EnergyRecordResponse])
def get_energy_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(EnergyRecord).join(
        Device,
        EnergyRecord.device_id == Device.device_id
    )

    # Admin can view all records
    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    return query.order_by(
        EnergyRecord.timestamp.desc()
    ).all()


# Get records for a particular device
@router.get("/{device_id}", response_model=list[EnergyRecordResponse])
def get_device_energy(
    device_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    device = db.query(Device).filter(
        Device.device_id == device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    # Check device ownership
    if (
        current_user.role != "Admin"
        and device.user_id != current_user.user_id
    ):
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    records = db.query(EnergyRecord).filter(
        EnergyRecord.device_id == device_id
    ).order_by(
        EnergyRecord.timestamp.desc()
    ).all()

    return records
