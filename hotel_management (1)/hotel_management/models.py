from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, func, Date, Float, DateTime
from sqlalchemy.orm import relationship
from database import Base

# Bảng Roles (Vai trò: Admin, Lễ tân...)
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    discount_threshold = Column(Float, default=0.0)  # % giảm giá tối đa cho phép (0.05 = 5%)
    
    # Quan hệ 1-nhiều với bảng users
    users = relationship("User", back_populates="role")

# Bảng Users (Người dùng, Nhân viên hệ thống)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False) # Mật khẩu băm
    email = Column(String(255), nullable=True) # Mã hóa đối xứng
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
    phone = Column(String(255), nullable=True) # Mã hóa đối xứng
    email_hash = Column(String(64), unique=True, index=True, nullable=True) # Băm tìm kiếm
    phone_hash = Column(String(64), unique=True, index=True, nullable=True) # Băm tìm kiếm
    
    role = relationship("Role", back_populates="users")

# Bảng Websites (Quản lý 100 trang web)
class Website(Base):
    __tablename__ = "websites"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    domain = Column(String(100), unique=True, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_handed_over = Column(Integer, default=0) # 0: False, 1: True
    created_at = Column(DateTime, default=func.now())

# Bảng Customers (Khách hàng đặt phòng)
class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(255), nullable=True) # Mã hóa đối xứng
    phone_hash = Column(String(64), index=True, nullable=True) # Băm tìm kiếm
    encrypted_id_card = Column(Text, nullable=False) # CCCD mã hóa
    created_at = Column(TIMESTAMP, server_default=func.now())


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True) # Đã sửa lỗi có dấu cách
    room_number = Column(String(50), unique=True, index=True)
    type_id = Column(Integer) # Sử dụng type_id giống hệt Database của bạn
    status = Column(String(50), default="Trống")
    image_url = Column(String(500), nullable=True)  # URL ảnh phòng
    description = Column(Text, nullable=True)        # Mô tả chi tiết phòng
    amenitiesjson = Column(Text, nullable=True)      # Tiện nghi JSON string

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


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_type = Column(String(50), nullable=False)  # e.g. 'cancel_booking', 'change_room'
    target_id = Column(Integer, nullable=True)         # booking_id or room_id
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")     # pending/approved/rejected
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    """Nhật ký hành động — ghi lại mọi thay đổi quan trọng trong hệ thống."""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # ai thực hiện
    username = Column(String(50), nullable=True)                        # tên đăng nhập lưu nhanh
    action = Column(String(100), nullable=False)                        # hành động (CANCEL_BOOKING, CHANGE_ROOM_STATUS...)
    entity_type = Column(String(50), nullable=True)                     # loại đối tượng (booking, room, user...)
    entity_id = Column(Integer, nullable=True)                          # ID đối tượng bị thay đổi
    old_value = Column(Text, nullable=True)                             # giá trị cũ (JSON string)
    new_value = Column(Text, nullable=True)                             # giá trị mới (JSON string)
    reason = Column(Text, nullable=True)                                # lý do thay đổi
    ip_address = Column(String(50), nullable=True)                      # IP người thực hiện
    created_at = Column(DateTime, default=func.now())


class NightAuditSession(Base):
    """Phiên chốt sổ ngày (Night Audit) — khóa dữ liệu tài chính sau khi chốt."""
    __tablename__ = "night_audit_sessions"

    id = Column(Integer, primary_key=True, index=True)
    audit_date = Column(Date, unique=True, nullable=False)  # ngày kinh doanh đã chốt
    status = Column(String(20), default="closed")           # 'closed'
    closed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # ai thực hiện chốt
    closed_by_username = Column(String(50), nullable=True)   # tên đăng nhập lưu nhanh
    total_revenue = Column(Float, default=0.0)               # doanh thu ngày đó
    total_bookings_closed = Column(Integer, default=0)       # số booking checked_out trong ngày
    notes = Column(Text, nullable=True)                      # ghi chú
    closed_at = Column(DateTime, default=func.now())


class WorkShift(Base):
    """Ca làm việc của nhân viên lễ tân — kiểm soát quyền thu tiền theo ca."""
    __tablename__ = "work_shifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # nhân viên
    username = Column(String(50), nullable=True)                        # tên đăng nhập
    shift_date = Column(Date, nullable=False)                           # ngày làm việc
    opened_at = Column(DateTime, default=func.now())                    # giờ mở ca
    closed_at = Column(DateTime, nullable=True)                         # giờ đóng ca (None = ca đang mở)
    cash_collected = Column(Float, default=0.0)                         # tổng tiền mặt thu trong ca
    status = Column(String(20), default="open")                         # 'open' hoặc 'closed'
    notes = Column(Text, nullable=True)                                 # ghi chú khi bàn giao