# Hợp đồng dữ liệu OneWord

## M4a — bảo toàn hợp đồng hiện tại

Không đổi schema: DB application/Dexie5, native50; Personal Backup5 đọc1–4; Study Pack1/2. Build ID/cache name là hash tài nguyên tĩnh và worker template, hoàn toàn độc lập schema. CacheStorage `oneword-shell-*` chứa app shell, icons, JS/CSS và tài nguyên PDF.js, không chứa document/PDF gốc/pack/card/schedule/event/attempt/backup/ảnh remote.

Read/migration phải kiểm toàn graph trước commit: meta/generation, documents/revisions/positions, active document/draft, packs, review và quiz. Metadata hiện hữu mà thiếu personal aggregate là lỗi, không tự phục hồi bằng aggregate rỗng. Native version tương lai bị chặn trước ghi. Upgrade bị ngắt hoặc validation thất bại rollback transaction; không deleteDatabase/reset. Browser fixtures thật cho eras1–5 và các lỗi nằm trong `tests/hardening.spec.ts`; missing aggregates/generation/orphan positions có unit/integration bổ sung.

Không đổi giới hạn số/byte của M3c. 200 attempts là trần thư viện đã stress; không có auto-prune. Những trần per-record không có nghĩa toàn bộ có thể đồng thời vừa backup32MiB. Không chỉnh thời điểm lịch ôn, ID chấm quiz, order đã lưu hoặc snapshot history khi cập nhật app. Thao tác lấy checkpoint sau reload có thể đổi meta generation/position.updatedAt; content, offset/revision/settings và các personal aggregates phải giữ nguyên.

Các phần M3b bên dưới là lịch sử; phiên bản hiện tại là phần M3c và M4a, không phải v4.

## M3c — hợp đồng bổ sung hiện tại

Study Pack v2 thêm `quizzes`/`questions` bắt buộc, giữ v1 nguyên định dạng cho pack chưa có quiz. Choice ID scoped trong câu; question/quiz ID duy nhất toàn content library. Attempt personal tách riêng, giữ snapshot revision/nội dung và thứ tự thực tế. Personal Backup v5 thêm `quizAttempts` và con trỏ `quizActiveAttemptId`; v1–v4 migrate thêm [] và giữ review data. DB v5/native50 thêm store quiz. Attempt cùng ID khác nội dung/trạng thái chặn restore toàn bộ; ID mới gộp, bản giống nhau no-op. Validator tính lại kết quả từ IDs, kiểm order/refs/time/limits. Chi tiết schema/giới hạn/ảnh: [QUIZ.md](QUIZ.md). Các version v4 trong phần lịch sử bên dưới mô tả M3b.


## Thay đổi hiện tại từ M3a

DB Dexie4/native40 thêm store review, key id=review: `{id,generation,data:{settings,schedules,events,undos}}`. Meta schemaVersion4; bốn stores reader và packs giữ keys/shape. Migration v3→v4 thêm review mặc định, giữ toàn bộ documents/positions/settings/draft/packs/generation. Schedule theo cardId, tách khỏi Study Packv1; event/undo immutable, có UTC instants và contentRevision. [Schema đầy đủ, giới hạn và invariants](FLASHCARD-SCHEDULING.md).

Personal Backup hiện **v4**, data thêm `review`. Parse v1/v2 thêm packs=[] và review rỗng; parse v3 giữ packs và thêm review rỗng; phiên bản>4 bị chặn. Snapshot state cần cho ts-fsrs5.4.2 được giữ đủ để exact restore; không recompute schedule khi restore. Không mang review generation nội bộ kho sang máy khác. Personal review histories khác nhau chặn toàn bộ restore, không merge ngầm; adapter kiểm generation và conflict trong transaction.

Xóa card/pack prune live schedules trong cùng transaction; events/undo còn như tham chiếu audit tới card đã xóa. Sửa/chuyển deck không xóa lịch. Limit mới được derive từ events chưa undo trong studyDay timezone cố định, nên atomic cùng sự kiện. Reader checkpoint chỉ ghi dữ liệu reader/content và giữ review authoritative đang có.

Các mục sau mô tả hợp đồng reader/content tiếp tục được giữ. Study Pack schema vẫn1.

## Database

Tên: oneword-reader. Schema application/Dexie 4; native IndexedDB version 40 do Dexie biểu diễn version theo bội số 10. Giữ stores/keys reader/packs và thêm review.

| Store / key | Nội dung |
| --- | --- |
| documents / id | TextDocument, original/metadata và mảng revisions |
| positions / documentId | Vị trí mới nhất của từng tài liệu |
| settings / id=reader | Preferences hiện tại |
| meta / id=library | schemaVersion, generation, activeDocumentId, draft |
| packs / id | StudyPack v1 chứa decks/cards, chỉ nội dung |
| review / id=review | generation và aggregate settings/schedules/events/undos cá nhân |

Revision nhúng trong aggregate document để ghi nguyên lịch sử undo cùng con trỏ. Original lặp trong revision 0 có chủ đích: nguồn bất biến và mốc undo của cùng mô hình. Không lưu mảng chunk, search index hoặc media binary; lịch ôn cá nhân ở store review riêng.

## Study Pack v1

Hợp đồng chuẩn, ví dụ đầy đủ và giới hạn ở [STUDY-PACK-SCHEMA.md](STUDY-PACK-SCHEMA.md); runtime validator ở src/application/study-pack.ts. Pack có type/schemaVersion/id/title/description/timestamps, optional author/source, mảng decks/cards. Deck trỏ packId; card trỏ deckId, có front/back {text,image?}, order/revision, optional tags/source. Image chỉ HTTPS URL/alt/caption?/essential?. IDs ổn định, không dựa vị trí mảng; unique xuyên mọi pack/deck/card trong thư viện, tách namespace khỏi ID tài liệu reader.

Giới hạn 8 MiB/pack, 100 decks/5.000 cards mỗi pack; 100 packs/10.000 cards toàn thư viện. Text tối đa 10.000 ký tự/mặt, URL 2.048. Exact keys và quan hệ được kiểm trước ghi. Không HTML renderer, base64/data URL, schema từ xa hoặc scheduling fields trong Study Pack. Export Study Pack v1 chỉ content; Personal Backup v4 là đường riêng chứa cả content và user state.

Editor giữ card ID khi sửa/chuyển deck, tăng revision mỗi Save; xóa thẻ/pack có xác nhận. Chưa có history/undo biên tập nội dung; undo review là luồng riêng. Mỗi save/import/delete nội dung ghi atomic cùng generation chung của reader. Toàn bộ pack là aggregate; không có record thẻ mồ côi. Runtime freeze nội dung đã validate. Nội dung sửa thủ công được ghi có chủ đích; import không tự ghi đè.

## Document / revision

TextDocument: id UUID, source (paste, txt hoặc pdf), name (nhãn/tên file, tối đa 256 ký tự), createdAt ISO UTC, version nguyên dương, original, revisions, revision (index bản sửa hiện hành). Chỉ source=pdf có thêm trường pdf bắt buộc; paste/txt giữ đúng shape M1b.

TextRevision: id UUID riêng, documentId, number tăng dần trong lịch sử còn giữ, text, createdAt ISO UTC. Revision 0 phải khớp original nguyên văn. Document và từng revision freeze trong memory. Storage kiểm immutable metadata/original và text của revision ID đã tồn tại.

Apply tạo revision ID mới và tăng version; nội dung không đổi không tạo revision. Undo draft trước rồi lùi con trỏ revision, tăng version. Sửa sau undo giữ ngữ nghĩa M1a: bỏ nhánh redo, tạo revision mới, không tái sử dụng number. Chưa có redo/history nhánh đầy đủ. Edit/undo đặt vị trí về đầu và thông báo.

TXT UTF-8 strict, giữ CRLF/dấu gạch trong original; textarea có thể normalize newline khi sửa. Text nguồn/revision/draft tối đa 2 MiB UTF-8, không NUL. Mở TXT nhận .txt, Mở PDF nhận .pdf. Tối đa 100 documents, 1.000 revisions/document và snapshot xuất được trong 32 MiB. Nếu vượt giới hạn thì không ghi; session giữ trong memory, có thể copy text ra ngoài.

### Nguồn PDF

pdf: {pageCount: 1..500, extractedAt: ISO UTC, extractor: string tối đa 80 ký tự, pages: PdfPageInfo[]}.

PdfPageInfo: {number: số trang liên tiếp từ 1, start: offset UTF-16, end: offset UTF-16, warnings: enum[]}. Số records phải bằng pageCount. Trang đầu start=0, mỗi trang sau start=end trước+2, hai ký tự ngăn trang trong original là `\n\n`; end cuối bằng original.length. Trang trống có start=end. Cảnh báo không trùng, chỉ nhận no-text/little-text/reading-order/fragmented/unicode.

original là chuỗi raw do PDF.js text items tạo ra với disableNormalization=true, giữ item.str nguyên văn, thêm newline theo hasEOL/baseline và space theo gap; không phải byte gốc hay lời hứa tái tạo layout. Không lưu bản PDF, ảnh, password, author/title metadata nội bộ PDF hoặc JavaScript. Filename ở name; ranh giới page cho phép lấy raw từng trang mà không lưu thêm một bản text theo page.

Working text thu gọn tab/space/NBSP, CRLF→LF, trim từng dòng và gom từ 3 newline thành 2; không xóa newline đơn/dấu gạch/Unicode. Khi xác nhận, revision 0=raw bất biến, revision tiếp theo=working nếu khác. Metadata PDF được deep-freeze và storage chặn sửa cùng original. Chỉnh/undo về sau không đổi nguồn; backup/restore giữ nguyên metadata/offsets.

## Position / settings / draft

ReadingPosition: documentId, revisionId, offset UTF-16 đầu chunk (không phải chunk index), settings {mode, words, wpm, punctuation}, updatedAt ISO UTC. References phải tồn tại; offset không vượt độ dài revision. Khi mở, revision không còn hiện hành hoặc offset không ở đầu chunk theo settings đã lưu thì về 0 và thông báo.

Reload không autoplay. Không persist remaining milliseconds của chunk; chunk phục hồi được đọc lại đủ thời lượng. Settings riêng trên position giúp mở từng tài liệu đúng chunk; preferences là cấu hình hiện tại để tạo tài liệu mới.

Preferences: reader như trên, glow, progress, fontSize. Defaults: words/1 từ, 300 WPM, punctuation/glow/progress bật, font 48px. Bounds: 1–100 từ, 30–1200 WPM nguyên, font 28–80px. Không persist fullscreen/toolbar/context.

activeDocumentId: UUID hoặc null. draft: null hoặc {documentId: UUID|null, text}, phải khớp tài liệu đang mở hoặc văn bản mới. Đổi tài liệu khi dirty yêu cầu apply/undo; mở TXT khi dirty có xác nhận bỏ draft. Tài liệu đã áp dụng trước vẫn giữ trong thư viện.

## Personal Backup v4 (đọc được v1/v2/v3)

Envelope có đúng bốn trường:
- type: oneword-personal-backup
- schemaVersion: 4
- exportedAt: ISO UTC, ví dụ 2026-09-16T00:00:00.000Z
- data: {documents, positions, preferences, activeDocumentId, draft, packs, review}

Các record trong data dùng contract ở trên. Backup chứa reader state, nội dung packs và review state đã lưu; chưa chứa form thẻ đang sửa. Reader memory/draft chưa checkpoint vẫn được xuất khi hợp lệ. v1/v2 dùng shape data cũ không có packs; normalize packs=[]; v1/v2/v3 thêm review rỗng và envelope v4, giữ IDs/revisions/draft/settings. v1 chỉ paste/txt, có PDF bị reject; v2/v3 cho PDF. Future version >4 bị reject. App cũ không nhận backup v4. Không mang generation nội bộ DB sang máy khác. Xuất tại client, không request server; JSON không mã hóa.

Validator runtime kiểm exact keys, types/ranges, UUID trùng, liên kết document/revision/position/draft, original-revision0 và timestamps. Kiểm 32 MiB trước đọc file/parse, depth tối đa 12 trước JSON.parse (ngoặc trong string không tính). Reject sai type, future version, malformed/large JSON, unknown fields. Không eval, remote schema hoặc $ref.

## Restore / conflict

Select → parse/validate → merge preview đếm mới/trùng → confirm → atomic write. Preview không ghi backup vào DB; checkpoint session bình thường có thể hoàn tất độc lập. Revalidate merge khi confirm, kiểm generation trong transaction.

- ID document mới: thêm cả aggregate revisions và position.
- Cùng ID, toàn bộ document record giống nhau: no-op document, giữ position local.
- Cùng ID khác bất kỳ trường/revision/version: chặn toàn bộ restore. Revision ID trùng giữa documents cũng bị reject.
- Thư viện có dữ liệu: giữ preferences, active document và draft local; thêm tài liệu mới để chọn mở.
- Pack mới thêm; pack trùng toàn bộ canonical content/metadata bỏ qua; cùng ID khác nội dung hoặc child ID trùng pack khác chặn toàn bộ restore, kể cả phần reader.
- Không có documents, packs và draft: nhận preferences/active/draft của backup.
- Không delete/replace/silent overwrite. Chưa có import-as-copy hoặc chọn bản thắng cho conflict. Không có bước phá hủy đòi backup trước xóa; nút export luôn sẵn.

## Migration / failure

M1a không có DB. M3b giữ upgrade1→2→3, thêm4 và review aggregate. Upgrade giữ documents/positions/settings/draft/packs/generation, thêm review mặc định; meta sai abort/rollback. Native version phải40 ở mỗi read/write; kho tương lai bị chặn, không xóa. App cũ chặn native40; tab cũ phải đóng connection khi versionchange trước nâng cấp. Không hỗ trợ hạ schema. Unit/integration kiểm M1b/M2/M3a migration và rollback; browser kiểm migration reader và backup4 reader/packs/review.

Read failure không ghi đè kho chưa đọc. Save failure giữ memory, báo chưa lưu; retry vẫn kiểm generation. Browser có thể xóa IndexedDB, quota/lifecycle không bảo đảm durability tuyệt đối. Dữ liệu theo origin: dev/preview khác port là kho khác; backup dùng chuyển thủ công, không phải sync hay Study Pack.
