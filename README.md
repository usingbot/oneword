# OneWord

Trình đọc TXT/dán văn bản theo nhịp RSVP. Chặng hiện tại: **M1a**, dữ liệu chỉ tồn tại trong bộ nhớ của trang. Tải lại/đóng trang làm mất nội dung. Chưa có lưu tự động, backup hoặc restore.

Trạng thái kiểm chứng: typecheck/lint/build, 16 unit tests và 14 browser tests đạt, bao gồm native hidden → pause → visible không chạy bù → tiếp tục thủ công. **Gate còn thiếu của M1a đã đóng; chưa bắt đầu M1b.** Chi tiết và giới hạn trong [TEST-ENVIRONMENT.md](docs/TEST-ENVIRONMENT.md).

## Chạy local

Môi trường Windows đã kiểm: Node 22.17.0, npm 11.15.0.

```powershell
npm ci --ignore-scripts
npm run dev
```

Vite chỉ bind 127.0.0.1. URL được terminal in ra (mặc định cổng 5173). Production preview:

```powershell
npm run build
npm run preview
```

## Sử dụng

1. Mở TXT UTF-8 (tối đa 2 MiB), dán văn bản hoặc thử đoạn mẫu.
2. Chọn **Dùng văn bản**. Có thể chỉnh sửa rồi **Áp dụng thay đổi**; bản gốc giữ riêng. **Hoàn tác** bỏ draft chưa áp dụng hoặc quay lại revision trước.
3. Chọn 1–5 đơn vị, số tùy chỉnh 1–100 hoặc cả câu. WPM đếm đơn vị cách nhau bằng khoảng trắng, không phải phân tích từ tiếng Việt.
4. Bấm phát hoặc focus vùng đọc và nhấn Space. ←/→ lùi/tiến một lượt. Các phím này giữ hành vi bình thường khi đang nhập liệu hoặc focus control.
5. Mở toàn màn hình; Escape hoặc nút **Thoát** để ra. Nếu API bị từ chối, dùng focus view trong cửa sổ. **Ngữ cảnh** luôn tạm dừng.

Chuyển tab/cửa sổ tạm dừng; trở lại cần chủ động tiếp tục. Đổi tốc độ/cách chia lượt cũng tạm dừng. Áp dụng sửa/undo đặt vị trí về đầu và có thông báo. Không có tự nối/xóa dấu gạch.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Playwright chạy trên Ubuntu WSL được hỗ trợ, không chạy Windows 10 làm bằng chứng hỗ trợ chính thức:

```powershell
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
```

Script dùng Node Linux portable trong `.tools` nếu có, nếu không dùng Node Linux trên PATH. Browser binaries phải được chuẩn bị trước; xem [môi trường kiểm thử](docs/TEST-ENVIRONMENT.md). Build lại trên Windows trước E2E. Các ca headed cần WSLg. Native visibility chạy Chromium với profile riêng và CDP `noDefaults: true`, kiểm trạng thái hidden thật trước khi kiểm reader. Ca mô phỏng handler chạy riêng, không thay bằng chứng native.

## Phạm vi

M1a không có PDF/OCR, FSRS/flashcard/quiz, Study Pack, IndexedDB, PWA, tài khoản, backend, AI API, telemetry hoặc cloud sync. Không có nội dung người dùng gửi lên server. Không có media ngoài hay font từ CDN. RSVP không bảo đảm tăng khả năng hiểu/nhớ.

Giấy phép dự án chưa được chọn. Không có LICENSE; MIT chưa được duyệt, AGPL-3.0 đang được cân nhắc. Không commit/push/deploy tự động.

Tài liệu: [kiến trúc](docs/ARCHITECTURE.md), [dữ liệu](docs/DATA-CONTRACTS.md), [quyết định đã duyệt](docs/DECISIONS.md).
