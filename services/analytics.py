
import pandas as pd
from sqlalchemy.orm import Session

from backend.models import EnergyRecord, Device


def get_energy_analytics(db: Session, current_user=None):

    query = (
        db.query(
            EnergyRecord.energy_generated,
            EnergyRecord.energy_consumed,
            Device.device_type
        )
        .join(Device, EnergyRecord.device_id == Device.device_id)
    )

    # Admin can view all analytics.
    # Other users can view only their own device analytics.
    if current_user and current_user.role != "Admin":
        query = query.filter(
            Device.user_id == current_user.user_id
        )

    records = query.all()

    if not records:
        return {
            "total_generated": 0,
            "total_consumed": 0,
            "solar_generation": 0,
            "wind_generation": 0,
            "average_generation": 0
        }

    df = pd.DataFrame([
        {
            "energy_generated": record.energy_generated,
            "energy_consumed": record.energy_consumed,
            "device_type": record.device_type
        }
        for record in records
    ])

    total_generated = df["energy_generated"].sum()
    total_consumed = df["energy_consumed"].sum()

    solar_generation = df.loc[
        df["device_type"] == "Solar",
        "energy_generated"
    ].sum()

    wind_generation = df.loc[
        df["device_type"] == "Wind",
        "energy_generated"
    ].sum()

    average_generation = df["energy_generated"].mean()

    return {
        "total_generated": round(float(total_generated), 2),
        "total_consumed": round(float(total_consumed), 2),
        "solar_generation": round(float(solar_generation), 2),
        "wind_generation": round(float(wind_generation), 2),
        "average_generation": round(float(average_generation), 2)
    }
