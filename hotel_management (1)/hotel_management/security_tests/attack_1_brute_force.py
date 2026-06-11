import requests
import time
import subprocess
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 1: BRUTE FORCE 1 USER")
    print("=============================================================")
    
    # Reset DB để đảm bảo tài khoản letan_test không bị khóa từ trước
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    username = "letan_test"
    print(f"Thực hiện 6 lần đăng nhập sai liên tiếp vào tài khoản '{username}' từ 1 IP...")
    
    for i in range(1, 7):
        res = requests.post(f"{BASE_URL}/login", data={"username": username, "password": f"WrongPass{i}"})
        print(f"  Lần {i}: HTTP Code = {res.status_code}, Response = {res.json()}")
        time.sleep(0.1)

if __name__ == "__main__":
    main()
