# Cài đặt, ngoại tuyến và cập nhật

M4a chỉ đăng ký service worker trong production trên secure context (HTTPS hoặc localhost). Manifest có name/short_name, id/start_url/scope `/`, display standalone, theme/background và icon192/512/maskable do dự án tạo. Dùng menu cài ứng dụng/Add to Home Screen khi trình duyệt hỗ trợ; không ép prompt, không xin notifications, camera hoặc file-system permission. Chromium đã kiểm manifest/icons và `Page.getInstallabilityErrors=[]`; không đồng nghĩa đã cài qua OS shell trên mọi thiết bị. [Điều kiện installability của trình duyệt](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## Khả năng thực tế

Điều kiện: ít nhất một lần mở online và chờ trạng thái **Ứng dụng đã sẵn sàng ngoại tuyến**, storage chưa bị trình duyệt/người dùng xóa.

| Hành vi | Khi offline |
| --- | --- |
| Mở lại trang/app sau khi đóng | Có, từ app-shell cache |
| Reader/TXT/draft/vị trí đọc đã lưu | Có, IndexedDB; luôn bắt đầu ở trạng thái dừng |
| PDF đã trích chữ | Có, chỉ text và metadata, không có PDF gốc trong kho |
| Chọn PDF local mới | Đã kiểm smoke offline ở Chromium/Firefox, dùng các asset parser đã chuẩn bị |
| Study Pack/editor/flashcards/FSRS | Có, cùng transaction và rating semantics |
| Quiz đang làm/history | Có; mở Học → Quiz để resume lượt đã lưu |
| Personal Backup xuất/khôi phục | Local; không cần upload |
| Ảnh HTTPS ngoài | Không bảo đảm; chỉ tải sau opt-in, browser HTTP cache có thể giúp |
| Cài/cập nhật lần đầu chưa tải đủ | Cần mạng; không nhận build thiếu làm bản active |

Mạng của remote image có thể tiết lộ IP và request headers/Origin cho host ảnh, dù OneWord dùng anonymous CORS/no-referrer và không gửi cookie cross-origin. Không proxy, không tự đưa media ngoài vào CacheStorage/IndexedDB. Khi mất ảnh essential, FSRS cho bỏ qua, Quiz cần đánh dấu ảnh không khả dụng để loại khỏi mẫu số đúng policy hiện có.

## Cache và lifecycle

“Sẵn sàng ngoại tuyến” ở production yêu cầu worker của registration hiện tại có
state `activated` và chính worker đó đang điều khiển trang. Install của worker
phải hoàn tất toàn bộ precache với integrity trước khi activate; `register()`
thành công hoặc `registration.active` tồn tại chưa đủ. Client đọc lại trạng thái
hiện tại sau khi gắn listeners và khi có statechange/controllerchange/updatefound;
`navigator.serviceWorker.ready` chỉ đánh thức phép kiểm tra này, không tự đặt ready.
Điều này cũng xử lý worker đã cài xong trước khi continuation của register chạy.
Đây không phải cam kết cache tồn tại sau khi browser/user xóa storage.

Build tạo `/sw.js` với allowlist URL + SHA-256 integrity từ output Vite. Cache name `oneword-shell-<hash>` lấy từ cả asset list và worker source, không từ DB version. Chỉ GET cùng origin của các tài nguyên tĩnh đã phát hành được cache. Navigation `/` và `/index.html` dùng index của active build; hashed chunks có fallback sang app cache trước để bảo vệ trang cũ còn mở. Không ghi cache response API/runtime tùy ý. Worker không mở IndexedDB.

Install fetch đủ từng asset với integrity; lỗi/thiếu asset hủy install và xóa riêng cache của build chưa hoàn thành. Active cache vẫn dùng được. Không gọi skipWaiting trong install. Khi activate an toàn, giữ current + previous cache, dọn các cache OneWord cũ hơn nếu không có nhiều window clients; có nhiều client thì hoãn dọn. Không dọn cache ứng dụng khác, không xóa IndexedDB. Cache bị OS/browser eviction không thể được bảo đảm giữ vĩnh viễn.

UI có kiểm cập nhật chủ động; tự kiểm khi focus/online trở lại, tối đa mỗi giờ cho các lần kiểm đó. Trình duyệt còn có kiểm tra lifecycle riêng khi đăng ký. Bản mới đã cài hiện thông báo. Nút update khóa khi đang chỉnh draft, tải/import/restore, đọc phát, focus/fullscreen, khu vực học hoặc có lỗi lưu. Trong lúc ghi FSRS/Quiz, cả chuyển khu vực lẫn cập nhật đều khóa cho tới khi transaction kết thúc; không thể rời vùng Học để vượt guard khi ghi còn pending. Hoàn tất thao tác rồi về Đọc; đóng các tab/cửa sổ OneWord khác. Bấm **Cập nhật an toàn** → khóa thao tác, flush Reader checkpoint → worker kiểm window clients → kích hoạt → controllerchange → reload. Tab khác không bị code UI ép reload. Timeout hoặc lỗi giữ phiên và thông báo thử lại.

Nếu đóng hết trang, browser có thể tự activate worker đang chờ; lần mở sau đọc kho hiện có. Reload không tự tiếp tục đọc hoặc reveal thẻ. Không có reload tự động do phát hiện bản mới trong phiên đang mở. First-install không hiện nhầm thông báo update.

## Kiểm chứng và yêu cầu phục vụ tĩnh

Playwright tạo browser context mới cho từng ca PWA. `seedDatabase` chỉ mở favicon
để tạo IndexedDB; không mở app, đăng ký worker hay xóa cache. Hardening và smoke
bắt đầu từ context mới, sau đó giữ nguyên context cho bước offline/reload. Update
tests dùng context mới và origin test riêng, cài build cũ rồi mới đưa build mới
vào cùng origin/context. Không dùng profile browser cá nhân hoặc worker của ca khác.

`tests/offline-readiness.spec.ts` tách ba trường hợp: cài mới giữ lại một response
precache (212/213 assets, chưa ready), cài đặt đã active và reload/cold-page offline,
và registration được chuyển cho app sau khi activation/controllerchange đã xảy ra.
Response gate chỉ phục vụ byte production thật và không sửa worker. Không mock
ready, không dispatch lifecycle giả trong browser, không dùng sleep làm oracle.

`tests/fixtures/offline.ts` đọc manifest của build đang test và chờ đủ URL trong
đúng cache, worker activated và controller đúng registration. Ngân sách install
15 giây là giới hạn lỗi có snapshot chẩn đoán, không phải thời gian ngủ hoặc SLO;
nó cho dư địa so với precache thực vượt 5 giây trong trace RC0. Assertion nhãn vẫn
giữ mặc định 5 giây sau điều kiện lifecycle/cache. Unit tests riêng kiểm thứ tự
activation/control và trạng thái đã hoàn tất, không thay cho browser verification.
Xem [RC0-OFFLINE-READINESS.md](RC0-OFFLINE-READINESS.md) để biết nguyên nhân, số đo
và kết quả gate; các kết quả M4a bên dưới là lịch sử.

`npm run build` rồi `npm run test:prepare-updates` trên Windows tạo hai output Vite thật với index/build hash khác nhau trong `.tools/m4a-update-old` và `next`. `tests/update.spec.ts` chuyển server test giữa hai output: draft, active Quiz/review, reading, restore dialog, nhiều tab, complete update và asset404. Dữ liệu thật trong IndexedDB được chụp/so sánh trước–sau, rồi reload offline. Không mock storage hoặc worker. Fixtures không có endpoint production và không đi vào dist.

Khi có yêu cầu triển khai riêng sau này: phục vụ toàn `dist` tại origin root bằng HTTPS; giữ `/sw.js`, manifest, MIME JS/mjs và icon đúng. SW/index/manifest cần revalidate, không immutable; chỉ hashed assets nên có cache dài. Publish output nhất quán/atomic và giữ assets build trước trong thời gian chuyển tiếp. Integrity sẽ từ chối deploy thiếu hoặc index không khớp worker; không dùng thủ thuật ép clear user data để cập nhật. `scripts/serve-built.mjs` là server test loopback no-store, không phải backend hoặc cấu hình hosting được triển khai.

Đổi origin/path base/port tạo storage scope khác; M4a chỉ kiểm root `/`, chưa hỗ trợ tự động host dưới subpath. Dev server không phải bằng chứng offline. Safari/iOS/WebKit và OS install UI chưa chạy; xem ma trận thật trong TEST-ENVIRONMENT.
