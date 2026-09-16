---
name: study-reader-focus-ui
description: Thiết kế hoặc sửa UI/UX nhập và chỉnh văn bản, engine RSVP, fullscreen và khả năng tiếp cận của Study Reader. Dùng khi thay đổi màn hình đọc hoặc nhịp trình chiếu; không dùng thay skill FSRS hay để xây landing page marketing.
---

# Focus reader workflow

## Trước khi làm

Đọc AGENTS.md và docs/PRODUCT-BRIEF.md. Xác định chặng đã được duyệt; nếu chỉ audit thì chỉ xuất kế hoạch. Kiểm các screenshot thật được cung cấp; không giả vờ có ảnh tham chiếu chưa mở được.

## Quy trình

1. Vẽ luồng vào: mở PDF/TXT hoặc dán văn bản → kiểm tra/sửa tùy chọn → đọc.
2. Tách dữ liệu gốc, dữ liệu đã sửa và vị trí đọc theo version. Đưa cleaning thành các đề xuất có diff/undo, không thay chữ âm thầm.
3. Lập state machine: idle, loading, editing, ready, playing, paused, completed, error. Ghi hành vi tab ẩn, fullscreen bị từ chối, thay chunk/speed và sửa văn bản.
4. Chốt đơn vị đếm/tokenization, WPM, ms/lượt và thời gian nghỉ. Không giữ cùng thời gian cho mọi nhóm dài ngắn. Tính timing độc lập React render; tránh stale closure, timer trùng và chạy bù sau tab ẩn.
5. Fullscreen: nội dung in rõ ở giữa, nền tối, glow nhẹ có thể tắt, tiến độ tùy chọn và một nút thoát. Không logo, sidebar, danh sách deck, dashboard, slogan hoặc chữ viết tay.
6. Điều khiển hiện khi tương tác; không ẩn khi người dùng keyboard-focus nó. Chọn cỡ chữ bằng thiết lập, xử lý từ/câu dài và màn hình hẹp rõ ràng; không nhảy cỡ chữ thất thường từng frame.
7. Hỗ trợ pause/resume, rewind/context, Esc, focus restoration. Phím tắt không chạy khi đang nhập nội dung. Không dùng aria-live để đọc dồn mọi từ đang flash; cung cấp bản văn bản truy cập được khi dừng.
8. Kiểm browser thật, keyboard, viewport hẹp, contrast và reduced motion. Chụp màn hình đang đọc và đang điều khiển, không chỉ dashboard.

## Tình huống lỗi

PDF scan/mixed, nhiều cột, bảng/công thức, password/corrupt; nội dung rỗng; dấu gạch nối hợp lệ; thiếu source text; API fullscreen không có hoặc bị từ chối; text bị sửa trước bookmark; từ quá dài; đang đọc thì unmount.

## Nghiệm thu

Thử TXT/paste trước rồi PDF khi đến chặng. Unit test timing/segmentation; browser test pause/tab hidden/fullscreen fallback. Không đánh đồng unit mock fullscreen với chứng minh fullscreen thật. Thống kê chỉ là hành vi đo được, không tự suy ra độ hiểu.

Nguồn thư viện/API phải kiểm theo version; tham khảo docs/SOURCES.md S7/S10 khi cần. Các nguyên tắc UX ở đây là quyết định dự án, không là tuyên bố hiệu quả tâm lý đã được chứng minh.
