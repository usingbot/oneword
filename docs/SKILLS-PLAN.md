# Skill plan

Ngày: 16/09/2026. Bốn tên bắt đầu bằng `study-reader-` dưới đây do Jarvis đặt cho bộ này; không phải tên gói trên marketplace và không phải dependency npm.

## Phân biệt

AGENTS.md chứa quy tắc xuyên dự án. SKILL.md là hướng dẫn thực hiện một nhóm công việc, được nạp khi phù hợp. Tool thực thi (terminal, browser, test runner) và thư viện runtime là lớp khác. Một skill mô tả Playwright không tự cài browser hay cấp quyền máy tính. Tài liệu OpenAI: S4–S5.

## Bộ tối thiểu đề xuất

| Skill tùy chỉnh | Khi cần | Đầu ra phải kiểm tra |
| --- | --- | --- |
| study-reader-focus-ui | Chỉnh UI reader, nhập/sửa text, fullscreen, timing | Luồng đọc ít phân tâm; ảnh desktop/mobile và kiểm tra bàn phím/timing |
| study-reader-local-first | Storage, migration, backup, PWA, JSON, ảnh URL | Dữ liệu không mất do nâng cấp/import; network đúng cam kết |
| study-reader-fsrs | Ôn thẻ, rating, queue, scheduler, undo | Adapter được kiểm chứng, log/state nhất quán, không chấm từ quiz |
| study-reader-quality | Hoàn thành feature, sửa bug, chuẩn bị merge | Test thật, browser flow, screenshot và báo cáo giới hạn |

Đây là bốn quy trình có chủ đích hẹp. Không cần cài hàng chục “super skill”. Agent đọc AGENTS.md trước, chỉ nạp skill liên quan.

## Năng lực/công cụ đi kèm, phải kiểm tra môi trường

- Terminal và Git trong repo được ủy quyền; không mặc định có quyền server.
- Vitest hoặc framework test phù hợp repo để kiểm logic, clock và storage [S8].
- Playwright Test để viết/chạy test trình duyệt có thể lặp lại [S7]. Nếu có skill browser CLI, không nhầm nó với bộ test nằm trong repo.
- Kiểm tra accessibility, console/network và trình duyệt thật; mô phỏng mobile không thay kiểm chứng mọi máy điện thoại.
- Tra tài liệu thư viện chính thức. Không cần OpenAI API trong app chỉ vì đang dùng Codex để viết app.

## Skill/plugin bên ngoài

Chỉ đề xuất sau khi phát hiện thiếu một năng lực cụ thể. Liệt kê URL/nguồn chính thức, license, yêu cầu quyền, phụ thuộc thực thi, chi phí chưa rõ, lý do không dùng công cụ sẵn có. Không cài hàng loạt, không chạy script tải về mà chưa xem, không tắt sandbox để tiện.

Kho openai/skills hiện có thông báo chuyển hướng tới kho openai/plugins [S6]. Vì vậy, không lấy tên skill hoặc lệnh installer từ bài hướng dẫn cũ làm bảo đảm hiện vẫn đúng. Kiểm tra catalog và phiên bản host trước.

Product Design đã được người dùng kết nối trong phiên hiện tại. Dùng nó ở bước rà luồng/mockup khi host hỗ trợ, không mặc định nó thay được unit/integration tests hoặc làm đúng scheduler. Codex Security vẫn chỉ là ứng viên tùy chọn, chưa cài. Không cái nào là dependency runtime bắt buộc của Study Reader; không suy đoán chi phí hoặc trạng thái cài trên máy khác.

Theo router và workflow chính thức [S11–S14]: `audit` dùng cho rà UX có bằng chứng; `image-to-code` chỉ dùng cho thiết kế được chọn và phạm vi triển khai được duyệt; `design-qa` là đối chiếu thiết kế với bản đã render, không phải việc xem một mockup rồi báo ứng dụng đạt. Trước mắt chỉ chuẩn bị/rà luồng, không tự sinh hình mới, viết code hay publish.

Prompt đi kèm: `prompts/03-product-design-review.md`. Môi trường chat thường không có Work tools thì chuyển prompt sang Work; không giả vờ workflow đã chạy. Cần phân biệt thêm việc cài plugin trong tài khoản với việc skill/tool đã được host nhận diện [S15].

## Quy tắc tạo skill mới

Chỉ tạo khi công việc lặp lại và skill đang có không bao phủ. Mỗi skill cần name/description có trigger, phạm vi không áp dụng, tài liệu đầu vào, quy trình, trường hợp lỗi và tiêu chí xác minh. Ưu tiên instruction-only; không thêm script nếu chỉ để trang trí.

Agent phải báo riêng: đã có; có tệp nhưng host chưa nhận; có nguồn nhưng chưa cài; cần tự tạo; không cần. Không ghi “đã dùng skill” khi chỉ nhìn thấy tên.
