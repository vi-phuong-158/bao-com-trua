# Admin Dashboard — Báo cơm trưa

Admin Dashboard chạy trong Google Sheet dưới dạng Apps Script dialog. Web App public vẫn cho người dùng báo cơm không cần đăng nhập.

## Mở dashboard

1. Chạy `setupApp()` một lần để tạo/migrate các sheet.
2. Reload Google Sheet.
3. Chọn menu **🍚 Quản trị cơm trưa → Mở Admin Dashboard**.
4. Mở bằng tài khoản `vingocphuong.92@gmail.com` hoặc `anmphongandn@gmail.com`.
5. Trên điện thoại, mở [Admin mobile](https://script.google.com/macros/s/AKfycbwxL5XWo8Bti9IWe7bR_i3KnBdk1YhemSCb3NiLRdVf7jNYTsGIncJLDuL35iEQTSPVqA/exec/admin), sau đó đăng nhập đúng tài khoản Admin.

Mọi hàm `admin*` đều kiểm tra `Session.getActiveUser().getEmail()` ở server-side. Không có API admin mở cho Web App anonymous.

## Chức năng

- Chọn bất kỳ ngày nào, kể cả ngày quá khứ và sau giờ chốt.
- Đánh hộ, báo ngoài, cắt, xóa trạng thái.
- Đặt/cắt tất cả thành viên đang hoạt động.
- Khóa ngày nghỉ, ghi chú và mở lại ngày.
- Xem trạng thái email; gửi lại báo cáo ngày sau khi dữ liệu thay đổi.
- Thống kê tháng theo trạng thái cuối cùng mỗi người/ngày.
- Thêm thành viên, bật/tắt hoạt động và tự động báo cơm.
- Chỉnh giờ chốt từ `CAU_HINH`.

## Schema

`setupApp()` mở rộng an toàn:

- `THANH_VIEN`: ID, HO_TEN, DANG_HOAT_DONG, TU_DONG_BAO_COM
- `CHAM_COM`: trạng thái cuối hiện tại theo ngày/người
- `NHAT_KY`: thêm NGUON và GHI_CHU, không xóa audit cũ
- `CAU_HINH`: ADMIN_EMAIL, ADMIN_EMAILS, CUTOFF, APP_NAME
- `NGAY_NGHI`: ngày, trạng thái, ghi chú, người cập nhật, thời gian

## Deploy

Với clasp:

```powershell
clasp push
```

Sau đó deploy lại Web App nếu đã thay đổi `Code.gs`/`Index.html`. Admin Dashboard không cần deploy riêng; mở từ Google Sheet sau khi reload.

Nếu dùng Apps Script UI, tạo/cập nhật 5 file: `Code.gs`, `Index.html`, `Admin.gs`, `AdminDashboard.html`, `appsscript.json`, rồi chạy `setupApp()`.

## Kiểm tra nhanh

- Khóa một ngày tương lai: user thấy “Hôm nay không tổ chức ăn trưa”, không book được, auto-book bỏ qua.
- Mở lại ngày: user và auto-book hoạt động lại.
- Gửi email ngày, sửa một booking trong Admin: Dashboard phải báo dữ liệu đã thay đổi; bấm gửi lại để nhận subject `[CẬP NHẬT]`.
- Kiểm tra `NHAT_KY` có action và nguồn `ADMIN_*`, `USER_*`, `BOOK_AUTO`.

Apps Script runtime/live deployment vẫn cần được kiểm tra trên Google Sheet thật; local validation không thay thế bước đó.

