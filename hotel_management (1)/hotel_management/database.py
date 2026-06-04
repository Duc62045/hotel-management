import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv(dotenv_path="setup.env")

# Lấy thông tin từ .env
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Tạo chuỗi kết nối MySQL
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

# Tạo engine kết nối
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Tạo SessionLocal để quản lý các phiên làm việc với DB
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class để sau này các Model (bảng) kế thừa
Base = declarative_base()

# Hàm tạo session để sử dụng trong các API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()