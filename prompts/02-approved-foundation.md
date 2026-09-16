Tôi duyệt triển khai chặng nền tảng M1 trong kế hoạch vừa được thống nhất, chỉ với các dependency và quyền mà tôi đã duyệt rõ ở kế hoạch đó. Nếu kế hoạch chưa được duyệt hoặc không xác định được repo, dừng và nêu phần còn thiếu; không dùng prompt này để tự mở rộng quyền.

Trước khi sửa: kiểm repo/branch/git status, đọc AGENTS.md và tệp kế hoạch thực có. Giữ nguyên thay đổi của tôi. Hợp nhất tài liệu/skill đã duyệt, không ghi đè instruction cũ; không cài plugin ngoài hoặc dependency chưa duyệt.

Thực hiện lát cắt chạy được: TXT/dán văn bản → chỉnh sửa có giữ bản gốc và undo → RSVP tùy chỉnh → fullscreen tối giản → pause/tab hidden/rewind → lưu vị trí và xuất/khôi phục dữ liệu tối thiểu. Không làm PDF, flashcard, quiz, auth, cloud hay AI ở chặng này. Kiến trúc cần có điểm mở rộng cho FSRS nhưng không dựng tính năng giả để lấp màn hình.

Dùng các skill liên quan đã được host nhận diện. Viết unit tests và Playwright Test specs cho phần đã làm, rồi chạy các kiểm tra khả dụng. Thiết lập mới chỉ trong phạm vi đã duyệt. Không đánh đồng test mock fullscreen với kiểm chứng fullscreen thật; ghi phần cần test thủ công.

Bàn giao: file đã sửa, cách chạy, lệnh kiểm thử thực chạy + kết quả, ảnh UI/trace có đường dẫn thật, phần chưa kiểm chứng, lỗi tồn tại và mốc tiếp theo. Không tự commit, push, deploy hoặc restart production.
