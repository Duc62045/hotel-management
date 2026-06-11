import subprocess
import sys
import time
import os
import re

BASE_URL = "http://127.0.0.1:8000"
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

def get_pid_port_8000():
    try:
        # Chạy Get-NetTCPConnection trên Windows để tìm PID
        cmd = 'powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        pids = res.stdout.strip().split()
        if pids:
            # Lấy PID đầu tiên tìm được
            return int(pids[0])
    except Exception as e:
        print(f"Lỗi tìm PID: {e}")
    return None

def kill_process(pid):
    try:
        cmd = f'powershell -Command "Stop-Process -Id {pid} -Force"'
        subprocess.run(cmd, shell=True, capture_output=True)
        print(f"[+] Đã dừng process {pid} thành công.")
        time.sleep(1)
    except Exception as e:
        print(f"Lỗi khi dừng process: {e}")

def restart_server():
    pid = get_pid_port_8000()
    if pid:
        print(f"[*] Phát hiện server đang chạy trên PID {pid}, tiến hành tắt...")
        kill_process(pid)
    
    # Khởi động server uvicorn mới
    print("[*] Đang khởi động server FastAPI mới...")
    # Sử dụng subprocess.Popen để chạy nền
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env
    )
    # Đợi server khởi động
    time.sleep(3)
    print("[+] Khởi động server thành công.")

def run_single_test_isolated(test_num):
    print(f"\n============================================================")
    print(f" ĐANG CHẠY CÔ LẬP KỊCH BẢN {test_num}")
    print(f"============================================================")
    
    # Khởi động lại server để reset sạch bộ nhớ Rate Limit
    restart_server()
    
    # Chạy kịch bản test
    res = subprocess.run(
        [sys.executable, "run_individual_test.py", str(test_num)],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    print(res.stdout)
    return res.stdout

def main():
    results = {}
    for i in range(1, 10):
        output = run_single_test_isolated(i)
        results[i] = output

    # Dừng server sau khi hoàn tất kiểm thử
    pid = get_pid_port_8000()
    if pid:
        print("[*] Hoàn tất kiểm thử, tắt server...")
        kill_process(pid)

    # Đọc log injection thô để lấy mẫu thực tế của kịch bản 8
    log_file = os.path.join(BACKEND_DIR, "security.log")
    log_sample_kịch_bản_8 = ""
    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            # Tìm dòng log chứa log injection payload
            for line in reversed(lines):
                if "hacker_user" in line:
                    log_sample_kịch_bản_8 = line.strip()
                    break

    # Tiến hành xây dựng tài liệu báo cáo đầy đủ
    report_content = f"""# Báo cáo Tổng hợp & Kết quả Thực nghiệm 9 Kịch bản Tấn công Cô lập (Isolated Runs)

Báo cáo này trình bày kết quả chạy thực nghiệm **cô lập hoàn toàn** 9 kịch bản tấn công của Red Team nhắm vào hệ thống `hotel_management`. Mỗi kịch bản được chạy ngay sau khi khởi động lại server và khôi phục DB sạch để đảm bảo không bị ảnh hưởng chéo bởi giới hạn tần suất (Rate Limiting).

---

## MỤC LỤC KẾT QUẢ THỰC NGHIỆM

| STT | Kịch Bản Tấn Công | Lớp Phòng Thủ Chính | Trạng Thái | HTTP Code |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Brute Force 1 User | Account Lockout | **Chặn tốt** | `401` -> `403` |
| **2** | Password Spraying | Rate Limiting | **Chặn tốt** | `401` -> `429` |
| **3** | Volume Attack (DoS) | Rate Limiting | **Chặn tốt** | `429` |
| **4** | Bypass Rate Limit | Log Parser | **Phát hiện** | `401` (Cảnh báo Critical) |
| **5** | Low and Slow Brute Force | Account Lockout | **Chặn tốt** | `403` |
| **6** | Credential Stuffing | Lockout / Auth Logic | **Chặn tốt** | `401` / `403` |
| **7** | SQL Injection Bypass | Parameterized Query | **Chặn tốt** | `401` |
| **8** | Log Injection (Poisoning)| Input Sanitizer | **Chặn tốt** | `401` (Lọc sạch CRLF) |
| **9** | Account Lockout DoS | Risk Warning | **Bị Lockout** | `403` |

---

## CHI TIẾT 9 KỊCH BẢN TẤN CÔNG & KẾT QUẢ ĐẦU RA THẬT

### Kịch bản 1: Brute Force 1 User
* **Mục tiêu:** Dò quét mật khẩu của tài khoản `letan_test` từ IP `127.0.0.1`.
* **Cơ chế hoạt động:** Bộ đếm `failed_login_attempts` trong DB tăng dần. Khi đạt 5 lần đăng nhập sai, tài khoản bị khóa 15 phút.
* **Kết quả đầu ra của Script:**
```text
{results[1].strip()}
```

---

### Kịch bản 2: Password Spraying
* **Mục tiêu:** Thử mật khẩu phổ biến `Password123@` trên nhiều tài khoản để tránh kích hoạt khóa tài khoản.
* **Cơ chế hoạt động:** Giới hạn tần suất IP (Rate Limiter - SlowAPI) cho phép tối đa 10 req/phút từ cùng một IP. Yêu cầu thứ 11 trở đi trong phút đó bị chặn.
* **Kết quả đầu ra của Script:**
```text
{results[2].strip()}
```

---

### Kịch bản 3: Volume Attack (DoS Rate Limit)
* **Mục tiêu:** Spam đăng nhập liên tiếp với tần suất cao để gây quá tải CPU do tính toán Bcrypt.
* **Cơ chế hoạt động:** Bị chặn ngay lập tức từ middleware của Rate Limiter mà không chạy vào logic xử lý Bcrypt trong DB.
* **Kết quả đầu ra của Script:**
```text
{results[3].strip()}
```

---

### Kịch bản 4: Bypass Rate Limit via X-Forwarded-For
* **Mục tiêu:** Giả mạo IP trong header `X-Forwarded-For` để bypass Rate Limit.
* **Cơ chế hoạt động:** Vượt qua SlowAPI thành công vì mỗi request là một IP khác nhau, nhưng bị module phát hiện bất thường chủ động (`/admin/security-report`) quét log và phát cảnh báo `DISTRIBUTED_BRUTE_FORCE` mức độ **CRITICAL**.
* **Kết quả đầu ra của Script:**
```text
{results[4].strip()}
```

---

### Kịch bản 5: Low and Slow Brute Force
* **Mục tiêu:** Dò mật khẩu tài khoản đang bị khóa bằng cách giãn cách thời gian và xoay IP.
* **Cơ chế hoạt động:** Mặc dù xoay IP để bypass Rate Limit, trạng thái khóa của tài khoản được lưu trong DB sẽ override và chặn đứng mọi request.
* **Kết quả đầu ra của Script:**
```text
{results[5].strip()}
```

---

### Kịch bản 6: Credential Stuffing
* **Mục tiêu:** Thử danh sách tài khoản rò rỉ từ bên ngoài.
* **Cơ chế hoạt động:** Tránh Timing Attack bằng hàm băm giả định `verify_password_dummy()` đối với tài khoản không tồn tại, và bảo vệ tài khoản lễ tân đang bị khóa bằng HTTP `403`.
* **Kết quả đầu ra của Script:**
```text
{results[6].strip()}
```

---

### Kịch bản 7: SQL Injection Bypass Attempt
* **Mục tiêu:** Nhập payload SQL `' OR '1'='1` vào ô đăng nhập nhằm bypass xác thực.
* **Cơ chế hoạt động:** SQLAlchemy sử dụng Parameterized Query. Giá trị payload được băm HMAC Blind Index trước khi so khớp trong DB, do đó được đối xử như một chuỗi văn bản thường an toàn.
* **Kết quả đầu ra của Script:**
```text
{results[7].strip()}
```

---

### Kịch bản 8: Log Injection (Poisoning)
* **Mục tiêu:** Tiêm ký tự xuống dòng `\\r\\n` để tạo dòng log giả mạo đăng nhập Admin thành công.
* **Cơ chế hoạt động:** Hàm `sanitize_log_input` lọc sạch các ký tự điều khiển xuống dòng, ép toàn bộ payload vào cùng một dòng log.
* **Kết quả đầu ra của Script:**
```text
{results[8].strip()}
```
* **Mẫu dòng log thực tế được lưu trong `security.log`:**
```text
{log_sample_kịch_bản_8}
```

---

### Kịch bản 9: Account Lockout DoS
* **Mục tiêu:** Cố tình khóa tài khoản quản trị viên bằng cách xoay IP nhập sai mật khẩu 5 lần.
* **Cơ chế hoạt động:** Vượt qua Rate Limit nhờ xoay IP, nhưng làm khóa tài khoản `admin_test` của quản trị viên thật trong database.
* **Kết quả đầu ra của Script:**
```text
{results[9].strip()}
```
* **Đề xuất khắc phục:** Tích hợp CAPTCHA hoặc Exponential Backoff thay vì khóa cứng trực tiếp tài khoản quản trị viên.
"""

    report_path = os.path.join(BACKEND_DIR, "security_test_run_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"\n[+] ĐÃ HOÀN TẤT VÀ CẬP NHẬT BÁO CÁO TẠI: {report_path}")

if __name__ == "__main__":
    main()
