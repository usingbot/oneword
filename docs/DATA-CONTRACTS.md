# Hợp đồng dữ liệu M1b

## Database

Tên: oneword-reader. Schema application/Dexie 1; native IndexedDB version 10 do Dexie biểu diễn version theo bội số 10.

| Store / key | Nội dung |
| --- | --- |
| documents / id | TextDocument, original/metadata và mảng revisions |
| positions / documentId | Vị trí mới nhất của từng tài liệu |
| settings / id=reader | Preferences hiện tại |
| meta / id=library | schemaVersion, generation, activeDocumentId, draft |

Revision nhúng trong aggregate document để ghi nguyên lịch sử undo cùng con trỏ. Original lặp trong revision 0 có chủ đích: nguồn bất biến và mốc undo của cùng mô hình. Không lưu mảng chunk, search index, media hoặc dữ liệu học.

## Document / revision

TextDocument: id UUID, source (paste hoặc txt), name (nhãn/tên file, tối đa 256 ký tự), createdAt ISO UTC, version nguyên dương, original, revisions, revision (index bản sửa hiện hành).

TextRevision: id UUID riêng, documentId, number tăng dần trong lịch sử còn giữ, text, createdAt ISO UTC. Revision 0 phải khớp original nguyên văn. Document và từng revision freeze trong memory. Storage kiểm immutable metadata/original và text của revision ID đã tồn tại.

Apply tạo revision ID mới và tăng version; nội dung không đổi không tạo revision. Undo draft trước rồi lùi con trỏ revision, tăng version. Sửa sau undo giữ ngữ nghĩa M1a: bỏ nhánh redo, tạo revision mới, không tái sử dụng number. Chưa có redo/history nhánh đầy đủ. Edit/undo đặt vị trí về đầu và thông báo.

TXT UTF-8 strict, giữ CRLF/dấu gạch trong original; textarea có thể normalize newline khi sửa. Text nguồn/revision/draft tối đa 2 MiB UTF-8, không NUL. Chỉ mở .txt. Tối đa 100 documents, 1.000 revisions/document và snapshot xuất được trong 32 MiB. Nếu vượt giới hạn thì không ghi; session giữ trong memory, có thể copy text ra ngoài.

## Position / settings / draft

ReadingPosition: documentId, revisionId, offset UTF-16 đầu chunk (không phải chunk index), settings {mode, words, wpm, punctuation}, updatedAt ISO UTC. References phải tồn tại; offset không vượt độ dài revision. Khi mở, revision không còn hiện hành hoặc offset không ở đầu chunk theo settings đã lưu thì về 0 và thông báo.

Reload không autoplay. Không persist remaining milliseconds của chunk; chunk phục hồi được đọc lại đủ thời lượng. Settings riêng trên position giúp mở từng tài liệu đúng chunk; preferences là cấu hình hiện tại để tạo tài liệu mới.

Preferences: reader như trên, glow, progress, fontSize. Defaults: words/1 từ, 300 WPM, punctuation/glow/progress bật, font 48px. Bounds: 1–100 từ, 30–1200 WPM nguyên, font 28–80px. Không persist fullscreen/toolbar/context.

activeDocumentId: UUID hoặc null. draft: null hoặc {documentId: UUID|null, text}, phải khớp tài liệu đang mở hoặc văn bản mới. Đổi tài liệu khi dirty yêu cầu apply/undo; mở TXT khi dirty có xác nhận bỏ draft. Tài liệu đã áp dụng trước vẫn giữ trong thư viện.

## Personal Backup v1

Envelope có đúng bốn trường:
- type: oneword-personal-backup
- schemaVersion: 1
- exportedAt: ISO UTC, ví dụ 2026-09-16T00:00:00.000Z
- data: {documents, positions, preferences, activeDocumentId, draft}

Các record trong data dùng contract ở trên. Backup chứa toàn bộ dữ liệu cá nhân M1b, cả memory chưa lưu khi xuất được. Không mang generation nội bộ DB sang máy khác. Xuất tại client, không request server; JSON không mã hóa.

Validator runtime kiểm exact keys, types/ranges, UUID trùng, liên kết document/revision/position/draft, original-revision0 và timestamps. Kiểm 32 MiB trước đọc file/parse, depth tối đa 12 trước JSON.parse (ngoặc trong string không tính). Reject sai type, future version, malformed/large JSON, unknown fields. Không eval, remote schema hoặc $ref.

## Restore / conflict

Select → parse/validate → merge preview đếm mới/trùng → confirm → atomic write. Preview không ghi backup vào DB; checkpoint session bình thường có thể hoàn tất độc lập. Revalidate merge khi confirm, kiểm generation trong transaction.

- ID document mới: thêm cả aggregate revisions và position.
- Cùng ID, toàn bộ document record giống nhau: no-op document, giữ position local.
- Cùng ID khác bất kỳ trường/revision/version: chặn toàn bộ restore. Revision ID trùng giữa documents cũng bị reject.
- Thư viện có dữ liệu: giữ preferences, active document và draft local; thêm tài liệu mới để chọn mở.
- Không có documents và không có draft: nhận preferences/active/draft của backup.
- Không delete/replace/silent overwrite. Chưa có import-as-copy hoặc chọn bản thắng cho conflict. Không có bước phá hủy đòi backup trước xóa; nút export luôn sẵn.

## Migration / failure

M1a không có DB nên không có dữ liệu persist cần chuyển. Version tương lai phải giữ khai báo v1 và thêm version mới cùng upgrade transaction, test migration/rollback trước phát hành; không delete DB để migrate. Backup version riêng, converter tương lai tạo dữ liệu hợp lệ trước transaction. M1b chặn native DB version mới hơn ngay cả khi Dexie mở được cấu trúc tương thích; giữ dữ liệu.

Read failure không ghi đè kho chưa đọc. Save failure giữ memory, báo chưa lưu; retry vẫn kiểm generation. Browser có thể xóa IndexedDB, quota/lifecycle không bảo đảm durability tuyệt đối. Dữ liệu theo origin: dev/preview khác port là kho khác; backup dùng chuyển thủ công, không phải sync hay Study Pack.
