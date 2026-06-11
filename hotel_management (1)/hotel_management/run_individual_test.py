import requests
import time
import sys
import subprocess
import os

BASE_URL = "http://127.0.0.1:8000"

def print_separator(title):
    print("\n" + "=" * 60)
    print(f" THỰC THI KIỂM THỬ: {title}")
    print("=" * 60)

def reset_db_state():
    print("[*] Đang khôi phục trạng thái cơ sở dữ liệu (Mở khóa tài khoản)...")
    # Chạy create_accounts.py để reset database
    result = subprocess.run([sys.executable, "create_accounts.py"], capture_output=True, text=True, encoding="utf-8")
    if result.returncode == 0:
        print("[+] Khôi phục DB thành công.")
    else:
        print("[-] Lỗi khi khôi phục DB:", result.stderr)

def run_test(choice):
    if choice == 1:
        print_separator("Kịch bản 1: Brute Force 1 User")
        username = "letan_test"
        print(f"Thực hiện 6 lần đăng nhập sai mật khẩu liên tiếp vào tài khoản '{username}'...")
        for i in range(1, 7):
            res = requests.post(f"{BASE_URL}/login", data={"username": username, "password": f"WrongPass{i}"})
            print(f"  Lần {i}: Status = {res.status_code}, Response = {res.json()}")
            time.sleep(0.1)

    elif choice == 2:
        print_separator("Kịch bản 2: Password Spraying")
        sprayed_users = ["admin_test", "letan_test", "customer_test", "alice_test", "bob_test", "john_doe"]
        common_pass = "Password123@"
        print(f"Thử mật khẩu phổ biến '{common_pass}' trên danh sách người dùng...")
        for user in sprayed_users:
            res = requests.post(f"{BASE_URL}/login", data={"username": user, "password": common_pass})
            print(f"  User '{user}': Status = {res.status_code}, Response = {res.json()}")
            time.sleep(0.1)

    elif choice == 3:
        print_separator("Kịch bản 3: Volume Attack (DoS Rate Limit)")
        print("Bắn liên tiếp 15 request đăng nhập cực nhanh để kích hoạt Rate Limit...")
        for i in range(1, 16):
            res = requests.post(f"{BASE_URL}/login", data={"username": "some_user", "password": "any_password"})
            print(f"  Request {i}: Status Code = {res.status_code}")
            if res.status_code == 429:
                print(f"  [+] BỊ CHẶN: Rate Limit đã được kích hoạt ở request thứ {i}!")
                break
            time.sleep(0.02)

    elif choice == 4:
        print_separator("Kịch bản 4: Bypass Rate Limit via X-Forwarded-For")
        print("Gửi 14 request đăng nhập nhắm vào 'some_user' với header IP giả mạo xoay vòng...")
        for i in range(1, 15):
            headers = {"X-Forwarded-For": f"192.168.1.{i}"}
            res = requests.post(f"{BASE_URL}/login", data={"username": "some_user", "password": "any_password"}, headers=headers)
            print(f"  IP 192.168.1.{i}: Status = {res.status_code}, Response = {res.json()}")
            time.sleep(0.05)

    elif choice == 5:
        print_separator("Kịch bản 5: Low and Slow Brute Force")
        print("Mục tiêu: Dò mật khẩu tài khoản 'letan_test' đang bị khóa bằng cách xoay IP để tránh Rate Limit...")
        # Đầu tiên ta khóa tài khoản letan_test
        print("[*] Thực hiện khóa tài khoản letan_test trước...")
        for i in range(1, 6):
            requests.post(f"{BASE_URL}/login", data={"username": "letan_test", "password": f"WrongPass{i}"})
        
        # Bây giờ dò chậm xoay IP
        print("[*] Bắt đầu tấn công Slow Brute Force xoay IP...")
        for i in range(1, 4):
            headers = {"X-Forwarded-For": f"192.168.5.{i}"}
            res = requests.post(f"{BASE_URL}/login", data={"username": "letan_test", "password": f"SlowPass{i}"}, headers=headers)
            print(f"  Lần {i} (IP 192.168.5.{i}): Status = {res.status_code}, Response = {res.json()}")
            time.sleep(0.5)

    elif choice == 6:
        print_separator("Kịch bản 6: Credential Stuffing")
        print("[*] Khóa tài khoản letan_test trước...")
        for i in range(1, 6):
            requests.post(f"{BASE_URL}/login", data={"username": "letan_test", "password": f"WrongPass{i}"})
            
        credentials_database = [
            ("user1@vju.vn", "Admin123"),
            ("letan_test", "Letan@123"), # Hợp lệ nhưng tài khoản bị khóa
            ("user3@gmail.com", "Password@1"),
            ("user4@yahoo.com", "Summer2026")
        ]
        print("Thử danh sách credential rò rỉ xoay IP...")
        for i, (user, pwd) in enumerate(credentials_database):
            headers = {"X-Forwarded-For": f"192.168.6.{i}"}
            res = requests.post(f"{BASE_URL}/login", data={"username": user, "password": pwd}, headers=headers)
            print(f"  Thử {user}:{pwd} -> Status = {res.status_code}, Response = {res.json()}")

    elif choice == 7:
        print_separator("Kịch bản 7: SQL Injection Bypass Attempt")
        sqli_payload = "' OR '1'='1"
        print(f"Chèn payload SQL Injection vào trường username: {sqli_payload}")
        headers = {"X-Forwarded-For": "192.168.7.1"}
        res = requests.post(f"{BASE_URL}/login", data={"username": sqli_payload, "password": "WrongPassword"}, headers=headers)
        print(f"  Response: Status = {res.status_code}, Response = {res.json()}")

    elif choice == 8:
        print_separator("Kịch bản 8: Log Injection (Poisoning)")
        log_injection_payload = "hacker_user\r\n2026-06-11 15:30:00 | WARNING | LOGIN_SUCCESS | IP=8.8.8.8 | user=admin_test | Fake logged in!"
        print(f"Tiêm nhiễm log sử dụng CRLF: {repr(log_injection_payload)}")
        headers = {"X-Forwarded-For": "192.168.8.1"}
        res = requests.post(f"{BASE_URL}/login", data={"username": log_injection_payload, "password": "WrongPassword"}, headers=headers)
        print(f"  Response: Status = {res.status_code}, Response = {res.json()}")

    elif choice == 9:
        print_separator("Kịch bản 9: Account Lockout DoS")
        target_user = "admin_test"
        print(f"Cố tình khóa tài khoản '{target_user}' bằng cách gửi 5 lần sai mật khẩu qua các IP khác nhau...")
        for i in range(1, 6):
            headers = {"X-Forwarded-For": f"192.168.9.{i}"}
            res = requests.post(f"{BASE_URL}/login", data={"username": target_user, "password": "BadPassword"}, headers=headers)
            print(f"  Lần {i} (IP 192.168.9.{i}): Status = {res.status_code}, Response = {res.json()}")
            time.sleep(0.1)
        
        print("\n[*] Quản trị viên thật đăng nhập bằng mật khẩu đúng từ IP hợp lệ (192.168.9.99)...")
        headers = {"X-Forwarded-For": "192.168.9.99"}
        res = requests.post(f"{BASE_URL}/login", data={"username": target_user, "password": "Admin@123"}, headers=headers)
        print(f"  Kết quả: Status = {res.status_code}, Response = {res.json()}")

    else:
        print("Lựa chọn không hợp lệ (1-9)")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Sử dụng: python run_individual_test.py <1-9>")
        sys.exit(1)
    
    try:
        choice = int(sys.argv[1])
    except ValueError:
        print("Lựa chọn phải là số nguyên từ 1 đến 9.")
        sys.exit(1)

    reset_db_state()
    run_test(choice)
