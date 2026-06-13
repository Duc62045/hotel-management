from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date, datetime # Nhớ import thêm datetime ở đầu file
import re


def _validate_password_strength(password: str) -> str:
    """Kiểm tra mật khẩu đủ mạnh: ≥8 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt."""
    if len(password) < 8:
        raise ValueError("Mật khẩu phải có ít nhất 8 ký tự.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Mật khẩu phải có ít nhất 1 chữ hoa (A-Z).")
    if not re.search(r"[a-z]", password):
        raise ValueError("Mật khẩu phải có ít nhất 1 chữ thường (a-z).")
    if not re.search(r"\d", password):
        raise ValueError("Mật khẩu phải có ít nhất 1 chữ số (0-9).")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{}|;:'\",.<>?/`~]", password):
        raise ValueError("Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...).")
    return password


# 1. Schema yêu cầu người dùng gửi lên khi Đăng ký
class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    full_name: Optional[str] = None
    username: Optional[str] = None
    role_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def password_must_be_strong(cls, v: str) -> str:
        return _validate_password_strength(v)

# 2. Schema trả về cho người dùng sau khi đăng ký thành công (Tuyệt đối không trả về password)
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    phone: Optional[str] = None
    full_name: Optional[str] = None
    role_id: int

    class Config:
        from_attributes = True

# Schema Quản lý trang web
class WebsiteCreate(BaseModel):
    name: str
    domain: str

class WebsiteResponse(BaseModel):
    id: int
    name: str
    domain: str
    owner_id: Optional[int] = None
    is_handed_over: int
    created_at: datetime

    class Config:
        from_attributes = True

# 3. Schema cho Token
class Token(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    requires_mfa: bool = False
    mfa_token: Optional[str] = None
    mfa_debug_otp: Optional[str] = None
    otp_sent_to_email: Optional[bool] = None
    email_masked: Optional[str] = None
    message: Optional[str] = None

class MfaVerifyRequest(BaseModel):
    mfa_token: str
    otp: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_must_be_strong(cls, v: str) -> str:
        return _validate_password_strength(v)


# 4. Schema nhận dữ liệu từ Lễ tân khi tạo khách hàng
class CustomerCreate(BaseModel):
    full_name: str
    phone: str
    id_card: str  # Căn cước công dân gốc

# 5. Schema trả về sau khi tạo xong (giấu đi id_card gốc)
class CustomerResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    user_id: int  # ID của nhân viên đã tạo hồ sơ này

    class Config:
        from_attributes = True

# 6. Schema trả về chi tiết khách hàng (Đã giải mã CCCD)
class CustomerDetailResponse(BaseModel):
    id: int
    full_name: str
    phone: str
    id_card: str  # Trả về CCCD gốc
    user_id: int

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS CHO PHÒNG (ROOMS)
# ==========================================
class RoomCreate(BaseModel):
    room_number: str
    type_id: int  # Người dùng sẽ truyền ID của loại phòng vào đây

class RoomResponse(BaseModel):
    id: int
    room_number: str
    type_id: int
    status: str

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    customer_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    # Không cần total_price ở đây vì nhân viên không tự nhập tiền, hệ thống sẽ tự tính

class AppBookingCreate(BaseModel):
    room_id: int
    check_in_date: date
    check_out_date: date

class BookingResponse(BaseModel):
    id: int
    customer_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    total_price: float | None # Có thể rỗng
    status: str
    payment_status: str | None = "unpaid"
    created_at: datetime | None # Có thể rỗng

    class Config:
        from_attributes = True


class PaymentInitRequest(BaseModel):
    booking_id: int


class PaymentVerifyAccountRequest(BaseModel):
    payment_id: int
    account_number: str


class PaymentConfirmRequest(BaseModel):
    payment_id: int
    otp: str


class PaymentInitResponse(BaseModel):
    payment_id: int
    transaction_ref: str
    booking_id: int
    amount: float
    currency: str = "VND"
    status: str
    message: str


class PaymentVerifyAccountResponse(BaseModel):
    payment_id: int
    account_holder: str
    account_masked: str
    otp_expires_in_seconds: int
    status: str
    message: str
    debug_otp: Optional[str] = None


class PaymentConfirmResponse(BaseModel):
    payment_id: int
    transaction_ref: str
    status: str
    reason: str
    message: str
    booking_id: int
    payment_status: str


class PaymentStatusResponse(BaseModel):
    payment_id: int
    transaction_ref: str
    booking_id: int
    amount: float
    status: str
    failure_reason: Optional[str] = None
    account_masked: Optional[str] = None
    completed_at: Optional[datetime] = None


# ==========================================
# SCHEMAS ĐẶT PHÒNG CÔNG KHAI (không cần login)
# ==========================================
class PublicBookingCreate(BaseModel):
    full_name: str
    phone: str
    email: EmailStr
    room_id: int
    check_in_date: date
    check_out_date: date
    note: Optional[str] = None

class PublicBookingResponse(BaseModel):
    booking_id: int
    room_number: str
    room_type: str
    full_name: str
    phone: str
    email: str
    check_in_date: date
    check_out_date: date
    num_nights: int
    total_price: float
    status: str
    message: str


# ==========================================
# SCHEMAS PHÒNG (cập nhật)
# ==========================================
class RoomUpdateByAdmin(BaseModel):
    image_url: Optional[str] = None
    description: Optional[str] = None
    amenities: Optional[list[str]] = None  # ['WiFi', 'TV', 'Minibar']
    type_name: Optional[str] = None
    price_per_night: Optional[float] = None
    type_description: Optional[str] = None

# ==========================================
# SCHEMAS PHÂN QUYỀN
# ==========================================
class RoleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class UserWithRoleResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    role_id: int
    role_name: Optional[str] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ChangeUserRoleRequest(BaseModel):
    role_id: int

# ==========================================
# SCHEMAS APPROVAL WORKFLOW
# ==========================================
class ApprovalRequestCreate(BaseModel):
    action_type: str
    target_id: Optional[int] = None
    reason: Optional[str] = None

class ApprovalRequestResponse(BaseModel):
    id: int
    requester_id: int
    approver_id: Optional[int] = None
    action_type: str
    target_id: Optional[int] = None
    reason: Optional[str] = None
    status: str
    note: Optional[str] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class ApprovalDecisionRequest(BaseModel):
    decision: str  # 'approved' or 'rejected'
    note: Optional[str] = None