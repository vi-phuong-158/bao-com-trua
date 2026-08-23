# Áp dụng bản hoàn thiện

1. Đẩy 5 file Apps Script ở root lên project đã liên kết:

```powershell
clasp push
```

2. Trong Apps Script chạy `setupApp()` một lần. Hàm tạo/migrate `NGAY_NGHI` và mở rộng `NHAT_KY` mà không xóa dữ liệu.
3. Reload Google Sheet.
4. Mở **🍚 Quản trị cơm trưa → Mở Admin Dashboard** bằng `vingocphuong.92@gmail.com`.
5. Deploy lại Web App để người dùng nhận UI/logic ngày nghỉ mới.

Không cần chạy `setupApp()` mỗi lần sửa code; chỉ chạy lại khi áp dụng schema/migration trên một Sheet chưa có các cột mới.