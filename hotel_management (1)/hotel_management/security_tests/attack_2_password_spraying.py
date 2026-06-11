import requests
import time
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 2: PASSWORD SPRAYING")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    sprayed_users = ["admin_test", "letan_test", "customer_test", "alice_test", "bob_test", "john_doe"]
    common_pass = "Password123@"
    
    print(f"Thử mật khẩu phổ biến '{common_pass}' trên danh sách người dùng...")
    for user in sprayed_users:
        res = requests.post(f"{BASE_URL}/login", data={"username": user, "password": common_pass})
        print(f"  User '{user}': HTTP Code = {res.status_code}, Response = {res.json()}")
        time.sleep(0.1)

if __name__ == "__main__":
    main()
