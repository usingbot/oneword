# Quyết định đã được người dùng duyệt

## M4b — chuẩn bị phát hành nguồn mở

- Người dùng chọn AGPL-3.0 cho source ứng dụng; metadata dùng `AGPL-3.0-only`, bản LICENSE chính thức GNU v3, không thêm điều khoản “or later”. Giữ license/notice riêng của dependency; không áp license ứng dụng lên PDF/ảnh/Study Pack của người dùng. Quyết định này thay thế trạng thái “chưa chọn license” trong các mốc lịch sử bên dưới.
- Giữ version hiện có 0.1.0 và đề xuất làm bản public đầu tiên; chưa tag/release/push/deploy. `private: true` chỉ ngăn publish npm nhầm.
- Phạm vi M4b là tài liệu, policy, CI và license assets của build. Không thay runtime `src`, schema hoặc dependency version. CI core trên Ubuntu/Node24; browser gate đầy đủ vẫn chạy WSL/WSLg, chưa coi runner GitHub là đã được kiểm chứng.
- Private security/CoC contacts và URL/source offer public chưa có; ghi TODO bắt buộc trước publication, không bịa thông tin. Bản Contributor Covenant2.1 giữ nguyên nội dung ngoài contact template và ghi chú trạng thái.
- Chỉ thêm notices runtime có ship, giữ nguyên PDF.js/CMap/font notices; Liberation trong package hiện tại là GPLv2 với font exceptions. Nguồn/điều kiện phân phối font phải được hoàn tất khi chuẩn bị public artifact.
- Không commit trong M4b trước review/phê duyệt riêng; không bắt đầu phát hành hay deployment.

## M4a — 17/09/2026

Người dùng duyệt production hardening: PWA/offline, cập nhật an toàn, mobile/accessibility, đo hiệu năng, migration/recovery và privacy. Giữ semantics Reader/PDF/FSRS/Quiz. Không commit/push/deploy, chọn LICENSE, backend/accounts/cloud/AI/telemetry hoặc M4b. Đầu lượt main sạch tại198e771; commit này chỉ thêm .gitattributes trên M3c12899e7, đã kiểm và giữ nguyên.

Lựa chọn triển khai trong phạm vi đã duyệt:

- Đã đánh giá [Vite PWA prompt lifecycle](https://vite-pwa-org.netlify.app/guide/prompt-for-update). Dùng plugin Vite nhỏ và worker native cho allowlist tĩnh, integrity và điều kiện nhiều tab; không cài vite-plugin-pwa/Workbox. Không có dependency thêm/xóa, lockfile giữ nguyên. Đây là lựa chọn kỹ thuật, không phải yêu cầu dùng thư viện của người dùng.
- [Lifecycle service worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers): cài đầy đủ rồi chờ, không tự skipWaiting khi có client cũ. Bấm cập nhật khi safe, flush rồi message/ack, controllerchange mới reload. Khi không còn client, lifecycle browser có thể kích hoạt worker đang chờ ở lần mở kế tiếp; không có phiên đang mở bị reload.
- Precache201 tài nguyên khoảng4,16MB chưa nén (dist cả sw.js khoảng4,19MB). Chấp nhận tải byte PDF.js trước để offline hoàn chỉnh; vẫn lazy thực thi. Giữ cache hiện tại và một cache trước khi điều kiện client cho phép dọn, chỉ xóa prefix của OneWord. Không cache runtime media/data.
- [Persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) là tùy chọn sau nút người dùng bấm, có đường denied/error; không phải điều kiện sử dụng hoặc bảo đảm vĩnh viễn.
- Không bump DB/backup. Validate graph trước commit migration và giữ kho lỗi. Tái sử dụng formatter và bỏ validation lặp sau đo; không giảm validation hoặc đổi thuật toán.
- PNG icon192/512/maskable được vẽ bằng script dự án `scripts/generate-icons.mjs`, cùng motif vòng tròn/chấm hiện có. Không dùng asset thương hiệu khác, không thêm quyền push/background sync.
- Kiểm package.json cài thực: runtime React/ReactDOM19.3.0 MIT, Dexie4.4.6 Apache-2.0, PDF.js6.3.289 Apache-2.0, ts-fsrs5.4.2 MIT. Toolchain giữ Vite8.3.0 MIT, Vitest5.0.1 MIT, TypeScript5.9.3 Apache-2.0, Playwright1.63.0 Apache-2.0. Giữ notice PDF/font/CMap trong build; chưa chọn license dự án. Audit cuối ghi ở TEST-ENVIRONMENT.

## Quyết định M3c — 17/09/2026

- Một đáp án đúng, 2–6 choices, identity độc lập thứ tự. Không thêm thư viện hoặc type câu khác.
- Study Pack v2 cho quiz, giữ v1; Personal Backup v5 và DB v5 để thêm personal attempts, giữ compatibility cũ.
- Mỗi attempt chụp câu/revision, choice order/question order, seed, selection, flags/current, timestamps/result. Sửa/xóa content không thay lịch sử.
- Practice chốt từng câu; Test chỉ lộ đúng/sai sau xác nhận nộp. Bỏ trống sai, ảnh essential thiếu phải đánh dấu loại và báo mẫu số thực tế.
- Fisher–Yates/Mulberry32 có seed để kiểm thử; không claim random bảo mật. Revision guard transaction để từ chối stale tabs; không tự merge đáp án mâu thuẫn.
- Quiz và FSRS độc lập tuyệt đối; không ánh xạ đúng/sai vào rating. Không PWA/deploy/AI/backend. Offline áp dụng sau khi app shell đã tải, media ngoài có thể không có.
- Giới hạn 200 attempts và 32 MiB backup; không tự dọn lịch sử. [QUIZ.md](QUIZ.md) ghi rõ giới hạn và hành vi.


## Phê duyệt M3b — 17/09/2026

- Baseline main sạch c0283f7, M3a đã chấp nhận. Triển khai ôn Anki-style/FSRS local, ratings đúng nghĩa, queue/daily limit, multi-tab guard/idempotency/undo, backup/migration; không quiz/AI/backend/accounts/cloud/PWA/deploy/.apkg/AnkiWeb/stats/optimizer.
- Đã xác minh và pin ts-fsrs5.4.2; chỉ dependency này, không phụ thuộc con. Adapter narrow, dùng next của thư viện thật; tests không tự viết lại toán FSRS.
- Lựa chọn triển khai: profile retention0.90 cố định/fuzz tắt/short-term bật; learning1m,10m/relearning10m; 20 thẻ mới/ngày toàn thư viện, setting0..200, ngày00:00 timezone lưu ban đầu. Due cards không bị limit mới chặn.
- DB4/native40, review aggregate riêng; generation review độc lập reader, per-schedule revision và operationID là authority. Event/undo append-only; daily counters được derive. Undo phục hồi FSRS snapshot nhưng tăng revision; unsafe undo bị chặn.
- Content edits/move giữ progress; delete prune live schedule, giữ audit. Backup4 đọc1/2/3, xung đột personal history chặn toàn bộ. Study Pack1 không đổi. Chi tiết và giới hạn tại FLASHCARD-SCHEDULING.md.
- Dừng sau M3b; không commit/push/deploy/LICENSE hoặc triển khai quiz.

## Phê duyệt M3a — 17/09/2026

- M1a/M1b/M2 đã được chấp nhận; baseline main sạch `da305cc`. Lượt hiện tại chỉ triển khai content layer Study Pack và flashcard thủ công, persistence, preview study và import/export. Các mục M0–M2 bên dưới là lịch sử phê duyệt.
- Yêu cầu: Study Pack content-only, ID ổn định, runtime validation, preview/confirm/atomic import, xung đột an toàn, ảnh HTTPS tham chiếu có fallback/essential, không thực thi HTML/script, giữ reader và backup cũ.
- Chọn triển khai: Study Pack v1, aggregate store packs trong DB v3/native30, Personal Backup v3 đọc v1/v2; unknown fields bị reject. Dùng validator cục bộ có test, không thêm Ajv hoặc dependency khác.
- Import pack trùng toàn bộ bỏ qua, khác nội dung/metadata cùng ID chặn cả pack; child ID trùng pack khác cũng chặn. Không tự merge từng thẻ. Editor sửa có chủ đích, giữ card ID/tăng revision; xóa có xác nhận.
- Ảnh chỉ tải từng ảnh khi opt-in, anonymous CORS/no-referrer; giữ URL/alt/caption/essential, không upload/proxy/cache ứng dụng. Prompt nhờ AI là Markdown tĩnh version1, người dùng tự copy và chọn tài liệu; không AI API.
- Dừng sau M3a; không commit/push/deploy/LICENSE, không FSRS/lịch ôn/history/ratings/quiz/backend/cloud/media upload/PWA.

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
