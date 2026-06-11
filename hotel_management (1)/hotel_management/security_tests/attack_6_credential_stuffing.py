import requests
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 6: CREDENTIAL STUFFING")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    # Khóa tài khoản letan_test trước
    print("[*] Bước chuẩn bị: Thực hiện khóa tài khoản 'letan_test' bằng 5 lần nhập sai liên tiếp...")
    for i in range(1, 6):
        requests.post(f"{BASE_URL}/login", data={"username": "letan_test", "password": f"WrongPass{i}"})
        
    credentials_database = [
        ("user1@vju.vn", "Admin123"),
        ("letan_test", "Letan@123"), # Mật khẩu đúng nhưng tài khoản đã bị khóa
        ("user3@gmail.com", "Password@1"),
        ("user4@yahoo.com", "Summer2026")
    ]
    
    print("Thử danh sách credential rò rỉ xoay IP...")
    for i, (user, pwd) in enumerate(credentials_database):
        headers = {"X-Forwarded-For": f"192.168.6.{i}"}
        res = requests.post(f"{BASE_URL}/login", data={"username": user, "password": pwd}, headers=headers)
        print(f"  Thử {user}:{pwd} -> HTTP Code = {res.status_code}, Response = {res.json()}")

if __name__ == "__main__":
    main()
