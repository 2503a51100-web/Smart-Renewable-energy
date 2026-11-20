
from sqlalchemy.orm import Session

from backend.models import EnergyRecord, Device


def get_recommendation(
    device_type,
    latest_generation,
    average_generation
):
    device_type = device_type.lower()

    if latest_generation == 0:

        if device_type == "solar":
            return (
                "Solar generation is zero. Check panel connections, "
                "inverter status, power supply, and sunlight availability."
            )

        if device_type == "wind":
            return (
                "Wind generation is zero. Check turbine connections, "
                "generator status, and mechanical components."
            )

        return (
            "Energy generation is zero. Check device connections, "
            "power supply, and operating conditions."
        )

    if device_type == "solar":
        return (
            "Solar generation has dropped. Inspect the panels for dust, "
            "shading, loose connections, and inverter issues."
        )

    if device_type == "wind":
        return (
            "Wind generation has dropped. Inspect turbine blades, "
            "wind conditions, generator performance, and connections."
        )

    return (
        "Check the device condition, power connections, "
        "and recent operating conditions."
    )


def get_ai_insights(db: Session, current_user=None):

    device_query = db.query(Device)

    if current_user and current_user.role != "Admin":
        device_query = device_query.filter(
            Device.user_id == current_user.user_id
        )

    devices = device_query.all()

    insights = []

    for device in devices:

        records = (
            db.query(EnergyRecord)
            .filter(
                EnergyRecord.device_id == device.device_id
            )
            .order_by(
                EnergyRecord.timestamp.desc(),
                EnergyRecord.record_id.desc()
            )
            .all()
        )

        if not records:
            continue

        latest_generation = records[0].energy_generated

        previous_values = [
            record.energy_generated
            for record in records[1:]
        ]

        average_generation = (
            sum(previous_values) / len(previous_values)
            if previous_values else 0
        )

        # Condition 1: Zero generation, including first reading
        if latest_generation == 0:

            severity = "Critical"
            status = "Needs Attention"

        # Condition 2: Compare against previous readings
        elif average_generation > 0:

            drop_percentage = (
                (average_generation - latest_generation)
                / average_generation
            ) * 100

            if drop_percentage >= 50:
                severity = "Critical"
                status = "Severe Generation Drop"

            elif drop_percentage >= 30:
                severity = "Warning"
                status = "Generation Drop Detected"

            else:
                continue

        else:
            continue

        # Calculate drop percentage for display
        drop_percentage = (
            (average_generation - latest_generation)
            / average_generation
        ) * 100 if average_generation > 0 else 0

        recommendation = get_recommendation(
            device.device_type,
            latest_generation,
            average_generation
        )

        insights.append({
            "device_id": device.device_id,
            "device_name": device.device_name,
            "device_type": device.device_type,
            "status": status,
            "severity": severity,
            "latest_generation": round(latest_generation, 2),
            "average_generation": round(average_generation, 2),
            "drop_percentage": round(drop_percentage, 2),
            "recommendation": recommendation
        })

    return {
        "total_anomalies": len(insights),
        "insights": insights
    }
