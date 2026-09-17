# Prompt bên ngoài — OneWord Study Pack v1

Bản kế tiếp hỗ trợ quiz: [STUDY-PACK-PROMPT-v2.md](STUDY-PACK-PROMPT-v2.md). Bản v1 này vẫn dùng cho flashcard-only.

Đây là tài liệu tĩnh. Sao chép prompt, điền phần trong ngoặc vuông rồi tự dùng với dịch vụ AI bạn chọn. OneWord không gửi dữ liệu hoặc gọi AI API. Chỉ chia sẻ tài liệu bạn có quyền chia sẻ và kiểm chứng kết quả trước khi nhập. Không cung cấp Personal Backup cho mục đích tạo nội dung.

```text
Tạo flashcard chỉ từ TÀI LIỆU được cung cấp ở cuối prompt. Không tự bổ sung kiến thức, không bịa nguồn hoặc URL ảnh. Giữ đúng ý nghĩa nguồn; bỏ qua phần thiếu/còn mơ hồ thay vì đoán đáp án. Kết quả cần được con người rà lại.

Chỉ xuất một đối tượng JSON hợp lệ, không Markdown/fence/bình luận hoặc giải thích bên ngoài. Dùng schema OneWord Study Pack v1 với chính xác các trường dưới đây, không trường khác:

{
  "type": "oneword-study-pack",
  "schemaVersion": 1,
  "id": "[PACK_ID]",
  "title": "[TÊN PACK]",
  "description": "[MÔ TẢ NGẮN]",
  "createdAt": "[THỜI ĐIỂM UTC: YYYY-MM-DDTHH:mm:ss.sssZ]",
  "updatedAt": "[CÙNG THỜI ĐIỂM UTC]",
  "decks": [
    {"id": "[DECK_ID]", "packId": "[PACK_ID]", "title": "[TÊN BỘ THẺ]", "order": 0}
  ],
  "cards": [
    {"id": "[CARD_ID]", "deckId": "[DECK_ID]", "front": {"text": "[CÂU HỎI]"}, "back": {"text": "[ĐÁP ÁN DỰA TRÊN NGUỒN]"}, "order": 0, "revision": 1}
  ]
}

Thay toàn bộ placeholder bằng giá trị thật. ID ổn định, duy nhất, 1–80 ký tự, chỉ chữ ASCII/số/dấu chấm/gạch dưới/gạch nối, bắt đầu bằng chữ hoặc số. Dùng prefix PACK_ID do tôi cung cấp để tránh trùng thư viện khác. Deck.packId và Card.deckId phải tham chiếu đúng ID trong file. Không dùng vị trí mảng làm ID. Các order là số nguyên không âm; revision=1 cho thẻ mới. Timestamp UTC phải là ngày thật và updatedAt không trước createdAt. Nếu tôi thiếu PACK_ID/thời điểm/tài liệu, hãy yêu cầu tôi cung cấp trước khi tạo JSON; không bịa dữ liệu nguồn.

Mỗi card hỏi một ý rõ ràng; front không lộ đáp án, back ngắn nhưng đủ nghĩa. Mỗi mặt có text string tối đa 10000 ký tự, không HTML/Markdown template hoặc script. Title không rỗng, tối đa 120; description tối đa 2000. Không thêm scheduling/review history/reader position/settings/quiz hoặc session.

Trường tùy chọn duy nhất: pack.author (string <=200), pack.source (string <=1000); deck.description (string <=2000); card.tags (tối đa 20 chuỗi khác nhau, mỗi chuỗi 1–64 ký tự) và card.source (string <=1000).

Chỉ thêm image khi tôi cung cấp URL ảnh HTTPS thực. Không tìm, đoán, sửa path hoặc tạo URL. Nếu không có URL được cung cấp, bỏ image hoàn toàn. Face.image gồm {"url":"URL HTTPS ĐƯỢC CUNG CẤP", "alt":"Mô tả ảnh", "caption":"Chú thích tùy chọn", "essential":true hoặc false}. url/alt bắt buộc; caption/essential tùy chọn. alt không rỗng <=1000, caption <=2000, URL <=2048, không credentials, whitespace, backslash; không data:/base64/javascript:/http:. Đánh essential=true chỉ khi thiếu ảnh thì không thể trả lời từ chữ. Đừng nhét nội dung tài liệu vào URL. Một mặt phải có chữ không rỗng hoặc ảnh hợp lệ.

Giới hạn: một pack/file, tối đa 100 decks/5000 cards, JSON <=8 MiB, nesting <=10; IDs của pack/deck/card không trùng nhau. Số lượng thẻ theo yêu cầu của tôi, không cố chạm giới hạn. Không thêm $ref hoặc schema từ xa. Toàn bộ nội dung cần được kiểm chứng bằng tài liệu tôi cung cấp.

PACK_ID: [điền prefix riêng]
THỜI ĐIỂM UTC: [điền]
SỐ THẺ MONG MUỐN: [điền]
URL ẢNH ĐƯỢC CUNG CẤP VÀ NGỮ CẢNH: [không có hoặc danh sách]
TÀI LIỆU:
[dán tài liệu được phép chia sẻ]
```

Hợp đồng đầy đủ và quy tắc xung đột: [STUDY-PACK-SCHEMA.md](STUDY-PACK-SCHEMA.md). Khi import, OneWord kiểm cấu trúc, không xác nhận tính đúng của nội dung AI tạo.
