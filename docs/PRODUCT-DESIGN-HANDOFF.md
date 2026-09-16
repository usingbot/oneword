# Product Design — bàn giao thiết kế cho Study Reader

Bản v2, ngày 16/09/2026. Đây là hướng dẫn sử dụng plugin và brief bàn giao, **không phải báo cáo audit đã thực hiện**.

## Trạng thái thực tế

Product Design được xác nhận installed=true sau khi người dùng kết nối. Công cụ discovery trong phiên chat này không cung cấp namespace/action Product Design; không có workflow audit/prototype/design-qa nào được gọi. Đã tra router/README/workflow trên kho chính thức của OpenAI để chuẩn bị prompt đúng phạm vi, không tải và chạy script plugin từ mạng.

Theo router hiện tại, chat thường không có Work tools không phải nơi chạy workflow đầy đủ; chuyển prompt sang Work hoặc dùng môi trường Codex được hỗ trợ [S11]. Plugin ở một giao diện không mặc nhiên chứng minh mọi tool đã sẵn sàng ở giao diện khác [S15]. Không yêu cầu người dùng cài lại nếu chính host đã có plugin.

## Mục tiêu của lượt Product Design kế tiếp

Rà thiết kế và luồng sử dụng để giảm phân tâm, tránh lộ đáp án, tránh mất dữ liệu và làm rõ cách tạo bộ học. Chưa viết mã, chưa thêm hình, chưa kiểm chứng hiệu năng hay khả năng ghi nhớ. Không biến bài học kiểu Anki thành yêu cầu sao chép giao diện/thương hiệu Anki.

Hai nhóm đầu vào khác nhau:
- Quyết định hiện tại: docs/PRODUCT-BRIEF.md, docs/ANKI-STYLE-FLASHCARDS.md và ràng buộc dưới đây.
- Bằng chứng hình ảnh: mockup hoặc screenshot người dùng đính kèm và agent thực sự mở được. Bản ZIP không đóng gói các hình này.

Mockup lịch sử không phải toàn bộ thiết kế đã duyệt. Dùng yêu cầu mới để đánh giá điểm lệch trên mockup, không tự xem mọi nét trong ảnh là tiêu chí phải sao chép.

## Ràng buộc đã thống nhất cần mang sang

1. Web mã nguồn mở, học cốt lõi miễn phí. Server/domain đã có; ưu tiên xử lý dữ liệu trên thiết bị, không AI/cloud/account bắt buộc.
2. Mở PDF/TXT hoặc dán chữ, sửa lỗi với bản gốc/diff/undo; không xóa mọi dấu gạch nối.
3. RSVP 1–5 đơn vị hoặc tùy chỉnh/cả câu, tốc độ do người dùng chọn. Có pause, rewind và ngữ cảnh.
4. Fullscreen: chữ in rõ, nền tối, glow tùy chọn, không logo, sidebar/tab hoặc thống kê. Giữ tiến độ mảnh tùy chọn và một nút thoát; controls chỉ hiện khi tương tác.
5. Flashcard: che đáp án → tự nhớ → mở đáp án → Quên/Khó/Nhớ/Dễ. Hai mặt cạnh nhau chỉ phù hợp chế độ biên tập, không phải phiên ôn mặc định.
6. Tạo bộ học thủ công hoặc nhập Study Pack JSON; Copy Prompt → AI bên ngoài → Import, không gắn nhãn khiến người dùng tưởng app tự gọi AI.
7. Quiz luyện tập khác kiểm tra; không lộ đáp án trước khi nộp trong chế độ kiểm tra. Không tự map quiz sang FSRS.
8. Ảnh dùng URL có kiểm soát tải; ảnh bắt buộc lỗi phải cho bỏ qua mà không tính sai. Backup/share tách biệt.

Đây là yêu cầu sản phẩm và đề xuất UX đã được ghi trong bộ; không phải kết luận thực nghiệm từ một audit người dùng.

## Chọn workflow theo đúng nhiệm vụ

`audit`: rà mockup/luồng hiện có với bằng chứng nhìn thấy; nêu rõ phần tương tác chưa được kiểm tra [S12]. Không dùng audit để bịa luồng ẩn sau ảnh.

`image-to-code`: chỉ khi có thiết kế được chọn rõ và người dùng đã giao phạm vi build [S14]. Ở lượt hiện tại chưa có yêu cầu này. Không dựng lại mockup cũ nguyên xi rồi bỏ qua những thay đổi người dùng đã chốt.

`design-qa`: chỉ khi có cả đích thiết kế và bản triển khai đã render để so sánh [S13]. Một screenshot không chứng minh xử lý PDF, scheduler hay backup đúng. Không tạo báo cáo passed cho ứng dụng chưa tồn tại.

Các bước ideate/share không cần thiết cho lượt rà luồng hiện tại. Không auto-deploy hoặc thêm một hosting target để hoàn thành một checklist thiết kế.

## Đầu ra yêu cầu

Bảng những gì giữ/bỏ/ẩn mặc định; luồng từng bước; state còn thiếu; findings theo mức độ ảnh hưởng, mỗi finding gắn với nguồn nhìn thấy hoặc ghi là đề xuất. Kèm nội dung tiếng Việt cho nút và cảnh báo, acceptance criteria, phạm vi chưa thể kiểm tra và handoff cho bốn skill dự án.

Không buộc agent vẽ mới màn hình để lấp bằng chứng thiếu. Khi ảnh cần thiết không được cung cấp trong phiên mới, chỉ hỏi đúng ảnh đó. Phân biệt review bản thiết kế với kiểm thử ứng dụng đang chạy.

## Chi phí và giới hạn quyền

Plugin phục vụ công việc phát triển/thiết kế; không phải mã chạy trong ứng dụng của người học. Không vì dùng plugin mà thêm API AI, storage ảnh, tài khoản hoặc thuê hosting mới vào sản phẩm. Chi phí/hạn mức agent vẫn theo môi trường người dùng; tài liệu này không xác nhận một mức giá.

Chưa có repo/server người dùng nào được truy cập. Không cài thêm tool, không tạo prototype và không lưu context vào bộ nhớ riêng của plugin. Tài liệu bàn giao chính là các file trong bộ này.
