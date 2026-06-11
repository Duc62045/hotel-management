# Báo cáo Phân tích Chuyên sâu: Thực nghiệm 9 Kịch bản Tấn công & Giải pháp Phòng thủ theo Chiều sâu

Báo cáo này trình bày chi tiết về mặt lý thuyết học thuật lẫn thực nghiệm thực tế đối với 9 kiểu tấn công bảo mật phổ biến nhắm vào cổng xác thực (Authentication API) của hệ thống. Mỗi kịch bản được phân tích toàn diện theo 4 trục nội dung chính: **Cách thức tấn công**, **Hành động mô phỏng**, **Thiệt hại tiềm tàng (Damage)**, **Biện pháp phòng thủ áp dụng**, và **Nhật ký Sự kiện Tấn công & Phòng thủ (Attack & Defense Log Timeline)**.

---

## KỊCH BẢN 1: BRUTE FORCE 1 USER (Tấn công dò quét mật khẩu trực diện)

### 1. Cách thức Tấn công
Tin tặc sử dụng danh sách các mật khẩu phổ biến (Wordlist) và gửi hàng loạt yêu cầu đăng nhập liên tiếp nhắm vào một tài khoản mục tiêu duy nhất (ví dụ: tài khoản quản trị viên hoặc nhân viên). Tần suất gửi yêu cầu cực cao nhờ các công cụ tự động hóa (như Hydra, Burp Suite Intruder).

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_1_brute_force.py`
* **Hành động:** Tự động gửi liên tiếp 6 yêu cầu đăng nhập vào tài khoản `letan_test` với các mật khẩu sai cấu trúc tăng dần (`WrongPass1` đến `WrongPass6`) từ IP `127.0.0.1`.

### 3. Hậu quả & Thiệt hại (Damage)
* **Chiếm quyền điều khiển (Account Takeover):** Nếu người dùng đặt mật khẩu yếu hoặc trung bình, tin tặc chắc chắn sẽ dò trúng mật khẩu, từ đó kiểm soát tài khoản, đánh cắp dữ liệu khách hàng hoặc thực hiện các hành vi gian lận.
* **Cạn kiệt tài nguyên (CPU Exhaustion):** Việc tính toán Bcrypt liên tục cho các mật khẩu sai sẽ đẩy CPU của server lên 100%, gây nghẽn hệ thống.

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Cơ chế Khóa tài khoản (Account Lockout):** Thiết lập ngưỡng đăng nhập sai tối đa `MAX_LOGIN_ATTEMPTS = 5`. Mỗi khi đăng nhập sai, hệ thống ghi nhận và tăng bộ đếm lỗi trong DB. Khi đạt ngưỡng, tài khoản bị khóa trong 15 phút (`lockout_until`).
* **Mã nguồn xử lý:**
  ```python
  # Trong main.py
  user.failed_login_attempts += 1
  if user.failed_login_attempts >= 5:
      user.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=15)
  ```

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Dưới đây là tiến trình ghi nhận log thể hiện rõ hành vi tấn công và phản hồi chặn của hệ thống:

1. **[Giai đoạn 1: Tấn công tích lũy]** Tin tặc gửi 4 mật khẩu sai liên tiếp, hệ thống ghi nhận sự kiện thất bại thông thường:
   ```text
   2026-06-11 18:30:52 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=letan_test
   2026-06-11 18:30:53 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=letan_test
   2026-06-11 18:30:53 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=letan_test
   2026-06-11 18:30:54 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=letan_test
   ```
2. **[Giai đoạn 2: Phòng thủ kích hoạt]** Ở lần thử thứ 5, bộ đếm lỗi chạm ngưỡng 5. Hệ thống ghi nhận sự kiện khóa tài khoản `ACCOUNT_LOCKED`:
   ```text
   2026-06-11 18:30:54 | WARNING | ACCOUNT_LOCKED | IP=127.0.0.1 | user=letan_test | Khóa 15 phút sau 5 lần sai.
   ```
3. **[Giai đoạn 3: Duy trì trạng thái chặn]** Ở lần thử thứ 6, request không được xác thực mật khẩu mà bị chặn ngay từ logic đầu vào, ghi nhận sự kiện từ chối truy cập:
   ```text
   2026-06-11 18:30:54 | WARNING | ACCOUNT_LOCKED | IP=127.0.0.1 | user=letan_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   ```

---

## KỊCH BẢN 2: PASSWORD SPRAYING (Tấn công rải mật khẩu diện rộng)

### 1. Cách thức Tấn công
Để tránh cơ chế khóa tài khoản (Account Lockout) nhắm vào một user duy nhất, tin tặc đảo ngược quy trình: Sử dụng duy nhất **một mật khẩu phổ biến** (ví dụ: `Password123@`, `Welcome123`) và thử đăng nhập lần lượt trên **nhiều tài khoản khác nhau** (quét diện rộng).

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_2_password_spraying.py`
* **Hành động:** Gửi yêu cầu đăng nhập sử dụng mật khẩu cố định `Password123@` quét qua danh sách người dùng mẫu: `admin_test`, `letan_test`, `customer_test`, `alice_test`, `bob_test`, `john_doe`.

### 3. Hậu quả & Thiệt hại (Damage)
* **Vượt qua cơ chế Lockout:** Các tài khoản đơn lẻ chỉ bị ghi nhận sai mật khẩu 1 lần, không đủ để kích hoạt khóa tài khoản, giúp tin tặc tiếp tục dò quét âm thầm mà không bị phát hiện bởi cơ chế kiểm tra DB thông thường.
* **Tỉ lệ thành công cao:** Trong các tổ chức lớn, chỉ cần một vài nhân viên lười biếng đặt mật khẩu yếu là tin tặc có thể xâm nhập thành công vào mạng nội bộ.

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Giới hạn tần suất IP (IP-based Rate Limiting):** Sử dụng thư viện SlowAPI cấu hình chặn IP của kẻ tấn công nếu gửi quá nhiều yêu cầu xác thực trong thời gian ngắn (ngưỡng an toàn: tối đa 10 login/phút).
* **Mã nguồn xử lý:**
  ```python
  # Trong main.py
  @app.post("/login")
  @limiter.limit("10/minute")
  async def login(request: Request, ...):
  ```

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Dưới đây là tiến trình ghi nhận log và cách Rate Limiter can thiệp chặn đứng tấn công:

1. **[Giai đoạn 1: Quét tài khoản chưa bị khóa]** Request 1 thử tài khoản `admin_test` thất bại:
   ```text
   2026-06-11 18:30:54 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=admin_test
   ```
2. **[Giai đoạn 2: Quét trúng tài khoản đang bị khóa]** Request 2 thử tài khoản `letan_test` (đã bị khóa từ kịch bản trước), hệ thống phản hồi khóa:
   ```text
   2026-06-11 18:30:55 | WARNING | ACCOUNT_LOCKED | IP=127.0.0.1 | user=letan_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   ```
3. **[Giai đoạn 3: Tiếp tục quét tài khoản sạch]** Request 3 và 4 thử `customer_test` và `alice_test` thất bại:
   ```text
   2026-06-11 18:30:55 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=customer_test
   2026-06-11 18:30:55 | WARNING | LOGIN_FAILED | IP=127.0.0.1 | user=alice_test
   ```
4. **[Giai đoạn 4: Kích hoạt Rate Limit]** Khi gửi request thứ 5 và 6 (cho `bob_test` và `john_doe`), bộ đếm SlowAPI của IP `127.0.0.1` vượt quá 10 request/phút. Cổng xác thực từ chối phục vụ ngay lập tức. **Không có bất kỳ dòng log nào được ghi vào file log**, ngăn chặn hoàn toàn việc tin tặc tiếp tục spam log kiểm toán.

---

## KỊCH BẢN 3: VOLUME ATTACK (Tấn công từ chối dịch vụ tài nguyên)

### 1. Cách thức Tấn công
Tin tặc bắn hàng loạt yêu cầu đăng nhập liên tiếp với tần suất rất cao (Brute Force mù quáng). Mục đích chính là thực hiện cuộc tấn công Từ chối dịch vụ (DoS) ở tầng ứng dụng bằng cách bắt CPU máy chủ liên tục thực hiện thuật toán băm mật khẩu Bcrypt nặng nề, làm cạn kiệt tài nguyên xử lý.

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_3_volume_dos.py`
* **Hành động:** Gửi liên tiếp 15 request đăng nhập cực nhanh (khoảng trễ cực nhỏ `0.02` giây) từ một IP duy nhất nhắm vào endpoint xác thực.

### 3. Hậu quả & Thiệt hại (Damage)
* **Từ chối dịch vụ (Application DoS):** CPU của máy chủ web bị quá tải 100%, dẫn đến treo hệ thống. Người dùng hợp lệ hoàn toàn không thể tải trang web, đăng nhập hay đặt phòng khách sạn.

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Chặn luồng xử lý đắt đỏ (Rate Limit Middleware):** Khi IP vi phạm hạn mức tần suất (10 req/phút), bộ lọc SlowAPI sẽ chặn ngay yêu cầu tại tầng định tuyến mạng của ứng dụng. Yêu cầu bị loại bỏ trước khi hệ thống phải tốn chi phí kết nối Database hay thực thi hàm băm Bcrypt giả định.

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
* **Không ghi nhận dòng log nào.**
* **Giải thích tiến trình:** Khi cuộc tấn công Volume bắt đầu, request 1 đến 10 tiêu thụ hết hạn ngạch. Từ request thứ 11, SlowAPI chặn đứng tại tầng giao vận HTTP, trả về mã trạng thái `429 Too Many Requests` trong vòng dưới `1ms`. Do không đi qua logic của ứng dụng backend, hệ thống hoàn toàn không ghi nhận thêm log, bảo vệ ổ cứng và cơ sở dữ liệu khỏi việc bị quá tải dữ liệu log rác.

---

## KỊCH BẢN 4: BYPASS RATE LIMIT VIA X-FORWARDED-FOR (Giả mạo IP để vượt bộ lọc)

### 1. Cách thức Tấn công
Khi tin tặc phát hiện hệ thống sử dụng cơ chế Rate Limiting dựa trên địa chỉ IP của client, chúng sẽ gửi kèm Header HTTP `X-Forwarded-For` chứa địa chỉ IP giả mạo. Bằng cách thay đổi giá trị IP này liên tục cho mỗi request gửi đi, tin tặc đánh lừa ứng dụng rằng các yêu cầu đăng nhập đến từ các máy tính khác nhau trên internet.

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_4_bypass_rate_limit.py`
* **Hành động:** Gửi 14 request đăng nhập nhắm vào tài khoản `some_user`, mỗi request giả mạo một IP nguồn khác nhau (`192.168.1.1` đến `192.168.1.14`) thông qua header.

### 3. Hậu quả & Thiệt hại (Damage)
* **Vô hiệu hóa Rate Limiter:** Kẻ tấn công có thể tiếp tục brute force hàng triệu lần mà không sợ bị chặn IP, đưa hệ thống trở lại trạng thái nguy hiểm của Kịch bản 1 (quá tải CPU, nguy cơ rò rỉ mật khẩu).

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Phân tích log chủ động (Active Anomaly Detection):** Xây dựng module phân tích bất thường chủ động `/admin/security-report` quét log định kỳ (cửa sổ trượt 5 phút). Nếu phát hiện cùng một tài khoản (`target_user`) bị tấn công đăng nhập sai liên tiếp từ nhiều IP khác nhau (vượt ngưỡng 3 IP), hệ thống sẽ ngay lập tức phát ra cảnh báo đỏ **DISTRIBUTED_BRUTE_FORCE** mức **CRITICAL**.

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Tiến trình ghi log phản ánh rõ hành vi giả mạo và phản hồi phân tích bất thường:

1. **[Giai đoạn 1: Bypass Rate Limit thành công]** Tin tặc thay đổi IP liên tục trong header. Hệ thống bị đánh lừa và ghi nhận các sự kiện đăng nhập sai từ các địa chỉ IP khác nhau:
   ```text
   2026-06-11 18:30:56 | WARNING | LOGIN_FAILED | IP=192.168.1.1 | user=some_user
   2026-06-11 18:30:56 | WARNING | LOGIN_FAILED | IP=192.168.1.2 | user=some_user
   ...
   2026-06-11 18:31:00 | WARNING | LOGIN_FAILED | IP=192.168.1.14 | user=some_user
   ```
2. **[Giai đoạn 2: Phát hiện bất thường]** Module Log Analyzer quét tệp log, gom nhóm theo trường `user` và thống kê các IP duy nhất đã gửi yêu cầu. Nhận thấy `some_user` có tới 14 IP khác nhau thử đăng nhập sai, hệ thống kích hoạt cảnh báo đỏ gửi đến Admin:
   ```json
   {
     "type": "DISTRIBUTED_BRUTE_FORCE",
     "severity": "CRITICAL",
     "target_user": "some_user",
     "message": "Phát hiện dấu hiệu tấn công Brute Force Phân tán nhắm vào tài khoản 'some_user' từ 14 IP khác nhau..."
   }
   ```

---

## KỊCH BẢN 5: LOW AND SLOW BRUTE FORCE (Tấn công brute force chậm, xoay IP)

### 1. Cách thức Tấn công
Kiểu tấn công tinh vi kết hợp: gửi yêu cầu dò mật khẩu rất chậm (độ trễ cao giữa các lần thử để tránh các cảm biến tần suất thời gian thực) đồng thời kết hợp xoay vòng IP để bypass Rate Limiting. Tin tặc nhắm vào các tài khoản quan trọng đã bị khóa nhằm chiếm đoạt chúng ngay khi hệ thống vừa mở khóa.

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_5_low_slow.py`
* **Hành động:** Khóa tài khoản `letan_test` trước (5 lần sai). Sau đó, thực hiện gửi chậm các request đăng nhập sai cách nhau 0.5s từ các IP xoay vòng (`192.168.5.1` -> `3`).

### 3. Hậu quả & Thiệt hại (Damage)
* **Khóa vĩnh viễn tài khoản (Denial of Account Access):** Do kẻ tấn công liên tục gửi yêu cầu sai mặc dù giãn cách, tài khoản của nạn nhân sẽ liên tục bị gia hạn thời gian khóa (Lockout reset), khiến người dùng thật mãi mãi không thể đăng nhập lại vào hệ thống.

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Khóa trạng thái mức Database (Persistent Database-level Lockout):** Cờ khóa tài khoản `lockout_until` được lưu trực tiếp trong DB. Khi có yêu cầu đăng nhập, backend kiểm tra DB trước. Nếu tài khoản đang bị khóa, hệ thống lập tức từ chối và trả về HTTP `403` mà không cần xác thực Bcrypt hay quan tâm yêu cầu đến từ IP nào.

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Tiến trình ghi log thể hiện sự bất lực của việc đổi IP hay giãn cách thời gian khi tài khoản đã bị khóa cứng từ DB:

1. **[Giai đoạn 1: Chuẩn bị khóa tài khoản]** Tài khoản `letan_test` bị khóa sau 5 lần nhập sai.
2. **[Giai đoạn 2: Tấn công Low & Slow xoay IP]** Kẻ tấn công gửi yêu cầu từ IP `192.168.5.1`. Hệ thống đọc trạng thái khóa trong DB và lập tức từ chối xác thực:
   ```text
   2026-06-11 18:31:00 | WARNING | ACCOUNT_LOCKED | IP=192.168.5.1 | user=letan_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   ```
3. **[Giai đoạn 3: Đổi IP tấn công]** Kẻ tấn công đổi sang IP `192.168.5.2` và `192.168.5.3`. Trạng thái khóa DB vẫn giữ nguyên và chặn đứng mọi request:
   ```text
   2026-06-11 18:31:01 | WARNING | ACCOUNT_LOCKED | IP=192.168.5.2 | user=letan_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   2026-06-11 18:31:01 | WARNING | ACCOUNT_LOCKED | IP=192.168.5.3 | user=letan_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   ```

---

## KỊCH BẢN 6: CREDENTIAL STUFFING (Thử tài khoản rò rỉ dữ liệu)

### 1. Cách thức Tấn công
Tin tặc sử dụng danh sách hàng triệu tài khoản và mật khẩu đã bị lộ trên mạng từ các đợt hack trước đó (ví dụ từ Yahoo, LinkedIn) để thử đăng nhập tự động hàng loạt vào hệ thống của bạn. Tấn công dựa trên thói quen xấu của người dùng là đặt một mật khẩu duy nhất cho nhiều dịch vụ khác nhau.

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_6_credential_stuffing.py`
* **Hành động:** Thử đăng nhập danh sách thông tin leak gồm: `user1@vju.vn:Admin123`, `letan_test:Letan@123` (cặp này chứa mật khẩu chính xác!), và các tài khoản khác sử dụng IP giả lập xoay vòng.

### 3. Hậu quả & Thiệt hại (Damage)
* **Xâm nhập diện rộng (Mass Account Compromise):** Hàng loạt tài khoản khách hàng, nhân viên có thể bị chiếm đoạt cùng lúc mà tin tặc không cần tốn công sức dò quét mật khẩu từ đầu, dẫn tới lộ lọt thông tin khách hàng (PII) quy mô lớn.

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Cân bằng thời gian phản hồi (Timing Attack Protection):** Đối với tài khoản không tồn tại, backend bắt buộc phải chạy qua một tiến trình bcrypt giả lập `verify_password_dummy()` để thời gian phản hồi của request luôn xấp xỉ ~100ms (bằng thời gian xác thực tài khoản thật), ngăn chặn tin tặc dò quét xem email nào có thật trong hệ thống.
* **Mở khóa an toàn:** Ngăn chặn đăng nhập kể cả khi gửi đúng mật khẩu hợp lệ (`Letan@123`) nếu tài khoản đó đang nằm trong trạng thái bị khóa (`ACCOUNT_LOCKED`).

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Tiến trình nhật ký ghi nhận nỗ lực nhồi thông tin rò rỉ:

1. **[Giai đoạn 1: Thử tài khoản rác không tồn tại]** Thử `user1@vju.vn` thất bại, hệ thống chạy Bcrypt giả lập và ghi log:
   ```text
   2026-06-11 18:31:02 | WARNING | LOGIN_FAILED | IP=192.168.6.0 | user=user1@vju.vn
   ```
2. **[Giai đoạn 2: Thử tài khoản thật đúng mật khẩu nhưng bị khóa]** Thử `letan_test` bằng mật khẩu đúng `Letan@123`. Hệ thống nhận dạng tài khoản đang bị khóa, từ chối cấp JWT token và trả về `403`:
   ```text
   2026-06-11 18:31:02 | WARNING | ACCOUNT_LOCKED | IP=192.168.6.1 | user=letan_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   ```
3. **[Giai đoạn 3: Tiếp tục thử các tài khoản rò rỉ khác]** Hệ thống ghi nhận thất bại thông thường cho các tài khoản không hợp lệ khác:
   ```text
   2026-06-11 18:31:02 | WARNING | LOGIN_FAILED | IP=192.168.6.2 | user=user3@gmail.com
   2026-06-11 18:31:03 | WARNING | LOGIN_FAILED | IP=192.168.6.3 | user=user4@yahoo.com
   ```

---

## KỊCH BẢN 7: SQL INJECTION BYPASS ATTEMPT (Tấn công tiêm mã SQL vượt xác thực)

### 1. Cách thức Tấn công
Tin tặc chèn các đoạn mã SQL đặc biệt (như `' OR '1'='1`) vào trường nhập tên đăng nhập (Username). Nếu mã nguồn backend nối chuỗi thô để tạo câu lệnh SQL truy vấn, câu lệnh sẽ bị thay đổi cú pháp logic và luôn trả về kết quả đúng, cho phép đăng nhập thành công vào tài khoản đầu tiên trong bảng dữ liệu (thường là tài khoản admin) mà không cần mật khẩu.

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_7_sqli.py`
* **Hành động:** Nhập vào trường username chuỗi payload kinh điển: `' OR '1'='1` với mật khẩu bất kỳ.

### 3. Hậu quả & Thiệt hại (Damage)
* **Bypass toàn bộ xác thực (Auth Bypass):** Tin tặc có thể đăng nhập trực tiếp với quyền Quản trị cao nhất của hệ thống mà không cần biết mật khẩu gốc, từ đó kiểm soát toàn bộ cơ sở dữ liệu (xóa bảng, lấy cắp dữ liệu, chèn tài khoản admin mới).

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Truy vấn tham số hóa (Parameterized Query) qua SQLAlchemy ORM:** SQLAlchemy không nối chuỗi thô mà gửi câu lệnh SQL tĩnh riêng, truyền dữ liệu người dùng dưới dạng tham số truyền vào (Placeholders).
* **HMAC Blind Index:** Trường username được băm một chiều kèm khóa bí mật `BLIND_INDEX_KEY` trước khi tìm kiếm trong DB. Đoạn mã SQL tiêm nhiễm biến thành chuỗi băm HMAC-SHA256 vô hại.

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Tiến trình xác thực và lưu vết dòng độc hại:

1. **[Giai đoạn 1: Nhận payload SQLi]** Kẻ tấn công gửi payload `' OR '1'='1`.
2. **[Giai đoạn 2: Vô hiệu hóa mã độc]** Hàm `get_sha256_hash` băm giá trị này thành chuỗi hex vô hại. Hệ thống tìm kiếm bản ghi khớp với chuỗi băm này và không tìm thấy.
3. **[Giai đoạn 3: Ghi vết]** Hệ thống ghi nhận một lần đăng nhập thất bại của người dùng có tên thô là `' OR '1'='1` từ IP tấn công, giúp quản trị viên dễ dàng lọc tìm chuỗi SQL Injection để điều tra:
   ```text
   2026-06-11 18:31:03 | WARNING | LOGIN_FAILED | IP=192.168.7.1 | user=' OR '1'='1
   ```

---

## KỊCH BẢN 8: LOG INJECTION / LOG POISONING (Đầu độc nhật ký kiểm toán)

### 1. Cách thức Tấn công
Kẻ tấn công chèn các ký tự ngắt dòng (CRLF: `%0D%0A` hoặc `\r\n`) vào các trường đầu vào được ghi log (như ô username). Khi hệ thống ghi log sự kiện thất bại của username này, ký tự xuống dòng sẽ ngắt dòng log cũ và chèn thêm một hoặc nhiều dòng log giả mạo với cấu trúc y hệt log hệ thống (ví dụ: tạo log giả báo đăng nhập admin thành công).

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_8_log_injection.py`
* **Hành động:** Nhập username chứa ký tự CRLF kèm dòng log giả mạo:
  `hacker_user\r\n2026-06-11 15:30:00 | WARNING | LOGIN_SUCCESS | IP=8.8.8.8 | user=admin_test | Fake logged in!`

### 3. Hậu quả & Thiệt hại (Damage)
* **Phá hủy tính toàn vẹn của Log (Log Spoofing):** Làm sai lệch nhật ký hệ thống. Điều này khiến các quản trị viên hoặc nhân viên điều tra số (Forensic Analysts) đưa ra nhận định sai khi có sự cố xảy ra, che giấu các dấu vết xâm nhập thực tế của kẻ tấn công.

### 4. Biện pháp Phòng thủ & Giải pháp đã triển khai
* **Bộ lọc làm sạch đầu vào (Log Sanitization):** Xây dựng hàm `sanitize_log_input()` để tìm và thay thế tất cả ký tự `\r`, `\n` thành chuỗi rỗng và cắt ngắn độ dài chuỗi ở mức 100 ký tự trước khi đẩy vào logger.

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Tiến trình ghi log thể hiện sự hoạt động của bộ lọc đầu vào:

1. **[Giai đoạn 1: Tiếp nhận dữ liệu CRLF]** Username chứa ký tự ngắt dòng được gửi tới.
2. **[Giai đoạn 2: Lọc bỏ ký tự điều khiển]** Hàm `sanitize_log_input` quét chuỗi, thay thế `\r` và `\n` thành chuỗi rỗng `""` và giới hạn độ dài ở mức 100 ký tự.
3. **[Giai đoạn 3: Ghi log an toàn]** Logger nhận chuỗi đã làm sạch và ghi vào file log trên một dòng duy nhất. Kịch bản tạo dòng log thành công giả bị vô hiệu hóa hoàn toàn:
   ```text
   2026-06-11 18:31:03 | WARNING | LOGIN_FAILED | IP=192.168.8.1 | user=hacker_user2026-06-11 15:30:00 | WARNING | LOGIN_SUCCESS | IP=8.8.8.8 | user=admin_test | Fake logge
   ```

---

## KỊCH BẢN 9: ACCOUNT LOCKOUT DOS (Tấn công từ chối dịch vụ tài khoản)

### 1. Cách thức Tấn công
Tin tặc lợi dụng chính cơ chế bảo mật khóa tài khoản (Account Lockout) để phá hoại hệ thống. Kẻ tấn công cố tình gửi 5 yêu cầu đăng nhập sai liên tiếp nhắm vào tài khoản của nạn nhân (ví dụ tài khoản quản trị viên `admin_test`). Bằng cách xoay IP để tránh bị Rate Limit IP của chính mình, tin tặc dễ dàng khóa tài khoản của người khác.

### 2. Mô phỏng Thực nghiệm
* **Tệp tin thực thi:** `attack_9_lockout_dos.py`
* **Hành động:** Gửi 5 lần đăng nhập sai vào tài khoản `admin_test` thông qua 5 IP giả lập khác nhau (`192.168.9.1` -> `5`) để ép khóa tài khoản. Sau đó thử đăng nhập thật từ IP quản trị viên chuẩn bằng mật khẩu đúng.

### 3. Hậu quả & Thiệt hại (Damage)
* **Từ chối dịch vụ người dùng (User DoS):** Người dùng hợp lệ/quản trị viên thật sự bị chặn hoàn toàn khỏi hệ thống mặc dù nhập đúng mật khẩu. Gây gián đoạn nghiêm trọng công việc quản lý khách sạn và vận hành hệ thống.

### 4. Biện pháp Phòng thủ & Đề xuất Nâng cao
* **Đánh giá rủi ro:** Hệ thống hiện tại ghi nhận đầy đủ hành vi khóa tài khoản này trong log (`ACCOUNT_LOCKED`). Tuy nhiên, do bản chất của cơ chế khóa cứng truyền thống, tài khoản quản trị viên thật vẫn bị khóa.
* **Đề xuất nâng cao để giải quyết triệt để:**
  1. Thay vì khóa cứng tài khoản trực tiếp, tích hợp thử thách **reCAPTCHA** sau 3 lần sai mật khẩu để ngăn chặn bot tự động.
  2. Áp dụng cơ chế **Trì hoãn đăng nhập tăng dần (Exponential Backoff)**: Sai lần đầu khóa 1 giây, lần tiếp theo khóa 5 giây, 30 giây, tối đa là 5 phút thay vì 15 phút.

### 5. Nhật ký Sự kiện Tấn công & Phòng thủ (Log Timeline)
Tiến trình ghi nhận sự cố Lockout DoS đối với Admin:

1. **[Giai đoạn 1: Tấn công khóa từ nhiều IP giả]** Tin tặc gửi 3 lần đăng nhập sai đầu tiên nhắm vào `admin_test` từ các IP khác nhau:
   ```text
   2026-06-11 18:31:04 | WARNING | LOGIN_FAILED | IP=192.168.9.1 | user=admin_test
   2026-06-11 18:31:04 | WARNING | LOGIN_FAILED | IP=192.168.9.2 | user=admin_test
   2026-06-11 18:31:04 | WARNING | LOGIN_FAILED | IP=192.168.9.3 | user=admin_test
   ```
2. **[Giai đoạn 2: Tài khoản bị khóa cứng]** Ở lần sai thứ 5 từ IP `192.168.9.4`, tài khoản `admin_test` chuyển trạng thái khóa:
   ```text
   2026-06-11 18:31:05 | WARNING | ACCOUNT_LOCKED | IP=192.168.9.4 | user=admin_test | Khóa 15 phút sau 5 lần sai.
   ```
3. **[Giai đoạn 3: Người dùng thật bị từ chối truy cập]** Quản trị viên thật đăng nhập bằng mật khẩu đúng từ địa chỉ IP sạch (`192.168.9.99`). Trạng thái khóa DB từ chối cấp quyền truy cập, ghi nhận sự kiện chặn người dùng thật:
   ```text
   2026-06-11 18:31:05 | WARNING | ACCOUNT_LOCKED | IP=192.168.9.99 | user=admin_test | Tài khoản vẫn đang bị khóa. Còn ~15 phút.
   ```
