# Prompt bên ngoài — Study Pack v2

Tài liệu tĩnh để người dùng tự sao chép sang dịch vụ AI họ chọn; OneWord không gọi AI. Chỉ gửi tài liệu có quyền chia sẻ, không gửi Personal Backup. Kiểm chứng nội dung trước import. Bản v1 vẫn dùng được cho flashcard-only.

```text
Chỉ từ TÀI LIỆU tôi cung cấp, tạo flashcards và/hoặc quiz theo số lượng yêu cầu. Không tự thêm kiến thức, không bịa nguồn, không bịa URL ảnh. Bỏ phần thiếu/mơ hồ; không đoán đáp án. Mỗi câu quiz phải có đúng một lựa chọn rõ ràng đúng, 2–6 lựa chọn và giải thích ngắn dựa trên tài liệu. Kết quả sẽ được con người rà lại.

Chỉ xuất một đối tượng JSON hợp lệ theo Study Pack v2, không Markdown, comments, hoặc lời giải ngoài JSON. Dùng các trường trong mẫu sau (thay placeholders):
{
  "type": "oneword-study-pack", "schemaVersion": 2,
  "id": "PACK_ID", "title": "Tên pack", "description": "Mô tả",
  "createdAt": "THỜI ĐIỂM UTC", "updatedAt": "CÙNG THỜI ĐIỂM UTC",
  "decks": [], "cards": [],
  "quizzes": [{"id":"PACK_ID-quiz-1","packId":"PACK_ID","title":"Tên quiz","description":"Mô tả","questionIds":["PACK_ID-q-1"]}],
  "questions": [{"id":"PACK_ID-q-1","prompt":"Câu hỏi từ nguồn","choices":[{"id":"choice-a","text":"Lựa chọn A"},{"id":"choice-b","text":"Lựa chọn B"}],"correctChoiceId":"choice-b","explanation":"Giải thích ngắn từ nguồn","revision":1}]
}
Nếu chỉ muốn flashcards, quizzes/questions là []. Nếu chỉ quiz, decks/cards có thể là []. Khi thêm flashcard: decks=[{"id":"PACK_ID-deck","packId":"PACK_ID","title":"Tên bộ thẻ","order":0}], cards=[{"id":"PACK_ID-card-1","deckId":"PACK_ID-deck","front":{"text":"Câu hỏi"},"back":{"text":"Đáp án"},"order":0,"revision":1}]. Không lộ đáp án trong front.

ID ổn định 1–80 ký tự: ASCII chữ/số/dấu chấm/gạch dưới/gạch nối, bắt đầu bằng chữ/số. Pack/deck/card/quiz/question IDs không được trùng. Choice IDs chỉ cần duy nhất trong câu; không dùng index làm identity. correctChoiceId phải tồn tại; questionIds phải tham chiếu đúng và không trùng. Giữ IDs khi sửa chữ. Revision=1 cho nội dung mới. Timestamp UTC YYYY-MM-DDTHH:mm:ss.sssZ phải do tôi cung cấp và là ngày thật. Nếu thiếu tài liệu, PACK_ID hoặc thời điểm, yêu cầu tôi bổ sung trước khi tạo.

Chỉ text thuần, không HTML/template/script. Title <=120, description <=2000; prompt/explanation/card face <=10000, choice text <=2000. Có thể thêm tags (<=20 chuỗi riêng biệt, mỗi chuỗi <=64) và source (<=1000) cho câu/thẻ, chỉ khi dựa trên nguồn cung cấp. Không bịa trích dẫn. Pack có thể có author <=200, source <=1000; deck.description <=2000; quiz.deckId tùy chọn phải tồn tại.

Chỉ thêm image khi tôi cung cấp chính xác URL HTTPS thực: {"url":"URL ĐƯỢC CUNG CẤP","alt":"Mô tả ảnh","caption":"Tùy chọn","essential":true}. Đặt image ở question hoặc card face. Không URL tự tìm/đoán, không credentials/whitespace/backslash, không data:/base64/javascript:/http:. alt bắt buộc <=1000, caption <=2000, URL <=2048. essential=true nếu bắt buộc có ảnh mới trả lời được. Không nhét nội dung vào URL. Thiếu URL thì bỏ field image.

Giới hạn: JSON <=8 MiB, nesting <=10, <=100 decks, <=5000 cards, <=100 quizzes, <=2000 questions, <=200 questions mỗi quiz. Không thêm $ref, schema từ xa, attempts, scores, history, flags, user settings, due/schedule/FSRS/review events. Study Pack chỉ chứa nội dung chia sẻ.

PACK_ID: [điền]
THỜI ĐIỂM UTC: [điền]
SỐ FLASHCARDS / QUIZ / CÂU HỎI: [điền; có thể 0 flashcards]
URL ẢNH DO TÔI CUNG CẤP: [không có hoặc danh sách và ngữ cảnh]
TÀI LIỆU: [dán tài liệu được phép chia sẻ]
```
