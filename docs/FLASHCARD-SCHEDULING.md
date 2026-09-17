# Lịch ôn M3b

## Thư viện và ranh giới

OneWord dùng **ts-fsrs 5.4.2**, FSRS-6, pin exact; chỉ thêm package này, không dependency con hoặc optimizer. Đã đối chiếu [release v5.4.2](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v5.4.2), README và dist/index.d.ts của package đã cài. Node >=20, phù hợp Windows22/WSL24. [Card API](https://open-spaced-repetition.github.io/ts-fsrs/interfaces/Card.html) và [parameters](https://open-spaced-repetition.github.io/ts-fsrs/interfaces/FSRSParameters.html) mô tả state/steps cần giữ. Notice upstream được giữ nguyên ở public/notices/ts-fsrs-5.4.2.txt, được Vite copy vào dist; đây không phải lựa chọn license cho OneWord.

UI ReviewPanel → ReviewGateway → IndexedDbReview transaction → fsrs-adapter.scheduleRecall → ts-fsrs.next. Chỉ adapter import ts-fsrs trong runtime; test đối chiếu thư viện thật. Không có công thức FSRS tự viết, remote scheduler hoặc optimizer. Adapter chuyển Date ↔ ISO UTC và enum ↔ tên trạng thái của ứng dụng. Clock được inject vào storage; UI dùng giờ hiện tại khi đọc/cập nhật hàng đợi. M3b không hiển thị interval preview.

Profile `ts-fsrs@5.4.2/oneword-v1`: weights mặc định từ đúng package pin, desired retention **0.90**, maximum interval **36500 ngày**, short term bật, fuzz tắt để quyết định có thể tái hiện. Learning steps `1m,10m`, relearning `10m` là cấu hình bước học được thư viện hỗ trợ; khoảng ôn dài do FSRS tính. Không tuyên bố những steps này là công thức FSRS. Retention cố định ở M3b, không có slider hoặc điểm trí nhớ; đổi profile/version về sau cần migration/test, không tự reschedule toàn bộ.

## Nội dung và trạng thái cá nhân

Study Pack giữ nguyên **schemaVersion1**, chỉ nội dung. Card không có due/stability/difficulty/history/retention/limits. Schedule theo stable cardId; edit text/ảnh/tags hoặc move deck giữ schedule/history. Event ghi contentRevision lúc được chấm, không lưu bản copy chữ thẻ.

Personal Backup **v4** thêm `data.review = {settings,schedules,events,undos}`. Tất cả object reject unknown fields, timestamps đúng ISO UTC milliseconds, IDs chuỗi hợp lệ, số hữu hạn/bounded, tham chiếu/snapshot/sequence được kiểm. Runtime contract: review.ts và review-validation.ts.

| Record | Fields |
| --- | --- |
| ReviewSettings | newPerDay (0..200), timeZone, desiredRetention=0.9, scheduler=profile ID |
| CardSchedule | cardId, revision (tăng đơn điệu), state (SchedulerState hoặc null), lastEventId (hoặc null) |
| SchedulerState | state=learning/review/relearning; due, lastReview UTC; stability, difficulty, elapsedDays, scheduledDays, learningSteps, reps, lapses |
| ReviewEvent | id (operation ID), cardId, rating, reviewedAt UTC, studyDay, contentRevision, before (Schedule hoặc null), after, settings snapshot, sequence |
| ReviewUndo | id (operation ID), eventId, undoneAt UTC, sequence, after (schedule phục hồi với revision mới) |

Card chưa học không cần schedule row. Undo về trạng thái mới tạo schedule với state=null/lastEventId=null; giữ revision để thao tác cũ không thể quay lại ghi như lần đầu. `elapsedDays` vẫn giữ vì Card API5 yêu cầu dù upstream đánh dấu deprecated. Không lưu thêm interval/string label hoặc số lần nhớ từ giá trị có thể suy ra.

ReviewEvent bất biến. Dấu undone là sự hiện diện của ReviewUndo tham chiếu event, cũng bất biến; không sửa/xóa event để giả vờ lượt chưa xảy ra. Sequence chung của rating/undo phục vụ thứ tự audit và validation. Khôi phục replay liên kết before/after và undo snapshots, không chạy lại FSRS hoặc thay due.

Giới hạn 10.000 schedules, 20.000 review events, tối đa một undo/event; sequence/revision/count <=1.000.000 và tổng Personal Backup <=32 MiB. Vượt giới hạn thì transaction thất bại rõ ràng; không tự cắt lịch sử. Chưa có archive/compaction history.

## Ngữ nghĩa và queue

Theo [Anki rating semantics](https://docs.ankiweb.net/studying.html): **Quên/Again** nếu quên hoặc sai đáng kể; **Khó/Hard** nếu nhớ đúng nhưng rất khó; **Nhớ/Good** nếu nhớ đúng với cố gắng bình thường; **Dễ/Easy** nếu nhớ đúng gần như ngay. Khó không thay cho Quên. Không tự đánh giá dựa trên thời gian đọc, RSVP hoặc quiz.

Người dùng chọn deck → Ôn theo lịch → một mặt trước → chủ động recall/reveal → front và back xếp dọc → bốn rating. Rating không xuất hiện trước reveal. Space reveal và phím1–4 chỉ trong vùng ôn ngoài controls/editor; bỏ qua KeyboardEvent.repeat. Preview nội dung M3a vẫn tách riêng và không ghi lịch. Skip chỉ loại thẻ khỏi phiên trong memory, không tạo rating; Cập nhật hàng đợi xóa skip. Thiếu ảnh essential được nhắc bỏ qua, không tự ghi Again. Ảnh giữ nguyên opt-in HTTPS/CORS/no-referrer, không là điều kiện cho scheduler chạy.

1. Mọi schedule có due <= now (learning/relearning/review) đi trước thẻ mới; sort due UTC rồi cardId.
2. Thẻ mới sort order rồi cardId. Không dùng vị trí mảng làm identity.
3. Mặc định **20 thẻ mới/ngày cho toàn thư viện**, chỉnh 0..200, persist và backup. Không giới hạn hoặc bỏ due cards do quota mới. Chỉ rating đầu khi state trước=null tiêu thụ một lượt mới.
4. Số lượt mới được tính từ events của ngày, loại events đã undo; không lưu counter dư có thể lệch transaction. Xóa card không trả lại lượt đã dùng; undo an toàn trả lại lượt. Xóa rồi nhập lại một card và học từ đầu có thể tiêu thụ thêm lượt mới.
5. Hàng đợi tính lại sau rating/undo/cập nhật. Không ôn sớm thẻ đang learning còn chờ; bấm Cập nhật hàng đợi khi tới hạn. Không tự đổi mặt/thẻ đang recall theo timer. Không persist queue/session offset; rebuild deterministic từ schedules; undo đưa lại card vừa hoàn tác nếu thuộc deck đang mở.

## Timezone và đồng hồ

Ngày học từ **00:00 đến 00:00 trong timezone IANA được lưu lúc tạo/migrate kho**, ban đầu lấy timezone thiết bị, fallbackUTC. M3b không có UI đổi timezone; timezone thiết bị đổi về sau không diễn giải lại ngày lịch sử. Date instants luôn UTC; studyDay YYYY-MM-DD tính qua Intl theo timezone đã lưu, kể cả DST. Chỉnh newPerDay không đổi timezone/retention hoặc reschedule.

Transaction lấy now từ clock, chặn giờ lùi trước action đã ghi gần nhất. Không có giờ server để phát hiện người dùng chủ động đổi đồng hồ về tương lai; đây là giới hạn local-only. Các test dùng UTC cố định, midnight Việt Nam và giờ DST New York.

## Transaction, idempotency và hai tab

DB Dexie **v4/native40**, thêm store `review`, key `id=review`, record `{id,generation,data}`. Đây là aggregate bounded chứa settings/schedules/events/undos; rating/undo/settings ghi một record trong readwrite transaction cùng các stores đang đọc. Không raw Dexie/IndexedDB trong React.

Rating trong transaction: đọc content/schedule/settings thật → kiểm operation ID → kiểm card contentRevision và expected schedule revision → kiểm due/limit/clock → tính FSRS bằng now → tạo schedule/event cùng sequence → validate và kiểm toàn snapshot exportable → put → commit. Lỗi bất kỳ bước nào không có schedule/event/counter dở. Replay cùng eventID và cùng payload trả dữ liệu hiện tại, không tạo event mới; ID đã dùng với payload khác bị chặn. UI lock chỉ hỗ trợ UX; IndexedDB revision + unique operation ID là authority.

Review generation độc lập với reader meta.generation để reader checkpoints không làm stale lịch. Checkpoint reader luôn giữ review live trong kho; không ghi snapshot review cũ từ React. Sửa/xóa content và prune schedule cùng transaction; review action đọc content mới nhất và từ chối card bị sửa/xóa.

Hai tab cùng schedule revision: chỉ transaction đầu thành công. Tab cũ nhận lỗi rõ, đọc snapshot mới, che đáp án và rebuild queue; không tự retry rating trên card mới. Có nút thử lại dùng đúng operation ID cho lỗi lưu/response không chắc chắn, vẫn chịu mọi guard. Không BroadcastChannel cần thiết cho tính nhất quán; không tự động cập nhật màn hình tab khác trước khi họ tương tác.

## Undo, xóa và restore

Undo chỉ action review chưa undo gần nhất toàn thư viện; phải còn card, cùng contentRevision và schedule hiện tại bằng event.after. Lượt mới/sửa/xóa khiến undo không an toàn bị chặn. Restore FSRS state-before chính xác, nhưng schedule revision tăng để chặn ABA; event vẫn giữ nguyên, thêm ReviewUndo. Daily allowance suy ra từ cùng aggregate nên hoàn tác nhất quán. Undo có operationID riêng, replay không ghi hai dấu.

Xóa card/pack theo confirmation M3a: prune schedule đang hoạt động; giữ event/undo audit chứa cardId và revision, không giữ media hoặc chữ thẻ. Đây là tham chiếu lịch sử cho nội dung đã xóa, không phải schedule mồ côi. Reimport ID đã xóa bắt đầu với schedule mới; event cũ vẫn audited. Không có reset progress hàng loạt, analytics hay lịch sử UI nâng cao.

DB nâng v1→v2→v3→v4 trong upgrade transaction, chỉ thêm review default và đổi meta schema, giữ nguyên dữ liệu reader/packs/generation. Meta không hợp lệ abort/rollback. Backup v1/v2/v3 được nâng trong memory với review mặc định rỗng; v1/v2 thêm packs=[] như trước. Backup v4 round-trip cả state/event/undo/settings; internal review generation không chia sẻ.

Restore content giữ conflict policy M3a. Personal review aggregate: đích chưa có hoạt động/thiết lập riêng nhận nguồn; nguồn rỗng không xóa hoạt động hiện tại; dữ liệu giống hệt bỏ qua; hai bộ trạng thái khác nhau chặn toàn bộ. Không merge histories hoặc tự chọn due thắng. Confirmation re-read review và kiểm generation trong transaction; adapter kiểm conflict lại trước ghi. Restore lỗi rollback reader/content/review cùng lúc.

## Giới hạn và privacy

FSRS hoàn toàn local, không network/API/telemetry. Sau khi app đã tải, rating/undo có thể chạy khi mạng offline; chưa có offline app shell/PWA cho cold start. Backup không mã hóa. Lúc storage không đọc được, export session dùng snapshot memory hiện có, có thể thiếu lượt từ tab khác. Giữ bản backup riêng trước cập nhật browser/app.

Chưa có configurable learning steps/fuzz/retention/timezone, interval preview, queue tự refresh, card-history UI, stats/dashboard, sync, accounts, .apkg, AnkiWeb, quiz hoặc optimizer. Giới hạn record/backup là giới hạn thực dụng, chưa benchmark thư viện sát trần; toàn aggregate review được validate/serialize khi ghi. Không hứa tương thích đầy đủ mọi queue policy của Anki.
