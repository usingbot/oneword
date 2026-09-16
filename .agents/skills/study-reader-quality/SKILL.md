---
name: study-reader-quality
description: Viết và chạy kiểm thử, browser QA, rà accessibility/privacy/performance và báo cáo bằng chứng cho Study Reader. Dùng sau thay đổi tính năng, sửa lỗi hoặc trước bàn giao; không được báo test pass khi chỉ đọc code hoặc chưa có tool thực thi.
---

# Quality and verification workflow

## Trước khi kiểm tra

Đọc AGENTS.md, docs/QUALITY-GATES.md và diff thật. Xác định tiêu chí chặng; không biến nhiệm vụ sửa một bug thành rewrite. Kiểm package manager, scripts, browser/test tools; không tự cài hoặc mở quyền mới khi chưa được duyệt.

## Quy trình

1. Viết danh sách claim sẽ bàn giao và test cần chứng minh từng claim.
2. Logic thuần: chọn framework đang có; ứng viên Vitest. Dùng fixtures/clock cho segmentation, cleaning, timing, schema, quiz grading, FSRS adapter và backup.
3. Storage: test transaction/migration thật ở mức phù hợp. Nếu dùng fake IndexedDB ở unit test, bổ sung test persistence trong browser thật.
4. Browser: dùng Playwright Test khi đã được duyệt. Viết test .spec có thể chạy lại, không chỉ script click một lần. Nếu có skill Playwright CLI thì dùng cho khám phá, không tự coi đó là test suite của dự án.
5. Kiểm desktop và màn hình hẹp, keyboard, empty/error/loading, console/network; chụp screenshot có ý nghĩa. Fullscreen thật cần user activation và kiểm tra riêng, không chỉ mock API. Mobile emulation không chứng minh mọi device.
6. Kiểm privacy baseline và ngoại lệ ảnh ngoài, offline/reload trên production preview, service-worker update và tab ẩn.
7. Đo bundle/latency/RAM trên môi trường đã mô tả. Không tuyên bố nhanh gấp đôi hoặc zero-cost từ cảm giác. Browser nặng/test runners chỉ cần ở môi trường dev/CI.
8. Chạy typecheck, lint, unit, integration/E2E và build theo lệnh có thật. Không bỏ test/giảm assertion để pass. Nếu thiếu runtime/browser/quyền thì ghi BLOCKED và cách tái hiện, không ghi PASS.
9. Rà diff cuối: mã thừa, dữ liệu riêng, secrets, dependency không dùng, license notices, migration tương thích và phạm vi đã được duyệt.

## Báo cáo

Nêu file thay đổi và hành vi; danh sách lệnh thực chạy + status; artifact/screenshot có đường dẫn thật; bug còn lại; phạm vi chưa test. Không commit/push/deploy nếu chưa có yêu cầu riêng. Nếu không thực hiện được kiểm chứng, nói rõ thay vì suy đoán kết quả.

Nguồn: docs/SOURCES.md S7–S8. Các tiêu chí khác là yêu cầu chất lượng của dự án.
