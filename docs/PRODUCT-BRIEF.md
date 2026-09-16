# Đặc tả sản phẩm — Study Reader

Ngày: 16/09/2026. Trạng thái: cơ sở thảo luận để khảo sát kỹ thuật, chưa có ứng dụng được triển khai.

## 1. Yêu cầu được người dùng xác nhận

Công cụ học trên web, mã nguồn mở, tính năng học cốt lõi miễn phí. Chủ dự án đã có server và domain; ưu tiên giảm chi phí vận hành.

### Nhập và chỉnh sửa

- Mở PDF, mở tệp TXT hoặc dán văn bản.
- Cho sửa lỗi trích xuất, xuống dòng và dấu gạch nối trước khi đọc.
- Giữ văn bản gốc để đối chiếu; không dùng AI tự tóm tắt/thay thế nội dung.

### Đọc theo lượt (RSVP)

- Người dùng chọn 1, 2, 3, 4, 5 từ/lượt, số tùy chỉnh hoặc cả câu.
- Chọn tốc độ hoặc thời gian hiển thị rõ ràng, có xem thử.
- Fullscreen tối giản là tính năng trung tâm: chữ in rõ, nền tối, vùng sáng nhẹ tùy chỉnh; không font viết tay.
- Bỏ logo, điều hướng và các thành phần thừa khi đọc; có thể giữ tiến độ và nút thoát.
- Có các điều khiển cần thiết để tạm dừng, quay lại, đọc tiếp.

### Học tập

- Flashcard theo trải nghiệm học của Anki: tự nhớ trước, xem đáp án rồi tự đánh giá để ôn về sau.
- Trắc nghiệm có đáp án và lời giải trong dữ liệu.
- Tạo thủ công hoặc nhập Study Pack JSON.
- Cung cấp prompt mẫu để người dùng nhờ AI bên ngoài tạo JSON; không cần gọi AI của ứng dụng.
- Ảnh của thẻ/câu hỏi là URL tham chiếu, không mở kho upload ảnh ở bản đầu.

## 2. Đề xuất kỹ thuật cần xác minh khi khảo sát

- Local-first; bản đầu không tài khoản, backend xử lý PDF, database đám mây hoặc đồng bộ bắt buộc.
- Frontend TypeScript; ứng viên React + Vite nếu repo mới. Không thay stack repo đang có chỉ vì sở thích.
- Ứng viên PDF.js, IndexedDB qua Dexie, JSON Schema qua Ajv, FSRS qua ts-fsrs, Vitest và Playwright Test. Đây là thư viện/công cụ, không phải skill đã cài.
- Xác minh phiên bản, API, yêu cầu môi trường, giấy phép và advisories hiện tại; khóa dependency sau khi được duyệt.
- FSRS được đề xuất để lập lịch ôn ngay trên máy người học. Không viết lại công thức; không nhúng/copy toàn bộ Anki.
- PWA/offline theo chặng. Cache tài nguyên ứng dụng không đồng nghĩa tự lưu toàn bộ media của bên thứ ba.
- License mã nguồn mở cụ thể, repository, branch, runtime và cấu hình server chưa được người dùng cung cấp.

## 3. Quyết định UX đề xuất

### Trước khi đọc

Dùng từ “Mở PDF” thay vì “Upload PDF” khi không gửi file lên server. Có hướng dẫn quyền riêng tư phản ánh đúng network thực tế. Chỉnh sửa là tùy chọn, không bắt buộc.

Chỉ đề xuất nối từ bị ngắt ở cuối dòng, có xem trước/hoàn tác. Không xóa mọi dấu gạch nối: từ ghép, dấu trừ và công thức phải được bảo toàn. Không xóa header/footer nếu người dùng chưa chọn và chưa có cách xem lại.

PDF scan, thứ tự nhiều cột, bảng và công thức cần trạng thái cảnh báo. Chỉ báo trang thật sự đọc được; không dùng số trang xử lý làm bằng chứng trích xuất đúng. Bản đầu không tự OCR cả sách.

### Khi đọc

Fullscreen đang chạy chỉ có nội dung trung tâm, tiến độ mảnh tùy chọn và một nút thoát. Điều khiển hiện lại khi tương tác, nhưng không tự ẩn khi đang được focus bàn phím. Chuyển tab thì tạm dừng; không chạy bù hàng loạt khi quay lại. Thoát fullscreen không mất vị trí.

Thời gian cơ bản mỗi lượt = số đơn vị đếm trong lượt × 60.000 / WPM (ms). Cộng thời gian nghỉ dấu câu khi được bật. Nếu chọn ms/lượt, giao diện phải phân biệt với WPM. Chốt và công bố quy ước đếm cho tiếng Việt; không gọi phép chia theo khoảng trắng là phân tích từ ngữ hoàn hảo.

Vị trí đọc gắn với phiên bản văn bản. Chỉnh sửa trước vị trí đang đọc phải được ánh xạ hoặc thông báo đặt lại, không âm thầm nhảy sang nội dung khác.

### Khi học

Giao diện biên tập có thể xem hai mặt; phiên ôn mặc định phải che đáp án. Quiz có chế độ luyện tập và kiểm tra tách biệt. Không tự chuyển kết quả quiz thành đánh giá FSRS ở bản đầu.

## 4. Dữ liệu, chia sẻ và chi phí

Study Pack dùng chia sẻ nội dung; Personal Backup dùng sao lưu trạng thái cá nhân. Không nhét lịch sử học riêng vào file chia sẻ mặc định. Định dạng phải có phiên bản, ID ổn định, kiểm tra cấu trúc và xem trước khi nhập. Không đánh giá chất lượng tri thức chỉ từ việc JSON hợp lệ.

Lưu dữ liệu trên thiết bị cần xuất/khôi phục, xử lý quota và thông báo nguy cơ mất dữ liệu. Không hứa local-first là không thể mất dữ liệu hoặc tự đồng bộ giữa máy.

URL ảnh: ưu tiên HTTPS, cho phép người dùng kiểm soát tải ảnh ngoài, không HTML tùy ý, không base64 nhúng, không proxy ảnh phía server. Link hỏng của bài bắt buộc có ảnh phải cho bỏ qua mà không tính sai/không ghi review thất bại. Xem S9 trong SOURCES về giới hạn bộ nhớ trình duyệt.

## 5. Ngoài phạm vi bản đầu

AI tích hợp, API key người dùng, OCR toàn sách, thư viện sách công khai, tài khoản bắt buộc, đồng bộ AnkiWeb, nhập/xuất .apkg, sao chép template HTML Anki, TTS, ranking và hệ thống gamification lớn. Không dự đoán độ hiểu hoặc hứa cải thiện trí nhớ từ WPM.

## 6. Chặng đề xuất

M0: khảo sát môi trường, chọn skill và kế hoạch; không code.
M1: nền tảng, TXT/paste → sửa → RSVP → fullscreen → lưu vị trí; test và bản sao lưu tối thiểu cho dữ liệu lưu.
M2: PDF có lớp text, kiểm tra/cảnh báo trích xuất, hiệu năng tài liệu dài.
M3: Study Pack JSON, flashcard Anki-style/FSRS, trắc nghiệm, ảnh URL.
M4: hardening offline/PWA, migration/backup, hiệu năng/khả năng tiếp cận và tài liệu tự host.

Mốc nào có dữ liệu người dùng phải có đường khôi phục tương ứng; không đợi M4 mới nghĩ đến sao lưu.
