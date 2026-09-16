# Bổ sung: flashcard học kiểu Anki

Ngày: 16/09/2026.
**Đã chốt từ người dùng:** học theo kiểu Anki.
**Đề xuất triển khai:** trải nghiệm tự nhớ + lập lịch FSRS chạy cục bộ, không clone toàn bộ Anki.

## Hợp đồng trải nghiệm

Hiện câu hỏi trước. Người học suy nghĩ, chủ động mở đáp án rồi chọn một trong bốn đánh giá:

| Giá trị | Nhãn đề xuất | Ý nghĩa |
| --- | --- | --- |
| Again | Quên | Không nhớ hoặc trả lời sai |
| Hard | Khó | Nhớ đúng nhưng khó khăn |
| Good | Nhớ | Nhớ đúng với mức cố gắng bình thường |
| Easy | Dễ | Nhớ đúng gần như tức thì |

Hard không thay cho Again khi quên. Luồng câu hỏi/đáp án và ý nghĩa các mức được đối chiếu tài liệu Anki [S1–S2]. Có hướng dẫn ngắn cạnh lần ôn đầu; không ép người dùng tự đoán ý nghĩa các nút.

## Đề xuất cho sản phẩm này

- Màn hình bộ thẻ phân biệt mới, đang học và đến hạn. Giới hạn thẻ mới/ngày có thể chỉnh. Chính sách sắp hàng là của ứng dụng, phải viết rõ và test.
- Chỉ nhận đánh giá sau khi mở đáp án. Nhấn đúp/giữ phím không được ghi hai lần.
- Có hoàn tác lượt gần nhất, tạm ngưng thẻ, sửa thẻ và tiếp tục sau reload.
- Không tự lật theo WPM, không chấm điểm theo tốc độ bấm. Luồng RSVP và luồng ôn tập là hai chế độ độc lập.
- Mỗi nút có thể hiển thị thời điểm ôn dự kiến do scheduler tính; không ghi cứng “Khó = 1 ngày, Nhớ = 3 ngày”.
- Không suy ra “đã thuộc” từ vài lần bấm, không hiển thị phần trăm hiểu giả.
- Thẻ mất ảnh thiết yếu: đánh dấu lỗi, sửa hoặc bỏ qua; không ghi Again chỉ vì ảnh không tải được.
- Bản đầu ưu tiên thẻ hỏi/đáp hai mặt. Thẻ đảo chiều, cloze và các kiểu khác là phần mở rộng cần duyệt riêng; không hứa nhập .apkg.

## Lập lịch: tái sử dụng thư viện

Đề xuất đánh giá ts-fsrs, thư viện TypeScript của Open Spaced Repetition [S3]. Agent phải đọc API và kiểm thử phiên bản chọn trước khi dùng. Chọn scheduler nhẹ, chưa đưa optimizer/huấn luyện tham số vào bản đầu.

Mục tiêu retention khởi điểm đề xuất 0,90, theo mặc định được tài liệu Anki mô tả [S2]. Đây là tham số mong muốn cho lịch ôn, không phải đo lường trí nhớ thực tế và không phải bảo đảm 90%.

Tách adapter scheduler khỏi UI và storage. Lưu phiên bản thuật toán/thư viện và cấu hình đã dùng. Chính sách learning/relearning, ngày học và timezone phải được ghi lại; dùng thư viện có kiểm chứng, không ráp chuỗi mốc 1–3–7–30 ngày rồi gọi đó là FSRS.

Đưa thời gian vào hàm qua một nguồn clock có thể thay thế trong test. Test cố định randomness khi thư viện hỗ trợ. Không dùng kết quả unit test phụ thuộc giờ thật.

## Mô hình dữ liệu đề xuất, chưa phải schema cuối

- Deck/Note/Card content: ID ổn định, câu hỏi, đáp án, tags, tham chiếu nguồn và ảnh tùy chọn.
- Card scheduling state: card ID, phiên bản nội dung, trạng thái FSRS, due instant, cấu hình scheduler, revision.
- Review event: ID lượt ôn, card ID, thời gian, rating, trạng thái trước/sau, phiên bản nội dung và cấu hình, trạng thái hoàn tác nếu có.
- Study session: queue/position và các bộ đếm cần khôi phục.

Content tách khỏi lịch cá nhân. Không đặt tên trường ổn định của ứng dụng phụ thuộc hoàn toàn vào tên field của phiên bản thư viện.

Lưu cập nhật card và review event trong cùng transaction. Chống ghi trùng bằng ID sự kiện và kiểm tra revision. Trường hợp nhiều tab phải có chủ sở hữu phiên hoặc từ chối lượt cũ; không cho hai lần ghi đè âm thầm.

Hoàn tác phải khôi phục lịch, log hợp lệ và bộ đếm liên quan, không chỉ quay lại mặt trước. Nếu có thay đổi mới từ tab khác, không ghi snapshot cũ đè lên; xử lý xung đột trước.

Sửa lỗi chính tả nhỏ có thể giữ lịch. Thay đổi ý nghĩa/đáp án cần cảnh báo, đề xuất tạo thẻ mới hoặc reset có xác nhận. Không tự reset hàng loạt.

## Nhập/xuất

Study Pack chia sẻ không mang due, difficulty, stability, review history hoặc chỉ số cá nhân. AI bên ngoài chỉ tạo nội dung theo schema.

Personal Backup phải giữ nội dung và lịch sử/scheduling cần thiết; validate phiên bản, kiểm tra quan hệ ID và cho xem trước khi restore. Xử lý import trùng/ID trùng rõ ràng, không tự nhân thẻ hay reset lịch hiện có.

## Kiểm chứng bắt buộc

Đúng mapping bốn mức; chặn đánh giá trước khi lật; preview không ghi lịch; lượt ôn chỉ ghi một lần; reload giữ trạng thái; undo chính xác; timezone/qua nửa đêm; nhiều tab; thiếu ảnh; backup/restore round-trip; update thư viện/migration không mất log.

Dùng fixture/reference của thư viện đã khóa version để đối chiếu adapter. Không mock scheduler rồi coi đó là chứng minh tích hợp FSRS đúng. Không yêu cầu khoảng cách mọi nút luôn tăng đơn điệu khi thư viện không cam kết điều đó.

Các yêu cầu transaction, import, undo và UI là đề xuất kỹ thuật cho Study Reader, không phải khẳng định Anki triển khai nội bộ y hệt.
