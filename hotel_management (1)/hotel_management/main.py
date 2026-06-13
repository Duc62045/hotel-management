from fastapi import FastAPI, Depends, HTTPException, status, Form, BackgroundTasks, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Optional
import hmac
import hashlib
import urllib.request
import json
import random
import os
import smtplib
import ssl
import secrets
from email.message import EmailMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date, datetime, timezone, timedelta
from sqlalchemy import func

# Import các module chúng ta vừa viết
import models
import schemas
import security
from database import engine, get_db, SessionLocal

from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

import jwt # Thêm dòng này để giải mã Token
from fastapi.security import OAuth2PasswordBearer # Thêm dòng này

# ==========================================
# RATE LIMITING (slowapi)
# ==========================================
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# ==========================================
# SECURITY LOGGING
# ==========================================
from security_logger import (
    log_security_event,
    EVENT_LOGIN_SUCCESS, EVENT_LOGIN_FAILED, EVENT_ACCOUNT_LOCKED,
    EVENT_REGISTER_SUCCESS, EVENT_PAYMENT_SUCCESS, EVENT_PAYMENT_FAILED,
    EVENT_PASSWORD_RESET_REQUEST, EVENT_PASSWORD_RESET_SUCCESS,
    EVENT_RATE_LIMIT_EXCEEDED,
)

# Lệnh này sẽ yêu cầu SQLAlchemy tự động tạo các bảng trong MySQL nếu nó chưa tồn tại 
# (Dù bạn đã chạy script tạo bảng rồi, nhưng để lệnh này vẫn rất an toàn và tốt cho backup)
models.Base.metadata.create_all(bind=engine)

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Hotel Management API")

# Gắn Rate Limiter vào app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def ensure_auth_columns(db: Session) -> None:
    """Create auth helper columns if they do not exist (MySQL-compatible)."""
    # 1. Tăng độ dài cột để lưu dữ liệu mã hóa PII
    try:
        db.execute(text("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NULL"))
        db.execute(text("ALTER TABLE users MODIFY COLUMN phone VARCHAR(255) NULL"))
        db.execute(text("ALTER TABLE customers MODIFY COLUMN phone VARCHAR(255) NULL"))
    except Exception as e:
        db.rollback()

    # Hủy bỏ index UNIQUE trên email và phone nếu có (do dữ liệu mã hóa không thể dùng UNIQUE index thường)
    for col in ["email", "phone"]:
        try:
            db.execute(text(f"ALTER TABLE users DROP INDEX {col}"))
        except Exception:
            pass

    columns_to_add = [
        ("login_otp", "VARCHAR(6) NULL"),
        ("login_otp_expires_at", "DATETIME NULL"),
        ("reset_otp", "VARCHAR(6) NULL"),
        ("failed_login_attempts", "INT NOT NULL DEFAULT 0"),
        ("locked_until", "DATETIME NULL"),
        ("reset_otp_expires_at", "DATETIME NULL"),
        ("reset_token_hash", "VARCHAR(128) NULL"),
        ("reset_token_expires_at", "DATETIME NULL"),
        ("phone", "VARCHAR(255) NULL"),
        ("email_hash", "VARCHAR(64) NULL UNIQUE"),
        ("phone_hash", "VARCHAR(64) NULL UNIQUE"),
    ]
    for col_name, col_def in columns_to_add:
        exists = db.execute(
            text(
                """
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND COLUMN_NAME = :col_name
                """
            ),
            {"col_name": col_name},
        ).scalar()
        if not exists:
            db.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))

    # Thêm phone_hash vào bảng customers
    exists_customer_phone_hash = db.execute(
        text(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'customers'
              AND COLUMN_NAME = 'phone_hash'
            """
        )
    ).scalar()
    if not exists_customer_phone_hash:
        db.execute(text("ALTER TABLE customers ADD COLUMN phone_hash VARCHAR(64) NULL"))

    db.commit()


def ensure_roles(db: Session) -> None:
    roles = [
        ("Super Admin", "Chủ khách sạn — quyền cao nhất"),
        ("Admin", "Quản lý hệ thống — quản trị toàn bộ"),
        ("Moderator", "Điều phối viên — quản lý ca, duyệt yêu cầu"),
        ("Lễ tân", "Nhân viên lễ tân — xử lý booking"),
        ("Customer", "Khách hàng đặt phòng"),
    ]
    for role_name, desc in roles:
        existing = db.query(models.Role).filter(models.Role.name == role_name).first()
        if not existing:
            db.add(models.Role(name=role_name, description=desc))
    db.commit()


# ==========================================
# SECRETS TỪ ENVIRONMENT VARIABLES
# ==========================================
MOCK_BANK_OTP = os.getenv("MOCK_BANK_OTP", "123456")
MOCK_VNPAY_SECRET = os.getenv("MOCK_VNPAY_SECRET", "VNPAY_SECRET_KEY_MOCK_123")

# Account Lockout config
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

MOCK_BANK_TEST_ACCOUNTS = [
    ("970419852619143211", "NGUYEN VAN A", 50_000_000.0),
    ("970419852619143212", "TRAN VAN B", 100_000.0),
]


def ensure_booking_payment_column(db: Session) -> None:
    exists = db.execute(
        text(
            """
            SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'bookings'
              AND COLUMN_NAME = 'payment_status'
            """
        )
    ).scalar()
    if not exists:
        db.execute(text("ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'"))
    db.commit()


def ensure_room_columns(db: Session) -> None:
    """Add image_url, description, amenitiesjson columns to rooms if not exist."""
    for col_name, col_def in [
        ("image_url", "VARCHAR(500) NULL"),
        ("description", "TEXT NULL"),
        ("amenitiesjson", "TEXT NULL"),
    ]:
        exists = db.execute(
            text("""
                SELECT COUNT(*) FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'rooms'
                  AND COLUMN_NAME = :col_name
            """),
            {"col_name": col_name},
        ).scalar()
        if not exists:
            db.execute(text(f"ALTER TABLE rooms ADD COLUMN {col_name} {col_def}"))
    db.commit()
    # Create approval_requests table if not exists
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS approval_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                requester_id INT NOT NULL,
                approver_id INT NULL,
                action_type VARCHAR(50) NOT NULL,
                target_id INT NULL,
                reason TEXT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                note TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME NULL
            )
        """))
        db.commit()
    except Exception:
        db.rollback()


def ensure_mock_bank_accounts(db: Session) -> None:
    for account_number, holder, balance in MOCK_BANK_TEST_ACCOUNTS:
        existing = (
            db.query(models.MockBankAccount)
            .filter(models.MockBankAccount.account_number == account_number)
            .first()
        )
        if not existing:
            db.add(
                models.MockBankAccount(
                    account_number=account_number,
                    account_holder=holder,
                    balance=balance,
                )
            )
    db.commit()


def normalize_account_number(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


PAYMENT_OTP_MINUTES = 5


def mask_account_number(account_number: str) -> str:
    if len(account_number) <= 4:
        return account_number
    return "*" * (len(account_number) - 4) + account_number[-4:]


def get_booking_for_current_user(
    booking_id: int, current_user: models.User, db: Session
) -> models.Booking:
    customer_profile = (
        db.query(models.Customer).filter(models.Customer.user_id == current_user.id).first()
    )
    if not customer_profile:
        raise HTTPException(
            status_code=400,
            detail="Bạn cần cập nhật hồ sơ cá nhân trước khi thanh toán.",
        )
    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.id == booking_id,
            models.Booking.customer_id == customer_profile.id,
        )
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt phòng.")
    return booking


def get_payment_for_current_user(
    payment_id: int, current_user: models.User, db: Session
) -> models.PaymentTransaction:
    payment = (
        db.query(models.PaymentTransaction)
        .filter(
            models.PaymentTransaction.id == payment_id,
            models.PaymentTransaction.user_id == current_user.id,
        )
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên thanh toán.")
    return payment


def payment_failure_message(reason: str) -> str:
    messages = {
        "success": "Thanh toán thành công.",
        "insufficient_balance": "Số dư tài khoản không đủ.",
        "account_not_found": "Số tài khoản ngân hàng không tồn tại.",
        "invalid_otp": "Mã OTP không đúng hoặc đã hết hạn.",
        "already_paid": "Đơn đặt phòng đã được thanh toán.",
        "cancelled_booking": "Đơn đặt phòng đã bị hủy.",
        "expired_session": "Phiên thanh toán đã hết hạn. Vui lòng thử lại.",
    }
    return messages.get(reason, "Thanh toán thất bại.")


def raise_payment_error(reason: str) -> None:
    """Lỗi nghiệp vụ thanh toán — luôn HTTP 400 + mã lỗi cho app."""
    raise HTTPException(
        status_code=400,
        detail={
            "code": reason,
            "message": payment_failure_message(reason),
        },
    )


@app.on_event("startup")
def on_startup() -> None:
    db = SessionLocal()
    try:
        ensure_booking_payment_column(db)
        ensure_mock_bank_accounts(db)
        ensure_auth_columns(db)
        ensure_roles(db)
        ensure_room_columns(db)
    finally:
        db.close()


def generate_otp() -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(6))


def send_otp_email(to_email: str, subject: str, otp: str, expire_minutes: int) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL") or smtp_user

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        return False

    message = EmailMessage()
    message["From"] = smtp_from
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(
        f"Ma OTP cua ban la: {otp}\n"
        f"Ma co hieu luc trong {expire_minutes} phut.\n"
        "Neu ban khong yeu cau, hay bo qua email nay."
    )

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls(context=context)
        server.login(smtp_user, smtp_password)
        server.send_message(message)
    return True


def send_password_reset_email(to_email: str, reset_link: str, expire_minutes: int) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL") or smtp_user

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        return False

    message = EmailMessage()
    message["From"] = smtp_from
    message["To"] = to_email
    message["Subject"] = "Khoi phuc tai khoan - Dat lai mat khau"
    message.set_content(
        "Ban da yeu cau dat lai mat khau.\n"
        f"Nhan vao link sau de dat lai mat khau: {reset_link}\n"
        f"Link co hieu luc trong {expire_minutes} phut.\n"
        "Neu ban khong yeu cau, vui long bo qua email nay."
    )

    context = ssl.create_default_context()
    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls(context=context)
        server.login(smtp_user, smtp_password)
        server.send_message(message)
    return True

# Cấu hình CORS để cho phép Frontend (Web/App) truy cập API mà không bị chặn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Cho phép tất cả các tên miền/IP
    allow_credentials=False, # PHẢI ĐẶT LÀ FALSE NẾU DÙNG ORIGINS="*" TRÊN WEB
    allow_methods=["*"], # Cho phép tất cả các phương thức POST, GET, PUT...
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Chào mừng đến với API Quản lý Khách sạn!"}

# API để test kết nối MySQL
@app.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        # Chạy một câu lệnh SQL đơn giản để test
        result = db.execute(text("SELECT DATABASE();")).scalar()
        return {
            "status": "Thành công",
            "message": "Đã kết nối tới MySQL!",
            "database_name": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối DB: {str(e)}")
    
# ==========================================
# API ĐĂNG KÝ NGƯỜI DÙNG MỚI
# ==========================================
@app.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
def register_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    client_ip = get_remote_address(request)
    
    # 1. Xác định username (mặc định lấy từ email nếu không truyền)
    username = user.username or user.email
    
    # Tạo mã băm tìm kiếm
    email_hash = security.get_sha256_hash(user.email)
    phone_hash = security.get_sha256_hash(user.phone) if user.phone else None
    
    # Kiểm tra xem username, email hoặc phone đã tồn tại chưa bằng cách khớp hash/username
    db_user = db.query(models.User).filter(func.lower(models.User.username) == func.lower(username)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")

    db_email = db.query(models.User).filter(models.User.email_hash == email_hash).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    if user.phone:
        db_phone = db.query(models.User).filter(models.User.phone_hash == phone_hash).first()
        if db_phone:
            raise HTTPException(status_code=400, detail="Số điện thoại đã được sử dụng")

    # 2. Xác định role hợp lệ cho tài khoản tự đăng ký
    selected_role_id = user.role_id
    if selected_role_id is None:
        customer_role = db.query(models.Role).filter(
            func.lower(models.Role.name).in_(["customer", "guest", "khach hang", "khách hàng"])
        ).first()
        if customer_role:
            selected_role_id = customer_role.id
        else:
            raise HTTPException(
                status_code=400,
                detail="Không tìm thấy vai trò mặc định cho khách hàng. Vui lòng liên hệ quản trị hệ thống."
            )
    else:
        role = db.query(models.Role).filter(models.Role.id == selected_role_id).first()
        if role is None:
            raise HTTPException(status_code=400, detail="Vai trò được chỉ định không tồn tại.")
    
    # 3. Băm mật khẩu người dùng gửi lên
    hashed_password = security.get_password_hash(user.password)
    
    # 4. Mã hóa thông tin nhạy cảm PII
    encrypted_email = security.encrypt_data(user.email)
    encrypted_phone = security.encrypt_data(user.phone) if user.phone else None
    
    # Tạo đối tượng User mới
    new_user = models.User(
        username=username,
        email=encrypted_email,
        phone=encrypted_phone,
        email_hash=email_hash,
        phone_hash=phone_hash,
        password_hash=hashed_password,
        full_name=user.full_name,
        role_id=selected_role_id
    )
    
    # 5. Lưu vào Database
    from sqlalchemy.exc import IntegrityError
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Đăng ký thất bại. Tên đăng nhập, Email hoặc Số điện thoại đã tồn tại.")
    
    log_security_event(EVENT_REGISTER_SUCCESS, ip=client_ip, user=username)
    
    # Trả về schema với thông tin đã giải mã cho client
    return schemas.UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=user.email,
        phone=user.phone,
        full_name=new_user.full_name,
        role_id=new_user.role_id
    )
    
# ==========================================
# API ĐĂNG NHẬP (LẤY TOKEN)
# ==========================================
@app.post("/login", response_model=schemas.Token)
@limiter.limit("10/minute")
def login_for_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    client_ip = get_remote_address(request)
    username_input = form_data.username
    input_hash = security.get_sha256_hash(username_input)
    # Làm sạch input để chống Log Injection
    clean_username = security.sanitize_log_input(username_input)

    # Tìm kiếm user qua username, email_hash hoặc phone_hash
    user = db.query(models.User).filter(
        (models.User.username == username_input) |
        (models.User.email_hash == input_hash) |
        (models.User.phone_hash == input_hash)
    ).first()

    # --- ACCOUNT LOCKOUT CHECK ---
    if user and user.locked_until:
        lock_time = user.locked_until
        if lock_time.tzinfo is None:
            lock_time = lock_time.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) < lock_time:
            remaining = int((lock_time - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            log_security_event(
                EVENT_ACCOUNT_LOCKED, ip=client_ip, user=clean_username,
                details=f"Tài khoản vẫn đang bị khóa. Còn ~{remaining} phút."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản bị khóa tạm thời do nhập sai quá nhiều lần. Vui lòng thử lại sau {remaining} phút.",
            )
        else:
            # Hết hạn khóa → reset
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # Cân bằng thời gian phản hồi: nếu user không tồn tại, chạy dummy bcrypt
    if not user:
        security.verify_password_dummy()
        log_security_event(EVENT_LOGIN_FAILED, ip=client_ip, user=clean_username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Nếu mật khẩu không đúng
    if not security.verify_password(form_data.password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            db.commit()
            log_security_event(
                EVENT_ACCOUNT_LOCKED, ip=client_ip, user=clean_username,
                details=f"Khóa {LOCKOUT_DURATION_MINUTES} phút sau {MAX_LOGIN_ATTEMPTS} lần sai."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản bị khóa {LOCKOUT_DURATION_MINUTES} phút do nhập sai mật khẩu {MAX_LOGIN_ATTEMPTS} lần liên tiếp.",
            )
        db.commit()
        log_security_event(EVENT_LOGIN_FAILED, ip=client_ip, user=clean_username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- LOGIN THÀNH CÔNG → RESET COUNTER ---
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    log_security_event(EVENT_LOGIN_SUCCESS, ip=client_ip, user=clean_username)
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/forgot-password")
@limiter.limit("3/minute")
def forgot_password(
    request: Request,
    payload: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    ensure_auth_columns(db)
    email_hash = security.get_sha256_hash(payload.email)
    user = db.query(models.User).filter(models.User.email_hash == email_hash).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email chưa đăng ký trong hệ thống")

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    user.reset_token_hash = token_hash
    user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    db.commit()
    log_security_event(EVENT_PASSWORD_RESET_REQUEST, ip=get_remote_address(request), user=str(payload.email))

    app_base_url = os.getenv("APP_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    reset_link = f"{app_base_url}/auth/reset-password-page?token={raw_token}"
    email_sent = False
    if user.email:
        decrypted_email = security.decrypt_data(user.email)
        email_sent = send_password_reset_email(decrypted_email, reset_link, 15)

    if not email_sent:
        return {
            "message": "Chua gui duoc email (chua cau hinh SMTP). Dung link reset ben duoi de test.",
            "email_sent": False,
            "reset_debug_link": reset_link,
        }

    decrypted_email = security.decrypt_data(user.email) if user.email else ""
    return {
        "message": f"Da gui email khoi phuc den {decrypted_email}. Vui long kiem tra hop thu (ca muc Spam).",
        "email_sent": True,
    }


@app.post("/auth/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    ensure_auth_columns(db)
    token_hash = hashlib.sha256(payload.token.strip().encode()).hexdigest()
    user = db.query(models.User).filter(models.User.reset_token_hash == token_hash).first()
    if not user:
        raise HTTPException(status_code=400, detail="Link đặt lại mật khẩu không hợp lệ")

    if not user.reset_token_expires_at:
        raise HTTPException(status_code=400, detail="Link đặt lại mật khẩu không hợp lệ")

    if datetime.now(timezone.utc) > user.reset_token_expires_at.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Link đặt lại mật khẩu đã hết hạn")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 6 ký tự")

    user.password_hash = security.get_password_hash(payload.new_password)
    user.reset_otp = None
    user.reset_otp_expires_at = None
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    db.commit()

    log_security_event(EVENT_PASSWORD_RESET_SUCCESS, user=user.username)
    return {"message": "Đặt lại mật khẩu thành công"}


@app.get("/auth/reset-password-page", response_class=HTMLResponse)
def reset_password_page(token: str):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dat lai mat khau</title>
        <style>
            body {{ font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:24px; }}
            .card {{ max-width:420px; margin:0 auto; background:#fff; border-radius:12px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,.08); }}
            h2 {{ margin-top:0; color:#1a1a2e; }}
            input {{ width:100%; box-sizing:border-box; padding:12px; margin:10px 0; border:1px solid #ddd; border-radius:8px; }}
            button {{ width:100%; padding:12px; border:none; border-radius:8px; background:#4f46e5; color:#fff; font-weight:600; cursor:pointer; }}
            .hint {{ color:#666; font-size:13px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Dat lai mat khau</h2>
            <p class="hint">Nhap mat khau moi de khoi phuc tai khoan.</p>
            <form method="post" action="/auth/reset-password-page">
                <input type="hidden" name="token" value="{token}" />
                <input type="password" name="new_password" minlength="6" required placeholder="Mat khau moi (>= 6 ky tu)" />
                <button type="submit">Dat lai mat khau</button>
            </form>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.post("/auth/reset-password-page", response_class=HTMLResponse)
def reset_password_page_submit(token: str = Form(...), new_password: str = Form(...), db: Session = Depends(get_db)):
    try:
        reset_password(schemas.ResetPasswordRequest(token=token, new_password=new_password), db)
        return HTMLResponse("<h3 style='font-family:Arial;padding:24px;'>Dat lai mat khau thanh cong. Ban co the quay lai app de dang nhap.</h3>")
    except HTTPException as ex:
        return HTMLResponse(f"<h3 style='font-family:Arial;padding:24px;color:#b91c1c;'>Loi: {ex.detail}</h3>", status_code=400)

# ==========================================
# CHỐT CHẶN BẢO VỆ API (DEPENDENCY)
# ==========================================
# Cấu hình báo cho Swagger biết Token được lấy từ API "/login"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Hàm này sẽ chạy trước mỗi API cần bảo mật để kiểm tra Token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Dùng khóa bí mật để giải mã Token xem có hợp lệ không
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
        
    # Lấy thông tin user đang đăng nhập từ Database
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/me")
def get_me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role_name": user_role.name if user_role else "guest"
    }

# ==========================================
# PERMISSION HIERARCHY (5 cấp)
# ==========================================
ROLE_HIERARCHY = {
    "super admin": 5,
    "admin": 4,
    "moderator": 3,
    "lễ tân": 2,
    "customer": 1,
}

def get_role_level(role_name: str) -> int:
    return ROLE_HIERARCHY.get(role_name.lower().strip(), 0)

def get_current_user_role(current_user: models.User, db: Session) -> str:
    user_role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    return user_role.name.lower().strip() if user_role else ""

def get_current_super_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chỉ Chủ khách sạn (Super Admin) được phép."""
    role_name = get_current_user_role(current_user, db)
    if get_role_level(role_name) < 5:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền Chủ khách sạn (Super Admin)."
        )
    return current_user

def get_current_admin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin và Super Admin được phép."""
    role_name = get_current_user_role(current_user, db)
    if get_role_level(role_name) < 4:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền Admin trở lên."
        )
    return current_user

def get_current_manager(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Moderator, Admin, Super Admin được phép."""
    role_name = get_current_user_role(current_user, db)
    if get_role_level(role_name) < 3:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền Moderator trở lên."
        )
    return current_user

def get_current_staff(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lễ tân, Moderator, Admin, Super Admin được phép."""
    role_name = get_current_user_role(current_user, db)
    if get_role_level(role_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yêu cầu quyền Nhân viên (Lễ tân) trở lên."
        )
    return current_user


@app.post("/admin/users/{user_id}/approve-moderator")
def approve_moderator(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng này.")
        
    moderator_role = db.query(models.Role).filter(func.lower(models.Role.name) == "moderator").first()
    if not moderator_role:
        raise HTTPException(status_code=500, detail="Không tìm thấy vai trò Moderator trong hệ thống.")
        
    user.role_id = moderator_role.id
    db.commit()
    return {"message": f"Đã duyệt tài khoản '{user.username}' làm Moderator (Điều phối viên)."}

# ==========================================
# API QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN
# ==========================================
@app.get("/admin/users")
def list_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin+ xem danh sách tất cả người dùng kèm vai trò."""
    users = db.query(models.User).all()
    roles = {r.id: r.name for r in db.query(models.Role).all()}
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role_id": u.role_id,
            "role_name": roles.get(u.role_id, "unknown"),
            "created_at": str(u.created_at) if u.created_at else None,
        }
        for u in users
    ]

@app.get("/admin/roles")
def list_roles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin+ xem danh sách tất cả vai trò."""
    return db.query(models.Role).all()

@app.put("/admin/users/{user_id}/role")
def change_user_role(
    user_id: int,
    payload: schemas.ChangeUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin thay đổi role người dùng. Super Admin mới được gán role Super Admin."""
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    new_role = db.query(models.Role).filter(models.Role.id == payload.role_id).first()
    if not new_role:
        raise HTTPException(status_code=404, detail="Không tìm thấy vai trò.")

    # Chỉ Super Admin mới được gán role Super Admin
    current_role_name = get_current_user_role(current_user, db)
    if new_role.name.lower() == "super admin" and get_role_level(current_role_name) < 5:
        raise HTTPException(
            status_code=403,
            detail="Chỉ Chủ khách sạn mới được gán quyền Super Admin."
        )

    old_role_name = db.query(models.Role).filter(models.Role.id == target.role_id).first()
    old_name = old_role_name.name if old_role_name else "?"
    target.role_id = payload.role_id
    db.commit()
    return {
        "message": f"Đã thay đổi quyền của '{target.username}' từ '{old_name}' → '{new_role.name}'.",
        "user_id": user_id,
        "new_role": new_role.name,
    }

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin xóa người dùng (không thể xóa Super Admin)."""
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể xóa chính mình.")
    target_role = db.query(models.Role).filter(models.Role.id == target.role_id).first()
    if target_role and target_role.name.lower() == "super admin":
        raise HTTPException(status_code=403, detail="Không thể xóa tài khoản Chủ khách sạn.")
    db.delete(target)
    db.commit()
    return {"message": f"Đã xóa người dùng '{target.username}'."}

# ==========================================
# API APPROVAL WORKFLOW (Lễ tân → Moderator duyệt)
# ==========================================
@app.post("/staff/approval-requests")
def create_approval_request(
    payload: schemas.ApprovalRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff)
):
    """Lễ tân tạo yêu cầu cần duyệt (vd: hủy phòng, đổi phòng)."""
    req = models.ApprovalRequest(
        requester_id=current_user.id,
        action_type=payload.action_type,
        target_id=payload.target_id,
        reason=payload.reason,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Yêu cầu đã được gửi, đang chờ Moderator duyệt.", "request_id": req.id}

@app.get("/manager/approval-requests")
def list_pending_approvals(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_manager)
):
    """Moderator+ xem danh sách yêu cầu chờ duyệt."""
    reqs = db.query(models.ApprovalRequest).filter(
        models.ApprovalRequest.status == "pending"
    ).order_by(models.ApprovalRequest.created_at.desc()).all()
    return reqs

@app.put("/manager/approval-requests/{request_id}")
def decide_approval(
    request_id: int,
    payload: schemas.ApprovalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_manager)
):
    """Moderator+ duyệt hoặc từ chối yêu cầu."""
    if payload.decision not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="decision phải là 'approved' hoặc 'rejected'.")
    req = db.query(models.ApprovalRequest).filter(models.ApprovalRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu.")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Yêu cầu này đã được xử lý rồi.")
    req.status = payload.decision
    req.approver_id = current_user.id
    req.note = payload.note
    req.resolved_at = datetime.now(timezone.utc)
    db.commit()
    action_word = "Đã duyệt" if payload.decision == "approved" else "Đã từ chối"
    return {"message": f"{action_word} yêu cầu #{request_id}."}

# ==========================================
# API QUẢN LÝ TRANG WEB (WEBSITES)
# ==========================================
@app.post("/websites", response_model=schemas.WebsiteResponse)
def create_website(
    website: schemas.WebsiteCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    # Kiểm tra tên miền trùng lặp
    existing = db.query(models.Website).filter(models.Website.domain == website.domain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tên miền này đã tồn tại.")
    
    new_site = models.Website(
        name=website.name,
        domain=website.domain
    )
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    return new_site

@app.get("/websites", response_model=list[schemas.WebsiteResponse])
def get_all_websites(db: Session = Depends(get_db)):
    return db.query(models.Website).all()

@app.post("/websites/{website_id}/handover")
def handover_website(
    website_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    site = db.query(models.Website).filter(models.Website.id == website_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Không tìm thấy trang web này.")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng nhận bàn giao.")
        
    # Gán quyền sở hữu
    site.owner_id = user.id
    site.is_handed_over = 1
    
    # Nâng cấp vai trò của người nhận bàn giao lên Admin
    admin_role = db.query(models.Role).filter(func.lower(models.Role.name) == "admin").first()
    if admin_role:
        user.role_id = admin_role.id
        
    db.commit()
    return {"message": f"Bàn giao thành công trang web '{site.name}' cho khách hàng '{user.username}'. Khách hàng đã được nâng cấp lên quyền Quản trị."}

# ==========================================
# API THÊM KHÁCH HÀNG (YÊU CẦU ĐĂNG NHẬP)
# ==========================================
@app.post("/customers", response_model=schemas.CustomerResponse)
def create_customer(
    customer: schemas.CustomerCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Yêu cầu phải đi qua chốt chặn
):
    # 1. Mã hóa số CCCD và SĐT trước khi lưu
    encrypted_id = security.encrypt_data(customer.id_card)
    encrypted_phone = security.encrypt_data(customer.phone)
    phone_hash = security.get_sha256_hash(customer.phone)
    
    # 2. Tạo đối tượng Customer
    new_customer = models.Customer(
        user_id=current_user.id, # Tự động lấy ID của người đang đăng nhập gán vào
        full_name=customer.full_name,
        phone=encrypted_phone,
        phone_hash=phone_hash,
        encrypted_id_card=encrypted_id # Lưu chuỗi đã mã hóa
    )
    
    # 3. Lưu vào DB
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return schemas.CustomerResponse(
        id=new_customer.id,
        full_name=new_customer.full_name,
        phone=customer.phone,
        user_id=new_customer.user_id
    )

# ==========================================
# API XEM CHI TIẾT KHÁCH HÀNG (YÊU CẦU ĐĂNG NHẬP)
# ==========================================
@app.get("/customers/{customer_id}", response_model=schemas.CustomerDetailResponse)
def get_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Yêu cầu có Token
):
    # 1. Tìm khách hàng trong database theo ID
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy khách hàng này"
        )
    
    # Kiểm tra phân quyền: Chỉ tài khoản staff (Admin, Lễ tân, Moderator) hoặc chính chủ sở hữu hồ sơ được xem
    user_role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    role_name = user_role.name.lower() if user_role else "guest"
    is_admin = role_name == "admin"
    is_staff = role_name in ["admin", "lễ tân", "moderator"]
    
    if customer.user_id != current_user.id and not is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem thông tin chi tiết của khách hàng này."
        )
    
    # 2. Giải mã dữ liệu nhạy cảm
    decrypted_id_card = security.decrypt_data(customer.encrypted_id_card)
    decrypted_phone = security.decrypt_data(customer.phone) if customer.phone else ""
    
    # Áp dụng mặt nạ dữ liệu động (Masking): Chỉ Admin hoặc Chính chủ được xem đầy đủ
    should_mask = not (customer.user_id == current_user.id or is_admin)
    if should_mask:
        decrypted_id_card = security.mask_data(decrypted_id_card, 3, 3)
        decrypted_phone = security.mask_data(decrypted_phone, 3, 4)
        
    # Ghi log kiểm toán bảo mật truy cập thông tin nhạy cảm
    log_security_event(
        "EVENT_VIEW_CUSTOMER_PII",
        user=current_user.username,
        details=f"Viewed customer_id={customer.id}, name={customer.full_name}, PII masked={should_mask}"
    )
    
    # 3. Trả dữ liệu về cho client
    return {
        "id": customer.id,
        "full_name": customer.full_name,
        "phone": decrypted_phone,
        "id_card": decrypted_id_card,
        "user_id": customer.user_id
    }

# ==========================================
# API QUẢN LÝ PHÒNG (ROOMS)
# ==========================================

# 1. API Thêm phòng mới (Yêu cầu đăng nhập)
@app.post("/rooms", response_model=schemas.RoomResponse)
def create_room(
    room: schemas.RoomCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Chốt chặn Token
):
    # Kiểm tra xem số phòng này đã tồn tại trong hệ thống chưa
    existing_room = db.query(models.Room).filter(models.Room.room_number == room.room_number).first()
    if existing_room:
        raise HTTPException(status_code=400, detail="Số phòng này đã tồn tại trong khách sạn!")

    # Tạo phòng mới với trạng thái mặc định là "Trống"
    # ĐÃ CẬP NHẬT: Sử dụng type_id thay vì room_type và price_per_night
    new_room = models.Room(
        room_number=room.room_number,
        type_id=room.type_id,
        status="available" 
    )
    
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

# ==========================================
# API ADMIN QUẢN LÝ PHÒNG (ảnh + mô tả)
# ==========================================
@app.put("/admin/rooms/{room_id}")
def admin_update_room(
    room_id: int,
    payload: schemas.RoomUpdateByAdmin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin)
):
    """Admin/Super Admin cập nhật ảnh, mô tả, tiện nghi phòng."""
    import json as _json
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")

    if payload.image_url is not None:
        room.image_url = payload.image_url
    if payload.description is not None:
        room.description = payload.description
    if payload.amenities is not None:
        room.amenitiesjson = _json.dumps(payload.amenities, ensure_ascii=False)

    # Cập nhật RoomType nếu có
    if any([payload.type_name, payload.price_per_night is not None, payload.type_description]):
        room_type = db.query(models.RoomType).filter(models.RoomType.id == room.type_id).first()
        if room_type:
            if payload.type_name:
                room_type.type_name = payload.type_name
            if payload.price_per_night is not None:
                room_type.price_per_night = payload.price_per_night
            if payload.type_description:
                room_type.description = payload.type_description

    db.commit()
    db.refresh(room)

    return {
        "message": f"Đã cập nhật thông tin phòng {room.room_number}.",
        "room_id": room.id,
        "room_number": room.room_number,
        "image_url": room.image_url,
        "description": room.description,
        "amenities": _json.loads(room.amenitiesjson) if room.amenitiesjson else [],
    }

@app.get("/admin/rooms/{room_id}")
def admin_get_room_detail(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_staff)
):
    """Staff xem chi tiết phòng bao gồm ảnh, mô tả, tiện nghi."""
    import json as _json
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng.")
    room_type = db.query(models.RoomType).filter(models.RoomType.id == room.type_id).first()
    return {
        "id": room.id,
        "room_number": room.room_number,
        "type_id": room.type_id,
        "status": room.status,
        "image_url": room.image_url,
        "description": room.description,
        "amenities": _json.loads(room.amenitiesjson) if room.amenitiesjson else [],
        "type_name": room_type.type_name if room_type else None,
        "price_per_night": room_type.price_per_night if room_type else None,
    }

# 2. API Xem danh sách toàn bộ phòng (Không bắt buộc đăng nhập)
@app.get("/rooms", response_model=list[schemas.RoomResponse])
def get_all_rooms(db: Session = Depends(get_db)):
    rooms = db.query(models.Room).all()
    return rooms

@app.get("/rooms/public")
def get_public_rooms(db: Session = Depends(get_db)):
    """Lấy danh sách phòng công khai kèm thông tin loại phòng - không cần đăng nhập."""
    rooms = db.query(models.Room).all()
    result = []
    for room in rooms:
        room_type = db.query(models.RoomType).filter(models.RoomType.id == room.type_id).first()
        result.append({
            "id": room.id,
            "room_number": room.room_number,
            "type_id": room.type_id,
            "status": room.status,
            "type_name": room_type.type_name if room_type else "Không rõ",
            "price_per_night": room_type.price_per_night if room_type else 0,
            "description": room.description if room.description else (room_type.description if room_type else ""),
            "image_url": room.image_url,
            "amenities": __import__('json').loads(room.amenitiesjson) if room.amenitiesjson else [],
        })
    return result

# ==========================================
# API ĐẶT PHÒNG CÔNG KHAI (không cần login)
# ==========================================
@app.post("/public/bookings")
def public_create_booking(
    booking: schemas.PublicBookingCreate,
    db: Session = Depends(get_db),
):
    """Đặt phòng không cần đăng nhập - khách chỉ cần tên, SĐT, email."""
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng này.")

    if str(room.status).strip().lower() != "available":
        raise HTTPException(status_code=400, detail="Phòng này hiện không trống!")

    if booking.check_out_date <= booking.check_in_date:
        raise HTTPException(status_code=400, detail="Ngày trả phòng phải sau ngày nhận phòng.")

    today = date.today()
    max_date = today + timedelta(days=60)
    if booking.check_in_date < today:
        raise HTTPException(status_code=400, detail="Ngày nhận phòng không thể ở quá khứ.")
    if booking.check_in_date > max_date or booking.check_out_date > max_date:
        raise HTTPException(status_code=400, detail="Không thể đặt phòng xa quá 2 tháng.")

    num_nights = (booking.check_out_date - booking.check_in_date).days

    room_type = db.query(models.RoomType).filter(models.RoomType.id == room.type_id).first()
    if not room_type:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin loại phòng.")

    calculated_price = num_nights * room_type.price_per_night

    # Tìm hoặc tạo hồ sơ khách vãng lai (guest customer) không có user_id
    # Dùng CCCD = "GUEST" + phone làm placeholder để tạo customer record
    guest_customer = models.Customer(
        user_id=None,
        full_name=booking.full_name,
        phone=booking.phone,
        encrypted_id_card=f"GUEST:{booking.phone}",
    )
    db.add(guest_customer)
    db.flush()  # lấy ID ngay mà chưa commit

    new_booking = models.Booking(
        customer_id=guest_customer.id,
        room_id=booking.room_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        total_price=calculated_price,
        status="pending",
    )
    db.add(new_booking)
    room.status = "booked"
    db.commit()
    db.refresh(new_booking)

    return {
        "booking_id": new_booking.id,
        "room_number": room.room_number,
        "room_type": room_type.type_name,
        "full_name": booking.full_name,
        "phone": booking.phone,
        "email": booking.email,
        "check_in_date": str(booking.check_in_date),
        "check_out_date": str(booking.check_out_date),
        "num_nights": num_nights,
        "total_price": calculated_price,
        "status": "pending",
        "message": f"Đặt phòng thành công! Mã đặt phòng của bạn là #{new_booking.id}",
    }

# ==========================================
# API ĐẶT PHÒNG (BOOKINGS)
# ==========================================
@app.post("/bookings", response_model=schemas.BookingResponse)
def create_booking(
    booking: schemas.BookingCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy ID phòng này.")
    
    if str(room.status).strip().lower() != "available":
        raise HTTPException(status_code=400, detail="Phòng này hiện không trống!")

    customer = db.query(models.Customer).filter(models.Customer.id == booking.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Không tìm thấy ID khách hàng này.")

    # Kiểm tra tính hợp lệ của ngày (Ngày trả phải sau ngày nhận)
    if booking.check_out_date <= booking.check_in_date:
        raise HTTPException(status_code=400, detail="Ngày trả phòng phải sau ngày nhận phòng.")
    
    today = date.today()
    max_date = today + timedelta(days=60)
    if booking.check_in_date < today:
        raise HTTPException(status_code=400, detail="Ngày nhận phòng không thể ở quá khứ.")
    if booking.check_in_date > max_date or booking.check_out_date > max_date:
        raise HTTPException(status_code=400, detail="Không thể đặt phòng xa quá 2 tháng kể từ thời điểm hiện tại.")
    
    # Tính số đêm khách ở
    num_nights = (booking.check_out_date - booking.check_in_date).days

    # Lấy thông tin loại phòng để biết giá tiền 1 đêm
    room_type = db.query(models.RoomType).filter(models.RoomType.id == room.type_id).first()
    if not room_type:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin loại phòng.")
    
    # Tính tổng tiền
    calculated_price = num_nights * room_type.price_per_night

    # Tạo phiếu Đặt phòng mới với tổng tiền đã tính
    new_booking = models.Booking(
        customer_id=booking.customer_id,
        room_id=booking.room_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        total_price=calculated_price,
        status="pending"
    )
    db.add(new_booking)

    # Đổi trạng thái của phòng thành 'booked'
    room.status = "booked"

    # Lưu toàn bộ thay đổi vào Database
    db.commit()
    db.refresh(new_booking)
    
    return new_booking

@app.post("/app/bookings")
def app_create_booking(
    booking: schemas.AppBookingCreate, # Dùng schema mới không có customer_id
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Tìm hồ sơ Customer dựa vào tài khoản đang đăng nhập
    customer_profile = db.query(models.Customer).filter(models.Customer.user_id == current_user.id).first()
    
    if not customer_profile:
        raise HTTPException(
            status_code=400, 
            detail="Bạn cần cập nhật hồ sơ cá nhân (Số điện thoại, CCCD) trước khi đặt phòng!"
        )

    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy ID phòng này.")

    if str(room.status).strip().lower() != "available":
        raise HTTPException(status_code=400, detail="Phòng này hiện không trống!")

    if booking.check_out_date <= booking.check_in_date:
        raise HTTPException(status_code=400, detail="Ngày trả phòng phải sau ngày nhận phòng.")

    today = date.today()
    max_date = today + timedelta(days=60)
    if booking.check_in_date < today:
        raise HTTPException(status_code=400, detail="Ngày nhận phòng không thể ở quá khứ.")
    if booking.check_in_date > max_date or booking.check_out_date > max_date:
        raise HTTPException(status_code=400, detail="Không thể đặt phòng xa quá 2 tháng kể từ thời điểm hiện tại.")

    num_nights = (booking.check_out_date - booking.check_in_date).days
    if num_nights <= 0:
        raise HTTPException(status_code=400, detail="Số đêm ở phải lớn hơn 0.")

    room_type = db.query(models.RoomType).filter(models.RoomType.id == room.type_id).first()
    if not room_type:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin loại phòng.")

    calculated_price = num_nights * room_type.price_per_night

    new_booking = models.Booking(
        customer_id=customer_profile.id, # <--- HỆ THỐNG TỰ ĐỘNG GẮN CUSTOMER_ID CHUẨN
        room_id=booking.room_id,
        check_in_date=booking.check_in_date,
        check_out_date=booking.check_out_date,
        total_price=calculated_price,
        status="pending"
    )

    room.status = "booked"

    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    return {"message": "Đặt phòng thành công!", "booking": new_booking}

@app.get("/bookings")
def get_all_bookings(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff)):
    bookings = db.query(models.Booking).order_by(models.Booking.id.desc()).all()
    return bookings

@app.get("/bookings/{booking_id}")
def get_booking_detail(booking_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt phòng này.")
    
    customer = db.query(models.Customer).filter(models.Customer.id == booking.customer_id).first()
    
    # Kiểm tra phân quyền: Chỉ staff hoặc chính khách hàng đặt đơn đó được xem
    user_role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    is_staff = user_role and user_role.name.lower() in ["admin", "lễ tân", "moderator"]
    if (not customer or customer.user_id != current_user.id) and not is_staff:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem thông tin đặt phòng này.")
        
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    
    return {
        "id": booking.id,
        "customer_id": booking.customer_id,
        "customer_name": customer.full_name if customer else "Khách vô danh",
        "room_id": booking.room_id,
        "room_number": room.room_number if room else "N/A",
        "check_in_date": booking.check_in_date,
        "check_out_date": booking.check_out_date,
        "total_price": booking.total_price,
        "status": booking.status
    }

@app.put("/bookings/{booking_id}/check-in")
def check_in_booking(booking_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu đặt phòng này.")
        
    if booking.status in ["checked_in", "checked_out", "cancelled", "no_show"]:
        raise HTTPException(status_code=400, detail=f"Không thể nhận phòng. Đơn này đang ở trạng thái: {booking.status}")

    # Đổi trạng thái phiếu đặt thành checked_in
    booking.status = "checked_in" 
    
    # Đảm bảo phòng chắc chắn ở trạng thái booked
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if room:
        room.status = "booked" 

    db.commit()
    return {"message": "Nhận phòng thành công!"}

@app.put("/bookings/{booking_id}/check-out")
def check_out_booking(booking_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiếu đặt phòng này.")
        
    if booking.status != "checked_in":
        raise HTTPException(status_code=400, detail=f"Không thể trả phòng. Trạng thái hiện tại: {booking.status}")
    
    # 1. Đơn hoàn thành
    booking.status = "checked_out" 
    booking.check_out_date = date.today()

    # 2. Phòng sang trạng thái chờ dọn dẹp
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if room:
        room.status = "cleaning" 

    db.commit()
    return {"message": "Trả phòng thành công! Phòng đã được chuyển sang trạng thái dọn dẹp."}

# ========================================================
# CẬP NHẬT CHUẨN: API HỦY ĐƠN ĐẶT PHÒNG TRỰC TIẾP (CANCEL)
# ========================================================
@app.put("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt phòng")
        
    customer = db.query(models.Customer).filter(models.Customer.id == booking.customer_id).first()
    user_role = db.query(models.Role).filter(models.Role.id == current_user.role_id).first()
    is_staff = user_role and user_role.name.lower() in ["admin", "lễ tân", "moderator"]
    if (not customer or customer.user_id != current_user.id) and not is_staff:
        raise HTTPException(status_code=403, detail="Bạn không có quyền hủy đơn đặt phòng này.")

    # Cho phép hủy khi đơn hàng chưa nhận phòng (đang pending hoặc confirmed)
    if booking.status not in ['pending', 'confirmed']:
        raise HTTPException(status_code=400, detail=f"Không thể hủy đơn này vì trạng thái hiện tại là: {booking.status}")

    # 1. Đổi trạng thái đơn sang 'cancelled'
    booking.status = "cancelled"

    # 2. Đổi trạng thái phòng về available tự do đón khách mới
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if room:
        room.status = "available" 

    db.commit()
    return {"message": "Hủy thành công và phòng đã được giải phóng."}

# ========================================================
# CẬP NHẬT CHUẨN: API XỬ LÝ KHÁCH KHÔNG ĐẾN (NO-SHOW)
# ========================================================
@app.put("/bookings/{booking_id}/no-show")
def no_show_booking(booking_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt phòng này.")
        
    if booking.status not in ['pending', 'confirmed']:
        raise HTTPException(status_code=400, detail=f"Chỉ đơn đang chờ check-in mới có thể đánh dấu không đến. Trạng thái hiện tại: {booking.status}")

    # 1. Đổi trạng thái đơn thành no_show
    booking.status = "no_show"

    # 2. Giải phóng phòng
    room = db.query(models.Room).filter(models.Room.id == booking.room_id).first()
    if room:
        room.status = "available"

    db.commit()
    return {"message": "Đã đánh dấu khách không đến. Phòng đã được giải phóng."}

@app.put("/rooms/{room_id}/clean")
def clean_room(room_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_staff)):
    # 1. Tìm phòng trong cơ sở dữ liệu
    room = db.query(models.Room).filter(models.Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Không tìm thấy ID phòng này.")

    # 2. Kiểm tra xem phòng có đúng là đang được dọn dẹp không
    if room.status != "cleaning":
        raise HTTPException(status_code=400, detail="Phòng này không ở trạng thái cần dọn dẹp.")

    # 3. Cập nhật trạng thái về trống (available)
    room.status = "available"
    
    # 4. Lưu vào Database
    db.commit()
    db.refresh(room)
    
    return {"message": "Dọn dẹp hoàn tất! Phòng đã sẵn sàng để đón khách mới.", "room_id": room.id, "status": room.status}

@app.get("/rooms/available")
def get_available_rooms(
    check_in: date,
    check_out: date,
    db: Session = Depends(get_db)
):
    # 1. Kiểm tra ngày hợp lệ
    if check_in >= check_out:
        raise HTTPException(status_code=400, detail="Ngày nhận phòng phải trước ngày trả phòng.")

    today = date.today()
    max_date = today + timedelta(days=60)
    if check_in < today:
        raise HTTPException(status_code=400, detail="Ngày nhận phòng không thể ở quá khứ.")
    if check_in > max_date or check_out > max_date:
        raise HTTPException(status_code=400, detail="Không thể tìm kiếm phòng xa quá 2 tháng kể từ thời điểm hiện tại.")

    # 2. Tìm danh sách ID các phòng bị vướng lịch (có booking chồng chéo thời gian)
    overlapping_bookings = db.query(models.Booking.room_id).filter(
        models.Booking.status.notin_(["cancelled", "checked_out", "no_show"]), # Bỏ qua cả đơn đã hủy, no_show và checked-out
        models.Booking.check_in_date < check_out,
        models.Booking.check_out_date > check_in
    ).subquery()

    # Chỉ lấy phòng KHÔNG vướng lịch VÀ trạng thái thực tế phải là 'available'
    available_rooms = db.query(models.Room).filter(
        models.Room.id.notin_(overlapping_bookings),
        models.Room.status == "available" # Chỉ lấy phòng có thể ở ngay
    ).all()

    return available_rooms

@app.get("/statistics")
def get_statistics(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin) # <--- CHỐT CHẶN ADMIN Ở ĐÂY
):
    total_revenue = db.query(func.sum(models.Booking.total_price)).filter(
        models.Booking.status == "checked_out"
    ).scalar() or 0.0

    total_bookings = db.query(models.Booking).filter(
        models.Booking.status.notin_(["cancelled"])
    ).count()

    return {
        "message": f"Xin chào Quản lý {admin.full_name}", 
        "total_revenue": total_revenue,
        "total_bookings": total_bookings
    }

@app.get("/admin/security-report")
def get_security_report(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    """API phân tích security.log chủ động để phát hiện các mối đe dọa brute-force, spraying, và DDOS."""
    log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "security.log")
    if not os.path.exists(log_file_path):
        return {"alerts": [], "stats": {"total_events": 0}, "message": "Chưa có dữ liệu log bảo mật."}

    alerts = []
    total_events = 0
    failures_by_ip = {}  # ip -> list of timestamps
    failures_by_user = {}  # username -> set of ips
    spraying_by_ip = {}  # ip -> set of distinct usernames tried
    
    now = datetime.now()
    time_window = timedelta(minutes=5)

    with open(log_file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(" | ")
            if len(parts) < 3:
                continue
            
            total_events += 1
            timestamp_str = parts[0]
            event_type = parts[2]
            
            # Chỉ phân tích sự kiện LOGIN_FAILED
            if event_type != "LOGIN_FAILED":
                continue
                
            try:
                log_time = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                continue
                
            # Kiểm tra xem log có trong cửa sổ 5 phút qua không
            if now - log_time > time_window:
                continue
                
            # Trích xuất IP và User
            ip = "unknown"
            user = "anonymous"
            for p in parts[3:]:
                if p.startswith("IP="):
                    ip = p.split("=")[1]
                elif p.startswith("user="):
                    user = p.split("=")[1]
                    
            # Thống kê theo IP
            if ip not in failures_by_ip:
                failures_by_ip[ip] = []
            failures_by_ip[ip].append(log_time)
            
            # Thống kê theo User
            if user not in failures_by_user:
                failures_by_user[user] = set()
            failures_by_user[user].add(ip)
            
            # Thống kê Password Spraying (các user khác nhau từ cùng IP)
            if ip not in spraying_by_ip:
                spraying_by_ip[ip] = set()
            spraying_by_ip[ip].add(user)

    # Phân tích luật để phát hiện tấn công
    # Luật 1: Brute Force (Một IP gõ sai > 10 lần trong 5 phút)
    for ip, times in failures_by_ip.items():
        if len(times) > 10:
            alerts.append({
                "type": "BRUTE_FORCE",
                "severity": "HIGH",
                "source_ip": ip,
                "message": f"Phát hiện dấu hiệu tấn công Brute Force từ IP '{ip}' (Thử thất bại {len(times)} lần trong 5 phút)."
            })

    # Luật 2: Password Spraying (Một IP thử nhiều tài khoản khác nhau > 5)
    for ip, users in spraying_by_ip.items():
        if len(users) > 5:
            alerts.append({
                "type": "PASSWORD_SPRAYING",
                "severity": "HIGH",
                "source_ip": ip,
                "message": f"Phát hiện dấu hiệu tấn công Password Spraying từ IP '{ip}' nhắm vào {len(users)} tài khoản khác nhau: {list(users)}."
            })

    # Luật 3: Tấn công Brute Force Phân tán (Một tài khoản bị thử từ > 3 IP khác nhau)
    for user, ips in failures_by_user.items():
        if len(ips) > 3:
            alerts.append({
                "type": "DISTRIBUTED_BRUTE_FORCE",
                "severity": "CRITICAL",
                "target_user": user,
                "message": f"Phát hiện dấu hiệu tấn công Brute Force Phân tán nhắm vào tài khoản '{user}' từ {len(ips)} IP khác nhau: {list(ips)}."
            })

    return {
        "status": "success",
        "total_analyzed_events": total_events,
        "alerts_count": len(alerts),
        "alerts": alerts,
        "raw_stats": {
            "failures_by_ip": {ip: len(times) for ip, times in failures_by_ip.items()},
            "failures_by_user_ips": {user: list(ips) for user, ips in failures_by_user.items()},
            "spraying_by_ip": {ip: list(users) for ip, users in spraying_by_ip.items()}
        }
    }

@app.get("/my-bookings")
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Tìm hồ sơ Customer ứng với tài khoản đang đăng nhập
    customer_profile = db.query(models.Customer).filter(models.Customer.user_id == current_user.id).first()
    
    if not customer_profile:
        return {"message": f"Chào {current_user.full_name}, bạn chưa cập nhật hồ sơ khách hàng.", "bookings": []}

    # Tìm đơn đặt bằng customer_profile.id
    my_bookings = db.query(models.Booking).filter(
        models.Booking.customer_id == customer_profile.id
    ).all()

    if not my_bookings:
        return {"message": f"Chào {customer_profile.full_name}, bạn chưa có đơn đặt phòng nào.", "bookings": []}

    return {
        "message": f"Chào {customer_profile.full_name}, đây là lịch sử đặt phòng của bạn:",
        "bookings": my_bookings
    }

@app.post("/my-profile", response_model=schemas.CustomerResponse)
def create_my_profile(
    profile: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Bắt buộc đăng nhập
):
    """API để khách hàng tự cập nhật hồ sơ cá nhân (CCCD, SĐT) trên App"""
    
    # 1. Kiểm tra xem khách này đã có hồ sơ chưa để tránh tạo trùng
    existing_customer = db.query(models.Customer).filter(models.Customer.user_id == current_user.id).first()
    if existing_customer:
        raise HTTPException(status_code=400, detail="Bạn đã có hồ sơ cá nhân rồi.")

    # 2. Tạo hồ sơ Customer và liên kết với User.id
    encrypted_id = security.encrypt_data(profile.id_card)
    encrypted_phone = security.encrypt_data(profile.phone)
    phone_hash = security.get_sha256_hash(profile.phone)
    new_customer = models.Customer(
        full_name=profile.full_name or current_user.full_name, # Lấy tên từ Form hoặc từ lúc đăng ký
        phone=encrypted_phone,
        phone_hash=phone_hash,
        encrypted_id_card=encrypted_id,
        user_id=current_user.id # <--- Gắn ID của tài khoản đang đăng nhập vào đây
    )
    
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    
    return schemas.CustomerResponse(
        id=new_customer.id,
        full_name=new_customer.full_name,
        phone=profile.phone,
        user_id=new_customer.user_id
    )

# ==========================================
# THANH TOÁN NỘI BỘ (Native app — không API bên thứ 3)
# ==========================================

# MOCK_VNPAY_SECRET đã được đọc từ env ở trên


@app.get("/payments/test-guide")
def payment_test_guide(db: Session = Depends(get_db)):
    """Hướng dẫn tài khoản test cho thanh toán native."""
    accounts = db.query(models.MockBankAccount).order_by(models.MockBankAccount.id).all()
    return {
        "flow": ["init", "verify-account", "confirm"],
        "otp_valid_minutes": PAYMENT_OTP_MINUTES,
        "accounts": [
            {
                "account_number": a.account_number,
                "account_holder": a.account_holder,
                "balance": a.balance,
            }
            for a in accounts
        ],
        "scenarios": [
            {
                "case": "Thanh toán thành công",
                "account_number": "970419852619143211",
            },
            {
                "case": "Số dư không đủ",
                "account_number": "970419852619143212",
            },
            {
                "case": "Tài khoản không tồn tại",
                "account_number": "111111111111111111",
            },
        ],
    }


@app.post("/payments/init", response_model=schemas.PaymentInitResponse)
@limiter.limit("10/minute")
def payment_init(
    request: Request,
    body: schemas.PaymentInitRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    booking = get_booking_for_current_user(body.booking_id, current_user, db)

    if str(booking.payment_status or "").lower() == "paid":
        raise HTTPException(status_code=400, detail=payment_failure_message("already_paid"))
    if str(booking.status or "").lower() == "cancelled":
        raise HTTPException(status_code=400, detail=payment_failure_message("cancelled_booking"))

    amount = float(booking.total_price or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền thanh toán không hợp lệ.")

    pending = (
        db.query(models.PaymentTransaction)
        .filter(
            models.PaymentTransaction.booking_id == booking.id,
            models.PaymentTransaction.user_id == current_user.id,
            models.PaymentTransaction.status.in_(["pending", "otp_sent"]),
        )
        .all()
    )
    for old in pending:
        old.status = "expired"
        old.failure_reason = "replaced_by_new_session"

    transaction_ref = secrets.token_hex(8).upper()
    payment = models.PaymentTransaction(
        transaction_ref=transaction_ref,
        booking_id=booking.id,
        user_id=current_user.id,
        amount=amount,
        status="pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return schemas.PaymentInitResponse(
        payment_id=payment.id,
        transaction_ref=payment.transaction_ref,
        booking_id=booking.id,
        amount=amount,
        status=payment.status,
        message="Phiên thanh toán đã được tạo. Vui lòng nhập số tài khoản.",
    )


@app.post("/payments/verify-account", response_model=schemas.PaymentVerifyAccountResponse)
@limiter.limit("10/minute")
def payment_verify_account(
    request: Request,
    body: schemas.PaymentVerifyAccountRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    payment = get_payment_for_current_user(body.payment_id, current_user, db)

    if payment.status not in ("pending", "otp_sent"):
        raise_payment_error("expired_session")

    account_no = normalize_account_number(body.account_number)
    if not account_no:
        raise HTTPException(status_code=400, detail="Số tài khoản không hợp lệ.")

    bank_account = (
        db.query(models.MockBankAccount)
        .filter(models.MockBankAccount.account_number == account_no)
        .first()
    )
    if not bank_account:
        raise_payment_error("account_not_found")

    if bank_account.balance < payment.amount:
        raise_payment_error("insufficient_balance")

    otp_code = generate_otp()
    payment.account_number = account_no
    payment.account_holder = bank_account.account_holder
    payment.otp_code = otp_code
    payment.otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=PAYMENT_OTP_MINUTES)
    payment.status = "otp_sent"
    payment.failure_reason = None
    db.commit()

    return schemas.PaymentVerifyAccountResponse(
        payment_id=payment.id,
        account_holder=bank_account.account_holder,
        account_masked=mask_account_number(account_no),
        otp_expires_in_seconds=PAYMENT_OTP_MINUTES * 60,
        status=payment.status,
        message="Mã OTP đã được gửi (mô phỏng SMS). Vui lòng nhập OTP để xác nhận.",
        debug_otp=otp_code,
    )


@app.post("/payments/confirm", response_model=schemas.PaymentConfirmResponse)
@limiter.limit("10/minute")
def payment_confirm(
    request: Request,
    body: schemas.PaymentConfirmRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    payment = get_payment_for_current_user(body.payment_id, current_user, db)

    if payment.status != "otp_sent":
        raise_payment_error("expired_session")

    now = datetime.now(timezone.utc)
    otp_expires = payment.otp_expires_at
    if otp_expires and otp_expires.tzinfo is None:
        otp_expires = otp_expires.replace(tzinfo=timezone.utc)

    if not payment.otp_code or body.otp.strip() != payment.otp_code:
        payment.status = "failed"
        payment.failure_reason = "invalid_otp"
        payment.completed_at = now
        db.commit()
        raise_payment_error("invalid_otp")

    if otp_expires and now > otp_expires:
        payment.status = "failed"
        payment.failure_reason = "invalid_otp"
        payment.completed_at = now
        db.commit()
        raise_payment_error("invalid_otp")

    booking = db.query(models.Booking).filter(models.Booking.id == payment.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn đặt phòng.")

    if str(booking.payment_status or "").lower() == "paid":
        raise HTTPException(status_code=400, detail=payment_failure_message("already_paid"))

    bank_account = (
        db.query(models.MockBankAccount)
        .filter(models.MockBankAccount.account_number == payment.account_number)
        .first()
    )
    if not bank_account:
        payment.status = "failed"
        payment.failure_reason = "account_not_found"
        payment.completed_at = now
        db.commit()
        raise_payment_error("account_not_found")

    payment.status = "processing"
    db.commit()

    if bank_account.balance < payment.amount:
        payment.status = "failed"
        payment.failure_reason = "insufficient_balance"
        payment.completed_at = now
        db.commit()
        raise_payment_error("insufficient_balance")

    bank_account.balance -= payment.amount
    booking.payment_status = "paid"
    # Giữ status=pending (Chờ check-in); chỉ đổi sang checked_in khi lễ tân nhận phòng

    payment.status = "success"
    payment.failure_reason = None
    payment.completed_at = now
    db.commit()

    send_webhook(booking.id, "success")
    log_security_event(EVENT_PAYMENT_SUCCESS, user=current_user.username, details=f"booking_id={booking.id}, amount={payment.amount}")

    return schemas.PaymentConfirmResponse(
        payment_id=payment.id,
        transaction_ref=payment.transaction_ref,
        status="success",
        reason="success",
        message=payment_failure_message("success"),
        booking_id=booking.id,
        payment_status=booking.payment_status,
    )


@app.get("/payments/{payment_id}/status", response_model=schemas.PaymentStatusResponse)
def payment_status(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    payment = get_payment_for_current_user(payment_id, current_user, db)
    account_masked = (
        mask_account_number(payment.account_number) if payment.account_number else None
    )
    return schemas.PaymentStatusResponse(
        payment_id=payment.id,
        transaction_ref=payment.transaction_ref,
        booking_id=payment.booking_id,
        amount=payment.amount,
        status=payment.status,
        failure_reason=payment.failure_reason,
        account_masked=account_masked,
        completed_at=payment.completed_at,
    )

# ==========================================
# API MOCK PAYMENT GATEWAY (WebView)
# ==========================================

@app.get("/mock-bank/checkout", response_class=HTMLResponse)
def mock_bank_checkout(booking_id: int, amount: float):
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Thanh Toán Qua Thẻ ATM (Sandbox)</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {{
                --primary: #2563eb;
                --primary-hover: #1d4ed8;
                --bg: #f8fafc;
                --card-bg: #ffffff;
                --text: #0f172a;
                --text-muted: #64748b;
                --border: #e2e8f0;
            }}
            body {{
                font-family: 'Inter', sans-serif;
                background-color: var(--bg);
                color: var(--text);
                margin: 0;
                padding: 16px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 95vh;
            }}
            .container {{
                width: 100%;
                max-width: 440px;
                background: var(--card-bg);
                border-radius: 16px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                border: 1px solid var(--border);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                padding: 24px;
                color: #ffffff;
                text-align: center;
            }}
            .header h2 {{
                margin: 0;
                font-size: 18px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }}
            .header .sandbox-badge {{
                display: inline-block;
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 2px 10px;
                border-radius: 99px;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                margin-top: 8px;
                letter-spacing: 0.5px;
            }}
            .amount-section {{
                padding: 20px 24px;
                border-bottom: 1px dashed var(--border);
                background-color: #fafafa;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }}
            .amount-label {{
                font-size: 13px;
                font-weight: 500;
                color: var(--text-muted);
            }}
            .amount-value {{
                font-size: 20px;
                color: #dc2626;
                font-weight: 700;
            }}
            .form-body {{
                padding: 24px;
            }}
            .form-group {{
                margin-bottom: 16px;
            }}
            label {{
                display: block;
                margin-bottom: 6px;
                font-size: 12px;
                font-weight: 600;
                color: var(--text);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            input {{
                width: 100%;
                padding: 11px 14px;
                border: 1px solid var(--border);
                border-radius: 8px;
                box-sizing: border-box;
                font-size: 14px;
                font-family: inherit;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
                outline: none;
            }}
            input:focus {{
                border-color: var(--primary);
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
            }}
            .test-help-panel {{
                margin-bottom: 20px;
                background-color: #fffbeb;
                border: 1px solid #fef3c7;
                border-radius: 10px;
                padding: 14px;
            }}
            .test-help-title {{
                font-size: 12px;
                font-weight: 700;
                color: #b45309;
                margin-bottom: 8px;
            }}
            .test-accounts-list {{
                list-style: none;
                margin: 0;
                padding: 0;
                font-size: 12px;
            }}
            .test-account-item {{
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px dashed rgba(217, 119, 6, 0.2);
                cursor: pointer;
            }}
            .test-account-item:last-child {{
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: none;
            }}
            .test-account-item span {{
                font-family: monospace;
                background: #fef3c7;
                padding: 1px 4px;
                border-radius: 4px;
                color: #92400e;
                font-weight: 600;
            }}
            .submit-btn {{
                width: 100%;
                padding: 13px;
                background-color: var(--primary);
                color: #ffffff;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: background-color 0.2s ease;
                margin-top: 8px;
            }}
            .submit-btn:hover {{
                background-color: var(--primary-hover);
            }}
            .footer-info {{
                text-align: center;
                padding: 12px;
                font-size: 11px;
                color: var(--text-muted);
                border-top: 1px solid var(--border);
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>CỔNG THANH TOÁN THẺ NỘI ĐỊA ATM</h2>
                <div class="sandbox-badge">Môi trường thử nghiệm (Sandbox)</div>
            </div>
            
            <div class="amount-section">
                <div>
                    <div style="font-size: 13px; font-weight: 600;">Đơn đặt phòng #{booking_id}</div>
                    <div class="amount-label" style="margin-top: 2px;">Thanh toán an toàn bảo mật</div>
                </div>
                <div class="amount-value">{amount:,.0f} đ</div>
            </div>

            <form action="/mock-bank/process" method="POST" class="form-body">
                <input type="hidden" name="booking_id" value="{booking_id}">
                <input type="hidden" name="amount" value="{amount}">
                
                <div class="test-help-panel">
                    <div class="test-help-title">
                        💡 Thẻ Test có sẵn (Click để tự động điền)
                    </div>
                    <ul class="test-accounts-list">
                        <li class="test-account-item" onclick="autoFill('970419852619143211', 'NGUYEN VAN A')">
                            ✅ <b>Thành công (Số dư: 50.000.000đ):</b><br>
                            Số thẻ: <span>970419852619143211</span> · Tên: <span>NGUYEN VAN A</span>
                        </li>
                        <li class="test-account-item" onclick="autoFill('970419852619143212', 'TRAN VAN B')">
                            ❌ <b>Thiếu tiền (Số dư: 100.000đ):</b><br>
                            Số thẻ: <span>970419852619143212</span> · Tên: <span>TRAN VAN B</span>
                        </li>
                    </ul>
                </div>

                <div class="form-group">
                    <label>Số tài khoản / Số thẻ ATM</label>
                    <input type="text" id="card_number" name="card_number" value="970419852619143211" placeholder="Nhập số tài khoản ngân hàng" required>
                </div>
                
                <div class="form-group">
                    <label>Tên chủ tài khoản (Không dấu)</label>
                    <input type="text" id="card_name" name="card_name" value="NGUYEN VAN A" placeholder="Ví dụ: NGUYEN VAN A" required>
                </div>

                <div class="form-group" style="margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px;">
                    <label>Mã xác thực OTP (Mô phỏng)</label>
                    <input type="text" name="otp" value="{MOCK_BANK_OTP}" placeholder="Nhập mã OTP" required style="font-weight: 600; text-align: center; font-size: 16px; letter-spacing: 4px;">
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px; text-align: center;">
                        Mã OTP gửi qua điện thoại mô phỏng là: <strong style="color: var(--primary);">{MOCK_BANK_OTP}</strong>
                    </div>
                </div>

                <button type="submit" class="submit-btn">Xác nhận thanh toán</button>
            </form>

            <div class="footer-info">
                🔒 Kết nối an toàn 256-bit SSL · © Cổng thanh toán Sandbox
            </div>
        </div>

        <script>
            function autoFill(cardNo, cardName) {{
                document.getElementById('card_number').value = cardNo;
                document.getElementById('card_name').value = cardName;
            }}
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

def send_webhook(booking_id: int, status: str):
    data_string = f"booking_id={booking_id}&status={status}"
    signature = hmac.new(
        MOCK_VNPAY_SECRET.encode(), 
        data_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    try:
        payload = {
            "booking_id": booking_id,
            "status": status,
            "signature": signature
        }
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            "http://127.0.0.1:8000/api/webhooks/payment", 
            data=data, 
            headers={'Content-Type': 'application/json'},
            method="POST"
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print("Webhook Error:", e)

def _payment_result_messages(reason: str) -> tuple[str, str]:
    messages = {
        "success": ("success", "Thanh toán thành công!"),
        "insufficient_balance": ("failed", "Số dư tài khoản không đủ."),
        "account_not_found": ("failed", "Số tài khoản ngân hàng không tồn tại."),
        "invalid_otp": ("failed", "Mã OTP không đúng."),
        "booking_not_found": ("failed", "Không tìm thấy đơn đặt phòng."),
    }
    return messages.get(reason, ("failed", "Thanh toán thất bại."))

@app.post("/mock-bank/process")
@limiter.limit("5/minute")
def process_mock_payment(
    request: Request,
    booking_id: int = Form(...),
    amount: float = Form(...),
    card_number: str = Form(...),
    otp: str = Form(...),
    db: Session = Depends(get_db),
):
    reason = "failed"

    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        reason = "booking_not_found"
    elif otp.strip() != MOCK_BANK_OTP:
        reason = "invalid_otp"
    else:
        account_no = normalize_account_number(card_number)
        bank_account = (
            db.query(models.MockBankAccount)
            .filter(models.MockBankAccount.account_number == account_no)
            .first()
        )
        if not bank_account:
            reason = "account_not_found"
        elif bank_account.balance < amount:
            reason = "insufficient_balance"
        else:
            bank_account.balance -= amount
            booking.payment_status = "paid"
            db.commit()
            reason = "success"
            
            # Send Webhook
            send_webhook(booking.id, "success")

    payment_status, _ = _payment_result_messages(reason)
    return RedirectResponse(
        url=f"/mock-bank/success?status={payment_status}&booking_id={booking_id}&reason={reason}",
        status_code=303,
    )

@app.get("/mock-bank/success")
def mock_bank_success(status: str, booking_id: int, reason: str = "failed"):
    payment_status, msg = _payment_result_messages(reason)
    color = "green" if payment_status == "success" else "red"
    html = f"""
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
        <div style="text-align: center; padding: 20px;">
            <h2 style="color:{color}">{msg}</h2>
            <p>Đang chuyển hướng về ứng dụng...</p>
            <script>
                const message = JSON.stringify({{
                    status: "{payment_status}",
                    booking_id: {booking_id},
                    reason: "{reason}"
                }});
                if (window.ReactNativeWebView) {{
                    window.ReactNativeWebView.postMessage(message);
                }} else {{
                    window.parent.postMessage(message, "*");
                }}
            </script>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

class WebhookPayload(BaseModel):
    booking_id: int
    status: str
    signature: str

@app.post("/api/webhooks/payment")
def payment_webhook(payload: WebhookPayload, db: Session = Depends(get_db)):
    data_string = f"booking_id={payload.booking_id}&status={payload.status}"
    expected_signature = hmac.new(
        MOCK_VNPAY_SECRET.encode(), 
        data_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    if payload.signature != expected_signature:
        raise HTTPException(status_code=400, detail="Invalid Signature")
        
    if payload.status == "success":
        booking = db.query(models.Booking).filter(models.Booking.id == payload.booking_id).first()
        if booking:
            booking.payment_status = "paid"
            db.commit()
            
    return {"status": "ok"}