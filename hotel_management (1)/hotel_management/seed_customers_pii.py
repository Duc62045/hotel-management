import sys
import os

# Đảm bảo import được các module của dự án
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Customer
from security import encrypt_data, get_sha256_hash

def main():
    print("=============================================================")
    print(" ĐANG TẠO BẢN GHI KHÁCH HÀNG MẪU ĐỂ KIỂM TRA MÃ HÓA PII")
    print("=============================================================")
    
    db = SessionLocal()
    
    # Danh sách khách hàng mẫu với dữ liệu nhạy cảm dạng rõ (plaintext)
    mock_customers = [
        {
            "full_name": "Nguyen Bao Mat",
            "phone": "0987654321",
            "id_card": "012345678901"
        },
        {
            "full_name": "Tran An Ninh",
            "phone": "0912345678",
            "id_card": "038300998877"
        },
        {
            "full_name": "Le Quoc Phong",
            "phone": "0909090909",
            "id_card": "024300112233"
        }
    ]
    
    # Xóa các bản ghi cũ của những người này để tránh trùng lặp
    for c_info in mock_customers:
        db.query(Customer).filter(Customer.full_name == c_info["full_name"]).delete()
    db.commit()

    print("[*] Bắt đầu mã hóa và chèn dữ liệu vào MySQL...")
    for c_info in mock_customers:
        # 1. Mã hóa dữ liệu bằng Fernet (AES)
        encrypted_phone = encrypt_data(c_info["phone"])
        encrypted_id_card = encrypt_data(c_info["id_card"])
        
        # 2. Tạo Blind Index tìm kiếm bằng HMAC-SHA256
        phone_hash = get_sha256_hash(c_info["phone"])
        
        # 3. Tạo đối tượng Customer mới
        new_customer = Customer(
            full_name=c_info["full_name"],
            phone=encrypted_phone,
            phone_hash=phone_hash,
            encrypted_id_card=encrypted_id_card
        )
        db.add(new_customer)
        db.commit()
        db.refresh(new_customer)
        
        print(f"\n[+] Đã chèn Khách hàng: {new_customer.full_name} (ID={new_customer.id})")
        print(f"  - SĐT thô:   {c_info['phone']} -> SĐT trong DB (Mã hóa Fernet): {new_customer.phone[:40]}...")
        print(f"  - Blind Index SĐT (HMAC-SHA256): {new_customer.phone_hash}")
        print(f"  - CCCD thô:  {c_info['id_card']} -> CCCD trong DB (Mã hóa Fernet): {new_customer.encrypted_id_card[:40]}...")
        
    db.close()
    print("\n=============================================================")
    print("[+] Hoàn tất! Các bản ghi đã được cập nhật thành công vào bảng 'customers'.")
    print("Bạn có thể truy cập MySQL Workbench hoặc chạy lệnh SELECT để kiểm tra.")
    print("=============================================================")

if __name__ == "__main__":
    main()
