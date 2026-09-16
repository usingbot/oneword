@Product Design

Hãy rà UX và các mockup của Study Reader trước khi coding agent triển khai. Trả lời bằng tiếng Việt. Lượt này chỉ review và chuẩn bị bàn giao, không tạo ảnh mới, không viết app, không cài dependency và không publish/deploy.

## Kiểm tra môi trường

Xác nhận Product Design và những skill/tool cần dùng thực sự được host nhận diện. Đọc hướng dẫn của plugin. Nếu đang ở chat thường không có Work tools, hướng dẫn chuyển prompt sang Work, không giả vờ workflow đã chạy. Việc kết nối plugin không cấp thêm quyền sửa repo, đọc secret hoặc triển khai server.

## Tài liệu và bằng chứng

Tôi đính kèm bộ study-reader-planning-kit-v2 và những mockup liên quan. Đọc README.md, docs/PRODUCT-BRIEF.md, docs/ANKI-STYLE-FLASHCARDS.md và docs/PRODUCT-DESIGN-HANDOFF.md khi thực sự có thể truy cập.

Mở các ảnh được cung cấp trước khi nhận xét. Bản ZIP không chứa các mockup. Nếu phiên này thiếu ảnh, nói rõ và hỏi đúng ảnh cần rà, không tự tìm một ảnh gần giống trên mạng. Không coi tên file là bằng chứng đã xem.

Đây là sản phẩm đang lên kế hoạch; không mặc định đã có app hoặc live URL. Rà ảnh tĩnh phải nói rõ các tương tác, hiệu năng, lưu trữ và accessibility chưa được thử.

## Brief hiện tại

Study Reader là web đọc tập trung + flashcard kiểu Anki + trắc nghiệm, mã nguồn mở, tính năng học cốt lõi miễn phí. Tôi đã có server/domain; ưu tiên local-first, không AI API, tài khoản, cloud sync hoặc kho upload media bắt buộc.

Đầu vào: mở PDF, mở TXT hoặc dán văn bản. Có sửa lỗi trích xuất, xem bản gốc và hoàn tác. Không xóa mọi dấu gạch nối. PDF không lấy được chữ phải có cảnh báo, không giả vờ đọc đủ.

Reader: 1–5 từ/lượt, số tùy chỉnh hoặc cả câu; tốc độ do người dùng chọn. Có pause, quay lại và xem ngữ cảnh. Fullscreen chỉ chữ in rõ ở giữa nền tối; vùng sáng nhẹ có thể tắt, tiến độ mảnh tùy chọn và một nút thoát. Bỏ font viết tay, logo, sidebar, tab, danh sách bộ học và thống kê. Controls hiện khi tương tác, không trùng nút thoát. Không quảng cáo rằng tốc độ trình chiếu bảo đảm tăng trí nhớ.

Flashcard: câu hỏi trước → tự nhớ → mở đáp án → Quên/Khó/Nhớ/Dễ. Không hiện mặt sau sẵn trong phiên ôn. Lập lịch dự kiến dùng FSRS; không tự chốt API hay công thức trong review UX. Có đến hạn, thẻ mới, hoàn tác và thông báo dữ liệu cục bộ. Không đồng nhất quiz với rating FSRS.

Study Pack: tạo thủ công hoặc nhập JSON có kiểm tra/xem trước. Luồng nhờ AI ngoài phải gọi rõ: Sao chép prompt → dùng AI của người học → dán JSON → kiểm tra → nhập. Ảnh dùng URL; hỏng ảnh thiết yếu thì bỏ qua, không tính sai.

Quiz tách luyện tập với kiểm tra; chỉ chế độ luyện tập mới hiện đáp án ngay sau mỗi câu. Chia sẻ bộ học khác sao lưu cá nhân có lịch sử ôn.

Những mockup trước chỉ là tham khảo; chi tiết đi ngược brief mới là điểm cần sửa, không phải yêu cầu sao chép. Không hỏi lại mục tiêu đã có trong brief, trừ khi có mâu thuẫn thật sự chặn việc review.

## Phạm vi review

Rà các bước nhập/sửa → đọc/fullscreen → tạo/nhập bộ học → ôn flashcard → quiz → backup/restore.

Phân loại mỗi nhận xét: quan sát trực tiếp từ mockup, yêu cầu từ brief, hoặc đề xuất thiết kế. Dẫn đúng ảnh/bước khi có bằng chứng; không phán như đã test thứ chỉ suy ra từ hình.

Đề xuất cái gì bỏ, cái gì ẩn mặc định, cái gì phải luôn truy cập được bằng bàn phím. Kiểm thông báo lỗi/trống/đang tải, từ/câu dài, JSON lỗi, ảnh lỗi, bấm nhầm và chuyển màn hình khi còn dữ liệu chưa lưu.

Không mở thêm feature chỉ để lấp chỗ trống. Không dùng design-qa để tuyên bố app đạt khi chưa có bản triển khai render thật. Không triển khai ideate/image-to-code/share trong lượt này.

## Đầu ra

1. Luồng sử dụng từng bước, gắn mockup thực sự đã xem.
2. Bảng GIỮ / BỎ / ẨN MẶC ĐỊNH theo màn hình.
3. Findings ưu tiên cao trước, có nguồn và giới hạn kiểm chứng.
4. Đề xuất nhãn nút/cảnh báo tiếng Việt và state còn thiếu.
5. Acceptance criteria để coding agent triển khai và kiểm thử.
6. Bàn giao cho study-reader-focus-ui, study-reader-local-first,
   study-reader-fsrs và study-reader-quality; không thay chúng bằng
   một nhận xét rằng UI đẹp.

Chỉ trả review/handoff và ghi tệp báo cáo khi môi trường cho phép trong phạm vi tài liệu. Không sửa runtime, không chạy server, không commit/push/deploy. Nếu một gate của plugin cần việc ngoài phạm vi này, nêu điều kiện còn thiếu và dừng ở đó.
