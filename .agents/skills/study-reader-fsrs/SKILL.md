---
name: study-reader-fsrs
description: Triển khai hoặc rà flashcard Anki-style, adapter FSRS, hàng đợi ôn, mapping Again/Hard/Good/Easy, review log và undo trong Study Reader. Dùng khi sửa logic lịch ôn; không áp dụng cho trình chiếu RSVP hoặc tự chấm quiz thành rating.
---

# Anki-style / FSRS workflow

## Ràng buộc

Đọc AGENTS.md và docs/ANKI-STYLE-FLASHCARDS.md. UX kiểu Anki là yêu cầu; ts-fsrs là ứng viên thư viện cần kiểm chứng và được duyệt. Không clone toàn bộ Anki, không hứa tương thích .apkg/AnkiWeb.

## Quy trình

1. Kiểm package/version đang dùng, API chính thức và fixture nguồn. Tách scheduler nhẹ khỏi optimizer; không thêm huấn luyện/AI/server vào MVP.
2. Định nghĩa một adapter domain có đầu vào card state, rating, now, scheduler config; đầu ra state/log. Cô lập Date/serialization, config/model version và randomness. Không chép công thức từ blog.
3. Map bốn mức theo tài liệu Anki: Again là sai/quên; Hard là đúng nhưng khó; Good là đúng bình thường; Easy là đúng rất dễ. Test mapping, không đổi nghĩa theo màu nút.
4. Xác định nội dung đã lật chưa. Chỉ lật không được ghi review. Preview interval là tác vụ không ghi; nhãn thời gian được tính chứ không hardcode. Preview/apply và fuzz tuân thủ API/version thực, không giả định tuyệt đối chúng luôn trùng từng millisecond.
5. Ghi card state, event, revision và bộ đếm liên quan trong transaction. Chống click trùng/giữ phím; xử lý lượt stale từ tab khác. Không ghi hai review từ cùng một thao tác.
6. Thiết kế undo trước khi nối UI: snapshot/version trước-sau, event liên quan và queue/counter. Lượt mới từ tab khác khiến snapshot cũ không được ghi đè; báo xung đột.
7. Chốt timezone, ngày học/cutoff, daily limits, overdue và learning/relearning policy bằng tài liệu riêng. Không biến due time thành chuỗi ngày địa phương mơ hồ. Clock phải inject được.
8. Sửa nội dung phân biệt typo và thay ý nghĩa. Share pack không chứa tiến độ; backup có đầy đủ lịch sử/config cần restore.
9. Mất ảnh bắt buộc, tạm ngưng, bỏ qua hoặc duyệt thẻ không tạo Again giả. Quiz không tự ghi FSRS.

## Nghiệm thu

Test New/Learning/Review/Relearning theo thư viện chọn; rating mapping; due đúng timezone; preview không mutation; double-submit; reload; undo cả log/state; multi-tab; backup restore. Test đối chiếu thư viện thật, không chỉ mock adapter.

Mốc interval không cố định và không được yêu cầu lúc nào cũng tăng theo thứ tự nút nếu thư viện không bảo đảm. Dùng clock/seed hoặc chế độ tắt fuzz trong test khi được hỗ trợ, không sửa thuật toán để làm đẹp test.

Khi nâng phiên bản FSRS, giữ trạng thái/lịch sử và có migration đã test. Không tự reschedule cả thư viện. Không gọi retention mục tiêu là phần trăm hiểu hay khả năng nhớ đã đo.

Nguồn: docs/SOURCES.md S1–S3. Với điểm tài liệu chưa rõ, nêu thiếu thông tin và kiểm API trước khi code.
