import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta, timezone
import bcrypt as _bcrypt

load_dotenv()

# Lấy khóa bí mật từ file .env (Dành riêng cho JWT)
SECRET_KEY = os.getenv("SECRET_KEY")

# ==========================================
# 1. CẤU HÌNH BĂM MẬT KHẨU (Bcrypt)
# ==========================================
def get_password_hash(password: str) -> str:
    """Hàm băm mật khẩu gốc thành chuỗi loằng ngoằng trước khi lưu vào DB"""
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Hàm kiểm tra xem mật khẩu người dùng nhập có khớp với mã băm trong DB không"""
    try:
        return _bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception:
        return False

# ==========================================
# 2. CẤU HÌNH MÃ HÓA DỮ LIỆU NHẠY CẢM (CCCD)
# ==========================================
# Định nghĩa khóa bí mật Fernet — lấy từ biến môi trường, ném lỗi nếu thiếu để tránh hardcode lộ lọt
_fernet_key_str = os.getenv("FERNET_KEY")
if not _fernet_key_str:
    raise ValueError("LỖI BẢO MẬT CỰC KỲ NGHIÊM TRỌNG: Thiếu biến môi trường FERNET_KEY để mã hóa dữ liệu nhạy cảm!")
SECRET_FERNET_KEY = _fernet_key_str.encode() if isinstance(_fernet_key_str, str) else _fernet_key_str
cipher_suite = Fernet(SECRET_FERNET_KEY)

def encrypt_data(data: str) -> str:
    """Mã hóa một chuỗi văn bản (ví dụ: Số CCCD)"""
    try:
        return cipher_suite.encrypt(data.encode()).decode()
    except Exception as e:
        print(f"Lỗi mã hóa: {e}")
        return data

def decrypt_data(encrypted_data: str) -> str:
    """Giải mã chuỗi văn bản về lại dạng gốc để hiển thị"""
    try:
        # Giải mã và chuyển đổi từ bytes về lại string
        return cipher_suite.decrypt(encrypted_data.encode()).decode()
    except Exception as e:
        # Đề phòng trường hợp khóa bị sai hoặc dữ liệu bị hỏng
        print(f"Lỗi giải mã: {e}")
        return "Lỗi giải mã dữ liệu"

# ==========================================
# 3. CẤU HÌNH JWT TOKEN
# ==========================================
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Token sẽ hết hạn sau 30 phút

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Hàm tạo thẻ thông hành JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
        
    to_encode.update({"exp": expire}) # Thêm thời hạn vào payload
    # Mã hóa dữ liệu bằng SECRET_KEY thành một chuỗi token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ==========================================
# 4. HÀM HỖ TRỢ BẢO MẬT PII
# ==========================================
import hmac
import hashlib

BLIND_INDEX_KEY = os.getenv("BLIND_INDEX_KEY")
if not BLIND_INDEX_KEY:
    raise ValueError("LỖI BẢO MẬT CỰC KỲ NGHIÊM TRỌNG: Thiếu biến môi trường BLIND_INDEX_KEY để băm blind index!")

def get_sha256_hash(value: str) -> str:
    """Tạo mã băm một chiều keyed-hash (HMAC-SHA256) phục vụ tìm kiếm dữ liệu đã mã hóa."""
    if not value:
        return ""
    return hmac.new(
        BLIND_INDEX_KEY.encode(),
        value.lower().strip().encode(),
        hashlib.sha256
    ).hexdigest()

def mask_data(value: str, visible_prefix: int = 3, visible_suffix: int = 4) -> str:
    """Làm mờ dữ liệu nhạy cảm (ví dụ: SĐT, CCCD)."""
    if not value:
        return ""
    val_len = len(value)
    if val_len <= visible_prefix + visible_suffix:
        return "*" * val_len
    return value[:visible_prefix] + "*" * (val_len - visible_prefix - visible_suffix) + value[-visible_suffix:]

# Dummy bcrypt hash of 'dummy_password' for timing equalization
DUMMY_HASH = "$2b$12$L.bH8kYn0V8L9D4V7H.bOe6x2KqW5Z0d0e0f0g0h0i0j0k0l0m0n0"

def verify_password_dummy() -> None:
    """Chạy đối sánh mật khẩu giả để cân bằng thời gian xử lý (Timing Equalization)."""
    verify_password("dummy_password", DUMMY_HASH)

def sanitize_log_input(text: str) -> str:
    """Loại bỏ ký tự xuống dòng CRLF và các ký tự điều khiển để chống Log Injection."""
    if not text:
        return ""
    clean_text = text.replace("\r", "").replace("\n", "").strip()
    return clean_text[:100]