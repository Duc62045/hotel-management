-- =====================================================
-- CHẠY SCRIPT NÀY TRỰC TIẾP TRONG MYSQL WORKBENCH
-- =====================================================

USE hotel_management;

-- 1. Thêm role Lễ tân (nếu chưa có)
INSERT IGNORE INTO roles (name, description)
VALUES ('Lễ tân', 'Nhân viên lễ tân khách sạn');

-- 2. Xóa tài khoản test cũ (nếu tồn tại)
DELETE FROM users WHERE username IN ('admin_test', 'letan_test', 'customer_test');

-- 3. Tạo tài khoản ADMIN (password: Admin@123)
INSERT INTO users (username, password_hash, email, full_name, role_id)
SELECT 'admin_test',
       '$2b$12$znpv40/wp19iaGu6VA5eOOwgrMDFCi4YGN4VEA2mCH7k8HMD6XHqm',
       'admin_test@hotel.vn',
       'Quan Tri Vien',
       id
FROM roles WHERE name = 'Admin' LIMIT 1;

-- 4. Tạo tài khoản LỄ TÂN (password: Letan@123)
INSERT INTO users (username, password_hash, email, full_name, role_id)
SELECT 'letan_test',
       '$2b$12$tlcbyT39VpV3WfVFAPLXKuGpk0sikCzEvBtCuJ8ygqKHNOHq3L6E2',
       'letan_test@hotel.vn',
       'Nhan Vien Le Tan',
       id
FROM roles WHERE name = 'Lễ tân' LIMIT 1;

-- 5. Tạo tài khoản CUSTOMER (password: Customer@123)
INSERT INTO users (username, password_hash, email, full_name, role_id)
SELECT 'customer_test',
       '$2b$12$5T/F8ZnNWzA2Pb1/qcSMBuQXNcD.Z832o4ERK57cC7mYb5Gs.99KO',
       'customer_test@hotel.vn',
       'Khach Hang Test',
       id
FROM roles WHERE name = 'Customer' LIMIT 1;

-- 6. Kiểm tra kết quả
SELECT u.id, u.username, u.full_name, r.name AS role
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.username IN ('admin_test', 'letan_test', 'customer_test');
