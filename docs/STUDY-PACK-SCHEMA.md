# OneWord Study Pack v1

M3a — content-only. Runtime contract: `src/application/study-pack.ts`. Đây là hợp đồng thật của import/export, không phải schema tương lai. Tất cả object từ chối trường lạ, kể cả HTML/template/script, scheduling, history, settings, `$ref` hoặc media nhúng. Text có ký tự `<script>` được giữ như chữ và hiển thị bằng React text nodes, không parse HTML.

## Ví dụ hợp lệ

```json
{
  "type": "oneword-study-pack",
  "schemaVersion": 1,
  "id": "pack-language-01",
  "title": "Từ vựng mẫu",
  "description": "Nội dung mẫu tự tạo để minh họa định dạng.",
  "author": "Tác giả tùy chọn",
  "source": "Ghi chú do người dùng cung cấp",
  "createdAt": "2026-09-17T00:00:00.000Z",
  "updatedAt": "2026-09-17T00:00:00.000Z",
  "decks": [
    {
      "id": "deck-language-01",
      "packId": "pack-language-01",
      "title": "Bộ thẻ mẫu",
      "description": "Mô tả tùy chọn",
      "order": 0
    }
  ],
  "cards": [
    {
      "id": "card-language-01",
      "deckId": "deck-language-01",
      "front": { "text": "Từ “hello” thường dùng để làm gì?" },
      "back": { "text": "Để chào hỏi." },
      "tags": ["giao-tiep"],
      "source": "Ghi chú nguồn tùy chọn",
      "order": 0,
      "revision": 1
    }
  ]
}
```

## Trường và giới hạn

| Đối tượng | Trường bắt buộc | Trường tùy chọn |
| --- | --- | --- |
| Pack | type, schemaVersion, id, title, description, createdAt, updatedAt, decks, cards | author, source |
| Deck | id, packId, title, order | description |
| Card | id, deckId, front, back, order, revision | tags, source |
| Face (front/back) | text | image |
| Image | url, alt | caption, essential |

- IDs là string 1–80 ký tự ASCII, regex `^[A-Za-z0-9][A-Za-z0-9._-]*$`, phân biệt hoa/thường. Toàn bộ pack/deck/card IDs không trùng nhau trong thư viện. UI tạo UUID. Không lấy vị trí mảng làm ID. Khi sao chép thành pack riêng phải đổi cả IDs và tham chiếu liên quan.
- title: 1–120 ký tự (không chỉ whitespace); description: tối đa 2.000, có thể rỗng. author: tối đa 200; source của pack/card: tối đa 1.000, chỉ chữ, không tự biến thành link.
- createdAt/updatedAt: chuỗi ISO UTC đúng dạng `YYYY-MM-DDTHH:mm:ss.sssZ`, ngày thật; updatedAt không trước createdAt.
- order: số nguyên 0–1.000.000. Deck/card hiển thị theo order rồi ID khi bằng nhau; order không là identity. Export chuẩn hóa mảng theo ID, không dựa thứ tự mảng để xác định nghĩa.
- revision: số nguyên 1–1.000.000. Save card giữ ID và tăng revision, gồm chuyển deck/sửa ảnh/chữ/tags/source. M3a không giữ lịch sử revision hoặc lịch ôn của thẻ. Sửa sau import là thao tác biên tập rõ ràng, không là implicit merge.
- text: tối đa 10.000 ký tự UTF-16/mặt, không NUL. Một mặt cần chữ không rỗng hoặc ảnh có alt; cho phép image-only. Không tự tóm tắt/diễn giải/normalize Unicode.
- tags: tối đa 20 chuỗi khác nhau, mỗi chuỗi không rỗng, tối đa 64 ký tự; được sort để compare/export ổn định. UI nhập bằng dấu phẩy. Caption tối đa 2.000; alt bắt buộc không rỗng, tối đa 1.000. Các string đều cấm NUL.
- Mỗi pack tối đa 100 decks và 5.000 cards; tổng thư viện tối đa 100 packs/10.000 cards. Study Pack JSON tối đa 8 MiB UTF-8, kiểm cả input và output đã định dạng để bảo đảm export lại được; nesting tối đa 10 (ngoặc trong string không tính). Toàn bộ Personal Backup vẫn phải xuất được trong 32 MiB.
- Deck phải trỏ về pack đang chứa nó, card phải trỏ về deck tồn tại trong pack. Không có tham chiếu cross-pack. Unknown fields, object thay array hoặc ngược lại, missing fields, schema future, IDs trùng/không hợp lệ bị từ chối trước ghi.

## Ảnh và quyền riêng tư

`image` là object `{ "url": "https://…", "alt": "Mô tả", "caption": "Chú thích tùy chọn", "essential": true }`. Chỉ url/alt bắt buộc; thiếu essential tương đương false. URL tối đa 2.048 ký tự trước và sau chuẩn hóa, phải bắt đầu chính xác `https://`, parse được, không whitespace/backslash hoặc username/password. Validator canonicalize bằng URL.href. Cấm http:, data:, blob:, javascript:, file: và base64 media như URL.

Import, preview, editor và mở thẻ không tự tải ảnh. Mỗi ảnh có nút **Tải ảnh này** cùng hostname và thông báo lộ IP. Ảnh render bằng `<img>`; không iframe, SVG inline, HTML hoặc script. `referrerPolicy=no-referrer` và `crossOrigin=anonymous`: không Referer/cookie cross-origin; host vẫn nhận IP, URL yêu cầu, browser headers và Origin của CORS. URL do tác giả cung cấp có thể là URL theo dõi; chỉ tải từ host bạn tin tưởng. Host phải cho phép CORS; nếu không hoặc ảnh hỏng, giữ alt/caption/chữ và báo lỗi. Ảnh essential lỗi gợi ý bỏ qua; không ghi đánh giá sai vì M3a chưa có đánh giá.

Không upload, proxy, chuyển URL sang binary/base64, Cache API, service worker hay persist media vào IndexedDB. Browser có thể dùng HTTP cache thông thường theo chính sách host; đó không phải kho media do OneWord quản lý. Preview từng mặt không tải ảnh của mặt sau trước khi mở. Quyền tải là tạm cho lần hiển thị ảnh; không lưu consent lâu dài.

## Import và xung đột

Một file chứa một pack. Chọn file/dán JSON → kiểm byte/depth → parse → validate structure/IDs/references → preview title/decks/card count/card mẫu → summary → confirm → atomic save. Preview không ghi nội dung; checkpoint reader đang tồn tại có thể hoàn tất độc lập. Confirm kiểm lại nội dung hiện tại, storage kiểm generation để chặn stale tab. Lỗi ghi giữ form/preview, không import một phần.

- Pack ID chưa có, không trùng child ID ở pack khác: thêm.
- Pack ID đã có và toàn bộ canonical content/metadata giống nhau: skip/no-op.
- Cùng pack ID khác bất kỳ nội dung/metadata/timestamp/revision: block toàn bộ. Không tự thêm card mới vào pack đã tồn tại và không ghi đè một phần.
- Child ID trùng ở pack khác: block toàn bộ, kể cả chữ giống nhau.
- Canonical property order, mảng deck/card sort theo ID, tags sort; khác vị trí mảng đơn thuần không tạo conflict. order field/timestamps/optional-field presence vẫn là content có ý nghĩa.

Export chỉ chiếu nội dung qua validator, không lịch sử review, FSRS, position, preferences, session, generation hoặc draft reader. Import/export giữ IDs, relationships, timestamps/revisions và image metadata. JSON hợp lệ không chứng minh tri thức đúng: người dùng cần kiểm nội dung.

## Personal Backup và FSRS

Personal Backup v4 chứa data.packs cùng reader documents/positions/preferences/draft và data.review cá nhân. Restore v1/v2 thêm packs=[]; v1/v2/v3 thêm review rỗng, giữ dữ liệu cũ. Study Pack không đọc Personal Backup và không dùng làm đường khôi phục trạng thái cá nhân. Backup merge áp dụng cùng quy tắc conflict cho packs và atomic xuyên reader/content/review.

M3b triển khai FSRS/review trong store/model riêng, tham chiếu cardId và content revision; xem [FLASHCARD-SCHEDULING.md](FLASHCARD-SCHEDULING.md). Không thêm due/stability/difficulty/rating/review history vào Card v1. Quiz/chọn đáp án chưa có trong schema v1; thay đổi schema cần version và converter có test. Study Pack v1 không thay đổi cấu trúc vì scheduling.
