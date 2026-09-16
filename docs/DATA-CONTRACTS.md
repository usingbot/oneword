# Hợp đồng dữ liệu M1a

M1a chỉ giữ dữ liệu trong memory; đây chưa phải format backup/Study Pack.

## TextDocument

- `original`: chuỗi Unicode được mở/dán lúc tạo document; không thay đổi theo sửa tay.
- `name`: tên tệp hoặc nhãn văn bản dán.
- `revisions`: các chuỗi đã áp dụng; phần tử đầu là original.
- `revision`: index revision hiện hành.

Document và mảng revisions được Object.freeze. Chuỗi là immutable. Draft editor riêng, không ghi đè original. Khi draft khác revision hiện hành, đọc bị vô hiệu cho tới apply hoặc undo. Apply tạo revision; undo ưu tiên bỏ draft chưa áp dụng, rồi lùi revision. Sửa sau undo tạo nhánh tuyến tính mới; không có redo ở M1a.

Undo không tự normalize CRLF, không bỏ dấu gạch. Browser textarea có thể normalize newline khi người dùng sửa; original nhập từ TXT vẫn giữ riêng. TextDecoder dùng UTF-8 strict; không đoán encoding.

## Reader

Chunk: `text`, `start`, `end`, `units`. start/end là UTF-16 offset của chuỗi JS và end exclusive. ReaderSnapshot: chunks/index/status; settings: mode, words, wpm, punctuation. Không dùng index chunk cũ sau chỉnh sửa nội dung.

## Import và lỗi

TXT ≤ 2 MiB; chỉ extension .txt, reject byte UTF-8 không hợp lệ và NUL. Dán text chịu cùng giới hạn khi áp dụng. Import lỗi giữ document cũ. Mở tệp mới hoặc thay draft bằng mẫu cần xác nhận nếu có nội dung. Hủy import vô hiệu kết quả bất đồng bộ; không báo rằng đã dừng I/O vật lý của File.arrayBuffer.

Tải lại/đóng trang sẽ mất mọi revision. UI ghi rõ và có beforeunload best-effort; browser có quyền không hiện dialog. File TXT gốc trên đĩa không bị sửa.

## Các contract chưa có

Không có IndexedDB, backup/restore, lịch sử đọc lâu dài, Study Pack, FSRS, quiz hoặc cloud. Schema có version, transaction, migration và conflict policy sẽ được thiết kế khi M1b được triển khai; chưa công bố format giả để người dùng lưu dữ liệu thật.
