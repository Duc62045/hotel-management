"""
permissions.py — Hệ thống phân quyền dựa trên Permission Code (RBAC granular)
Áp dụng theo chuẩn HMS thực tế (Opera, EzCloud)

Thiết kế:
- Permission Codes: các hằng số định nghĩa từng quyền cụ thể
- ROLE_PERMISSIONS: mapping role → tập permissions
- Helper functions: kiểm tra quyền, Night Audit lock, Discount limit, Audit Trail
"""
from datetime import date, datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import models
import json


# ==========================================
# PERMISSION CODES — Mã quyền chi tiết
# Mỗi permission là một chuỗi duy nhất
# ==========================================
class P:
    """Namespace chứa tất cả Permission Code của hệ thống."""

    # Cấu hình hệ thống
    SYSTEM_CONFIG       = "system_config"       # Cấu hình hệ thống gốc (chỉ Super Admin)

    # Quản lý người dùng
    MANAGE_USERS        = "manage_users"         # Quản lý tài khoản nhân viên
    VIEW_AUDIT_LOG      = "view_audit_log"       # Xem nhật ký hành động

    # Báo cáo tài chính
    VIEW_REVENUE_REPORT = "view_revenue_report"  # Xem báo cáo doanh thu
    EXPORT_REPORT       = "export_report"        # Xuất báo cáo

    # Booking & vận hành
    MANAGE_BOOKING      = "manage_booking"       # Tạo/sửa booking
    CHECKIN_CHECKOUT    = "checkin_checkout"     # Check-in / Check-out
    COLLECT_PAYMENT     = "collect_payment"      # Thu tiền, in hóa đơn
    APPLY_DISCOUNT      = "apply_discount"       # Áp dụng giảm giá (trong hạn mức)
    OVERRIDE_PRICE      = "override_price"       # Sửa giá phòng tùy ý (không hạn mức)
    VOID_BOOKING        = "void_booking"         # Hủy/hoàn tiền booking đã thanh toán

    # Phòng
    UPDATE_ROOM_STATUS  = "update_room_status"   # Cập nhật trạng thái phòng (Clean/Dirty/OOO)

    # Night Audit
    NIGHT_AUDIT         = "night_audit"          # Thực hiện chốt sổ ngày

    # Khách hàng PII
    VIEW_GUEST_PII      = "view_guest_pii"       # Xem thông tin cá nhân khách (CCCD, SĐT)


# ==========================================
# ROLE → PERMISSIONS MAPPING
# Đây là nguồn sự thật duy nhất (Single Source of Truth)
# cho phân quyền — dựa theo chuẩn HMS thực tế
# ==========================================
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "super admin": {
        # Toàn quyền — không có giới hạn
        P.SYSTEM_CONFIG, P.MANAGE_USERS, P.VIEW_AUDIT_LOG,
        P.VIEW_REVENUE_REPORT, P.EXPORT_REPORT,
        P.MANAGE_BOOKING, P.CHECKIN_CHECKOUT, P.COLLECT_PAYMENT,
        P.APPLY_DISCOUNT, P.OVERRIDE_PRICE, P.VOID_BOOKING,
        P.UPDATE_ROOM_STATUS, P.NIGHT_AUDIT, P.VIEW_GUEST_PII,
    },
    "admin": {
        # Hotel Manager — toàn quyền trừ system_config
        P.MANAGE_USERS, P.VIEW_AUDIT_LOG,
        P.VIEW_REVENUE_REPORT, P.EXPORT_REPORT,
        P.MANAGE_BOOKING, P.CHECKIN_CHECKOUT, P.COLLECT_PAYMENT,
        P.APPLY_DISCOUNT, P.OVERRIDE_PRICE, P.VOID_BOOKING,
        P.UPDATE_ROOM_STATUS, P.NIGHT_AUDIT, P.VIEW_GUEST_PII,
    },
    "moderator": {
        # Điều phối viên — quản lý vận hành, duyệt yêu cầu
        # Có thể manage booking và thu tiền, nhưng không void booking tự do
        P.MANAGE_BOOKING, P.CHECKIN_CHECKOUT, P.COLLECT_PAYMENT,
        P.APPLY_DISCOUNT,           # Tối đa 20% — check thêm bằng validate_discount()
        P.UPDATE_ROOM_STATUS,
        P.NIGHT_AUDIT,              # Moderator cũng có thể chốt sổ ca đêm
        P.VIEW_GUEST_PII,
        # Không có: VOID_BOOKING (cần phê duyệt từ Admin), OVERRIDE_PRICE, VIEW_REVENUE_REPORT
    },
    "lễ tân": {
        # Receptionist — xử lý vận hành hằng ngày
        P.MANAGE_BOOKING,           # Tạo/sửa booking
        P.CHECKIN_CHECKOUT,         # Check-in / Check-out
        P.COLLECT_PAYMENT,          # Thu tiền (chỉ trong ca đang mở)
        P.APPLY_DISCOUNT,           # Tối đa 5% — check thêm bằng validate_discount()
        P.UPDATE_ROOM_STATUS,       # Cập nhật trạng thái phòng
        P.VIEW_GUEST_PII,           # Xem thông tin khách (cần để check-in)
        # Không có: VOID_BOOKING, OVERRIDE_PRICE, VIEW_REVENUE_REPORT, NIGHT_AUDIT
    },
    "housekeeping": {
        # Buồng phòng — chỉ cập nhật trạng thái phòng
        # Không được xem thông tin khách, giá phòng, doanh thu
        P.UPDATE_ROOM_STATUS,
    },
    "kế toán": {
        # Kế toán — xem báo cáo tài chính, chốt sổ
        # Không tham gia luồng check-in/out hay đổi phòng của khách
        P.VIEW_REVENUE_REPORT,
        P.EXPORT_REPORT,
        P.NIGHT_AUDIT,
    },
    "customer": {
        # Khách hàng — chỉ xem đặt phòng của mình (kiểm soát ở tầng business logic)
    },
}


# ==========================================
# DISCOUNT THRESHOLDS — Hạn mức giảm giá theo role
# Theo chuẩn HMS: Lễ tân tối đa 5%, Moderator 20%, Admin+ không giới hạn
# Nếu vượt hạn mức → phải gửi yêu cầu duyệt lên Manager
# ==========================================
DISCOUNT_LIMITS: dict[str, float] = {
    "super admin":  1.0,    # 100% — không giới hạn
    "admin":        1.0,    # 100% — không giới hạn
    "moderator":    0.20,   # 20%  — phê duyệt trung cấp
    "lễ tân":       0.05,   # 5%   — chuẩn thực tế HMS
    "housekeeping": 0.0,    # Không được giảm
    "kế toán":      0.0,    # Không được giảm
    "customer":     0.0,    # Không được giảm
}


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_role_name(user: models.User, db: Session) -> str:
    """Lấy tên role của user (lowercase, stripped)."""
    role = db.query(models.Role).filter(models.Role.id == user.role_id).first()
    return role.name.lower().strip() if role else ""


def has_permission(user: models.User, permission_code: str, db: Session) -> bool:
    """Kiểm tra user có permission_code hay không."""
    role_name = get_role_name(user, db)
    allowed = ROLE_PERMISSIONS.get(role_name, set())
    return permission_code in allowed


def require_permission(user: models.User, permission_code: str, db: Session) -> None:
    """
    Raise HTTP 403 nếu user không có permission.
    Dùng trong các API handler:
        require_permission(current_user, P.VOID_BOOKING, db)
    """
    if not has_permission(user, permission_code, db):
        role_name = get_role_name(user, db)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Bạn không có quyền thực hiện hành động này. "
                f"Role '{role_name}' không có permission '{permission_code}'."
            )
        )


def validate_discount(user: models.User, discount_percent: float, db: Session) -> None:
    """
    Kiểm tra % giảm giá có vượt quá hạn mức của role không.
    discount_percent: giá trị từ 0.0 đến 1.0 (ví dụ 0.05 = 5%)

    Theo chuẩn HMS thực tế:
    - Lễ tân: tối đa 5% (ví dụ cho khách VIP hoặc khách phàn nàn)
    - Moderator: tối đa 20%
    - Admin+: không giới hạn (Complimentary)
    - Vượt hạn mức → phải gửi approval request lên Manager

    Raises HTTP 403 nếu vượt hạn mức.
    """
    require_permission(user, P.APPLY_DISCOUNT, db)

    role_name = get_role_name(user, db)
    max_discount = DISCOUNT_LIMITS.get(role_name, 0.0)

    if discount_percent > max_discount + 0.001:  # +0.001 để tránh lỗi float
        max_pct = int(max_discount * 100)
        actual_pct = round(discount_percent * 100, 1)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Vượt hạn mức giảm giá! Role '{role_name}' chỉ được giảm tối đa {max_pct}%, "
                f"nhưng yêu cầu giảm {actual_pct}%. "
                f"Vui lòng tạo yêu cầu duyệt (POST /staff/approval-requests) để Manager phê duyệt."
            )
        )


def check_night_audit_lock(target_date: date, db: Session) -> None:
    """
    Kiểm tra xem ngày target_date đã bị khóa bởi Night Audit chưa.

    Logic nghiệp vụ HMS thực tế:
    - Sau khi ca đêm thực hiện Night Audit (thường 2-3h sáng),
      toàn bộ dữ liệu tài chính của ngày đó sẽ bị khóa (Read-only).
    - Lễ tân không thể sửa bất kỳ thông tin tiền nong nào của ngày cũ
      để tránh gian lận và đảm bảo tính toàn vẹn sổ sách.

    Raises HTTP 423 (Locked) nếu ngày đã bị khóa.
    """
    audit_session = db.query(models.NightAuditSession).filter(
        models.NightAuditSession.audit_date == target_date,
        models.NightAuditSession.status == "closed"
    ).first()

    if audit_session:
        closed_time = ""
        if audit_session.closed_at:
            closed_time = audit_session.closed_at.strftime("%H:%M ngày %d/%m/%Y")
        raise HTTPException(
            status_code=423,  # HTTP 423 Locked
            detail=(
                f"Ngày {target_date.strftime('%d/%m/%Y')} đã được chốt sổ Night Audit lúc {closed_time} "
                f"(Thực hiện bởi: {audit_session.closed_by_username or 'N/A'}). "
                f"Dữ liệu tài chính của ngày đã chốt là Read-only và không thể chỉnh sửa. "
                f"Liên hệ Admin nếu cần điều chỉnh."
            )
        )


def check_shift_open(user: models.User, db: Session) -> models.WorkShift:
    """
    Kiểm tra nhân viên có ca làm việc đang mở không.

    Logic nghiệp vụ HMS thực tế:
    - Lễ tân phải mở ca (shift) trước khi thực hiện các giao dịch tài chính.
    - Khi kết thúc ca, nhân viên đóng ca và chốt số tiền mặt thu được.
    - Tài khoản của họ sẽ bị khóa chức năng thu tiền của ca đó.
    - Điều này giúp kiểm soát trách nhiệm tài chính theo từng ca.

    Returns WorkShift object nếu ca đang mở.
    Raises HTTP 403 nếu không có ca đang mở.
    """
    today = date.today()
    open_shift = db.query(models.WorkShift).filter(
        models.WorkShift.user_id == user.id,
        models.WorkShift.shift_date == today,
        models.WorkShift.status == "open"
    ).first()

    if not open_shift:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Bạn chưa mở ca làm việc cho hôm nay. "
                "Vui lòng thực hiện mở ca (POST /staff/shifts/open) "
                "trước khi tạo booking hoặc thu tiền."
            )
        )
    return open_shift


def log_audit_action(
    db: Session,
    user_id: int,
    username: str,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    old_value: dict = None,
    new_value: dict = None,
    reason: str = None,
    ip_address: str = None,
) -> models.AuditLog:
    """
    Ghi log hành động vào bảng audit_log.

    Đây là tính năng bắt buộc của HMS — mọi thay đổi liên quan đến:
    - Tiền tệ (giá phòng, discount, refund)
    - Booking (hủy, đổi phòng, no-show)
    - Người dùng (đổi role, xóa tài khoản)
    - Night Audit (chốt sổ)
    ...đều phải được ghi lại với đầy đủ: ai làm, khi nào, giá trị cũ/mới.

    Lưu ý: Không commit ở đây — để caller tự commit cùng transaction.
    """
    log_entry = models.AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=json.dumps(old_value, ensure_ascii=False, default=str) if old_value else None,
        new_value=json.dumps(new_value, ensure_ascii=False, default=str) if new_value else None,
        reason=reason,
        ip_address=ip_address,
    )
    db.add(log_entry)
    return log_entry
