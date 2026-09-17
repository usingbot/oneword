# Kiến trúc M1b

Baseline M1a: f57c872. M1b thêm persistence và Personal Backup; không đổi domain RSVP hoặc triển khai chặng tiếp theo.

## Ranh giới

- src/ui/App.tsx: UI, lựa chọn tài liệu, adapter keyboard/fullscreen/visibility, hydrate state và gửi snapshot cho application. Không có lệnh IndexedDB/transaction trong React. UI tạo adapter tại điểm lắp ghép.
- src/application/document.ts: tạo document/revision bất biến, TXT UTF-8, sửa/undo; cấp UUID và timestamp.
- src/application/library.ts: interface ReaderStorage, dữ liệu thư viện, kiểm resume và coordinator Persistence. Application không phụ thuộc kiểu Dexie.
- src/application/backup.ts: validator runtime, JSON envelope v1, tham chiếu và merge policy; không tải schema hoặc gọi API.
- src/domain/reader.ts: segmentation/duration/ReaderEngine độc lập React/storage; giữ timing, hidden pause và không chạy bù của M1a.
- src/storage/indexed-db.ts: adapter Dexie duy nhất, transaction xuyên bốn stores, kiểm generation và immutability.
- scripts/serve-built.mjs: server dist loopback phục vụ test, không phải backend dữ liệu.

## Hydration và checkpoint

UI chờ đọc kho trước khi cho nhập. Phục hồi tài liệu đang mở, draft, preferences và position; engine luôn dừng, không tự play hoặc mở fullscreen. Position là offset UTF-16 đầu chunk + revision ID + settings; không persist mảng chunk có thể tính lại. Mismatch về đầu và báo rõ.

Coordinator gom thay đổi trong cửa sổ khoảng 1 giây khi trang đang hoạt động, không reset timer theo từng tick. Pause, thay tài liệu/revision yêu cầu flush ngay; blur/hidden/pagehide cũng yêu cầu flush best-effort. Không dựa riêng vào beforeunload. Hàng đợi tuần tự xử lý cả update đến khi promise flush trước vừa kết thúc.

Checkpoint ghi position/preferences/meta; không ghi lại document có reference không đổi. Nội dung/revisions chỉ ghi khi sửa hoặc đổi con trỏ undo. Validation/serialization vẫn xử lý snapshot thư viện trước ghi; chưa tối ưu thư viện sát 32 MiB.

Chỉ báo đã lưu sau transaction thành công và hàng đợi hết. Lỗi quota/transaction/concurrent writer giữ memory, dừng tự retry và cho export/retry. Lỗi đọc ban đầu không cho ghi lên kho chưa đọc: backup session rồi reload. Không tự xóa database lỗi/future schema.

Kill browser/mất điện không bảo đảm flush cuối. Có thể mất tiến độ/draft sau checkpoint gần nhất; browser throttle có thể làm trễ hơn 1 giây. Dừng và chờ đã lưu trước khi đóng là đường an toàn.

## Transaction và multi-tab tối thiểu

Mọi writer kiểm meta.generation trong readwrite transaction, so với generation đã đọc; thành công tăng generation. Tab stale bị chặn, giữ memory để backup. Không tự merge edits hoặc refresh tab đang đọc; không thêm workflow BroadcastChannel hay conflict system FSRS.

Restore parse/validate/merge preview trước, xác nhận rồi flush session và ghi merged snapshot trong một transaction. Lỗi bước cuối rollback cả document/settings/position/meta. UI chỉ nhận restore sau commit. Không có replace/delete.

## Dependency và privacy

Runtime mới: Dexie 4.4.6, không dependency con. Dev mới: fake-indexeddb 6.2.5 chỉ cho integration tests Node; browser tests dùng IndexedDB thật. Schema nhỏ v1 dùng validator runtime rõ ràng nên không thêm Ajv. Version trực tiếp pin exact.

Nội dung render như text; original giữ nguyên Unicode/dấu gạch. CSP production giới hạn script/assets nội bộ. Backup qua Blob URL; restore đọc File tại máy. Không upload/fetch user text, analytics, telemetry, remote DB hoặc API key. IndexedDB theo origin, không sync giữa browser/máy. Backup JSON không mã hóa. Không service worker hoặc offline app-shell guarantee.

Nguồn API: [Dexie transaction](https://dexie.org/docs/Dexie/Dexie.transaction()), [schema design](https://dexie.org/docs/Tutorial/Design), [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB).
