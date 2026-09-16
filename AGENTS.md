# Study Reader — quy tắc cho coding agent

## Trạng thái

Đây là hướng dẫn dự án, không phải giấy phép chạy mọi thay đổi. Mặc định lượt đầu là AUDIT/PLAN ONLY. Không cài dependency/skill/plugin, không viết runtime, không commit/push/deploy cho tới khi có phạm vi được duyệt.

Nếu repo đã có AGENTS.md/override, đọc và hợp nhất có chủ đích; không ghi đè chỉ dẫn cũ. Không sửa file ngoài dự án được người dùng cho phép. Không đọc .env/secret nếu nhiệm vụ không cần; không đưa dữ liệu người dùng vào log.

## Mục tiêu và giới hạn

Đọc tập trung + flashcard Anki-style + quiz. Mã nguồn mở, tính năng cốt lõi miễn phí, chi phí server thấp. Local-first là kiến trúc đề xuất. Không tự thêm tài khoản, backend, API AI, OCR cả sách, kho media hoặc cloud sync.

Đọc docs/PRODUCT-BRIEF.md và docs/ANKI-STYLE-FLASHCARDS.md. Tách yêu cầu người dùng đã chốt khỏi lựa chọn kỹ thuật còn là đề xuất. Giấy phép cụ thể và thông tin repo/server chưa được suy đoán.

## Các nguyên tắc không được bỏ

- Che đáp án trước recall; Again/Hard/Good/Easy có ý nghĩa khác nhau. Không ghi lịch trước khi đánh giá.
- Dùng scheduler có nguồn kiểm chứng; không tự viết lại FSRS. Ghi lịch/log nhất quán và hỗ trợ undo.
- Nội dung chia sẻ tách khỏi lịch sử cá nhân; import/restore có version, validate và xử lý xung đột.
- PDF/text không tự gửi lên server; ảnh ngoài tải có kiểm soát, không nhúng mã tùy ý.
- Reader giữ nội dung gốc, chỉnh sửa có hoàn tác; không tự tóm tắt hoặc xóa mọi dấu gạch.
- Fullscreen không logo/tab thừa; font in rõ, UI chỉ hiện khi cần.
- Không tuyên bố hiểu/nhớ tốt hơn từ tốc độ hiển thị; không tạo số thống kê giả.

## Cách làm việc

Xác minh cwd, repo root, branch, git status và lịch sử gần nhất trước khi sửa. Nếu có thay đổi chưa commit, ghi nhận và bảo toàn; không reset/clean. Hỏi chỉ khi không thể xác định phạm vi hay sắp chạm thay đổi của người dùng.

Đọc version/library APIs từ nguồn chính thức khi chọn dependency. Chỉ cài sau khi duyệt; không dùng script tải về không kiểm tra, không tắt sandbox. Skill là workflow, không phải bằng chứng tool đã có.

Chỉ nạp skill liên quan trong .agents/skills. Bắt đầu bằng khảo sát; triển khai từng lát cắt có thể chạy sau khi được duyệt. Không viết cả app trong một lượt.

## Hoàn thành một chặng

Kiểm docs/QUALITY-GATES.md. Dùng lệnh thực có trong repo cho typecheck/lint/test/build. Feature UI phải có browser verification; artifact ghi đường dẫn thật. Báo việc đã làm, test/lệnh thực chạy, kết quả, giới hạn và chặng đề xuất. Không nói “đã test” khi chỉ đọc code.

## Product Design — bàn giao thiết kế, không mở rộng quyền

Người dùng đã kết nối Product Design. Kiểm tra host nhận diện plugin/skills thực tế; đọc tài liệu plugin được host cung cấp trước khi sử dụng. Tham khảo docs/PRODUCT-DESIGN-HANDOFF.md và prompt 03.

Chỉ gọi workflow phù hợp khi người dùng yêu cầu rà thiết kế/prototype. Không gọi Product Design cho mọi thay đổi code. Rà mockup không phải test ứng dụng; không báo audit/QA đã chạy nếu thiếu bằng chứng cần thiết. Không tự sinh phương án hình mới khi nhiệm vụ chỉ là rà luồng; không xây lại các chi tiết mockup đã bị người dùng bác bỏ. Khi một gate của plugin cần bước ngoài phạm vi đã duyệt, dừng và nêu điều kiện chứ không tự thực hiện.

Báo cáo UX chuyển thành acceptance criteria cho coding agent; test logic, dữ liệu, FSRS và restore vẫn phải thực hiện riêng. Không tự publish checkpoint, thêm hosting hay dịch vụ có phí; việc kết nối plugin không phải phê duyệt deploy.
