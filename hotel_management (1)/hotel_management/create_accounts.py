"""
Script tạo tài khoản mẫu cho tất cả 5 role phân quyền khách sạn:
  - superadmin_test / SuperAdmin@123 (Chủ khách sạn / Super Admin)
  - admin_test      / Admin@123      (Quản lý hệ thống / Admin)
  - moderator_test  / Moderator@123  (Điều phối viên / Moderator)
  - letan_test      / Letan@123      (Nhân viên lễ tân / Lễ tân)
  - customer_test   / Customer@123   (Khách hàng / Customer)
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from models import User, Role
from security import get_password_hash

db = SessionLocal()

# ─────────────────────────────────────────────
# 1. Đảm bảo tất cả 5 role tồn tại
# ─────────────────────────────────────────────
ROLES_TO_ENSURE = [
    {"name": "Super Admin", "description": "Chủ khách sạn — quyền cao nhất"},
    {"name": "Admin",       "description": "Quản lý hệ thống — quản trị toàn bộ"},
    {"name": "Moderator",   "description": "Điều phối viên — quản lý ca, duyệt yêu cầu"},
    {"name": "Lễ tân",      "description": "Nhân viên lễ tân — xử lý booking"},
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
        # Đảm bảo cập nhật mô tả nếu cần
        role.description = r_info["description"]
        db.commit()
        print(f"  [=] Role đã tồn tại: {r_info['name']} (id={role.id})")
    role_map[r_info["name"]] = role.id

# ─────────────────────────────────────────────
# 2. Tạo (hoặc cập nhật) tài khoản mẫu
# ─────────────────────────────────────────────
ACCOUNTS = [
    {
        "username": "superadmin_test",
        "password": "SuperAdmin@123",
        "email":    "superadmin_test@hotel.vn",
        "full_name":"Chủ Khách Sạn",
        "role_name":"Super Admin",
    },
    {
        "username": "admin_test",
        "password": "Admin@123",
        "email":    "admin_test@hotel.vn",
        "full_name":"Quản Trị Viên",
        "role_name":"Admin",
    },
    {
        "username": "moderator_test",
        "password": "Moderator@123",
        "email":    "moderator_test@hotel.vn",
        "full_name":"Điều Phối Viên",
        "role_name":"Moderator",
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
        # Cập nhật password và role, đồng thời mở khóa tài khoản
        existing.password_hash = get_password_hash(acc["password"])
        existing.role_id = role_map[acc["role_name"]]
        existing.locked_until = None
        existing.failed_login_attempts = 0
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

print("\n===========================================================")
print("  THÔNG TIN ĐĂNG NHẬP")
print("===========================================================")
print("  Super Admin: superadmin_test / SuperAdmin@123")
print("  Admin      : admin_test      / Admin@123")
print("  Moderator  : moderator_test  / Moderator@123")
print("  Lễ tân     : letan_test      / Letan@123")
print("  Customer   : customer_test   / Customer@123")
print("===========================================================")
