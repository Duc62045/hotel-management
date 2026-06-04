from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, func, Date, Float, DateTime
from sqlalchemy.orm import relationship
from database import Base

# Bảng Roles (Vai trò: Admin, Lễ tân...)
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    
    # Quan hệ 1-nhiều với bảng users
    users = relationship("User", back_populates="role")

# Bảng Users (Người dùng, Nhân viên hệ thống)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False) # Mật khẩu băm
    email = Column(String(100), unique=True)
    full_name = Column(String(100))
    role_id = Column(Integer, ForeignKey("roles.id"))
    login_otp = Column(String(6), nullable=True)
    login_otp_expires_at = Column(DateTime, nullable=True)
    reset_otp = Column(String(6), nullable=True)
    reset_otp_expires_at = Column(DateTime, nullable=True)
    reset_token_hash = Column(String(128), nullable=True)
    reset_token_expires_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    role = relationship("Role", back_populates="users")

# Bảng Customers (Khách hàng đặt phòng)
class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    encrypted_id_card = Column(Text, nullable=False) # CCCD mã hóa
    created_at = Column(TIMESTAMP, server_default=func.now())

# Đảm bảo ở đầu file bạn đã có các import này:
from sqlalchemy import Column, Integer, String
# (Không cần import Float nữa vì bảng của bạn không lưu giá tiền ở đây)

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True) # Đã sửa lỗi có dấu cách
    room_number = Column(String(50), unique=True, index=True)
    type_id = Column(Integer) # Sử dụng type_id giống hệt Database của bạn
    status = Column(String(50), default="Trống")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer) 
    room_id = Column(Integer)     
    check_in_date = Column(Date)
    check_out_date = Column(Date)
    
    # --- THÊM 2 CỘT NÀY CHO KHỚP DATABASE ---
    total_price = Column(Float, default=0.0) 
    status = Column(String(50), default="pending") 
    payment_status = Column(String(20), default="unpaid")
    created_at = Column(DateTime, default=func.now()) # Tự động điền ngày giờ lúc tạo

class RoomType(Base):
    __tablename__ = "room_types"

    id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String(255))
    price_per_night = Column(Float)
    description = Column(Text)


class MockBankAccount(Base):
    """Tài khoản ngân hàng giả lập để test thanh toán."""
    __tablename__ = "mock_bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_number = Column(String(32), unique=True, nullable=False, index=True)
    account_holder = Column(String(100), nullable=False)
    balance = Column(Float, default=0.0)


class PaymentTransaction(Base):
    """Phiên thanh toán nội bộ (mô phỏng cổng ngân hàng)."""
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_ref = Column(String(32), unique=True, nullable=False, index=True)
    booking_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    account_number = Column(String(32), nullable=True)
    account_holder = Column(String(100), nullable=True)
    status = Column(String(20), default="pending")
    failure_reason = Column(String(50), nullable=True)
    otp_code = Column(String(6), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)