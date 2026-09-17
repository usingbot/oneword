# Môi trường kiểm thử M1a / M1b / M2 / M3a / M3b / M3c

## M3c — kiểm chứng 17/09/2026

Root D:/oneword, branch main, HEAD vẫn c0283f7. Đầu lượt M3c có 30 file M3b đã staged và chưa commit; giữ nguyên index đó. M3c được triển khai trong working tree, không commit/push/deploy/M4. Đã dùng project skills local-first và quality; không subagent, Product Design hoặc dependency/plugin mới. Package/lockfile không đổi so với index M3b; không tạo LICENSE dự án.

Windows: Node22.17.0/npm11.15.0. Ubuntu WSL: Node24.21.0/npm11.19.0; production build được serve cùng origin localhost, Chromium sandbox giữ nguyên, native hidden qua WSLg. Fixture chỉ là dữ liệu tổng hợp. Không dùng dữ liệu cá nhân hoặc đọc secrets.

| Lệnh đã thực chạy | Kết quả cuối |
| --- | --- |
| `npm run typecheck` | PASS, exit0 |
| `npm run lint` | PASS, exit0 |
| `npm test` | PASS, **173 tests / 12 files**, exit0 |
| `npm run build` | PASS, exit0 |
| `npm audit` | PASS, **0 vulnerabilities**, exit0 |
| `git diff --check` | PASS, exit0 |
| `git diff HEAD --check` | PASS, exit0; kiểm thêm toàn working tree so với HEAD |
| `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh` | PASS, **61/61**, 0 fail/skip/retry, exit0, **5.2 phút** |

38 unit/integration mới trên baseline135; 10 browser quiz mới trên baseline51. Native hidden cuối37.4s. Lượt riêng ban đầu quiz7/7, sau mở rộng10 ca. Full trước có60/61 do locator exact label của textarea đã có nội dung; đổi sang textbox role/name, kiểm riêng editor1/1 rồi chạy lại full61/61. Không skip/xfail hoặc bỏ assertion. Những lỗi khác đã giải quyết trong phát triển: legacy backup fixtures phải bỏ cả fields v5, seed fixture cần thực sự chuyển vị trí đáp án, chờ transaction rồi assert radio checked, khởi tạo quiz generation0 trước checkpoint/restore đầu tiên, CSS radio bị kế thừa width100%, và lưu con trỏ lượt đang mở để resume bài cũ. Dòng trống EOF trong StudyFace.tsx từng chặn closure M3b đã được bỏ ở working tree, index M3b giữ nguyên. Sau build/browser cuối chỉ có chỉnh tài liệu và whitespace này, không đổi runtime.

### Schema và ranh giới đã kiểm

Study Pack v2 thêm quiz/question/choice IDs, explanation và revision; v1 vẫn nhập/xuất nguyên v1. Personal Backup v5 thêm `quizAttempts` và `quizActiveAttemptId`, đọc v1/v2/v3/v4. DB v5/native50 thêm store quiz; attempts giữ bản chụp câu hỏi/revision, question/choice order, đáp án, flags/current, UTC timestamps và result. Quiz không gọi FSRS hoặc ghi review store. Chi tiết hành vi/giới hạn nằm trong [QUIZ.md](QUIZ.md), prompt tĩnh trong [STUDY-PACK-PROMPT-v2.md](STUDY-PACK-PROMPT-v2.md).

- `src/application/quiz.test.ts`: tạo/sửa/xóa nội dung và stable IDs; quiz v2/v1 boundary; 9 loại import lỗi; shuffle xác định/chấm theo ID; Practice khóa sau chốt; Test không có result trước nộp, bỏ trống sai; round-trip in-progress/flags/order; history snapshot; essential image loại khỏi mẫu số; 5 loại attempt bị sửa sai; conflict merge; backup1/2/3/4 migration.
- `src/storage/quiz-store.test.ts`: adapter thật qua fake-indexeddb; idempotent start, hai connections/revision guard, reload/completion và review state bất biến; quota rollback/retry; reader checkpoint giữ live attempts; sửa/xóa content giữ snapshot; backup/restore có guard; empty generation hồi quy; selected older attempt/active pointer; v4→v5 migration và rollback. `review-store.test.ts` thêm v4 backup có FSRS event/schedule thực, migrate giữ nguyên. Các baseline legacy fixtures/expected versions đã cập nhật theo schema mới, không bỏ assertions bảo toàn dữ liệu.
- `tests/quiz.spec.ts`: 10 ca browser thật: Practice sai→chốt→đúng/giải thích→next offline; Test shuffle→answer/flag→reload exact→confirm/cancel→submit→history; backup hai attempts (một hoàn thành, một dở dang) clear/restore; manual create/keyboard/narrow; essential failure; broken import; two tabs + failed put retry; editor edit/reorder/delete; essential HTTPS load; chọn bài cũ giữa nhiều attempt rồi reload. Đã kiểm DOM trước submit không render giải thích/correctness, không chỉ kiểm state.

### Bằng chứng tại dự án

- `artifacts/m3c-practice-privacy.json`: chọn sai, feedback/explanation sau chốt, thao tác offline sau khi app tải; review store không đổi; `errors: []`, `unexpectedRequests: []`.
- `artifacts/m3c-shuffle-resume-fsrs.json`: seed0 tạo question order q1/q2/q0, choice order đầu right/other/wrong (đúng chuyển từ index1 sang0); reload giữ exact state, chấm1/3, unanswered2; không đổi review events/settings/schedules. DOM script text không thực thi đã assert bằng window sentinel. Completed reload/history cũng được kiểm.
- `artifacts/m3c-backup-restore.json`: Personal Backup5, hai attempts và active pointer, clear IndexedDB test rồi restore; Study Pack v2 export chỉ content, so khớp fixture, không attempts.
- `artifacts/m3c-image-exclusion.json`: không request trước opt-in, ảnh hỏng sau đúng1 request; explicit unavailable cho kết quả0/2 và excluded1, không âm thầm tính0/3. Ca ảnh load thành công còn kiểm không referrer/cookie.
- `artifacts/m3c-practice.png`, `artifacts/m3c-test-results.png`, `artifacts/m3c-quiz-mobile.png`: ảnh đã xem trực tiếp; radio/choice text hiển thị đúng. Viewport390×844, keyboard Space chọn radio, selected state không chỉ màu, không horizontal overflow; có assertion radio width<30 và text width>120 để bắt regression CSS. Đây không phải kiểm điện thoại thật.
- `playwright-report/index.html`: báo cáo full61 cuối cùng. Evidence từ các chặng trước được suite sinh lại với build hiện tại.
- `artifacts/m3c-git-review.txt`: output nguyên văn git diff --stat/status và inventory files; không chứa secrets.

Bundle Vite cuối: main JS456.38kB/gzip141.81kB; CSS17.39kB/gzip4.73kB. Lazy PDF429.74kB/gzip128.69kB, worker1265.41kB. Đây là kích thước build, không benchmark runtime/RAM hay ngân sách mới.

Giới hạn: một đáp án đúng; tối đa200 attempts/200 câu mỗi attempt và backup32MiB; chưa xóa lịch sử từng lượt, chưa PWA/cold-start offline, chưa multi-answer hoặc chấm tự luận. Sau reload mở Học→Quiz để trở lại đúng lượt đã lưu. Ảnh ngoài tùy CORS/mạng và không cache. Không có anti-cheat: answer key là dữ liệu local, DevTools có thể đọc; Test mode che trong UI trước nộp. Quota được inject, không làm đầy đĩa thật; chưa test điện thoại thật, WebKit/Firefox quiz hoặc screen reader chuyên dụng. Giữ phạm vi M3c, không triển khai M4.


## M3b — kiểm chứng 17/09/2026

Baseline trước sửa: `c0283f7`, branch main, working tree sạch, root D:/oneword. Chỉ triển khai M3b. Node Windows22.17.0/npm11.15.0, Ubuntu WSL Node24.21.0/npm11.19.0, Chromium/WSLg như các chặng trước. Sandbox giữ nguyên. Đã dùng project skills FSRS/local-first/quality; không Product Design hoặc subagent.

Dependency duy nhất mới: **ts-fsrs5.4.2**, đã chạy `npm view ts-fsrs version engines dependencies license repository --json`, đối chiếu release/API chính thức và README/dist/index.d.ts thực, rồi `npm install --save-exact ts-fsrs@5.4.2 --ignore-scripts`. Không dependency runtime con, Anki package hoặc optimizer. Notice upstream được giữ nguyên ở public/notices/ts-fsrs-5.4.2.txt và dist/notices tương ứng; không chọn license dự án.

| Lệnh thực chạy | Kết quả cuối |
| --- | --- |
| `npm run typecheck` | PASS, exit0 |
| `npm run lint` | PASS, exit0 |
| `npm test` | PASS, **135 tests / 10 files**, exit0 |
| `npm run build` | PASS, exit0 |
| `npm audit` | **0 vulnerabilities**, exit0 |
| `git diff --check` | PASS, exit0 |
| `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh` | PASS, **51 tests, 0 fail, 0 skip, 0 retry**, exit0, **4.4 phút** |

25 unit/integration mới cộng110 baseline; 8 browser review mới cộng43 baseline. Native hidden cuối40.2s. Lượt riêng review đạt7/7, sau đó thêm timezone/rollover và chạy full51. Một lượt riêng trước đó có1 fail do test dùng thông báo lỗi mới nhưng dist cũ; rebuild rồi kiểm lại rollback/retry thật đạt, không đổi assertion để bỏ lỗi. Các test version/migration baseline được cập nhật schema expected4/native40 và legacy fixtures loại review field; không bỏ kiểm preserve dữ liệu. Sau full suite chỉ bổ sung notice tĩnh, rebuild và so hash với upstream; runtime bundle không đổi.

### Bằng chứng

- application/review.test.ts: frozen clock; bốn rating của card mới và overdue/subsequent đều đối chiếu card trả về từ ts-fsrs thật; lapse/relearning, serialization steps, clock lùi; deterministic due-before-new và new limit0 không chặn overdue. Không tính lại công thức FSRS trong test. Backup1/2/3 fixtures có reader original/revisions/draft, v3 có pack/deck/card, migration giữ nguyên và thêm review rỗng.
- storage/review-store.test.ts: adapter thật/fake-indexeddb. Duplicate event ID và hai concurrent connections tạo đúng1 event; ID cùng payload retry no-op, payload khác reject; stale revision/ABA bị chặn. Inject final review put failure không thay snapshot; undo new/subsequent khôi phục exact FSRS state, counter derive được phục hồi và event bất biến. Chặn unsafe undo sau rating mới hoặc content edit. Limit/due exemption/rollover, edit/move/delete, live review không bị reader checkpoint ghi đè. Backup4 restore exact, conflict và rollback xuyên reader/content/review; M3a DB30→40 migration giữ pack/generation, meta sai rollback về30. Quota failure được inject, không làm đầy đĩa thật.
- `artifacts/m3b-review-privacy.json`: browser import → front (rating/back chưa có) → reveal → Good offline → next → reload giữ schedule/event/revision. `unexpected: []`, `errors: []`; chỉ GET cùng origin cho app assets, không request dữ liệu ôn. Đây là offline sau khi app đã tải, không PWA/cold start offline.
- `artifacts/m3b-double-submit.json`: click hai lần đồng bộ tạo đúng1 ReviewEvent/schedule revision1. Keyboard repeat không ghi lượt; phím trong form không đánh giá. UI lock được kiểm cùng transaction authority ở unit/concurrent tests.
- `artifacts/m3b-two-tabs.json`: TabB ghi thành công, TabA đang reveal lịch cũ bị reject; state/history sau stale attempt bằng snapshot TabB, UI giải thích và chuyển về mặt trước của queue mới. Page/console errors của cả hai tab rỗng.
- `artifacts/m3b-undo.json`: rate→undo→reload. FSRS state trước là null được phục hồi; guard revision tăng2, event giữ nguyên, có undo reference, allowance trở lại20. Unit còn kiểm exact snapshot trước một subsequent review.
- `artifacts/m3b-backup-restore.json`: limit7 + rating → export Personal Backup4 → clear IndexedDB test → restore; schedules/history/settings khớp chính xác. Export Study Pack sau đó bằng content fixture ban đầu, không scheduler fields.
- `artifacts/m3b-timezone.json`: clock16:59UTC, timezone Việt Nam, dùng quota1; đổi device timezoneUTC và clock17:00UTC, timezone đã lưu không đổi, ngày học rollover cho thẻ mới tiếp theo. Unit thêm DST NewYork. Không dựa giờ máy thật cho phép thử này.
- Ca real IndexedDB failure inject IDBObjectStore.put của review: không event/schedule dở, nút thử lại dùng cùng operation identity và chỉ ghi1 lượt. Narrow390px kiểm keyboard/no overflow/daily limit persisted. Đã mở kiểm desktop `artifacts/m3b-review-reveal.png` và `artifacts/m3b-review-mobile.png`; back xếp dọc sau front, ratings chỉ sau reveal. Mobile emulation không chứng minh điện thoại thật hoặc screen reader.

Build runtime: entryJS **426.20kB / gzip134.13kB**, CSS **16.57kB / gzip4.52kB**. PDF lazy429.74kB/gzip128.69kB và worker1265.41kB giữ nguyên. Log `artifacts/m3b-build.log`. Không benchmark RAM/latency 20.000 events; review aggregate validation/serialization vẫn ở main thread. Không tuyên bố hiệu quả ghi nhớ từ các con số này.

Giới hạn: retention0.90/steps/profile cố định, không interval preview, không tự refresh khi chờ due; skip/queue selection trong memory. Undo chỉ khi latest review còn khớp snapshot, không undo stack tùy ý hoặc ghi đè thao tác mới. History khác nhau khi restore chặn toàn bộ; không merge/compact lịch sử. Xóa thẻ giữ audit metadata, bỏ live schedule. App cũ không mở DB40. Timezone cố định nhưng không có giờ server chống chỉnh clock về tương lai. Chưa real mobile/Firefox/Safari/screen reader hoặc stress sát32MiB/20.000 events. Không quiz/PWA/backend/accounts/cloud/optimizer/AI/deploy.

Report: playwright-report/index.html; JSON/screenshots/log dưới artifacts và test-results đều Git-ignored, chỉ dữ liệu tổng hợp. Không stage/commit/push/deploy; AGENTS và project skills giữ nguyên.

## M3a — kiểm chứng 17/09/2026

Baseline trước sửa: `da305cc`, `main`, working tree sạch, root `D:/oneword`. Chỉ thêm Study Pack/flashcard content. Không thêm dependency; package.json/package-lock.json không đổi. Windows Node 22.17.0/npm 11.15.0; WSL Ubuntu dùng Node Linux 24.21.0/npm 11.19.0 và Chromium đã chuẩn bị ở các chặng trước. Giữ sandbox browser. Các phần M1a/M1b/M2 dưới đây là lịch sử.

| Lệnh thực chạy | Kết quả cuối |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm test` | PASS, **110 tests / 8 files**, exit 0 |
| `npm run build` | PASS, exit 0 |
| `npm audit` | **0 vulnerabilities**, exit 0 |
| `git diff --check` | PASS, exit 0 |
| `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh` | PASS, **43 tests, 0 fail, 0 skip**, exit 0, 3.1 phút |

9 ca Study mới cộng đủ 34 ca reader/PDF/persistence/native visibility. Ca native hidden cuối đạt trong 34.8s. Suite không retry hoặc skip, không giảm assertion để xanh. Lượt Study riêng ban đầu có hai locator thất bại do tên accessible của label bọc select/textarea thay đổi theo nội dung; sửa explicit aria-label, chạy lại 8/8 rồi thêm ca editor ảnh. Kiểm screenshot phát hiện header hẹp thiếu chiều cao, đã sửa và thêm assertion không chồng vùng Study. Test giới hạn export mới ban đầu có fixture chưa đủ lớn; sửa fixture 415 thẻ và kiểm cả compact dưới/pretty trên 8 MiB. Kết quả cuối ở bảng trên.

### Bằng chứng M3a

- `src/application/study-pack.test.ts`: 40 ca content contract — tạo pack/deck/card, sửa/chuyển/xóa giữ ID/revision; canonical export/round-trip; duplicate/conflict; malformed/type/future/required/unknown/depth/size/count/reference; URL schemes/credentials; giới hạn sau URL canonicalization và formatted export; essential/image-only; text script literal; Personal Backup v1/v2→v3 và tách content/state.
- `src/storage/indexed-db.test.ts`: adapter thật qua fake-indexeddb, giữ test M1b→v3 và rollback; thêm M2→v3 giữ PDF original/revisions/position/draft/settings/generation, save/delete pack, stale writer không phục hồi dữ liệu đã xóa, lỗi final meta write rollback cả pack cũ/mới và reader. Đây là quota error được inject, không phải làm đầy đĩa thật.
- Browser manual flow: tạo pack/deck/card → reload → front trước/back ẩn → reveal → sửa và chuyển deck giữ card ID/revision2 → hủy/xác nhận xóa → reload. Ca riêng thêm URL/alt/caption/essential bằng editor → reload → bỏ ảnh → revision3, không external request.
- `artifacts/m3a-migration.json`: native IndexedDB20 được seed như M2 → app nâng30; PDF source/revisions còn nguyên, vị trí `two` được giữ. Import pack → xuất Personal Backup3 → clear kho test → restore, reader và pack đều giữ nguyên. Các fixture là dữ liệu tổng hợp.
- `artifacts/m3a-round-trip.json`: preview chưa có packs trong DB → confirm → export JSON → xóa test pack → nhập tệp đã export → pack/deck/card IDs và nội dung bằng nhau; không position/preferences/draft/history/scheduling. Ca conflict so cả generation/snapshot trước-sau: duplicate no-op, changed same-ID/cross-pack child ID collision chặn toàn bộ.
- `artifacts/m3a-security.json`: script/HTML nhập vào hiện như chữ, không dialog hoặc global side effect; `unexpected: []`, `dialogs: []`, `pageErrors: []`. Request ảnh chỉ xảy ra sau opt-in; header có Origin nhưng không Cookie/Referer dù context có cookie test. Server ảnh được Playwright route giả lập, không liên hệ host Internet thật. PNG hỏng trả HTTP200 để kiểm fallback alt/caption/essential mà không tạo lỗi transport giả. Ca riêng ảnh SVG trong img có script không thực thi, naturalWidth=100, mặt sau chưa reveal không tải ảnh. Tất cả ca Study assert console.error/pageerror rỗng.
- Đã mở kiểm screenshot desktop `artifacts/m3a-study-reveal.png`, import `artifacts/m3a-import-preview.png` và narrow390px `artifacts/m3a-study-mobile.png`; keyboard Enter reveal, không overflow ngang hoặc header chồng content. `artifacts/m3a-literal-content.png` lưu trạng thái text độc hại dưới dạng chữ. Đây là mobile emulation, chưa test thiết bị thật/screen reader chuyên dụng.

Build cuối: entry JS **386.17 kB / gzip 122.16 kB**, CSS **16.12 kB / gzip 4.43 kB**; PDF API lazy **429.74 kB / gzip 128.69 kB**, worker **1,265.41 kB**. Output ở `artifacts/m3a-build.log`. Không benchmark RAM/latency thư viện Study sát giới hạn; validator và snapshot serialize còn chạy trên main thread. Không có dependency mới.

Giới hạn: import whole-pack, không merge từng card hoặc tự đổi ID; editor không có undo/history thẻ, chưa sửa metadata pack/deck đã tạo. Ảnh cần HTTPS/CORS và opt-in, host thấy IP/Origin; ảnh có thể mất hoặc thay đổi, không bảo đảm offline. Không PWA/service worker. App cũ không mở DB30; cần giữ bản backup cũ trước khi muốn quay phiên bản. Study form chưa lưu không nằm trong Personal Backup. Chưa kiểm Firefox/Safari, điện thoại thật hoặc thư viện 10.000 thẻ trong browser. FSRS/review/quiz không được triển khai.

Report đầy đủ: `playwright-report/index.html`; artifacts/JSON/log và test-results đều Git-ignored, không có dữ liệu người dùng. Không stage/commit/push/deploy; AGENTS/project skills được giữ nguyên.

## M2 — kiểm chứng 17/09/2026

Baseline trước sửa: `3078e62`, `main`, working tree sạch, root `D:/oneword`. Chỉ triển khai M2; không commit/push/deploy. Các phần M1a/M1b bên dưới là lịch sử, không phải giới hạn hiện tại của M2.

Dependency: `npm view pdfjs-dist@6.3.289 version engines dependencies optionalDependencies license dist.unpackedSize --json` và candidate 5.4.624; đối chiếu release/API Mozilla trước khi pin. Lệnh cài: `npm install --save-exact pdfjs-dist@6.3.289 --ignore-scripts`. Node Windows 22.17 và WSL 24.21 đáp ứng engine >=22.13 hoặc >=24. Không thêm test PDF generator library, OCR hay server. Optional @napi-rs/canvas 1.0.9 nằm trong lock do upstream, không vào browser bundle.

| Lệnh thực chạy ở lượt cuối | Kết quả |
| --- | --- |
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0 |
| `npm test` | PASS, **67 tests / 7 files**, exit 0 |
| `npm run build` | PASS, exit 0 |
| `npm audit` | **0 vulnerabilities**, exit 0 |
| `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh` | PASS, **34 tests, 0 fail, 0 skip**, exit 0, 1.6 phút |
| `git diff --check` | PASS |

12 ca browser PDF cộng toàn bộ 22 ca baseline. Native visibility đạt trong 32.6s, sandbox giữ nguyên. Typecheck/lint chạy lại sau khi thêm kiểm console/pageerror cho mọi test PDF, đều exit 0. Không skip, retry hay giảm assertion để có kết quả xanh. Một test adapter mới ban đầu dùng lại Dexie đã close nên fail DatabaseClosedError; sửa harness tạo adapter mới để kiểm reopen thực tế, giữ kiểm dữ liệu/immutability. Unit lifecycle mock transport được ghi rõ trong tên suite; kiểm PDF.js thật nằm ở browser.

### Bằng chứng M2

- `tests/fixtures/pdf.ts` sinh PDF tổng hợp tại test, không giữ sách/tài liệu bên thứ ba: Helvetica text, nhiều trang, một image XObject thật không lớp chữ, mixed, hai cột, ToUnicode cho `Tiếng Việt é Ω 中文 😀`, corrupt/empty/no-pages/501 pages, password Standard R2 và PDF JavaScript action không được thực thi. Fixture password dùng mật khẩu thử `secret`, không phải thông tin người dùng.
- `pdf-reader-reload-privacy`: mở PDF thật → preview (DB vẫn 0 documents) → sửa → tạo raw revision 0 và edited revision 1 → đọc đến `one` → pause/save → reload vẫn `one`, không autoplay → resume sang `two`. Raw giữ `informa-\ntion`, well-being/state-of-the-art/x-ray/A-B/-4. IndexedDB có source=pdf, filename, pageCount, extractor, timestamp, ranh giới/cảnh báo; không PDF bytes.
- `artifacts/m2-pdf-privacy.json`: lưu evidence với raw/edited fixtures, vị trí trước/sau, `errors: []` và danh sách request. Mọi request là **GET cùng origin**, không query/body; chỉ app assets, worker và LiberationSans local. Không PDF/text/metadata upload, không external request. Test kiểm PDF action không đặt biến toàn cục trước và sau reload. Mọi ca PDF bắt pageerror/console.error và assert rỗng, gồm lỗi file/hủy.
- `scanned-pdf-no-document`: PDF image-only thật báo không có chữ/OCR không có, không nút tiếp tục, DB 0 documents. Ảnh `artifacts/m2-scan-warning.png`.
- Mixed 3 trang giữ trang scan với cảnh báo no-text; hai cột synthetic kích hoạt reading-order, không tự sort. Unicode và combining accent giữ nguyên trong working text. UI luôn cảnh báo thứ tự có thể sai kể cả heuristic không phát hiện.
- `pdf-cancel-progress`: file 400 trang cho tiến độ >0 và <hoàn thành, hủy trả focus về nút mở, giữ document đã có, không document dở; nhập lại file khác thành công. Unit kiểm không gọi trang thứ hai sau abort và destroy/cleanup cả lỗi hoặc thành công.
- PDF backup v2 export thật → clear test IndexedDB → preview không ghi → confirm → reload: record PDF, metadata, raw và edited giữ nguyên. Unit/integration còn kiểm metadata không thể bị sửa, v1 backup giữ IDs/history/draft, migration DB v1→v2 giữ data/generation/positions và rollback khi meta version sai; kho tương lai v3 bị reject.
- Đã mở kiểm ảnh `artifacts/m2-pdf-preview.png`, `artifacts/m2-pdf-mobile.png`, `artifacts/m2-scan-warning.png`. Viewport hẹp 390px không tràn ngang, undo chuẩn hóa và Escape không tạo document. Đây là emulation, không chứng minh thiết bị di động thật. Reader/fullscreen/hidden/TXT/paste/persistence baseline đều chạy lại trong suite đầy đủ.

### Đo mẫu và bundle

`artifacts/m2-pdf-performance.json`: 100 trang × 30 dòng synthetic, input **285.430 bytes**, working **142.958 ký tự**, từ chọn tệp đến preview **1.178 ms**. Timer 50ms còn chạy 23 nhịp; PerformanceObserver ghi một long task 52ms. Main-thread JSHeapUsedSize trước **2.483.292** và sau **24.576.416 bytes**; không phải peak heap, không bao gồm worker/native memory. Không có canvas trong DOM; runtime không gọi page.render. Kết quả mẫu này không đại diện PDF sát giới hạn hoặc layout phức tạp, không là bảo đảm RAM/latency.

Build: entry JS **362.49 kB / gzip 115.62 kB**, CSS **13.22 kB / gzip 3.87 kB**. PDF API lazy **429.74 kB / gzip 128.69 kB**, worker **1,265.41 kB**, toàn bộ font/CMap/notices local **1.975.967 bytes** trên đĩa (chỉ request tài nguyên cần dùng). Không đưa toàn bộ package pdfjs-dist 34.78 MB lên browser. Build output ở `artifacts/m2-build.log`.

Giới hạn thực tế: 50 MiB/file trước đọc, 500 trang, 2 MiB chữ và 100.000 items/trang; timeout parser 120s chưa được ép timeout trong browser. Cancel File.arrayBuffer/module download đang chạy là best-effort; kết quả cũ không được parse/publish. Giới hạn không bảo đảm RAM tuyệt đối trước mọi PDF đối nghịch. Không OCR, không nhập password, không reconstruct layout, không bảo đảm font mapping/Unicode/reading order hoàn hảo. Chưa kiểm PDF sát 50 MiB, real mobile, Safari/Firefox, screen reader chuyên dụng. Không persist PDF binary/page images. Không PWA/service worker/offline guarantee.

Report: `playwright-report/index.html`; screenshots/JSON/log ở `artifacts/`, downloads/traces ở `test-results/`, đều bị Git ignore. Chỉ dữ liệu tổng hợp của test. Lệnh chạy lại WSL giữ nguyên ở mục Chạy lại bên dưới.

## M1b — kiểm chứng hiện tại, 16/09/2026

Baseline trước sửa: `f57c872`, branch main, working tree sạch. Không commit M1b. Các phần M1a bên dưới là lịch sử đã nghiệm thu, không phải giới hạn storage của bản M1b.

Dependency mới đã cài bằng lệnh thực:

```powershell
npm view dexie@4.4.6 version engines dependencies --json
npm view fake-indexeddb@6.2.5 version engines --json
npm install --save-exact dexie@4.4.6 --ignore-scripts
npm install --save-dev --save-exact fake-indexeddb@6.2.5 --ignore-scripts
```

Windows: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm audit` đều PASS ở lượt cuối. Unit/integration: **46 tests / 5 files**; npm audit báo **0 vulnerabilities**. Build JS 349.92 kB (gzip 111.45 kB), CSS 11.94 kB (gzip 3.60 kB), HTML 0.91 kB (gzip 0.53 kB). Không coi đây là benchmark thư viện lớn.

Browser chạy trên production dist bằng lệnh WSL ở mục Chạy lại bên dưới. Lượt kiểm riêng `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh --project=chromium tests/persistence.spec.ts` đạt **8/8**. Lượt cuối `wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh` đạt **22/22, 0 fail, 0 skip**, exit 0, 2.6 phút; ca native hidden đạt trong 40.4s. Typecheck/lint đã chạy lại sau thay đổi harness, đều exit 0. `git diff --check` sạch. M1b đã có bằng chứng hoàn thành phạm vi; chưa commit/push/deploy.

Bằng chứng M1b trong HTML report:

- `reload-resume`: snapshot IndexedDB thật trước/sau reload, từ/chunk trước/sau và settings. Có ca riêng reload khi đang playing, phục hồi checkpoint và không autoplay.
- `backup-restore-privacy`: export download JSON → clear IndexedDB của origin thử bằng CDP → parse/preview (DB vẫn rỗng) → confirm → restore. Original, revision, position nhóm 3 tại `từ3 từ4 từ5`, WPM 420, glow tắt, font 60 và draft đều được kiểm. Reload rồi undo draft/undo revision về đúng original.
- `errors: []`, `unexpectedRequests: []` trong flow backup/restore; theo dõi pageerror, console error và mọi request ngoài origin hoặc khác GET. Test privacy M1a cập nhật để chấp nhận duy nhất database local oneword-reader; localStorage/sessionStorage vẫn rỗng. Không upload/analytics.
- Malformed JSON, future backup version, references sai, conflict IDs bị reject và không đổi snapshot DB. Backup trùng được gộp no-op.
- Real IndexedDB rollback: inject QuotaExceededError vào lần put meta cuối để kiểm transaction rollback cả document mới; không giả vờ đã làm đầy ổ đĩa thực. Unit integration dùng fake-indexeddb kiểm cùng adapter.
- IndexedDB unavailable: session vẫn đọc được và download backup, không báo đã lưu. Hai tab: writer cũ bị chặn, nội dung chưa lưu vẫn xuất được, writer mới giữ nguyên sau reload.

Ảnh đã mở kiểm: artifacts/m1b-reload.png, artifacts/m1b-restore-preview.png, artifacts/m1b-storage-error.png và mobile.png. Report: playwright-report/index.html. Tất cả chỉ dùng text thử tổng hợp, bị Git ignore.

Các lỗi phát hiện/sửa trong chặng: queue có thể bỏ sót immediate update đúng lúc flush promise đang settle (đã có regression); Dexie có thể mở DB version mới hơn tương thích (adapter kiểm native version trong mỗi transaction); test context M1a chỉ install clock mà chưa pause clock nên từ có thể tiến giữa hai click (đã cố định clock và giữ nguyên assertion). Một lượt browser full bị timeout khởi tạo CDP 15s; lượt native riêng tiếp theo đã tới bước resume nhưng hết tổng budget 30s. Harness native nay cho startup 30s và tổng 60s, giữ mọi assertion hidden/trusted/pause/resume và thời gian chờ thực 4500/2200ms; không retry/skip/xfail.

Giới hạn: kiểm Chromium/WSLg, chưa thiết bị di động thật/Safari/Firefox persistence. Không kiểm mất điện thật, quota disk thật hoặc thư viện sát cap 32 MiB. Checkpoint/lifecycle là best-effort; browser có thể xóa kho. M1b không thêm PWA/service worker. Migration foundation v1 và reject future version đã test, chưa có migration v1→v2 vì chưa có schema v2.

## Windows host

- Windows build 19045 (Windows 10).
- Node 22.17.0, npm 11.15.0; Git 2.50.1.windows.1.
- Dùng Windows cho install/build/typecheck/lint/unit. Không coi Windows 10 là môi trường Playwright hiện tại được hỗ trợ.

## WSL

- Ubuntu 26.04.1 LTS, x86_64; WSLg DISPLAY=:0.
- Ban đầu không có Node Linux; npm trên PATH trỏ tới Windows. Không dùng kết quả npm đó để nhận môi trường Linux đã sẵn sàng.
- Đã đặt Node Linux portable 24.21.0, npm 11.19.0 tại `.tools/node-v24.21.0-linux-x64` trong dự án.
- Archive chính thức https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz; SHA256 đối chiếu với SHASUMS256.txt: `fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6`.
- Playwright 1.63.0; Chromium 153.0.8010.12 (build 1243). Browser/FFmpeg đặt trong `.tools/browsers`, không commit.
- Firefox 155.0 (build 1543) được thêm để đối chiếu tiêu chí native visibility; không phải dependency ứng dụng.
- Ubuntu 26.04 x86_64 và Node 24 đáp ứng tài liệu https://playwright.dev/docs/intro đã đọc ngày 16/09/2026.
- Chromium ban đầu không mở được do thiếu libnspr4/libnss3/libasound2. Đã dùng apt-get download từ archive.ubuntu.com và dpkg-deb --extract vào `.tools/linux-libs`, không cài package vào hệ thống: libnspr4 `2:4.38.2-1ubuntu1`, libnss3 `2:3.120-1ubuntu2.1`, libasound2t64 `1.2.15.3-1ubuntu1.1`. Script test cung cấp LD_LIBRARY_PATH cục bộ.
- Playwright được cấu hình `chromiumSandbox: true`; không tắt Chromium sandbox để chạy test.

## Chạy lại

Sau `npm ci --ignore-scripts` và `npm run build` trên Windows, chạy:

```powershell
wsl -d Ubuntu -- bash /mnt/d/oneword/scripts/test-wsl.sh
```

Nếu cần chuẩn bị lại browser, trong WSL với Node Linux trên PATH:

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/browsers" node node_modules/@playwright/test/cli.js install chromium firefox
```

Test tự khởi động server dist loopback cổng 4173 rồi dừng nó. Không tái dùng server khác đang chiếm cổng. Các test headed dùng WSLg. Project `native-visibility` mở Chromium thường với profile test riêng, giữ sandbox mặc định, gắn qua API công khai `connectOverCDP({ noDefaults: true })` vào default context. Không dùng profile cá nhân, không mock visibilityState, không dispatch visibility event. Test handler mô phỏng document.hidden là ca riêng. Fullscreen rejection là một test riêng có mock API và không thay test native fullscreen.

Artifacts: `artifacts/*.png`, `playwright-report/index.html`; failure traces trong `test-results/`. Tất cả bị Git ignore, chỉ dùng dữ liệu thử tổng hợp.

## Kết quả thực chạy — 16/09/2026

| Môi trường / lệnh | Kết quả |
| --- | --- |
| Windows `npm run typecheck` | PASS |
| Windows `npm run lint` | PASS |
| Windows `npm test` | PASS: 16 tests, 2 files |
| Windows `npm run build` | PASS |
| Windows `npm audit` | 0 vulnerabilities được registry báo ở lượt chạy này |
| Windows `npm ls --depth=0` | PASS, đủ 13 dependency trực tiếp |
| WSL `bash /mnt/d/oneword/scripts/test-wsl.sh` | Closure: exit 0, **14 PASS, 0 FAIL, 0 SKIP**, 43.5s |
| WSL `bash /mnt/d/oneword/scripts/test-wsl.sh --project=native-visibility` | Closure: exit 0, **1 PASS**, 20.4s; sau đó đã chạy cả suite |

**Verification closure: gate native visibility của M1a đã được chứng minh trên Chromium headed/WSLg. Có thể đóng M1a trong phạm vi đã kiểm; không bắt đầu M1b.** Typecheck/lint/unit/build đã chạy lại và đạt trong lượt closure. `npm audit`/`npm ls` ở bảng là kết quả lượt triển khai trước, không chạy lại hoặc cài thêm dependency trong closure.

Kết quả trước closure: `tests/hidden.spec.ts` dùng Firefox mặc định thất bại tại assertion hidden; Chromium mặc định cũng visible. Phân loại sau điều tra: **TEST BUG / giới hạn cấu hình automation mặc định**, không phải bằng chứng APP BUG hoặc WSLg không hỗ trợ. Playwright mô tả mỗi Page hoạt động như trang active; `newPage()` + `bringToFront()` không tự bảo đảm trang trước hidden. Trang trắng độc lập ứng dụng tái hiện cùng hiện tượng ở Chromium và Firefox, headed và headless. Tắt focus emulation ở Chromium headed tạo blur thật nhưng vẫn visible. Thử viewport native hoặc bỏ flag CDPScreenshotNewSurface riêng cũng chưa đủ. Không quy kết một flag đơn lẻ khi chưa chứng minh.

Cùng WSLg, Chromium thường + default context + CDP noDefaults tạo visible → hidden → visible với event trusted. Đã sửa phương pháp của `tests/hidden.spec.ts` sang harness này, giữ assertion hidden và thêm kiểm resume. Test kiểm trang trắng hidden trước; nếu môi trường tương lai không hỗ trợ, gate vẫn fail rõ `[NATIVE_ENVIRONMENT_UNSUPPORTED]`, không skip/xfail. Nếu probe đạt nhưng reader không pause/giữ vị trí/resume, đó là lỗi chức năng. Không thay mã runtime.

Native flow dùng 120 từ tổng hợp `từ0`…`từ119`, nhóm 1, 30 WPM (2000ms/lượt): đang đọc `từ3` → hidden/paused tại `từ3` → chờ 4500ms vẫn `từ3` → visible/chờ thêm 2200ms vẫn paused tại `từ3` → bấm tiếp tục mới sang `từ4`. JSON ghi `visibilitychange` hidden và visible đều `isTrusted: true`, `document.hidden` khớp; không dùng clock mock. Blur đến trước hidden và đã pause: native flow chứng minh kết quả tổng thể; test mô phỏng riêng chứng minh handler hidden hoạt động ngay cả không có blur.

Unit kiểm pause hủy timer về 0, duplicate pause không reset remaining, không chạy bù và resume sau phần thời gian còn lại. Browser deterministic test còn kiểm dispatch event khi vẫn visible không pause; mock hidden + event pause; visible không tự resume; 75ms trước pause để lại 125ms, sau resume 124ms chưa đổi từ, thêm 1ms mới đổi. Các bằng chứng này được ghi rõ là mô phỏng, không gọi là native.

Ca native chuyển tab mất focus vẫn giữ và đạt. Fullscreen thật/user activation, Escape, đúng một nút thoát, toolbar fade và keyboard-focus đạt trên Chromium headed. Phần timing tiếp tục nằm trong ReaderEngine độc lập React, adapter DOM gọi pause; không cần thêm tầng kiến trúc.

Các browser flow khác đã qua: TXT UTF-8/lỗi/empty; paste; giữ bản gốc; edit/undo/dirty guard; nhóm 1–5/custom/câu; timing 599/600 ms và từ cuối; context pause; fullscreen fallback; text payload không chạy script; không request ngoài/upload; không localStorage/sessionStorage/IndexedDB writes; viewport 390px, từ dài, reduced motion. Không coi resize viewport là đã test điện thoại thật.

Đã kiểm trực tiếp qua browser trong Codex trên Windows: paste → nhóm ba từ → focus → phím Right → context → Escape. Vị trí còn đúng, focus về nút mở fullscreen. Đây là kiểm UI bổ sung, không phải một lượt Playwright Windows.

Đã mở và kiểm ảnh workspace/fullscreen/mobile. Artifacts:
- `artifacts/workspace.png`
- `artifacts/fullscreen.png`
- `artifacts/mobile.png`
- `artifacts/mobile-focus.png`
- `playwright-report/index.html`
- `artifacts/visibility-diagnostic.json` — ma trận khám phá trên trang trắng, không chạy mã reader
- `artifacts/native-visibility.json` — state/chunk/event/time của lượt full suite cuối
- `artifacts/native-visibility-returned.png` — ảnh sau khi trở lại và resume; ảnh riêng không chứng minh hidden
- Attachment `native-visibility-evidence` trong HTML report của ca native

Các lỗi đã sửa trong lượt này: thiếu import URL ở test server (lint); trả focus trước khi React render lại nút fullscreen (browser test). Ca timing ban đầu sai harness vì clock tiếp tục trôi theo thời gian thực; đã cố định clock và giữ assertion đúng 599/600 ms.

Build cuối: JS 237.62 kB (gzip 74.74 kB), CSS 10.82 kB (gzip 3.34 kB), HTML 0.91 kB (gzip 0.53 kB), theo output Vite. Đây không phải benchmark runtime/RAM hoặc ngân sách đã duyệt.

## Dependency trực tiếp, đã cài

Runtime: react 19.3.0; react-dom 19.3.0.

Dev: @eslint/js 10.0.1; @playwright/test 1.63.0; @types/node 22.19.15; @types/react 19.3.0; @types/react-dom 19.3.0; @vitejs/plugin-react 6.1.1; eslint 10.10.0; typescript 5.9.3; typescript-eslint 8.70.0; vite 8.3.0; vitest 5.0.1.

Lệnh cài đã chạy: `npm install --ignore-scripts`, rồi `npm install --save-dev --save-exact @playwright/test@1.63.0 --ignore-scripts` sau xác minh WSL. Không dùng scaffold tải script, không cài toàn bộ candidate M1b/M2/M3.

## Việc còn lại

Native hidden đã xác minh bằng automation trên browser headed thật; không gọi đây là một lượt thao tác tay của con người. Firefox native visibility ngoài cấu hình automation mặc định chưa được chứng minh. Chưa test điện thoại thật, Safari/WebKit, screen reader chuyên dụng hoặc benchmark tài liệu sát giới hạn 2 MiB. Nội dung chỉ nằm trong memory; dữ liệu mất khi đóng/reload theo phạm vi M1a.

## Quy trình kiểm native bằng tay để đối chiếu

1. Chạy `npm run dev`, mở URL loopback được in trong Chromium/Chrome bình thường. Mở sẵn tab thứ hai trong cùng cửa sổ. Không dùng fullscreen ở phép thử này.
2. Dán 120 từ tổng hợp (ví dụ `từ0` tới `từ119`), chọn Dùng văn bản, nhóm 1, 30 WPM. Có thể tạo chuỗi bằng `Array.from({length:120}, (_, i) => 'từ' + i).join(' ')` trong console rồi copy kết quả vào editor.
3. Ghi phiên bản browser. Nếu cần log, chạy đoạn dưới trong DevTools sau khi tải app, rồi đóng DevTools trước khi đọc. Đoạn này chỉ quan sát DOM, không thay trạng thái visibility hoặc reader.
4. Bấm đọc, ghi từ/chỉ số đang hiển thị; chuyển ngay sang tab thứ hai. Đợi ít nhất 5 giây, trở lại. Reader phải Đã tạm dừng, giữ từ ghi tại sự kiện hidden (không cộng số lượt tương ứng 5 giây).
5. Chờ thêm 3 giây khi visible, vẫn không đổi từ. Bấm Đọc tiếp, kiểm từ tiếp theo tăng đúng 1 sau thời gian còn lại, không nhảy nhiều từ. Tạm dừng và chụp ảnh.
6. Mở console, xem log event trusted/hidden/visible và từ ở từng event; lưu bằng chứng với browser/mode. Chỉ dùng văn bản thử, không ghi nội dung người dùng.

```js
for (const type of ['visibilitychange', 'blur', 'focus']) {
  (type === 'visibilitychange' ? document : window).addEventListener(type, event => {
    queueMicrotask(() => console.log({
      type, trusted: event.isTrusted, at: performance.now(),
      visibility: document.visibilityState, hidden: document.hidden,
      chunk: document.querySelector('[data-testid="current-chunk"]')?.textContent,
      status: document.querySelector('.stage-status')?.textContent,
    }));
  });
}
```

Nguồn chính thức đã đối chiếu ngày 16/09/2026: [Playwright — Multiple pages](https://playwright.dev/docs/pages#multiple-pages), [connectOverCDP / noDefaults](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp-option-no-defaults). API noDefaults hiện diện trong typings của Playwright 1.63.0 đã khóa tại dự án. Không dùng protocol riêng Firefox hay sửa thư viện/binary để làm test pass.
