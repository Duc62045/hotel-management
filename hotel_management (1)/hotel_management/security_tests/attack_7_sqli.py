import requests
import subprocess
import sys

BASE_URL = "http://127.0.0.1:8000"

def main():
    print("=============================================================")
    print(" KIỂM THỬ KỊCH BẢN 7: SQL INJECTION BYPASS ATTEMPT")
    print("=============================================================")
    
    print("[*] Đang tự động reset dữ liệu mẫu và mở khóa tài khoản...")
    subprocess.run([sys.executable, "create_accounts.py"], capture_output=True)
    
    sqli_payload = "' OR '1'='1"
    print(f"Chèn payload SQL Injection vào trường username: {sqli_payload}")
    headers = {"X-Forwarded-For": "192.168.7.1"}
    res = requests.post(f"{BASE_URL}/login", data={"username": sqli_payload, "password": "WrongPassword"}, headers=headers)
    print(f"  Response: HTTP Code = {res.status_code}, Response = {res.json()}")

if __name__ == "__main__":
    main()
