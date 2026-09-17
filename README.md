# OneWord

Trình đọc TXT/PDF/dán văn bản theo nhịp RSVP. Chặng hiện tại: **M2**, trích xuất lớp chữ PDF tại máy, xem/sửa trước khi đọc; lưu tài liệu/bản sửa/vị trí/thiết lập bằng IndexedDB và có Personal Backup JSON.

M1a và M1b đã được chấp nhận tại `f57c872` và `3078e62`. Kiểm chứng và giới hạn trong [TEST-ENVIRONMENT.md](docs/TEST-ENVIRONMENT.md).

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

Chọn tài liệu đã lưu trong thanh dữ liệu hoặc **Tạo văn bản mới**. Reload mở lại tài liệu/draft và vị trí đã lưu, không tự phát. Checkpoint gom khoảng 1 giây, flush khi dừng; chờ **Đã lưu trên thiết bị** trước khi đóng. Khi báo lỗi, giữ trang mở và xuất backup của session.

**Xuất sao lưu** tải JSON tại máy. **Khôi phục sao lưu** kiểm file, cho xem số tài liệu mới/trùng rồi mới xác nhận ghi atomic. Restore chỉ gộp; cùng ID khác nội dung bị chặn toàn bộ. Dữ liệu có sẵn không bị xóa. Giới hạn: 32 MiB/backup, 2 MiB/text, 100 documents, 1.000 revisions/document.

IndexedDB thuộc origin/trình duyệt này; đổi port dev/preview là kho khác. Trình duyệt có thể dọn dữ liệu. Giữ backup JSON ở nơi riêng tư; file không mã hóa. Đóng cưỡng bức có thể mất phần sau checkpoint cuối. Chưa có PWA/offline app shell.

## Mở PDF

Chọn **Mở PDF** → xem tiến độ trang X/N → đối chiếu cảnh báo và bản trích xuất gốc theo trang → sửa văn bản → **Lưu và tiếp tục đến trình đọc**. Trình đọc không tự phát. Hãy áp dụng/hoàn tác văn bản đang nhập trước khi mở PDF. **Hủy nhập PDF** hoặc Escape bỏ toàn bộ preview, giữ nguyên tài liệu trước đó. Preview chưa lưu; đóng/reload có cảnh báo mất preview.

PDF.js **6.3.289** đọc File bằng worker local, theo từng trang/stream chữ; không render trang ra canvas. PDF, chữ và metadata không upload. Worker, CMaps và font chuẩn được phục vụ như tài nguyên tĩnh cùng origin, chỉ tải khi cần; không CDN. Không chạy PDF JavaScript, attachment hoặc XFA.

Giữ raw text và ranh giới/cảnh báo từng trang bất biến; bản làm việc chỉ gom tab/space/NBSP, chuẩn hóa CRLF, bỏ khoảng trắng đầu/cuối dòng và gom dòng trống. Giữ Unicode, xuống dòng đơn và mọi dấu gạch nối, kể cả `informa-\ntion`; người dùng có thể tự sửa. Có nút trở về bản chuẩn hóa hoặc dùng raw.

Lưu chữ gốc, revisions, filename, số trang, thời điểm/phiên bản extractor và cảnh báo; **không lưu PDF binary hoặc ảnh trang**. Backup v2 đọc được backup M1b v1; DB v1 nâng lên v2 bằng transaction, giữ dữ liệu cũ. M1b cũ không đọc được kho v2.

Giới hạn: 50 MiB/tệp, 500 trang, 2 MiB chữ và 120 giây cho một lần xử lý PDF.js. PDF ảnh/scan hoặc trắng hoàn toàn báo không có chữ, không tạo tài liệu rỗng; mixed PDF ghi rõ trang thiếu/ít chữ. Chưa OCR và chưa nhập mật khẩu: PDF cần mật khẩu bị từ chối rõ ràng. File hỏng/không có trang/quá giới hạn bị chặn. Hai cột, bảng, footnote, font mapping sai hoặc công thức có thể trích xuất sai; heuristic chỉ cảnh báo, không bảo đảm đúng thứ tự. Không sửa thứ tự tự động.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

Playwright chạy trên Ubuntu WSL được hỗ trợ, không chạy Windows 10 làm bằng chứng hỗ trợ chính thức:

```powershell
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
```

Script dùng Node Linux portable trong `.tools` nếu có, nếu không dùng Node Linux trên PATH. Browser binaries phải được chuẩn bị trước; xem [môi trường kiểm thử](docs/TEST-ENVIRONMENT.md). Build lại trên Windows trước E2E. Các ca headed cần WSLg. Native visibility chạy Chromium với profile riêng và CDP `noDefaults: true`, kiểm trạng thái hidden thật trước khi kiểm reader. Ca mô phỏng handler chạy riêng, không thay bằng chứng native.

## Phạm vi

M2 không có OCR, FSRS/flashcard/quiz, Study Pack, PWA, tài khoản, backend, AI API, telemetry hoặc cloud sync. Không có nội dung người dùng gửi lên server. Không có media ngoài hay font từ CDN. RSVP không bảo đảm tăng khả năng hiểu/nhớ.

Giấy phép dự án chưa được chọn. Không có LICENSE; MIT chưa được duyệt, AGPL-3.0 đang được cân nhắc. Không commit/push/deploy tự động.

Tài liệu: [kiến trúc](docs/ARCHITECTURE.md), [dữ liệu](docs/DATA-CONTRACTS.md), [quyết định đã duyệt](docs/DECISIONS.md).
