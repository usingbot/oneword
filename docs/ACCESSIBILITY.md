# Mobile và accessibility M4a

Giữ layout desktop; responsive bằng CSS, không dò user agent. Reader có văn bản thường/textarea và bản gốc mở được; RSVP không được xem là phù hợp cho mọi người hoặc chứng minh tăng khả năng hiểu/nhớ. Không thêm animation truyền tải thông tin thiết yếu.

Các thay đổi:

- Skip link tới source text hoặc vùng Study; landmarks/heading/labels hiện có giữ nguyên. Focus outline rõ cho select/file controls, thông báo lỗi/status dùng alert/status.
- Điều khiển Reader/select/import/choice có vùng bấm tối thiểu44px ở các nhóm đã chỉnh; rating mobile tối thiểu72px cao, bố cục2×2. Quiz label choice tối thiểu48px. Radio checked có dấu và outline, feedback đúng/sai bằng chữ.
- Màn hình hẹp có input16px, toolbar wrap, modal scroll theo100dvh, safe-area cho focus view và study. Không khóa trang vào chiều cao thiết bị cố định. Reader focus giữ word/group và nút thoát; desktop không xây lại.
- PDF focus trap bỏ qua các controls bên trong details đang đóng; backup dialog trap và Escape/restore focus được kiểm. Quiz confirmation là vùng xác nhận không modal, có aria-modal=false, focus vào Quay lại; hủy đưa focus về Nộp toàn bài, không giả vờ trap toàn trang.
- Reader Space/←/→/Escape, guard input/form, review Space reveal rồi1–4, repeat guards và Quiz radio/submit/navigation tiếp tục được kiểm. Reduced-motion tắt transition và smooth scroll; không tự đổi tốc độ/timing Reader.
- Quiz lỗi ghi không hiện “Đã lưu trên thiết bị” cho command bị lỗi. Text lưu trữ hướng dẫn xuất backup/sao chép; persistent grant không được mô tả như bảo đảm vĩnh viễn.

## Kiểm chứng đã làm

Automated `tests/hardening.spec.ts`:390×844, touch tap pause/resume, keyboard input guard, fullscreen/Escape,4 rating targets, keyboard rating/radio, cancel focus, backup trap/Escape, reduced-motion,320px overflow và quota recovery. Existing suites thêm duplicate/held-key, editors/import, fullscreen thật, Quiz result/remote image states. PNG: `artifacts/m4a-mobile-reader.png`, `m4a-mobile-review.png`, `m4a-mobile-quiz.png`, `m4a-mobile-recovery.png`.

Rà trực tiếp bằng browser control trên production preview `http://127.0.0.1:4184/`, desktop rồi390×844: dùng đoạn mẫu, Space pause/resume, → đổi word, fullscreen Tab tới nút thoát rồi Escape; nguồn text vẫn đọc/chỉnh được. Import pack tổng hợp, Enter xác nhận, Space reveal,3 rating; Quiz Enter bắt đầu, Space chọn radio, Enter nộp rồi hủy. Quan sát screenshot vùng đọc/rating/confirmation: chữ và controls đọc được, không tràn ngang (DOM scrollWidth375, innerWidth390). Focus thực trở lại Nộp toàn bài. Console warnings/errors=[] trong phiên kiểm này. Input JSON ban đầu bị serializer test làm mất milliseconds đã bị validator từ chối có thông báo, trước khi nhập lại bản JSON hợp lệ.

Mẫu contrast từ các cặp màu CSS đang dùng (relative luminance sRGB): body11,68:1, study/button text10,92:1, secondary text5,01:1, offline-panel8,86:1, error7,61:1; focus outline3,30:1 so với nền trang. Dữ liệu màu/ratio thật trong `artifacts/m4a-contrast-samples.json`. Đây chỉ là mẫu màu opaque, không phải phép đo tự động mọi pixel/state/ảnh ngoài.

Đây là audit thủ công có phạm vi và browser automation, không phải chứng nhận WCAG. Chưa chạy NVDA/VoiceOver/TalkBack, điện thoại vật lý, zoom/forced-colors mọi nền tảng, OS software keyboard/cutout, Safari/iOS. Không cài thêm axe hoặc công cụ accessibility mới. Màu/focus và chữ được rà ở các luồng chính; không tuyên bố toàn bộ combinations/remote-image contrast đã đạt.
