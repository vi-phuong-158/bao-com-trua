# Áp dụng bản hoàn thiện — Quản lý Suất ăn Trưa & Tối, Đối soát ngày

1. Đẩy các file Apps Script lên project đã liên kết:

```powershell
clasp push
```

2. Trong Google Apps Script Editor, chọn hàm `setupApp()` và bấm **Run / Chạy**.
   - Hàm tự động migrate cột `LOAI_BUA` cho `CHAM_COM` và `NHAT_KY` (gán toàn bộ lịch sử cũ là `LUNCH`).
   - Tự động tạo sheet `DOI_SOAT` để quản lý đối soát / chốt sổ từng ngày.
   - Hoàn toàn idempotent, không duplicate dữ liệu, bảo toàn dữ liệu cũ.
3. Reload lại Google Sheet.
4. Mở menu **🍚 Quản trị suất ăn → Mở Admin Dashboard** bằng tài khoản Admin `vingocphuong.92@gmail.com`.
5. Vào Apps Script Editor → **Deploy → Manage deployments** → Edit deployment của Web App → chọn Version: **New version** → bấm **Deploy** để người dùng nhận giao diện và logic mới.