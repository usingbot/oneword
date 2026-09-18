# Hướng dẫn sử dụng OneWord

## Sử dụng

1. Mở TXT UTF-8 (tối đa 2 MiB), dán văn bản hoặc thử đoạn mẫu.
2. Chọn **Dùng văn bản**. Có thể chỉnh sửa rồi **Áp dụng thay đổi**; bản gốc giữ riêng. **Hoàn tác** bỏ draft chưa áp dụng hoặc quay lại revision trước.
3. Chọn 1–5 đơn vị, số tùy chỉnh 1–100 hoặc cả câu. WPM đếm đơn vị cách nhau bằng khoảng trắng, không phải phân tích từ tiếng Việt.
4. Bấm phát hoặc focus vùng đọc và nhấn Space. ←/→ lùi/tiến một lượt. Các phím này giữ hành vi bình thường khi đang nhập liệu hoặc focus control.
5. Mở toàn màn hình; Escape hoặc nút **Thoát** để ra. Nếu API bị từ chối, dùng focus view trong cửa sổ. **Ngữ cảnh** luôn tạm dừng.

Chuyển tab/cửa sổ tạm dừng; trở lại cần chủ động tiếp tục. Đổi tốc độ/cách chia lượt cũng tạm dừng. Áp dụng sửa/undo đặt vị trí về đầu và có thông báo. Không có tự nối/xóa dấu gạch.

Chọn tài liệu đã lưu trong thanh dữ liệu hoặc **Tạo văn bản mới**. Reload mở lại tài liệu/draft và vị trí đã lưu, không tự phát. Checkpoint gom khoảng 1 giây, flush khi dừng; chờ **Đã lưu trên thiết bị** trước khi đóng. Khi báo lỗi, giữ trang mở và xuất backup của session.

**Xuất sao lưu** tải JSON tại máy. **Khôi phục sao lưu** kiểm file, cho xem số tài liệu mới/trùng rồi mới xác nhận ghi atomic. Restore chỉ gộp; cùng ID khác nội dung bị chặn toàn bộ. Dữ liệu có sẵn không bị xóa. Giới hạn: 32 MiB/backup, 2 MiB/text, 100 documents, 1.000 revisions/document.

IndexedDB thuộc origin/trình duyệt này; đổi port dev/preview là kho khác. Trình duyệt có thể dọn dữ liệu. Giữ backup JSON ở nơi riêng tư; file không mã hóa. Đóng cưỡng bức có thể mất phần sau checkpoint cuối. [Hướng dẫn phục hồi](RECOVERY.md).

## Cài đặt và ngoại tuyến

Dùng bản production trên HTTPS hoặc localhost; `npm run dev` không đăng ký worker. Chờ **Ứng dụng đã sẵn sàng ngoại tuyến** trong lần mở có mạng, rồi dùng menu cài ứng dụng của trình duyệt nếu được hỗ trợ. Reader, PDF đã trích chữ, flashcards, FSRS, Quiz và Personal Backup dùng được sau khi đóng/mở trang không có mạng. Ảnh HTTPS bên ngoài cần mạng nếu chưa có trong cache HTTP của trình duyệt; OneWord không tự tải/cache ảnh đó.

Khi thấy **OneWord có bản cập nhật mới**, hoàn tất chỉnh sửa/import, dừng đọc, về **Đọc**, đóng các tab OneWord khác rồi chọn **Cập nhật an toàn**. App flush dữ liệu trước reload; không tự tải lại phiên đang học. **Ưu tiên giữ dữ liệu trên thiết bị** là tùy chọn, không thay thế backup hoặc bảo đảm dữ liệu vĩnh viễn. [Ma trận và chiến lược cập nhật](OFFLINE.md).

## Mở PDF

Chọn **Mở PDF** → xem tiến độ trang X/N → đối chiếu cảnh báo và bản trích xuất gốc theo trang → sửa văn bản → **Lưu và tiếp tục đến trình đọc**. Trình đọc không tự phát. Hãy áp dụng/hoàn tác văn bản đang nhập trước khi mở PDF. **Hủy nhập PDF** hoặc Escape bỏ toàn bộ preview, giữ nguyên tài liệu trước đó. Preview chưa lưu; đóng/reload có cảnh báo mất preview.

PDF.js **6.3.289** đọc File bằng worker local, theo từng trang/stream chữ; không render trang ra canvas. PDF, chữ và metadata không upload. PDF.js vẫn import/thực thi khi mở PDF; PWA chuẩn bị trước các byte module/worker/CMaps/font tĩnh cùng origin để dùng ngoại tuyến. Không CDN, không chạy PDF JavaScript, attachment hoặc XFA.

Giữ raw text và ranh giới/cảnh báo từng trang bất biến; bản làm việc chỉ gom tab/space/NBSP, chuẩn hóa CRLF, bỏ khoảng trắng đầu/cuối dòng và gom dòng trống. Giữ Unicode, xuống dòng đơn và mọi dấu gạch nối, kể cả `informa-\ntion`; người dùng có thể tự sửa. Có nút trở về bản chuẩn hóa hoặc dùng raw.

Lưu chữ gốc, revisions, filename, số trang, thời điểm/phiên bản extractor và cảnh báo; **không lưu PDF binary hoặc ảnh trang**. Personal Backup hiện là v5, đọc được v1/v2/v3/v4; DB cũ nâng lên v5 bằng transaction, giữ dữ liệu cũ. App cũ không đọc được kho v5.

Giới hạn: 50 MiB/tệp, 500 trang, 2 MiB chữ và 120 giây cho một lần xử lý PDF.js. PDF ảnh/scan hoặc trắng hoàn toàn báo không có chữ, không tạo tài liệu rỗng; mixed PDF ghi rõ trang thiếu/ít chữ. Chưa OCR và chưa nhập mật khẩu: PDF cần mật khẩu bị từ chối rõ ràng. File hỏng/không có trang/quá giới hạn bị chặn. Hai cột, bảng, footnote, font mapping sai hoặc công thức có thể trích xuất sai; heuristic chỉ cảnh báo, không bảo đảm đúng thứ tự. Không sửa thứ tự tự động.

## Quiz (M3c)

Chọn **Học / Flashcards → Quiz**. Tạo pack nếu chưa có, rồi **Tạo quiz** → lưu tên/mô tả → **Sửa nội dung quiz** → **Thêm câu hỏi**. Soạn 2–6 lựa chọn và chọn đúng một đáp án; có giải thích và ảnh HTTPS tùy chọn. Có thể sửa/xóa/đưa câu lên. Luyện tập chốt từng câu rồi hiện đúng/sai; Kiểm tra chỉ hiện kết quả sau xác nhận nộp toàn bài, cảnh báo câu bỏ trống. Xáo câu/lựa chọn là tùy chọn; reload giữ nguyên thứ tự, đáp án và vị trí đã lưu. Lịch sử cho mở lại bài đã nộp.

Điểm chỉ là đúng/tổng của lượt này. Câu bỏ trống tính sai; câu đánh dấu thiếu ảnh thiết yếu được loại khỏi mẫu số và báo riêng. Quiz không ghi FSRS. Study Pack v2 chia sẻ nội dung quiz (v1 vẫn đọc/xuất được); Personal Backup v5 giữ cả bài đang làm và lịch sử. Chi tiết/giới hạn: [QUIZ.md](QUIZ.md). Prompt ngoài tĩnh mới: [STUDY-PACK-PROMPT-v2.md](STUDY-PACK-PROMPT-v2.md), không API AI trong app.

## Học / Flashcards

Chọn **Học / Flashcards** → **Tạo pack** → đặt tên/mô tả → tạo bộ thẻ → **Tạo thẻ**. Nhập chữ hai mặt, nhãn, nguồn và URL ảnh tùy chọn. **Sửa thẻ** giữ ID, tăng revision và có thể chuyển bộ thẻ; xóa thẻ/pack có xác nhận. Nội dung được lưu sau transaction thành công. Bản sửa đang nhập chưa lưu sẽ có cảnh báo khi rời khu vực học hoặc đóng trang.

Khi xem nội dung chỉ hiện mặt trước; **Xem đáp án** mở mặt sau, **Thẻ tiếp theo** che đáp án lại. Chế độ này không ghi lịch ôn; dùng **Ôn theo lịch** để đánh giá recall và cập nhật FSRS.

**Nhập Study Pack** nhận tệp JSON hoặc nội dung dán → kiểm tra → xem trước và xung đột → xác nhận. Không ghi trước xác nhận. Pack trùng hoàn toàn được bỏ qua; cùng ID khác nội dung/metadata hoặc tái dùng ID con ở pack khác chặn toàn bộ. **Xuất Study Pack** chỉ xuất nội dung của pack đang chọn, giữ ID và quan hệ; không chứa vị trí đọc, thiết lập hoặc trạng thái cá nhân. **Personal Backup v5** chứa thư viện đọc, packs, lịch ôn và quiz attempts cá nhân, dùng luồng sao lưu/khôi phục riêng.

Ảnh chỉ là tham chiếu HTTPS, có alt và tùy chọn caption/essential. Mỗi ảnh cần bấm **Tải ảnh này**; không tải trước trong editor/import hoặc mặt sau đang che. Yêu cầu ảnh không gửi cookie cross-origin/referrer, nhưng máy chủ vẫn nhận IP và có thể nhận Origin; cần máy chủ cho phép CORS. Khi lỗi, giữ mô tả/chú thích và nhắc bỏ qua nếu ảnh thiết yếu. Không upload, proxy hoặc lưu binary ảnh vào kho ứng dụng; cache HTTP bình thường của trình duyệt vẫn có thể hoạt động.

Xem [schema Study Pack v1 và giới hạn](STUDY-PACK-SCHEMA.md). Có [prompt tĩnh v1](STUDY-PACK-PROMPT-v1.md) để tự copy sang AI bên ngoài cùng tài liệu bạn chọn; OneWord không gọi API AI hoặc tự gửi tài liệu.

## Ôn theo lịch

Trong **Học / Flashcards**, chọn deck → **Ôn theo lịch**. Tự nhớ trước, **Mở đáp án**, rồi chọn **Quên / Khó / Nhớ / Dễ**. Quên dành cho quên/sai; Khó chỉ dùng khi nhớ đúng nhưng rất khó. Mặt trước và mặt sau xếp dọc sau reveal; không có rating trước reveal. Space mở đáp án, phím1–4 đánh giá khi focus ở vùng ôn ngoài controls; giữ phím không tạo lượt lặp.

Thẻ đến hạn trước thẻ mới. Mặc định 20 thẻ mới/ngày toàn thư viện, chỉnh 0..200 trong **Thiết lập ôn**; không giới hạn due cards. Ngày học bắt đầu 00:00 theo timezone được lưu lúc mở kho lần đầu, không đổi theo timezone thiết bị về sau. FSRS **ts-fsrs 5.4.2** chạy local với retention mục tiêu0,90 cố định; đây là tham số scheduler, không phải điểm trí nhớ.

**Hoàn tác lượt ôn** phục hồi lịch và allowance khi còn an toàn, giữ dấu lịch sử. **Bỏ qua trong phiên** không ghi rating, dùng khi thiếu ảnh thiết yếu. Thẻ đang learning có thể chưa đến hạn; bấm **Cập nhật hàng đợi** sau thời gian chờ. Sửa/chuyển deck giữ schedule; xóa card bỏ schedule live nhưng giữ audit và lượt mới đã dùng. Tab stale không được ghi đè: ứng dụng tải lại lịch và yêu cầu recall lại.

Personal Backup hiện là **v5**, đọc v1/v2/v3/v4, giữ lịch ôn/events/undo/settings và quiz attempts; DB **v5/native50**. Study Pack **v1/v2 chỉ nội dung**, không mang tiến độ cá nhân. Chờ chuẩn bị ngoại tuyến ở lần mở có mạng để cold start. Xem [chính sách và schema lịch ôn](FLASHCARD-SCHEDULING.md) trước khi trao đổi backup giữa máy; các history khác nhau bị chặn, không tự merge.
