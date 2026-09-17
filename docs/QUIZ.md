# Quiz local — M3c

Chỉ trắc nghiệm một đáp án đúng, 2–6 lựa chọn. Không có API AI, chấm tự luận, dự đoán điểm, dashboard, tài khoản hay backend. Reader và thao tác ôn FSRS giữ nguyên.

## Nội dung và identity

Study Pack v2 giữ mọi trường v1 và thêm hai mảng bắt buộc `quizzes`, `questions`. Pack v1 vẫn đọc/xuất nguyên v1; khi tạo quiz trong pack v1 mới nâng pack đó lên v2. Flashcard không cần đổi định dạng.

`Quiz`: `id`, `packId`, `title`, `description`, `questionIds` theo thứ tự; `deckId` tùy chọn phải tồn tại trong pack. Quiz rỗng dùng làm bản đang soạn, không thể bắt đầu lượt làm bài.

`QuizQuestion`: `id`, `prompt`, `choices: [{id,text}]`, `correctChoiceId`, `revision`; tùy chọn `image`, `explanation`, `tags`, `source`. Mỗi choice có ID riêng trong câu, giữ ID khi sửa chữ; xóa/thêm lựa chọn tạo identity mới. ID câu/quiz/pack/deck/card không trùng trong toàn thư viện. `correctChoiceId` phải trỏ vào một choice của câu; không dùng index để chấm. Image dùng chính validator HTTPS/alt/caption/essential của flashcard. Text là dữ liệu, không parse HTML.

Giới hạn mỗi pack: 100 quiz, 2.000 câu hỏi; mỗi quiz tối đa 200 câu không trùng; choice 2–6, text <=2.000 ký tự; prompt/explanation <=10.000; title <=120, description <=2.000. Các giới hạn pack 8 MiB, JSON depth 10 và backup 32 MiB vẫn áp dụng. Import theo parse → validate → preview (số quiz/câu) → conflict → xác nhận → transaction. Cùng pack ID khác nội dung bị chặn, không import một phần.

## Lượt làm bài cá nhân

`QuizAttempt` trong store `quiz`, không trong Study Pack. Fields: `id`, `quizId`, `packId`, `title` tại lúc bắt đầu, `mode`, UTC `startedAt`/`completedAt` (null khi chưa nộp), `revision`, `current`, `seed`, `shuffleQuestions`, `shuffleChoices`, `questionOrder`, `items`, `result`.

Mỗi item giữ bản chụp toàn bộ question và revision, `choiceOrder`, `selectedChoiceId` (null nếu bỏ trống), `submitted` cho Practice, `unavailable`, `mediaReady`, `flagged`. Bản chụp gồm đáp án/giải thích để lượt đang làm và lịch sử vẫn dùng được sau sửa/xóa quiz/pack. Nội dung chia sẻ và lịch sử không tự hòa trộn khi reimport. Câu đã làm trong Practice và bài đã nộp không sửa được. Lịch sử hiển thị tên, thời gian, mode, đúng/tổng; mở lại để xem từng câu.

Fisher–Yates với nguồn Mulberry32 có seed uint32 lấy từ `crypto.getRandomValues`; đây là randomization cho thứ tự, không thuật toán bảo mật. Thứ tự câu và lựa chọn thật được lưu một lần, không sinh lại khi reload. Con trỏ `activeAttemptId` lưu cả thao tác mở/đóng lịch sử, để reload mở đúng lượt đã chọn ngay cả khi có nhiều bài dở dang. Con trỏ là trạng thái điều hướng dùng chung các tab (lần thao tác cuối thắng), nhưng đáp án luôn có revision guard riêng. Test inject seed/clock. Bắt đầu dùng attempt ID để chống tạo trùng khi retry; mọi cập nhật có expected revision trong transaction, tab cũ bị từ chối và tải trạng thái mới. Chọn, điều hướng, flag đều chờ lưu thành công; lỗi quota không ghi một phần, có thể thao tác lại. Giới hạn 200 attempts, tối đa 200 câu/attempt và tổng backup 32 MiB; vượt giới hạn bị chặn rõ ràng, không tự xóa lịch sử.

## Practice và Test

- Practice: chọn → **Kiểm tra câu trả lời** → khóa lựa chọn, hiển thị đúng/sai bằng chữ, chỉ rõ đáp án đúng/lựa chọn sai và giải thích → câu tiếp. Có thể quay lại xem. Nộp toàn bài yêu cầu mọi câu đã được chốt hoặc loại do ảnh thiết yếu.
- Test: chọn, bỏ chọn, điều hướng và đánh dấu. Trước nộp không render giải thích, đáp án đúng hoặc nhận xét đúng/sai. **Nộp toàn bài** hiển thị số câu bỏ trống, số câu loại và xác nhận; có thể quay lại. Sau nộp mới hiện kết quả và review. Không có khóa chống gian lận: dữ liệu local/JSON có đáp án, DevTools có thể đọc. Đây không phải hệ thống thi có giám sát.
- Điểm = câu đúng / tổng câu đủ dữ liệu để chấm; câu bỏ trống tính sai. Hiển thị raw count và phần trăm chỉ của lượt này, cùng đã/chưa trả lời và số câu loại. Nếu tất cả câu bị loại, hiển thị không có câu đủ dữ liệu, không chia cho 0 và không đưa phần trăm.

## Ảnh ngoài và offline

Ảnh HTTPS chỉ tải sau nút **Tải ảnh câu hỏi**, `crossOrigin=anonymous`, `referrerPolicy=no-referrer`. Không upload/proxy/cache media hoặc nhúng HTML/base64. Câu ảnh thiết yếu khóa lựa chọn đến khi load thành công. Nếu ảnh hỏng, bị CORS, offline hoặc người dùng không thể tải: chủ động **Đánh dấu ảnh không khả dụng**, khóa câu, xóa lựa chọn, loại khỏi mẫu số và báo số câu bị loại. Không tự tính sai hoặc tự loại âm thầm. Câu ảnh không thiết yếu có thể tiếp tục với chữ.

Logic quiz, chấm, lưu, lịch sử và resume đều local; sau khi app shell đã tải có thể làm bài offline. Chưa có PWA/service worker: không hứa lần tải đầu hoặc reload không mạng sẽ có app shell. Ảnh ngoài không được bảo đảm offline.

## Persistence, backup và FSRS

DB Dexie v5/native50 thêm store `quiz` aggregate `{id:'quiz', generation, attempts, activeAttemptId}`; migration từ v4 giữ reader/content/review. `IndexedDbQuiz` là boundary; React không gọi IndexedDB trực tiếp. Ghi quiz chỉ thay store quiz; không gọi scheduler, không tạo ReviewEvent, không ánh xạ đúng/sai thành Good/Again. Ghi reader/content và review bảo toàn attempts mới nhất.

Personal Backup v5 gồm `data.quizAttempts` và `data.quizActiveAttemptId`, đọc v1/v2/v3/v4 bằng migration thêm mảng rỗng, giữ reader/flashcard/FSRS. Xuất backup đọc dữ liệu cá nhân hiện tại trong transaction. Restore gộp attempt IDs: khác ID thêm, cùng ID hoàn toàn giống bỏ qua, cùng ID khác snapshot/trạng thái chặn toàn bộ. Kiểm generation riêng của review và quiz trước ghi; rollback nếu một bên đổi trong lúc xác nhận. JSON kiểm lại result bằng selected IDs, order là permutation đúng, timestamps/revisions/refs hợp lệ. Study Pack export từ chối mọi trường attempts/scores/history/flags/scheduling.

## Giới hạn M3c

Không nhiều đáp án đúng, thời gian đếm ngược, xóa lịch sử từng attempt, chia sẻ tiến độ, analytics hay tự ghi FSRS. Chưa có điều phối thao tác đồng thời tự merge: tab cũ phải xem dữ liệu vừa tải lại rồi chọn tiếp. Người dùng nên xuất backup trước khi chạm giới hạn lịch sử; M3c không có tự dọn dữ liệu. Trình soạn hỗ trợ title/description, prompt, 2–6 choices, đúng một choice, explanation, URL/alt/essential, sửa/xóa câu và đưa câu lên. Tags/source và deck reference nhận qua JSON nhưng chưa có control riêng trong editor. Không có quiz/attempt deletion riêng, xóa pack vẫn giữ lịch sử theo snapshot.
