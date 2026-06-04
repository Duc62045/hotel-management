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
# Định nghĩa khóa bí mật Fernet — lấy từ biến môi trường, không hardcode
_fernet_key_str = os.getenv("FERNET_KEY", "rXm_U8H9G4D2v-T5qP_1kL_nB7Z_yW3x_aC5v_E9N_8=")
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