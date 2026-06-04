"""
Script tạo tài khoản mẫu cho tất cả các role:
  - admin    / Admin@123
  - letan    / Letan@123
  - customer / Customer@123
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import User, Role
from security import get_password_hash

db = SessionLocal()

# ─────────────────────────────────────────────
# 1. Đảm bảo tất cả role tồn tại
# ─────────────────────────────────────────────
ROLES_TO_ENSURE = [
    {"name": "Admin",       "description": "Quản trị viên hệ thống"},
    {"name": "Lễ tân",      "description": "Nhân viên lễ tân"},
    {"name": "Customer",    "description": "Khách hàng đặt phòng"},
]

role_map = {}
for r_info in ROLES_TO_ENSURE:
    role = db.query(Role).filter(Role.name == r_info["name"]).first()
    if not role:
        role = Role(name=r_info["name"], description=r_info["description"])
        db.add(role)
        db.commit()
        db.refresh(role)
        print(f"  [+] Đã tạo role: {r_info['name']}")
    else:
        print(f"  [=] Role đã tồn tại: {r_info['name']} (id={role.id})")
    role_map[r_info["name"]] = role.id

# ─────────────────────────────────────────────
# 2. Tạo (hoặc cập nhật) tài khoản mẫu
# ─────────────────────────────────────────────
ACCOUNTS = [
    {
        "username": "admin_test",
        "password": "Admin@123",
        "email":    "admin_test@hotel.vn",
        "full_name":"Quản Trị Viên",
        "role_name":"Admin",
    },
    {
        "username": "letan_test",
        "password": "Letan@123",
        "email":    "letan_test@hotel.vn",
        "full_name":"Nhân Viên Lễ Tân",
        "role_name":"Lễ tân",
    },
    {
        "username": "customer_test",
        "password": "Customer@123",
        "email":    "customer_test@hotel.vn",
        "full_name":"Khách Hàng Test",
        "role_name":"Customer",
    },
]

print("\n--- Tạo tài khoản ---")
for acc in ACCOUNTS:
    existing = db.query(User).filter(User.username == acc["username"]).first()
    if existing:
        # Cập nhật password và role phòng trường hợp đã tồn tại
        existing.password_hash = get_password_hash(acc["password"])
        existing.role_id = role_map[acc["role_name"]]
        db.commit()
        print(f"  [=] Đã cập nhật: {acc['username']} (role={acc['role_name']})")
    else:
        new_user = User(
            username=acc["username"],
            password_hash=get_password_hash(acc["password"]),
            email=acc["email"],
            full_name=acc["full_name"],
            role_id=role_map[acc["role_name"]],
        )
        db.add(new_user)
        db.commit()
        print(f"  [+] Đã tạo: {acc['username']} (role={acc['role_name']})")

db.close()

print("\n========================================")
print("  THÔNG TIN ĐĂNG NHẬP")
print("========================================")
print("  Admin   : admin_test   / Admin@123")
print("  Lễ tân  : letan_test   / Letan@123")
print("  Customer: customer_test / Customer@123")
print("========================================")
