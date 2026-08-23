# 🍚 Báo cơm trưa — Google Apps Script

Bản này dành cho nhóm khoảng 30 người, **không cần đăng nhập**.

## Chức năng đã có

- Màn chính hiển thị:
  - Hôm nay có bao nhiêu người đặt cơm.
  - Danh sách ai đã đặt.
  - Thời gian từng người báo cơm.
- Nút **Báo cơm hôm nay**.
- Nếu đã báo thì nút tự đổi thành **Hủy báo cơm hôm nay**.
- Điện thoại ghi nhớ tên đã chọn bằng `localStorage`.
- Nút **Theo dõi suất ăn**:
  - Chọn thành viên.
  - Chọn tháng.
  - Xem tổng số suất và từng ngày đã ăn.
- Khóa thay đổi từ **08:00**.
- Tài khoản Admin:
  - `vingocphuong.92@gmail.com`
  - `anmphongandn@gmail.com`

- Tự động gửi email chốt ngày về:
  - `vingocphuong.92@gmail.com`
- Ngày 1 hằng tháng tự gửi tổng hợp tháng trước.
- Có nhật ký thao tác báo/hủy.
- Chống bấm trùng bằng khóa `LockService`.

---

## 1. Tạo Google Sheet

Tạo một Google Sheet mới, ví dụ:

**HỘI CƠM TRƯA**

Sau đó vào:

**Tiện ích mở rộng → Apps Script**

## 2. Tạo file

Trong Apps Script:

### File `Code.gs`

Xóa nội dung cũ và dán toàn bộ nội dung trong file `Code.gs` của gói này.

### File `Index.html`

Bấm dấu `+` → **HTML** → đặt tên:

`Index`

Dán nội dung file `Index.html`.

> File `appsscript.json` chỉ là manifest tham khảo. Không bắt buộc phải dán nếu Apps Script đang ẩn manifest.

---

## 3. Chạy khởi tạo

Trong Apps Script, chọn hàm:

`setupApp`

Bấm **Run / Chạy**.

Google sẽ hỏi quyền lần đầu. Chấp nhận để script:

- ghi Google Sheet;
- gửi email;
- tạo trigger tự động.

Sau khi chạy xong sẽ có 5 sheet:

1. `THANH_VIEN`
2. `CHAM_COM`
3. `NHAT_KY`
4. `CAU_HINH`
5. `NGAY_NGHI`

---

## 4. Danh sách thành viên

Khi chạy `setupApp`, hệ thống tự thêm sẵn 37 thành viên mặc định.

Nếu ứng dụng đã được khởi tạo trước khi có danh sách này, chạy thêm hàm:

`seedDefaultMembers`

Hàm chỉ thêm tên còn thiếu, không sửa hoặc xóa dữ liệu thành viên hiện có.

Vào sheet:

`THANH_VIEN`

Cột:

| ID | HO_TEN | DANG_HOAT_DONG |
|---|---|---|
| | Nguyễn Văn A | TRUE |
| | Trần Văn B | TRUE |
| | ... | TRUE |

Bạn có thể thêm thành viên mới bằng cách nhập **họ tên** ở cột B.

Sau đó quay lại Apps Script chạy hàm:

`normalizeMembers`

Hệ thống tự tạo ID cho từng người và tự điền `TRUE`.

> Không tự sửa ID sau khi hệ thống đã chạy vì ID dùng để liên kết lịch sử suất ăn.

---

## 5. Deploy thành Web App

Apps Script → **Deploy → New deployment**

Chọn:

**Web app**

Thiết lập:

- Execute as: **Me**
- Who has access: **Anyone**

Bấm **Deploy**.

Google trả về một URL dạng:

`https://script.google.com/macros/s/.../exec`

Đây là link gửi vào nhóm Zalo hoặc tạo QR Code.

---

## 6. Cách mọi người sử dụng

Lần đầu:

1. Mở link.
2. Bấm **Báo cơm hôm nay**.
3. Chọn tên.
4. Điện thoại ghi nhớ tên.

Từ lần sau:

1. Mở link.
2. Bấm **Báo cơm hôm nay**.

Nếu đã báo, nút đổi thành:

**Hủy báo cơm hôm nay**

Trước 08:00 có thể báo/hủy.

Từ 08:00 hệ thống khóa danh sách.

---

## 7. Hủy cơm cho ngày sắp tới

Nếu đã bật **Tự động báo cơm vào ngày làm việc**, người dùng không cần chờ đến đúng ngày để hủy:

1. Bấm **Hủy cơm sắp tới**.
2. Chọn ngày làm việc muốn nghỉ.
3. Bấm **Lưu ngày hủy**.

Hệ thống lưu yêu cầu trước và sẽ bỏ qua ngày đó khi tác vụ tự động chạy. Cuối tuần không cần hủy vì hệ thống không tự báo cơm vào Thứ 7 và Chủ nhật.

---

## 8. Email tự động

### Hằng ngày

Sau 08:00 hệ thống gửi:

**🍚 Báo cơm 11/08/2026: 24 suất**

Trong email có:

- Tổng suất.
- Danh sách người báo cơm.
- Giờ từng người báo.

Email nhận:

`vingocphuong.92@gmail.com`

### Hằng tháng

Ngày 1 tháng sau, hệ thống gửi:

**📊 Tổng hợp suất ăn tháng 8/2026**

Gồm:

| Họ tên | Số suất |
|---|---:|
| Nguyễn Văn A | 21 |
| Trần Văn B | 18 |

---

## 9. Kiểm tra email ngay

Có 2 hàm kiểm tra thủ công:

### Gửi email hôm nay

`sendDailySummaryNow`

### Gửi email tổng tháng trước

`sendPreviousMonthSummaryNow`

Có thể chạy 2 hàm này để kiểm tra trước khi đưa vào sử dụng.

---

## 10. Cấu hình email

Sheet `CAU_HINH` có:

| KEY | VALUE |
|---|---|
| ADMIN_EMAIL | vingocphuong.92@gmail.com |
| ADMIN_EMAILS | vingocphuong.92@gmail.com, anmphongandn@gmail.com |
| CUTOFF | 08:00 |
| APP_NAME | Báo cơm trưa |

Hiện giờ thời gian khóa trong code là **08:00**.

---

## Lưu ý về việc không đăng nhập

Hệ thống nhận diện bằng **tên người dùng tự chọn**, vì vậy về mặt kỹ thuật một người có thể chọn tên người khác.

Đối với hội cơm nội bộ khoảng 30 người, đây thường là đánh đổi hợp lý để mọi người dùng nhanh, không cần tài khoản và mật khẩu.

Nhật ký `NHAT_KY` vẫn lưu mọi lần báo/hủy để có thể đối chiếu khi cần.

## 11. Admin Dashboard và ngày nghỉ

Admin Dashboard chạy trong Google Sheet, không đưa quyền quản trị vào Web App public. Sau `clasp push` và reload Sheet, mở menu **🍚 Quản trị cơm trưa → Mở Admin Dashboard** bằng tài khoản `vingocphuong.92@gmail.com` hoặc `anmphongandn@gmail.com`.

Dùng điện thoại: mở [Admin mobile](https://script.google.com/macros/s/AKfycbwxL5XWo8Bti9IWe7bR_i3KnBdk1YhemSCb3NiLRdVf7jNYTsGIncJLDuL35iEQTSPVqA/exec?admin=1). Link này có toàn quyền quản trị, chỉ chia sẻ cho người tin cậy.

Chạy `setupApp()` một lần khi áp dụng schema mới. Hàm tạo `NGAY_NGHI` và mở rộng `NHAT_KY` mà không xóa lịch sử cũ. Khi Admin khóa ngày nghỉ, Web App, auto-book và email đều hiển thị “không tổ chức ăn trưa”.

Sau khi sửa code, deploy lại Web App để người dùng nhận phiên bản `Index.html`/`Code.gs` mới. Admin dùng nút **Gửi báo cáo ngày** để gửi lại email nếu dashboard báo dữ liệu đã thay đổi sau lần gửi trước.


