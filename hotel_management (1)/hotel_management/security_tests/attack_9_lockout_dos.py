import requests
import time
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 9: ACCOUNT LOCKOUT DOS")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    target_user = "admin_test"
    print(f"Cố tình khóa tài khoản '{target_user}' bằng cách gửi 5 lần sai mật khẩu qua các IP khác nhau...")
    for i in range(1, 6):
        headers = {"X-Forwarded-For": f"192.168.9.{i}"}
        res = requests.post(f"{BASE_URL}/login", data={"username": target_user, "password": "BadPassword"}, headers=headers)
        print(f"  Lần {i} (IP 192.168.9.{i}): HTTP Code = {res.status_code}, Response = {res.json()}")
        time.sleep(0.1)
    
    print("\n[*] Quản trị viên thật đăng nhập bằng mật khẩu đúng từ IP hợp lệ (192.168.9.99)...")
    headers = {"X-Forwarded-For": "192.168.9.99"}
    res = requests.post(f"{BASE_URL}/login", data={"username": target_user, "password": "Admin@123"}, headers=headers)
    print(f"  Kết quả: HTTP Code = {res.status_code}, Response = {res.json()}")

if __name__ == "__main__":
    main()
