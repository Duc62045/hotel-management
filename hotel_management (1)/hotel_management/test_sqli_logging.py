import os
import sys
import requests

# Cấu hình UTF-8 để hiển thị tiếng Việt trên Terminal Windows
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "security.log")

def print_separator(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_sql_injection_login():
    print_separator("TEST CHỐNG TẤN CÔNG SQL INJECTION QUA LOGIN")
    
    # Các payload SQL Injection phổ biến dùng để bypass đăng nhập hoặc gây crash SQL
    payloads = [
        "admin' OR '1'='1",
        "admin' --",
        "admin' OR 1=1 --",
        "' UNION SELECT NULL, NULL, NULL --",
        "duck' OR 'x'='x"
    ]
    
    # Kiểm tra xem server FastAPI có đang chạy hay không
    try:
        requests.get(f"{BASE_URL}/docs", timeout=3)
    except requests.exceptions.ConnectionError:
        print(f"❌ KHÔNG THỂ KẾT NỐI ĐẾN SERVER FastAPI ({BASE_URL}).")
        print("👉 Vui lòng khởi động server trước bằng lệnh:")
        print("   cd \"d:\\VJU\\Nam3ki2\\ANTT\\cuoi\\hotel_management (1)\\hotel_management\"")
        print("   python -m uvicorn main:app --reload --port 8000")
        return False

    all_passed = True
    for payload in payloads:
        print(f"\n[+] Đang gửi payload thử nghiệm SQL Injection: {payload}")
        try:
            # Gửi request POST tới endpoint /login sử dụng Form Data
            response = requests.post(
                f"{BASE_URL}/login",
                data={"username": payload, "password": "wrongpassword"},
                timeout=5
            )
            
            # Kết quả mong đợi nếu chống SQL Injection thành công:
            # 1. Server không được bị lỗi 500 (SQL Syntax Error / Crash)
            # 2. Server không được cho đăng nhập thành công (200 OK)
            # 3. Server phải trả về 401 Unauthorized hoặc 403 Forbidden hoặc 400 Bad Request
            print(f"    -> Status Code trả về: {response.status_code}")
            print(f"    -> Response JSON: {response.json()}")
            
            if response.status_code == 200:
                print("    ❌ THẤT BẠI: Payload đã bypass được cơ chế đăng nhập !")
                all_passed = False
            elif response.status_code == 500:
                print("    ❌ THẤT BẠI: Server bị lỗi SQL Syntax / Crash !")
                all_passed = False
            elif response.status_code in (401, 403, 400):
                print("    ✅ THÀNH CÔNG: API từ chối đăng nhập an toàn!")
            else:
                print(f"    ⚠️ Cảnh báo: API trả về HTTP status code lạ: {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"    ❌ Lỗi khi gửi request: {e}")
            all_passed = False

    return all_passed

def verify_security_logging():
    print_separator("TEST CƠ CHẾ GHI LOG BẢO MẬT (SECURITY LOGGING)")
    
    if not os.path.exists(LOG_FILE):
        print(f"❌ Không tìm thấy file log tại: {LOG_FILE}")
        print("👉 Hãy thử khởi động server và gửi các request lỗi để tạo file log trước.")
        return
        
    print(f"🔎 Đọc 10 dòng cuối cùng trong file log bảo mật: {LOG_FILE}")
    print("-" * 70)
    
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
        last_lines = lines[-12:] if len(lines) >= 12 else lines
        for line in last_lines:
            print(line.strip())
            
        print("-" * 70)
        
        # Kiểm tra xem các sự kiện LOGIN_FAILED có lưu payload SQL Injection vừa thử không
        print("\n🔎 Kiểm tra việc ghi nhận tấn công trong log:")
        found_sqli_log = False
        for line in reversed(lines):
            if "LOGIN_FAILED" in line and ("OR" in line or "--" in line or "UNION" in line):
                print(f"    ✅ Đã phát hiện log ghi nhận hành vi dò quét SQLi:")
                print(f"       👉 Dòng log: {line.strip()}")
                found_sqli_log = True
                break
                
        if not found_sqli_log:
            print("    ⚠️ Chưa tìm thấy dòng log chứa payload SQL Injection vừa gửi.")
            print("    (Hãy đảm bảo bạn đã chạy phần test SQL Injection phía trên thành công)")
            
    except Exception as e:
        print(f"❌ Lỗi khi đọc file log: {e}")

if __name__ == "__main__":
    success = test_sql_injection_login()
    if success:
        print("\n🎉 KẾT LUẬN: Cơ chế chống SQL Injection hoạt động tốt (SQLAlchemy Parameterized Queries)!")
    verify_security_logging()
