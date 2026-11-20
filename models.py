
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


# User Model
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # Account permissions
    role = Column(String(20), default="Viewer", nullable=False)

    # Account approval and status
    is_approved = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Account activity
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    devices = relationship("Device", back_populates="owner")


# Device Model
class Device(Base):
    __tablename__ = "devices"

    device_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    device_name = Column(String(100), nullable=False)
    device_type = Column(String(50), nullable=False)
    location = Column(String(150))
    status = Column(String(30), default="Active")

    owner = relationship("User", back_populates="devices")
    energy_records = relationship("EnergyRecord", back_populates="device")
    alerts = relationship("Alert", back_populates="device")

# Energy Record Model
class EnergyRecord(Base):
    __tablename__ = "energy_records"

    record_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"))
    energy_generated = Column(Float, nullable=False)
    energy_consumed = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="energy_records")


# Alert Model
class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"))
    alert_type = Column(String(100), nullable=False)
    message = Column(String(255), nullable=False)
    is_resolved = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    is_acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="alerts")

    @property
    def device_name(self):
        return self.device.device_name if self.device else "Unknown Device"