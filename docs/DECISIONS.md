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
