import requests
import time
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 3: VOLUME ATTACK (DoS Rate Limit)")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    print("Gửi liên tiếp 15 request đăng nhập cực nhanh để kích hoạt Rate Limit...")
    for i in range(1, 16):
        res = requests.post(f"{BASE_URL}/login", data={"username": "some_user", "password": "any_password"})
        print(f"  Request {i}: HTTP Code = {res.status_code}")
        if res.status_code == 429:
            print(f"  [+] BỊ CHẶN: Rate Limit đã kích hoạt thành công ở request thứ {i}!")
            break
        time.sleep(0.02)

if __name__ == "__main__":
    main()
