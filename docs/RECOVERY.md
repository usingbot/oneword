# Lưu trữ và phục hồi

IndexedDB và app cache thuộc origin/trình duyệt/profile. Dữ liệu có thể mất khi dọn site data, profile, thiết bị hoặc do eviction. **Personal Backup** là bản sao người dùng tự giữ; JSON không mã hóa. Nút **Ưu tiên giữ dữ liệu trên thiết bị** chỉ gọi StorageManager.persist sau thao tác chủ động, có thông báo granted/denied/error và luôn nhắc backup. Ứng dụng không phụ thuộc quyền này.

| Tình huống | Hành vi và việc nên làm |
| --- | --- |
| Ghi bị quota/transaction lỗi | Hiện Chưa lưu được, giữ nội dung memory; xuất backup/sao chép trước khi đóng, kiểm dung lượng/quyền lưu rồi thử lại |
| IndexedDB không mở được | Không ghi đè kho chưa đọc; đóng tab cũ, kiểm quyền/dung lượng, mở lại; giữ profile và backup cũ |
| Dữ liệu hỏng/thiếu reference/aggregate hoặc future version | Chặn hydrate/ghi, không xóa/recreate database; dùng đúng app mới hơn nếu cần, giữ kho gốc để điều tra |
| Backup JSON hỏng hoặc quá giới hạn | Từ chối trước transaction, dữ liệu có sẵn không đổi; chọn lại file hợp lệ |
| Backup version tương lai | Từ chối; giữ file và dùng phiên bản app tương thích, không sửa schemaVersion bằng tay |
| Restore xung đột ID/history | Chặn toàn bộ; giữ cả hai backup, có thể mở file trong profile/browser riêng để kiểm; không merge lịch sử ngầm |
| Migration bị ngắt/transaction abort | Rollback schema và records; thử lại khi giải quyết nguyên nhân, không Clear site data |
| Update tải thiếu/mất mạng | Active app cache và IndexedDB giữ nguyên; kết nối lại rồi kiểm tra cập nhật |

Khi read ban đầu thất bại, backup của phiên memory **không chứa dữ liệu cũ chưa đọc được**. Không thay thế bản backup tốt bằng file đó. UI nói rõ giới hạn này. Không có nút tự “sửa” bằng cách wipe storage; M4a không cung cấp công cụ phục hồi raw corrupted records.

Writer báo Đã lưu trên thiết bị chỉ sau transaction và hết pending queue. Hãy dừng thao tác và chờ trạng thái này trước khi đóng. Shutdown/mất điện vẫn có thể mất phần sau checkpoint cuối. Export lấy snapshot nhất quán khi đọc kho được; khi lỗi ghi, đường memory backup bảo vệ phần còn đang mở, không hứa cứu records không đọc được.

Schema hiện tại DB5/native50; hỗ trợ đường historical1–4 qua upgrade Dexie trong transaction. Validator kiểm cả graph trước commit upgrade5; đọc schema5 cũng kiểm aggregate/generation/ref. Unit fake-indexeddb bổ sung browser IndexedDB thật cho eras1–5, corruption/future/abort. Backup5 đọc1–4, giữ semantics merge-only và không upload. Các giới hạn số/byte không tăng trong M4a; đặc biệt200 attempts và32MiB backup vẫn là trần, không tự prune.

Quota/interruption/denial được inject có chủ đích trong tests; không làm đầy ổ đĩa thật, không thử nghiệm cắt điện, không kiểm mọi chế độ private browsing/eviction của OS. Test clearDatabase chỉ dùng profile test tổng hợp, không phải chiến lược phục hồi sản phẩm.
