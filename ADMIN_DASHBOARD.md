# Admin Dashboard — Quản trị Suất ăn (Trưa & Tối)

Hệ thống quản lý suất ăn nội bộ cho 30–40 người, vận hành bằng **Google Apps Script + Google Sheets**.
Admin Dashboard chạy trực tiếp bên trong Google Sheet dưới dạng Apps Script Dialog (`showAdminDashboard`), được bảo mật chặt chẽ bằng tài khoản Google của Admin (`vingocphuong.92@gmail.com`).

---

## 1. Mở Admin Dashboard

1. Mở Google Sheet **HỘI CƠM TRƯA** bằng tài khoản Admin (`vingocphuong.92@gmail.com`).
2. Chọn menu: **🍚 Quản trị suất ăn → Mở Admin Dashboard**.
3. Dashboard sẽ mở ra với toàn quyền xem, sửa, đối soát theo từng ngày, từng người, từng bữa.

---

## 2. Các Tính năng Chính

### A. Quản lý theo ngày (Trưa & Tối)
- **Bộ chọn ngày (Date Picker):** Chọn bất kỳ ngày nào (hôm nay, quá khứ hoặc tương lai). Admin hoàn toàn bypass giờ chốt (cutoff).
- **Cơm trưa (LUNCH):**
  - Xem trạng thái: *Đã đặt*, *Đã cắt*, *Chưa báo*, kèm nhãn nguồn (*Đánh hộ*, *Báo ngoài*, *Tự động*, *Người dùng*).
  - Thao tác nhanh: `Đánh hộ`, `Báo ngoài`, `Cắt`, `Xóa`.
- **Cơm tối (DINNER):**
  - Xem trạng thái: *Đã đặt*, *Đã cắt*, *Chưa báo*.
  - Thao tác nhanh: `+ Tối` (Đánh hộ tối), `Báo ngoài`, `Cắt`, `Xóa`.
- **Thao tác hàng loạt (Bulk actions):**
  - `Đặt trưa tất cả` / `Cắt trưa tất cả` (chỉ áp dụng cho LUNCH của thành viên đang hoạt động).
  - `Đặt tối tất cả` / `Cắt tối tất cả` (chỉ áp dụng cho DINNER của thành viên đang hoạt động).
  - Hai bữa ăn hoàn toàn cô lập: thao tác trưa không ảnh hưởng tối và ngược lại.

### B. Đối soát / Chốt sổ từng ngày
- Sau khi kiểm tra suất ăn thực tế, Admin bấm: **✅ Đánh dấu đã đối soát**.
- Hệ thống lưu lại thời gian, tài khoản Admin và mã băm snapshot suất ăn của ngày.
- **Tự động cảnh báo khi có thay đổi:** Nếu Admin chỉnh sửa bất kỳ suất ăn nào (trưa hoặc tối) sau khi đã đối soát, Dashboard sẽ tự động hiển thị: **⚠️ Dữ liệu thay đổi — Cần đối soát lại!**.
- Admin có thể bấm **Đối soát lại** để cập nhật hoặc **Mở lại đối soát** (`OPEN`).

### C. Khóa ngày nghỉ & Bảo toàn dữ liệu
- Khi khóa ngày nghỉ (**🔒 Khóa ngày nghỉ**):
  - Web App người dùng hiển thị: *“Hôm nay không tổ chức ăn trưa”*.
  - Hệ thống tự động báo cơm (auto-book) bỏ qua ngày này.
  - Thống kê ngày và tháng tính 0 suất ăn cho ngày nghỉ.
  - **BẢO TOÀN DỮ LIỆU TUYỆT ĐỐI:** Khóa ngày nghỉ **KHÔNG** xóa hay hủy các bản ghi trong `CHAM_COM`.
- Khi mở lại ngày nghỉ (**↩ Mở lại ngày**):
  - Toàn bộ dữ liệu đặt cơm trước đó tự động khôi phục nguyên vẹn (ai đã đặt vẫn là đặt, ai đã hủy vẫn là hủy).

### D. Báo cáo & Email
- **Email cơm trưa hằng ngày (08:00):** Tự động gửi lúc giờ chốt, chỉ tổng hợp danh sách Cơm Trưa (`LUNCH`).
- **Phát hiện dữ liệu thay đổi:** Nếu sau giờ chốt Admin chỉnh sửa Cơm Trưa, Dashboard hiện cảnh báo và cho phép bấm **✉ Gửi báo cáo trưa** với tiêu đề `🍚 [CẬP NHẬT] Báo cơm trưa DD/MM/YYYY: X suất`.
- **Cô lập bữa ăn:** Thêm/sửa Cơm Tối (`DINNER`) **không** làm dirty email trưa.
- **Email tổng kết tháng:** Tách rõ 3 cột: Cơm Trưa, Cơm Tối, Tổng cộng.

---

## 3. Cấu trúc Sheet (Data Schema)

Hàm `setupApp()` tự động tạo/nâng cấp các sheet một cách an toàn (idempotent, không mất dữ liệu cũ):

1. **`THANH_VIEN`**: `ID`, `HO_TEN`, `DANG_HOAT_DONG`, `TU_DONG_BAO_COM`.
2. **`CHAM_COM`**: `NGAY`, `MEMBER_ID`, `HO_TEN`, `LOAI_BUA`, `TRANG_THAI`, `CAP_NHAT_LUC`.
   - Khóa logic: `NGAY + MEMBER_ID + LOAI_BUA`.
   - `LOAI_BUA`: `LUNCH` hoặc `DINNER`. Dữ liệu cũ tự động migrate thành `LUNCH`.
3. **`NHAT_KY`**: `THOI_GIAN`, `NGAY`, `MEMBER_ID`, `HO_TEN`, `LOAI_BUA`, `HANH_DONG`, `NGUON`, `GHI_CHU`.
4. **`CAU_HINH`**: `ADMIN_EMAIL`, `ADMIN_EMAILS`, `CUTOFF` (mặc định 08:00), `APP_NAME`.
5. **`NGAY_NGHI`**: `NGAY`, `TRANG_THAI` (`CLOSED` / `OPEN`), `GHI_CHU`, `CAP_NHAT_BOI`, `CAP_NHAT_LUC`.
6. **`DOI_SOAT`**: `NGAY`, `TRANG_THAI` (`RECONCILED` / `OPEN`), `DOI_SOAT_BOI`, `DOI_SOAT_LUC`, `GHI_CHU`, `SNAPSHOT_HASH`.

---

## 4. Bảo mật Phân quyền

- Tất cả hàm quản trị (`admin*`) đều bắt buộc kiểm tra `Session.getActiveUser().getEmail()` thuộc danh sách Admin (`vingocphuong.92@gmail.com`).
- Web App public hoạt động ở chế độ ẩn danh (không bắt buộc người dùng đăng nhập), và **không thể** gọi bất kỳ hàm quản trị nào.
