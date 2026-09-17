# Quyết định đã được người dùng duyệt

Nguồn: nội dung phê duyệt M0/M1 gửi ngày 16/09/2026. Chỉ ghi những quyết định đã duyệt; các con số/cách tổ chức code do triển khai chọn được mô tả riêng trong ARCHITECTURE.md.

- `D:\oneword` là project root thật của OneWord. Được khởi tạo Git tại đây; không di chuyển sang repo khác.
- Triển khai M1 theo hai lát cắt M1a và M1b. **Lượt này dừng sau M1a**, không bắt đầu M1b dù M1a đạt.
- M1a: nền tảng app; TXT/paste; bản gốc bất biến; sửa tay/undo; RSVP 1–5 đơn vị, tùy chỉnh, câu; WPM đúng; nghỉ dấu câu tùy chọn; pause/resume/rewind/context/keyboard/fullscreen; dừng khi tab/cửa sổ mất hiện diện, không chạy bù.
- UI fullscreen là trọng tâm: chữ rõ giữa nền tối, glow/progress tùy chọn, đúng một điều khiển thoát rõ ràng; không logo/sidebar/dashboard/tab tính năng chưa có hoặc thống kê trang trí.
- Kiến trúc UI → use cases → domain engines/adapters. Timing/segmentation độc lập React.
- TypeScript, React + Vite và Vitest được duyệt. Chọn version tương thích; dependency phải có lý do cụ thể.
- Playwright Test chỉ được cài/chạy sau xác minh Ubuntu WSL được hỗ trợ và Node/npm Linux. Báo riêng kết quả Windows/WSL.
- Dexie/IndexedDB được duyệt cho **M1b**, Ajv chỉ khi cần schema validation. Chưa dùng ở M1a.
- Không làm PDF/OCR/flashcard/FSRS/quiz/Study Pack/PWA/tài khoản/backend/AI/cloud sync/media hosting trong lượt này.
- Không upload text, không analytics/telemetry; không xóa dấu gạch hàng loạt.
- Giữ nguyên planning files và skills. Được tạo/cập nhật README và ARCHITECTURE/DATA-CONTRACTS/DECISIONS/TEST-ENVIRONMENT.
- Không tạo LICENSE. MIT chưa được duyệt; AGPL-3.0 đang được xem xét riêng.
- Không commit, push, deploy hoặc truy cập production. Những việc đó cần yêu cầu riêng.

## Phê duyệt M1b — 16/09/2026

- M1a đã được chấp nhận, baseline commit riêng theo yêu cầu: `f57c872`.
- Lượt này triển khai M1b: IndexedDB, document/revisions/position/preferences, backup export/restore, runtime validation và failure handling.
- Dexie được duyệt, chọn 4.4.6. fake-indexeddb 6.2.5 dùng trong test theo phạm vi yêu cầu. Không thêm Ajv vì format v1 có validator runtime cục bộ.
- Không commit M1b trước review và phê duyệt riêng; không push/deploy hoặc bắt đầu PDF/flashcard/FSRS/quiz/Study Pack/PWA/backend/cloud.
- Quyết định triển khai trong phạm vi được giao: restore gộp, bản trùng giữ position local, xung đột ID chặn toàn bộ; không replace/delete. Schema/giới hạn thực tế ở DATA-CONTRACTS.md, không mở rộng phạm vi chặng tiếp theo.

## Phê duyệt M2 — 17/09/2026

- M1a và M1b được chấp nhận; baseline main sạch `3078e62`. Chỉ triển khai PDF có lớp text, xem/sửa trước khi tạo document và dùng reader hiện có.
- Yêu cầu người dùng: xử lý local, giữ raw và working riêng, tiến độ/hủy, xử lý rõ scan/mixed/password/corrupt/large, cảnh báo thứ tự, lưu extracted source + metadata, không lưu PDF binary mặc định. Không tự mở RSVP trước preview.
- Người dùng cho phép chọn/cài PDF.js phù hợp sau khảo sát, pin patched version. Lựa chọn triển khai: pdfjs-dist **6.3.289**, không thêm React viewer/wrapper hoặc PDF generator dependency. Đã so sánh engine và package với 5.4.624; 6.3.289 tương thích Node 22.17/24.21, có sửa parser/font mới và không cần giữ nhánh cũ. Package unpacked 34.78 MB so với 37.63 MB của 5.4.624; đây không phải download runtime. Browser chỉ tải API lazy, worker và text font/CMap assets khi cần.
- Nguồn kiểm chứng: npm registry theo exact version, [release 6.3.289](https://github.com/mozilla/pdf.js/releases/tag/v6.3.289), [API theo tag](https://github.com/mozilla/pdf.js/blob/v6.3.289/src/display/api.js), [advisory đã vá từ 4.2.67](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq). Cài bằng `npm install --save-exact pdfjs-dist@6.3.289 --ignore-scripts`; npm audit kiểm riêng. PDF.js Apache-2.0 và notice font/CMap đi kèm build; không chọn license cho dự án.
- Lựa chọn triển khai, không phải yêu cầu số cụ thể từ người dùng: 50 MiB/file, 500 trang, 2 MiB chữ, timeout parser 120s, không tự nối dấu gạch, PDF cần password báo chưa hỗ trợ thay vì thêm quản lý mật khẩu. Backup v2, migration DB v1→v2 bảo vệ client M1b cũ khỏi ghi schema mới.
- Dừng sau M2. Không commit/push/deploy. Không OCR, flashcard/FSRS/quiz, Study Pack, AI API, backend, sync, media hosting hoặc PWA. Không tạo LICENSE dự án.
