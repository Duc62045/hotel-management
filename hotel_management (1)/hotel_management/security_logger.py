"""
Module ghi log bảo mật chuyên dụng.
Mỗi event bảo mật quan trọng (login, payment, lockout...) sẽ được ghi
vào file security.log để phục vụ audit và phát hiện tấn công.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone

# -------------------------------------------------------------------
# Đường dẫn file log — nằm cùng thư mục với project
# -------------------------------------------------------------------
LOG_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(LOG_DIR, "security.log")

# -------------------------------------------------------------------
# Cấu hình logger
# -------------------------------------------------------------------
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)

# Xoay vòng file log: mỗi file tối đa 5 MB, giữ lại 5 bản backup
_handler = RotatingFileHandler(
    LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
)
_formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
)
_handler.setFormatter(_formatter)
security_logger.addHandler(_handler)

# Tránh log bị nhân đôi nếu root logger cũng có handler
security_logger.propagate = False


# ===================================================================
# Các loại sự kiện bảo mật
# ===================================================================
EVENT_LOGIN_SUCCESS = "LOGIN_SUCCESS"
EVENT_LOGIN_FAILED = "LOGIN_FAILED"
EVENT_ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
EVENT_REGISTER_SUCCESS = "REGISTER_SUCCESS"
EVENT_PAYMENT_SUCCESS = "PAYMENT_SUCCESS"
EVENT_PAYMENT_FAILED = "PAYMENT_FAILED"
EVENT_PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST"
EVENT_PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS"
EVENT_RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
EVENT_UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"


def log_security_event(
    event_type: str,
    *,
    ip: str = "unknown",
    user: str = "anonymous",
    details: str = "",
) -> None:
    """
    Ghi một sự kiện bảo mật vào file security.log.

    Args:
        event_type: Loại sự kiện (LOGIN_SUCCESS, PAYMENT_FAILED, ...).
        ip: Địa chỉ IP của client.
        user: Tên đăng nhập hoặc ID người dùng.
        details: Mô tả chi tiết thêm.
    """
    message = f"{event_type} | IP={ip} | user={user}"
    if details:
        message += f" | {details}"

    if event_type in (
        EVENT_ACCOUNT_LOCKED,
        EVENT_RATE_LIMIT_EXCEEDED,
        EVENT_UNAUTHORIZED_ACCESS,
    ):
        security_logger.warning(message)
    elif "FAILED" in event_type:
        security_logger.warning(message)
    else:
        security_logger.info(message)
