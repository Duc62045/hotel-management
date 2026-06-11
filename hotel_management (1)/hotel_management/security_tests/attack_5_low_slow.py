import requests
import time
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 5: LOW AND SLOW BRUTE FORCE")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    # Khóa tài khoản letan_test trước
    print("[*] Bước chuẩn bị: Thực hiện khóa tài khoản 'letan_test' bằng 5 lần nhập sai liên tiếp...")
    for i in range(1, 6):
        requests.post(f"{BASE_URL}/login", data={"username": "letan_test", "password": f"WrongPass{i}"})
        
    print("[*] Thực thi: Tiến hành dò chậm xoay IP nhắm vào tài khoản 'letan_test'...")
    for i in range(1, 4):
        headers = {"X-Forwarded-For": f"192.168.5.{i}"}
        res = requests.post(f"{BASE_URL}/login", data={"username": "letan_test", "password": f"SlowPass{i}"}, headers=headers)
        print(f"  Lần {i} (IP 192.168.5.{i}): HTTP Code = {res.status_code}, Response = {res.json()}")
        time.sleep(0.5)

if __name__ == "__main__":
    main()
