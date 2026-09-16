---
name: study-reader-local-first
description: Thiết kế hoặc sửa IndexedDB, transaction, migration, backup/restore, PWA/offline, Study Pack JSON và ảnh URL của Study Reader. Dùng cho thay đổi hợp đồng dữ liệu/quyền riêng tư; không tự thêm backend, tài khoản hay sync.
---

# Local-first data workflow

## Đầu vào

Đọc AGENTS.md, docs/PRODUCT-BRIEF.md, docs/QUALITY-GATES.md và schema/migration hiện có. Kiểm dữ liệu thử là tổng hợp hoặc được cấp quyền; không dùng sách riêng làm fixture commit.

## Quy trình

1. Liệt kê dữ liệu được lưu: nguồn/edited text, bookmark, content/decks/cards, scheduling state, review events, quiz attempts, settings. Phân biệt dữ liệu bắt buộc và có thể tái tạo.
2. Tách domain contract khỏi cấu trúc của thư viện ngoài. Dùng version và ID ổn định, quy tắc xung đột, revision và migration trước khi thay schema.
3. Study Pack chỉ trao đổi nội dung. Personal Backup có trạng thái cá nhân và review history. Không để AI tạo due/state/lịch người học.
4. Validate JSON đầu vào như dữ liệu không tin cậy: type, version, kích thước, độ sâu, ID, quan hệ, đáp án. Không eval, không raw HTML/template JS, không schema `$ref` ngoài tự tải. Nếu dùng Ajv, kiểm plugin/version trước tích hợp.
5. Import vào vùng staging, xem trước, xác nhận rồi ghi atomic theo thiết kế. Lỗi giữa chừng không để thư viện nửa vời. Restore không ghi đè dữ liệu hiện có khi chưa rõ chính sách.
6. Review card và event phải lưu cùng transaction; tham khảo skill FSRS. Multi-tab cần concurrency guard; không chỉ dựa vào disabled button.
7. Blob/file caching phải có giới hạn và cách giải phóng; IndexedDB không phải sao lưu bất tử. Handle quota, persistence denied, blocked migration và tab cũ.
8. PWA cache tài nguyên app do ta phân phối; không mặc định cache ảnh bên thứ ba, nội dung riêng hay response opaque không giới hạn. Update không làm mất draft/review đang ghi.
9. Ảnh ngoài HTTPS được validate và hiển thị như ảnh, có kiểm soát tải theo pack/nguồn. Không proxy ảnh bằng server, không fetch mọi URL ngay khi paste/import, không base64 data URL hay chèn SVG/HTML inline. Kiểm lại URL sau mọi phép chuẩn hóa; không chạy PDF JavaScript/attachment.
10. Network và log phải phản ánh lời hứa privacy. Không request chứa nội dung PDF/text/card tới AI, telemetry hoặc backend. Ảnh ngoài là ngoại lệ do người dùng chọn; cần nói rõ ảnh host có thể nhận request.

## Nghiệm thu

Schema reject test; duplicate/import conflict; malicious text/URL; backup round-trip; migration rollback; transaction fail; storage full; multi-tab; offline trên production build; service-worker update khi có draft. Không coi localStorage demo là phần persistence hoàn chỉnh.

Nguồn đối chiếu: docs/SOURCES.md S9 và tài liệu chính thức của version thư viện được lựa chọn. Báo tất cả hành vi chưa kiểm chứng.
