# Đo hiệu năng M4a

Đã đo bản production M3c trước khi sửa runtime, rồi đo M4a với cùng synthetic fixture và script `tests/performance.spec.ts`. Windows build Node22.17.0/npm11.15.0; browser Chromium trong Ubuntu WSL, Node24.21.0/npm11.19.0, một worker, không CPU/network throttle. Đây là các lần chạy cục bộ, không median/p95 hoặc so sánh phần cứng. Số phụ thuộc cache/OS/GC; không ngoại suy sang điện thoại.

Fixture sinh từ code:4 packs,2.000 cards,4.000 ReviewEvents từ scheduler thật,200 QuizAttempts ×20 questions, text540.000 UTF-8 bytes và backup11.087.067 bytes. Đạt trần200 attempts hiện tại; không đồng thời đẩy mọi giới hạn tối đa. Backup tải ra sau restore được parse/so sánh chính xác documents/packs/review/attempts/active ID. Không sách hay dữ liệu cá nhân trong fixture.

| Phép đo (ms) | M3c trước | M4a lượt riêng | M4a full cuối |
| --- | ---: | ---: | ---: |
| Cold empty load tới trạng thái saved | 2169,67 | 1654,44 | 2454,91 |
| Warm empty reload tới saved | 1578,42 | 1458,07 | 1801,88 |
| Restore qua UI/transaction tới thông báo thành công | 61594,83 | 5774,20 | 18513,46 |
| Reload thư viện lớn tới saved | 26569,59 | 2165,83 | 5176,33 |
| Mở Study Pack UI | 613,12 | 430,35 | 651,52 |
| Mở FSRS review UI | 9636,04 | 249,70 | 843,24 |
| Queue generation thuần trong Node | 5,70 | 4,62 | 12,92 |
| Mở Quiz có attempt | 1361,09 | 148,04 | 374,63 |
| Export backup qua browser/download | 9688,86 | 1044,30 | 3054,07 |
| Node export/validation | 1902,69 | 257,39 | 720,11 |
| Node parse/validation | 1724,97 | 371,90 | 1051,02 |
| IndexedDB read+validate trong browser | chưa instrument | 250 | 754,70 |
| Reader open/segmentation text lớn | chưa instrument | 35 | 107,30 |

Browser timings gồm browser automation và chờ saved/debounce, không chỉ CPU. Performance marks mới chỉ đo ranh giới thực, không telemetry. Heap used sample Chrome:286MB trước,188MB sau; không phải peak/RSS, không gồm native/worker memory và không phải cam kết memory limit. Page errors=[] cả hai lần. Dữ liệu raw: `artifacts/m4a-performance-baseline.json` và `m4a-performance-optimization.json`; suite cuối cập nhật `m4a-performance-current.json` riêng.

Lượt full cuối trong bảng dùng bản có khóa chuyển khu vực khi FSRS/Quiz đang ghi. Heap sample103MB, page errors=[]; backup11.087.067bytes khớp chính xác sau round-trip. Lượt full thứ ba trước bản khóa này đã đạt81/81 và có startup5604,21ms/restore17468,50ms/export3101,83ms, lưu riêng ở `m4a-performance-full-third.json`. Không bỏ các samples chậm khi tổng hợp.

Các lượt full suite chậm hơn lượt riêng, cả Node lẫn browser; chưa xác định nguyên nhân môi trường. Không chọn riêng lần nhanh để kết luận. Lượt full đầu: cold2612,14ms, warm2424,47ms, large-startup5835,57ms, restore19390,60ms, pack655,11ms, review942,79ms, Quiz504,84ms, browser-export3306,57ms; Node export814,88ms/parse1234,72ms/queue15,65ms. IDB read933,5ms, reader open102,30ms, heap sample103MB. Lượt full tiếp theo: cold3170,17ms, warm2164,44ms, large-startup8625,00ms, restore31311,16ms, pack708,48ms, review1260,74ms, Quiz527,62ms, export4594,47ms; IDB read1651,70ms, reader open167ms, heap103MB. Raw samples giữ riêng trong `m4a-performance-full-first.json`/`full-second.json`; performance case đều PASS dù các tests khác trong những suite này cần sửa locator/synchronization. Round-trip vẫn chính xác, page errors=[]. Phạm vi đã quan sát M4a: large-startup2,17–8,63s, restore5,77–31,31s, export1,04–4,60s; không phải confidence interval. Cold/warm full chậm hơn M3c ban đầu nên không claim mọi load đều nhanh hơn. `current.json` là phép đo ở lượt suite chạy cuối cùng.

## Tối ưu dựa trên phép đo

Chi phí lớn tập trung validation lặp trên histories: mỗi event dựng lại Intl.DateTimeFormat, cùng library parse lại packs/attempts nhiều lần. M4a giữ tất cả validator nhưng reuse formatter theo timezone với cache bounded16, và reuse kết quả validation trong một lần đọc. Thử DST/timezone boundary và invalid timezone vẫn chạy. Không thay study day, profile FSRS, grade hoặc giới hạn dữ liệu.

Lazy StudyArea gồm Quiz/editor và lazy review gateway tách FSRS khỏi entry; PdfImport/PDF.js tiếp tục dynamic import. PWA precache tải byte của mọi chunk để offline nhưng không parse/execute module PDF/FSRS khi chưa dùng. Không state framework hoặc dependency mới.

## Bundle production

Số kB thập phân từ output Vite (gzip theo cách đo Vite):

| Phần | M3c raw/gzip kB | M4a raw/gzip kB |
| --- | ---: | ---: |
| Entry JS | 456,38 / 141,81 | 395,27 / 125,68 |
| CSS | 17,39 / 4,73 | 19,08 / 5,09 |
| StudyArea/Quiz/editor lazy | trong entry | 36,64 / 10,39 |
| review-store/FSRS lazy | trong entry | 26,23 / 8,48 |
| PdfImport lazy | trong entry | 6,42 / 2,89 |
| PDF.js lazy | 429,74 / 128,69 | 429,74 / 128,69 |
| PDF worker mjs | 1265,41 | 1265,41 |

Toàn dist khoảng4,19MB chưa nén;201 tài nguyên precache khoảng4,16MB, còn lại sw.js. Đây là chi phí chuẩn bị offline, không phải entry JS hoặc backup. Gzip thực gửi phụ thuộc host; server test no-store không cấu hình compression. File `artifacts/m4a-bundle.json` dùng Node gzip default nên có gzipBytes hơi khác Vite, không trộn hai phương pháp.

## Giới hạn và cách tái hiện

Đường dẫn tuyệt đối bên dưới là môi trường phát triển/kiểm thử tham chiếu dùng
để thu thập bằng chứng M4a; thay bằng đường dẫn clone của bạn khi chạy lại.

Windows: `npm run build`, `npm run test:prepare-updates`. Sau đó `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh tests/performance.spec.ts --project=chromium`. `M4A_MEASUREMENT=baseline` chỉ dành cho đo bản runtime trước thay đổi, không dùng ghi đè baseline bằng code hiện tại.

11MB/200 attempts đã round-trip; chưa stress toàn32MiB hoặc20.000 ReviewEvents trên mobile. Restore vẫn có synchronous validation và đã mất hơn30s trong một lượt; không nên xem các trần dữ liệu hiện tại là dung lượng sử dụng thoải mái trên mobile. Đề xuất đánh giá mức vận hành ban đầu≤5MiB backup/≤50attempts/≤1.000cards trên điện thoại thật, rồi mới chốt giới hạn hướng dẫn; các số đề xuất này **chưa được benchmark**, không phải hard limit mới hoặc bảo đảm an toàn. Giữ validator limits hiện có để không từ chối dữ liệu hợp lệ của người dùng, không auto-truncate và không tăng trần. Xử lý validation ngoài main thread cần một thay đổi có test riêng; chưa triển khai ở đây. Có thể xem xét cảnh báo entry gzip150kB cho CI sau này; timing biến động quá lớn để đặt gate latency cụ thể từ các lần chạy này. M4a chưa đặt timing gate dễ flaky.
