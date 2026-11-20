
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Alert, Device, EnergyRecord
from backend.schemas import AlertCreate, AlertResponse
from backend.routers.auth import get_current_user

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"]
)


# Create a new manual alert
@router.post("/", response_model=AlertResponse)
def create_alert(
    alert: AlertCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    device = db.query(Device).filter(
        Device.device_id == alert.device_id
    ).first()

    if not device:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    if (
        current_user.role != "Admin"
        and device.user_id != current_user.user_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You cannot create alerts for another user's device"
        )

    new_alert = Alert(
        device_id=alert.device_id,
        alert_type=alert.alert_type,
        message=alert.message
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    return new_alert


# Generate automatic alerts
def generate_automatic_alerts(db: Session, current_user):

    devices = db.query(Device)

    if current_user.role != "Admin":
        devices = devices.filter(
            Device.user_id == current_user.user_id
        )

    for device in devices.all():

        if device.device_type.lower() != "solar":
            continue

        records = db.query(EnergyRecord).filter(
            EnergyRecord.device_id == device.device_id
        ).order_by(
            EnergyRecord.timestamp.desc(),
            EnergyRecord.record_id.desc()
        ).limit(6).all()

        if len(records) < 2:
            continue

        latest = records[0]
        previous_records = records[1:]

        average_generation = sum(
            record.energy_generated
            for record in previous_records
        ) / len(previous_records)

        if (
            latest.energy_generated == 0
            and average_generation > 0
        ):

            message = (
                f"{device.device_name} is generating zero energy. "
                "Check panel connections, inverter status, "
                "power supply and sunlight availability."
            )

            # Check whether an alert already exists for this
            # exact device, warning and reading timestamp.
            # IMPORTANT: Check resolved alerts also.
            existing = db.query(Alert).filter(
                Alert.device_id == device.device_id,
                Alert.alert_type == "Warning",
                Alert.message == message,
                Alert.created_at == latest.timestamp
            ).first()

            # Create an alert only if this reading has not
            # already generated one.
            if not existing:
                new_alert = Alert(
                    device_id=device.device_id,
                    alert_type="Warning",
                    message=message,
                    created_at=latest.timestamp
                )

                db.add(new_alert)

    db.commit()


# Get all alerts
@router.get("/", response_model=list[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    generate_automatic_alerts(db, current_user)

    query = db.query(Alert).join(
        Device,
        Alert.device_id == Device.device_id
    )

    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    return query.order_by(
        Alert.created_at.desc()
    ).all()


# Resolve an alert
@router.put("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Alert).join(
        Device,
        Alert.device_id == Device.device_id
    ).filter(
        Alert.alert_id == alert_id
    )

    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    alert = query.first()

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    alert.is_resolved = True
    db.commit()

    return {
        "message": "Alert resolved successfully"
    }


# Mark an alert as read
@router.put("/{alert_id}/read")
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Alert).join(
        Device,
        Alert.device_id == Device.device_id
    ).filter(
        Alert.alert_id == alert_id
    )

    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    alert = query.first()

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    alert.is_read = True
    db.commit()

    return {
        "message": "Alert marked as read"
    }


# Acknowledge an alert
@router.put("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Alert).join(
        Device,
        Alert.device_id == Device.device_id
    ).filter(
        Alert.alert_id == alert_id
    )

    if current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    alert = query.first()

    if not alert:
        raise HTTPException(
            status_code=404,
            detail="Alert not found"
        )

    alert.is_read = True
    alert.is_acknowledged = True

    db.commit()

    return {
        "message": "Alert acknowledged successfully"
    }
