# Nguồn đã đối chiếu

Ngày truy cập: 16/09/2026. Đây là nguồn về cơ chế/công cụ; các yêu cầu sản phẩm trong bộ tài liệu được đề xuất từ cuộc thảo luận, không phải tất cả đều là hành vi có sẵn của Anki/Codex. Agent cần kiểm tra lại API/version tại thời điểm triển khai.

S1. Anki Manual — Studying: https://docs.ankiweb.net/studying.html
Cơ sở cho câu hỏi trước, đáp án sau và ý nghĩa Again/Hard/Good/Easy.

S2. Anki Manual — Deck Options: https://docs.ankiweb.net/deck-options
Cơ sở cho FSRS, mục tiêu retention, phân biệt quên với khó nhớ.

S3. Open Spaced Repetition — ts-fsrs:
https://github.com/open-spaced-repetition/ts-fsrs
https://github.com/open-spaced-repetition/ts-fsrs/blob/main/packages/fsrs/README.md
https://github.com/open-spaced-repetition/ts-fsrs/blob/main/LICENSE
Thư viện scheduler TypeScript, preview/apply, cấu hình; phải xác minh bản được chọn. Scheduler khác optimizer; bản đầu chỉ cần scheduler.

S4. OpenAI — Build skills:
https://learn.chatgpt.com/docs/build-skills
URL cũ được mở và chuyển hướng: https://developers.openai.com/codex/skills
Cấu trúc SKILL.md, discovery, thư mục .agents/skills, /skills và cách gọi skill theo host.

S5. OpenAI — Custom instructions with AGENTS.md:
https://learn.chatgpt.com/docs/agent-configuration/agents-md
URL cũ: https://developers.openai.com/codex/guides/agents-md
Hướng dẫn cấp repo và cách agent khám phá instruction.

S6. OpenAI — Skills/Plugins repositories:
https://github.com/openai/skills
https://github.com/openai/plugins
Kho skills cũ hiện có thông báo deprecated; không sao chép lệnh cài đặt lỗi thời.

S7. Playwright — Installation/introduction: https://playwright.dev/docs/intro
Năng lực test trình duyệt và môi trường hỗ trợ. Kiểm version trước cài.

S8. Vitest — Getting Started: https://vitest.dev/guide/
Framework test; kiểm tính tương thích với stack đã có.

S9. MDN — Storage quotas and eviction criteria:
https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
Dữ liệu trình duyệt có hạn mức và có thể bị thu hồi/xóa; cần backup riêng.

S10. Mozilla — PDF.js: https://mozilla.github.io/pdf.js/
Ứng viên engine PDF phía trình duyệt; agent cần kiểm tra API/version khi triển khai.

Ở bản v1, Product Design/Codex Security mới là đề xuất. Sau đó người dùng đã kết nối Product Design; catalog xác nhận installed=true ở lượt v2. Codex Security chưa được cài. Chưa chạy workflow Product Design trong phiên chat này. Không có kết quả plugin Playwright trong lượt tìm catalog này; Playwright Test vẫn là ứng viên công cụ phát triển độc lập, không suy từ đó rằng công cụ không tồn tại hoặc không thể cài trên máy dev.

## Nguồn bổ sung v2 — Product Design

Trạng thái kết nối lấy từ catalog plugin trong phiên này, không từ trang web công khai. Các nguồn dưới đây hỗ trợ hướng dẫn workflow, không chứng minh workflow đã được thực thi.

S11. OpenAI role-specific-plugins — Product Design router:
https://github.com/openai/role-specific-plugins/blob/main/plugins/product-design/skills/index/SKILL.md
Môi trường chat/Work và định tuyến nhiệm vụ.

S12. OpenAI role-specific-plugins — Product Design audit:
https://github.com/openai/role-specific-plugins/blob/main/plugins/product-design/skills/audit/SKILL.md
Báo cáo rà trải nghiệm dựa trên bước và bằng chứng, phân biệt với QA triển khai.

S13. OpenAI role-specific-plugins — Product Design design-qa:
https://github.com/openai/role-specific-plugins/blob/main/plugins/product-design/skills/design-qa/SKILL.md
Cần nguồn thiết kế và bản render triển khai để đối chiếu; thiếu nguồn thì không báo đạt.

S14. OpenAI role-specific-plugins — Product Design README:
https://github.com/openai/role-specific-plugins/blob/main/plugins/product-design/README.md
Vai trò các workflow và dạng đầu vào hỗ trợ.

S15. OpenAI Help Center — Plugins in ChatGPT and Codex:
https://help.openai.com/en/articles/20001256
Khác biệt theo giao diện, quyền và khả năng plugin/app; không suy từ cài đặt sang quyền thao tác.

Các nguồn được đọc trên web để cập nhật hướng dẫn. Không sao chép mã plugin hoặc chạy script lấy từ repository. Bốn SKILL.md tùy chỉnh vẫn là nội dung do Jarvis soạn cho dự án.
