Bạn là technical lead và coding agent cho dự án mã nguồn mở tạm gọi là Study Reader. Trả lời bằng tiếng Việt. Nhiệm vụ hiện tại là KHẢO SÁT + ĐỀ XUẤT SKILL + LẬP KẾ HOẠCH, chưa triển khai ứng dụng.

# 1. Mục tiêu và bối cảnh

Ứng dụng giúp đọc tài liệu trong màn hình tập trung, học flashcard theo kiểu Anki và làm trắc nghiệm. Tính năng cốt lõi miễn phí. Tôi đã có server và domain; không muốn thêm chi phí AI, database hoặc kho media trên server.

Nếu có bộ tài liệu đi kèm, đọc README.md, AGENTS.md, docs/PRODUCT-BRIEF.md, docs/ANKI-STYLE-FLASHCARDS.md, docs/SKILLS-PLAN.md và docs/QUALITY-GATES.md. Không giả định tồn tại hoặc đã đọc tệp bạn không truy cập được. Brief dưới đây đủ để bắt đầu phân tích ngay cả khi chưa có file.

# 2. Sản phẩm cần giữ đúng

Đầu vào: mở PDF, mở TXT hoặc dán văn bản. Cho sửa text lỗi, nối từ bị ngắt dòng có xem trước/hoàn tác; giữ nguyên bản gốc. Không xóa mọi dấu gạch nối, không tự viết lại/tóm tắt bằng AI. PDF scan hoặc bố cục trích sai phải có cảnh báo; không tự OCR cả sách ở MVP.

Reader: chọn 1/2/3/4/5 từ mỗi lượt, số tùy chỉnh hoặc cả câu; tốc độ WPM với thời gian theo độ dài lượt và tùy chọn nghỉ dấu câu. Fullscreen là trọng tâm: chữ in rõ ở giữa nền tối, glow nhẹ có thể tắt, tiến độ mảnh tùy chọn và một nút thoát. Không font viết tay, logo, sidebar, tab hay số liệu trang trí trong focus mode. Điều khiển chỉ hiện khi tương tác và vẫn dùng được bằng bàn phím. Có pause, rewind/context, giữ vị trí; tab ẩn thì dừng, không chạy bù. Không quảng cáo RSVP bảo đảm nhớ/hiểu tốt hơn.

Flashcard kiểu Anki: hiện câu hỏi → người học tự nhớ → mở đáp án → Quên/Khó/Nhớ/Dễ, tương ứng Again/Hard/Good/Easy. Hard là nhớ đúng nhưng khó, không phải quên. Lập lịch ôn thực sự, có thẻ mới/đến hạn, daily limits, review log và undo. Tách content khỏi scheduling cá nhân. Đề xuất đánh giá FSRS qua ts-fsrs; dùng thư viện có nguồn, không tự chép công thức hoặc hardcode chuỗi ngày. Không cần AnkiWeb, .apkg hoặc clone toàn bộ Anki. Không tự biến kết quả quiz thành rating FSRS.

Study Pack: tạo thủ công hoặc nhập JSON; có prompt mẫu để dùng AI bên ngoài. App chỉ validate/render nội dung, không gọi API AI. Chia sẻ pack không mang lịch sử cá nhân; backup phải giữ trạng thái/lịch ôn. Ảnh chỉ URL HTTPS có kiểm soát tải; không base64, không upload/proxy media server, không HTML/mã tùy ý. Ảnh thiết yếu hỏng thì cho bỏ qua, không tính sai.

Quiz: luyện tập và kiểm tra; đáp án/lời giải có sẵn; đảo lựa chọn không làm hỏng đáp án.

Kiến trúc đề xuất: local-first, không đăng nhập bắt buộc, dữ liệu trong trình duyệt, static hosting, backup/restore và PWA/offline theo chặng. Không gọi dữ liệu local là không thể mất hoặc tự sync giữa máy.

# 3. Khảo sát môi trường trước

Nếu có terminal/repository được phép: kiểm cwd, repo root, branch, git status, commit gần đây, AGENTS.md/override, cấu trúc, manifest, lockfile và test hiện có. Không đọc secret không cần thiết. Không reset/clean hoặc ghi đè thay đổi người dùng. Không tự chọn một repo khác.

Nếu chưa có repo/quyền đọc, nói rõ phần chưa kiểm chứng, lập kế hoạch có điều kiện và chỉ hỏi thông tin thực sự chặn bước tiếp theo. Không giả vờ đã inspect code hoặc cài skill.

Xác định môi trường agent: ChatGPT, Codex desktop, CLI hay IDE. Liệt kê skill/tool thực có: terminal, browser, test runner, đọc docs. Kỹ năng mô tả trong file không có nghĩa tool thực thi đã tồn tại.

# 4. Đề xuất skill có kiểm chứng

Đánh giá tối đa 4 skill cốt lõi và 2 tùy chọn, tránh trùng lặp. Phân biệt skill/workflow, tool thực thi và dependency ứng dụng.

Bốn skill tùy chỉnh được đề xuất, không phải tên marketplace:
- study-reader-focus-ui: reader/fullscreen/timing, UI tối giản và accessibility.
- study-reader-local-first: IndexedDB, migrations, backup, JSON, offline, privacy.
- study-reader-fsrs: Anki-style review, adapter scheduler, log/undo.
- study-reader-quality: unit/integration/browser tests, network và screenshots.

Với mỗi skill hãy báo: đã có hay cần tạo/cài; nhiệm vụ; nguồn thật hoặc nhãn custom; dependencies/quyền; chi phí hoặc điều chưa xác minh; cách kích hoạt; đầu ra và tiêu chí test. Nếu chưa được kiểm tra trong host, phải ghi rõ.

Chỉ dựa tài liệu chính thức hiện tại cho cách cài/discovery và APIs. Không bịa skill, URL, lệnh installer, version hoặc nói miễn phí khi chưa xác minh. Kiểm tra catalog hiện tại vì tên/đường dẫn có thể thay đổi. Nếu không có skill phù hợp, đề xuất SKILL.md instruction-only có trigger, workflow, guardrails và tests. Không tự thêm dịch vụ ngoài hoặc tắt sandbox.

# 5. Kiến trúc và tiêu chí kỹ thuật

Với repo mới, đánh giá TypeScript + React + Vite, PDF.js, IndexedDB/Dexie, JSON Schema/Ajv, ts-fsrs, Vitest và Playwright Test. Đây là ứng viên, không phải lệnh cài hàng loạt. Với repo đang có, ưu tiên tái sử dụng. Xác minh phiên bản tương thích, license, advisories và bundle cost trước đề xuất.

Tách reader engine, scheduler, storage và JSON contract khỏi UI. Review state/log phải ghi atomic, chống click trùng/nhiều tab; undo khôi phục cả lịch và lịch sử liên quan. Clock/timezone/ngày học có chính sách và test. FSRS adapter được test với thư viện thật của version đã chọn, không chỉ mock.

JSON/ảnh/PDF là đầu vào không tin cậy. Giới hạn kích thước, schema version và ID/reference. Backup/restore, migration và xung đột import phải có kế hoạch từ trước khi lưu dữ liệu thật. Không gửi nội dung lên server, telemetry hay AI ngầm.

Quality gates phải có typecheck/lint/unit/build và kiểm browser thật cho UI. Yêu cầu test file có thể lặp lại; không chỉ demo click. Bao gồm fullscreen/fallback, tab hidden, bảo toàn dấu gạch, rating/undo, offline/reload và backup round-trip. Không nhận đã chạy test nếu chưa chạy. Không đặt số đo hiệu năng đã đạt khi chưa benchmark.

Mã nguồn mở là yêu cầu; giấy phép cụ thể chưa chốt. Đề nghị lựa chọn dựa license dependency, không tự áp giấy phép cho sách/ảnh bên thứ ba.

# 6. Đầu ra của lượt này

A. Hiểu sản phẩm: yêu cầu đã chốt, đề xuất kỹ thuật, điểm còn thiếu.
B. Báo cáo môi trường: đã xác minh và chưa thể xác minh.
C. Bảng tối đa 4 skill cốt lõi + 2 tùy chọn; kèm nguồn/cách thêm phù hợp host.
D. Kiến trúc tối thiểu, data model sơ bộ và nguồn phát sinh chi phí.
E. Roadmap theo lát cắt: TXT/paste reader → PDF → JSON/FSRS/quiz → offline/hardening; tiêu chí nghiệm thu từng chặng.
F. Dự thảo nội dung/cây tệp AGENTS.md và SKILL.md cần bổ sung; không ghi đè tệp có sẵn.
G. Rủi ro trọng yếu và những câu hỏi ít nhất cần tôi quyết định.

DỪNG ở kế hoạch. Không viết runtime, không cài package/skill/plugin, không đổi cấu hình bảo mật, không commit/push/deploy hoặc đụng production. Chỉ triển khai từng chặng sau khi tôi duyệt phạm vi.

# 7. Cập nhật sau khi kết nối Product Design

Product Design đã được kết nối trong cuộc thảo luận tạo brief. Hãy kiểm tra nó có được nhận diện trong chính host bạn đang chạy không; không mặc định tài khoản/phiên khác tự có đủ tool.

Lượt khảo sát kỹ thuật này không cần chạy workflow thiết kế. Khi cần rà luồng/mockup, dùng prompt riêng `prompts/03-product-design-review.md` trong môi trường được plugin hỗ trợ. Không tạo thêm một skill UX chung trùng việc của Product Design; vẫn giữ skill `study-reader-focus-ui` cho các ràng buộc riêng về RSVP/fullscreen/timing.

Nếu đã có báo cáo Product Design thật, dùng findings có bằng chứng để bổ sung tiêu chí nghiệm thu. Nếu chưa có, ghi chưa rà; không dùng tên plugin làm bằng chứng chất lượng. Không tự chuyển nhiệm vụ PLAN thành tạo ảnh/prototype/deploy.
