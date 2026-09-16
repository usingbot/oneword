# Tiêu chí nghiệm thu đề xuất

Không có test ứng dụng nào đã chạy khi tạo bộ tài liệu này. Các mục dưới đây là yêu cầu cho agent triển khai về sau.

## Gate dùng chung

- Xác định repo, branch, thay đổi đang có và phạm vi trước khi sửa.
- Chạy typecheck/lint/unit/build theo script đã khai báo, không đoán tên lệnh.
- Feature UI phải được chạy trong browser; kiểm bàn phím, giao diện hẹp, empty/error/loading, console và network.
- Không test.skip hoặc đổi assertion chỉ để báo xanh. Lỗi test sẵn có được ghi riêng, không nhận là đã sửa nếu chưa sửa.
- Báo lệnh đã chạy, exit/status, artifact kiểm chứng, phần chưa test. Không nhận “chạy trên mobile” chỉ từ resize viewport.
- Browser/test tool chạy ở máy dev hoặc CI, không thành dịch vụ luôn chạy trên production của chủ dự án.

## Reader

Văn bản 0 từ, 1 từ, dài; Unicode/dấu tiếng Việt; từ ghép/dấu trừ; PDF scan/mixed, nhiều cột, password/corrupt; hủy import; không phá bản gốc.

Timing dùng clock kiểm soát được: 300 WPM cho 1/3/5 đơn vị → 200/600/1000ms cơ bản. Kiểm dấu câu, câu dài, pause/resume, đổi tốc độ/chunk giữa chừng, từ cuối, tab ẩn/hiện và sửa nội dung gắn với bookmark.

Fullscreen vào/ra bằng thao tác người dùng, Esc, API bị từ chối và fallback; không có logo/tab thừa trong focus; điều khiển dùng được bằng keyboard; không tràn chữ hoặc tự làm chữ bé không thể đọc.

## Study Pack và quiz

JSON hợp lệ/sai; schema version không hỗ trợ; ID trùng; answer ID không tồn tại; text/HTML/script payload; protocol URL bị cấm; thiếu ảnh; giới hạn byte/số thẻ/độ sâu; hủy import; thông báo lỗi cụ thể.

Đảo lựa chọn không làm đổi đáp án đúng. Chế độ kiểm tra không lộ đáp án trước khi nộp. Quiz không tự ghi review FSRS.

## Flashcard / FSRS

Bốn rating, recall trước reveal, click trùng, held key, preview không ghi storage, undo cả state/log/counter, reload, review quá hạn, giờ bất thường, đổi timezone/ngày học, xung đột nhiều tab và thiếu ảnh bắt buộc.

Đối chiếu thư viện FSRS thật với fixture/version đã chọn. Randomness phải được kiểm soát trong test khi hỗ trợ. Không mock toàn bộ thư viện cho test chấp nhận tích hợp.

## Persistence và offline

Transaction fail phải rollback; import không viết dở; migration đọc được backup cũ; round-trip dữ liệu/lịch ôn; quota đầy; persistence bị từ chối; tab nâng cấp database bị chặn.

Đo offline trên production build đã cache, không chỉ dev server. Cập nhật service worker không làm mất nội dung đang sửa. Ảnh ngoài chưa cache được báo là không có sẵn; không tuyên bố app bảo đảm mọi ảnh offline.

Network baseline không có upload PDF/text/card hoặc analytics ngầm. Khi bật ảnh ngoài, chỉ các request được giải thích/cho phép; không dùng URL ảnh để nhét nội dung người học.

## Hiệu năng và phát hành

Đặt ngân sách bundle/latency/RAM sau khi đo bản nền; không bịa số đã đạt. Lazy-load phần nặng, xử lý theo phần, giải phóng worker/object URL/canvas. Không chuyển mọi dữ liệu thành ảnh.

Kiểm dependency/license/advisory theo version đã khóa. Giữ notice cần thiết; không đóng gói sách riêng hay font không có quyền. Tài liệu tự host phải khớp build và cache policy đã kiểm chứng. Deploy chỉ khi có yêu cầu riêng.
