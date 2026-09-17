# Kiến trúc M3a

Baseline M2: da305cc. M3a thêm nội dung Study Pack, editor và import/export; giữ engine RSVP, fullscreen và luồng TXT/paste/PDF.

## Ranh giới

- src/ui/App.tsx: UI, lựa chọn tài liệu, adapter keyboard/fullscreen/visibility, hydrate state và gửi snapshot cho application. Không có lệnh IndexedDB/transaction trong React. UI tạo adapter tại điểm lắp ghép.
- src/application/document.ts: tạo document/revision bất biến, TXT UTF-8, sửa/undo; cấp UUID và timestamp.
- src/application/library.ts: interface ReaderStorage, dữ liệu thư viện, kiểm resume và coordinator Persistence. Application không phụ thuộc kiểu Dexie.
- src/application/backup.ts: validator runtime, xuất Personal Backup v3, đọc v1/v2/v3, tham chiếu và merge policy; không tải schema hoặc gọi API.
- src/application/study-pack.ts: contract Study Pack v1, parse/validate/canonicalize, giới hạn, merge policy và các thao tác nội dung thuần; không có scheduling hoặc storage API.
- src/ui/StudyArea.tsx: editor, preview import và xem từng mặt thẻ; chỉ chuyển snapshot đã kiểm cho application. RemoteImage chỉ mount img sau opt-in.
- src/application/pdf.ts: lazy-load PDF.js 6.3.289 và worker được Vite đóng gói; File → Uint8Array chuyển cho worker → streamTextContent từng trang → cleanup/destroy.
- src/application/pdf-text.ts: dựng raw text theo thứ tự item, lưu ranh giới trang, cảnh báo hình học và chuẩn hóa whitespace thuần/deterministic.
- src/ui/PdfImport.tsx: preview tạm riêng, progress, hủy, edit/undo; chỉ publish qua createPdfDocument sau khi người dùng xác nhận.
- src/domain/reader.ts: segmentation/duration/ReaderEngine độc lập React/storage; giữ timing, hidden pause và không chạy bù của M1a.
- src/storage/indexed-db.ts: adapter Dexie duy nhất, transaction xuyên năm stores, kiểm generation và immutability nguồn reader. Store packs chứa aggregate StudyPack.
- scripts/serve-built.mjs: server dist loopback phục vụ test, không phải backend dữ liệu.

## Hydration và checkpoint

UI chờ đọc kho trước khi cho nhập. Phục hồi tài liệu đang mở, draft, preferences và position; engine luôn dừng, không tự play hoặc mở fullscreen. Position là offset UTF-16 đầu chunk + revision ID + settings; không persist mảng chunk có thể tính lại. Mismatch về đầu và báo rõ.

Coordinator gom thay đổi trong cửa sổ khoảng 1 giây khi trang đang hoạt động, không reset timer theo từng tick. Pause, thay tài liệu/revision yêu cầu flush ngay; blur/hidden/pagehide cũng yêu cầu flush best-effort. Không dựa riêng vào beforeunload. Hàng đợi tuần tự xử lý cả update đến khi promise flush trước vừa kết thúc.

Checkpoint ghi position/preferences/meta; không ghi lại document có reference không đổi. Nội dung/revisions chỉ ghi khi sửa hoặc đổi con trỏ undo. Validation/serialization vẫn xử lý snapshot thư viện trước ghi; chưa tối ưu thư viện sát 32 MiB.

Chỉ báo đã lưu sau transaction thành công và hàng đợi hết. Lỗi quota/transaction/concurrent writer giữ memory, dừng tự retry và cho export/retry. Lỗi đọc ban đầu không cho ghi lên kho chưa đọc: backup session rồi reload. Không tự xóa database lỗi/future schema.

Kill browser/mất điện không bảo đảm flush cuối. Có thể mất tiến độ/draft sau checkpoint gần nhất; browser throttle có thể làm trễ hơn 1 giây. Dừng và chờ đã lưu trước khi đóng là đường an toàn.

## Transaction và multi-tab tối thiểu

Mọi writer kiểm meta.generation trong readwrite transaction, so với generation đã đọc; thành công tăng generation. Tab stale bị chặn, giữ memory để backup. Không tự merge edits hoặc refresh tab đang đọc; không thêm workflow BroadcastChannel hay conflict system FSRS.

Restore parse/validate/merge preview trước, xác nhận rồi flush session và ghi merged snapshot trong một transaction. Lỗi bước cuối rollback cả document/settings/position/meta/packs. UI chỉ nhận restore sau commit. Restore không replace/delete; editor cho phép sửa/xóa nội dung pack qua cùng transaction, có xác nhận xóa.

## Nội dung Study Pack

Khu vực Study làm reader tạm dừng và ẩn/inert; không thay layout/timing đọc. Mỗi pack chứa decks/cards với ID ổn định; editor tạo UUID, giữ ID khi sửa/chuyển deck và tăng revision. UI xuất hiện thay đổi đã lưu chỉ sau transaction thành công; lỗi giữ form để sửa/xuất, không ghi nửa pack. Shared generation chặn tab stale kể cả khi ghi nội dung học. Adapter theo dõi reference của packs nên checkpoint vị trí đọc không ghi lại packs chưa đổi; xóa có chủ đích đối chiếu ID trong cùng transaction.

DB Dexie v3/native30 thêm store packs, upgrade chỉ đổi meta schema 2→3, giữ upgrade v1→2. Personal Backup v3 thêm packs, v1/v2 normalize packs=[]; schema Study Pack vẫn độc lập v1. Canonicalization dùng thứ tự ID và tag để so sánh nội dung ổn định; trường order điều khiển trình bày. Nhập pack mới hoặc bỏ qua bản trùng hoàn toàn, chặn cùng ID khác nội dung và va chạm child ID; không có merge từng thẻ vào pack đã tồn tại.

Ảnh HTTPS chỉ lưu URL/alt/caption/essential. React render chữ trực tiếp, không HTML renderer. img dùng anonymous CORS/no-referrer, không preload trong editor/import/mặt sau; tải lỗi giữ fallback. CSP chỉ mở img-src https:, script-src giữ self. Không fetch schema/$ref, không media backend/Cache API. Prompt AI là Markdown tĩnh version cùng schema; không runtime API. FSRS sau này phải dùng bảng trạng thái riêng tham chiếu card ID/revision, không thêm lịch ôn vào content model.

## Dependency và privacy

M3a không thêm dependency. Runtime persistence giữ Dexie 4.4.6, PDF dùng pdfjs-dist 6.3.289. fake-indexeddb 6.2.5 chỉ cho integration tests Node; browser tests dùng IndexedDB thật. Các schema dùng validator runtime cục bộ với exact keys nên không thêm Ajv. Version trực tiếp pin exact. Optional dependency @napi-rs/canvas của PDF.js phục vụ Node, không được import/đóng gói trong browser và không dùng để trích xuất.

Nội dung render như text; original giữ nguyên Unicode/dấu gạch. CSP production giới hạn script/assets nội bộ. Backup qua Blob URL; restore đọc File tại máy. Không upload/fetch user text, analytics, telemetry, remote DB hoặc API key. IndexedDB theo origin, không sync giữa browser/máy. Backup JSON không mã hóa. Không service worker hoặc offline app-shell guarantee.

Nguồn API: [Dexie transaction](https://dexie.org/docs/Dexie/Dexie.transaction()), [schema design](https://dexie.org/docs/Tutorial/Design), [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB).

## PDF: tài nguyên và ranh giới thực thi

Chọn PDF dừng reader. UI còn nguyên phía sau modal inert; nhập lỗi/hủy không thay tài liệu/draft đã có. Publish tạo document source=pdf, revision 0 bằng raw và revision 1 bằng working text nếu khác; engine.load luôn dừng. Checkpoint và backup dùng cùng coordinator M1b, có trạng thái lỗi lưu thực.

Không viewer, scripting manager, canvas rendering, annotation/actions/attachment execution hoặc API server. PDF.js 6 đã bỏ isEvalSupported; không truyền option giả cho API đã xóa. XFA và Wasm bị tắt; CSP giữ script 'self', không unsafe-eval. API chỉ nhận data, không nhận URL do PDF/người dùng cung cấp. CMap/font URL cố định ở pdf-assets cùng origin. Vite phát hành đúng asset và notice của dependency; không cần copy vào source/public hoặc giữ binary PDF trong DB.

Mỗi trang đọc stream theo chunk, kiểm tổng chữ 2 MiB và tối đa 100.000 items/trang, yield event loop giữa chunk/trang. Không gom toàn bộ PDF textContent vào memory. Cuối trang cleanup; cuối task (thành công/lỗi/hủy) destroy để giải phóng worker và byte buffer. AbortSignal chặn đọc trang tiếp và publish kết quả cũ. Hủy không có tùy chọn giữ phần đã trích xuất. File.arrayBuffer đang chạy không thể bị browser API hủy giữa chừng; sau đó không chuyển bytes cho parser nếu đã hủy. Module/asset download đang diễn ra cũng có thể hoàn tất sau hủy.

Giới hạn file 50 MiB được kiểm trước arrayBuffer, page count 500 trước đọc chữ. Timeout PDF.js 120 giây destroy task; không bao gồm tải module/File.arrayBuffer. Đây là giới hạn thực dụng, không sandbox RAM tuyệt đối cho PDF đối nghịch. Không giữ page images; original lặp ở revision 0 theo mô hình M1b, raw preview và working tồn tại tạm trong UI.

Heuristic không dựng layout: giữ thứ tự item, dùng hasEOL/baseline để đặt newline và khoảng cách ngang để thêm space giữa fragments. Cảnh báo khi nhiều x-jumps/y quay ngược, chữ xoay/dọc, nhiều fragments rất ngắn, ít/không chữ hoặc ký tự Unicode đáng kiểm. Không phát hiện mọi sidebar/table/column; tất cả PDF đều có nhắc kiểm thứ tự trước khi đọc. Chuẩn hóa chỉ whitespace, không NFC/NFKC, tự dehyphenate hay sửa chữ.

Nguồn: [PDF.js 6.3.289 release](https://github.com/mozilla/pdf.js/releases/tag/v6.3.289), [API đúng tag](https://github.com/mozilla/pdf.js/blob/v6.3.289/src/display/api.js), [advisory CVE-2024-4367, patched từ 4.2.67](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq).
