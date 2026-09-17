# OneWord M4a — báo cáo bàn giao

Phạm vi: production hardening, giữ semantics Reader/PDF/Study Pack/FSRS/Quiz. Baseline main sạch `198e771`, parent `12899e7` M3c; `198e771` chỉ chuẩn hóa line endings. Không commit, push, deploy, LICENSE hoặc M4b.

1. **PWA architecture:** manifest + icons dự án; Vite plugin tạo SW với static allowlist/integrity và build hash độc lập DB. Worker không mở IndexedDB. [Kiến trúc](ARCHITECTURE.md).
2. **Dependencies:** thêm 0, xóa 0; lockfile không đổi. Runtime Dexie 4.4.6, PDF.js 6.3.289, React/ReactDOM 19.3.0, ts-fsrs 5.4.2; toolchain Vite 8.3.0, Vitest 5.0.1, TypeScript 5.9.3, Playwright 1.63.0 giữ nguyên. Đã kiểm license metadata thực; PDF/font/CMap notices giữ trong dist. Audit 0 vulnerabilities. [Quyết định](DECISIONS.md).
3. **Offline matrix:** cold app shell, Reader/PDF-derived text, packs/flashcards/FSRS, Quiz và backup local dùng được sau chuẩn bị; ảnh HTTPS ngoài không được bảo đảm. Offline nhập PDF mới cũng đã smoke test. [Ma trận đầy đủ](OFFLINE.md).
4. **Cache/update:** 201 static assets, 4.168.797 bytes; integrity trước activation, current/previous caches, không runtime media cache. Update thông báo và nút explicit, flush trước reload, khóa trong active/dirty/import/review/quiz, chặn khi còn tab khác. Ghi FSRS/Quiz pending còn khóa chuyển khu vực để không vượt guard. Incomplete build giữ cache cũ. Đóng hết clients có thể activate theo lifecycle browser ở lần mở sau.
5. **Bảo toàn state:** hai build Vite thật từ cùng nguồn M4a với release metadata/cache hash khác nhau, DB thật native50; documents/packs/settings/ReviewEvents/CardSchedules/QuizAttempts so sánh exact; vị trí đọc so offset/revision/settings, checkpoint timestamp/generation có thể tăng hợp lệ. Active Quiz/reveal/draft không bị reload trước hành động an toàn; ghi bị trì hoãn được giữ cho tới commit rồi mới cập nhật.
6. **Migration/recovery:** fixtures native10/20/30/40/50, validation toàn graph trước commit, missing personal aggregates/generation/orphan refs bị chặn. Corrupt/future/interrupted migration giữ raw DB trước–sau. Không wipe/reset. [Phục hồi](RECOVERY.md).
7. **Mobile:**390px touch/keyboard,320px overflow/recovery; toolbar wrap, input16px, safe-area, modal scroll, rating2×2/≥72px và choice≥48px; desktop giữ cấu trúc.
8. **Accessibility:** skip link, labels/landmarks, visible focus, PDF trap loại hidden controls, backup trap/restore focus, Quiz cancel focus về submit, truthful status, reduced-motion. Đã rà thủ công production preview bằng keyboard; không chứng nhận screen-reader/WCAG. [Chi tiết](ACCESSIBILITY.md).
9. **Bundle:** entry JS456,38→395,27kB; Vite gzip141,81→125,68kB. Lazy StudyArea36,64kB, FSRS gateway26,23kB, PdfImport6,42kB, PDF429,74kB, worker1265,41kB; CSS19,08kB. Toàn dist≈4,19MB. Precache byte không đồng nghĩa eager execute.
10. **Performance:** đo trước rồi tối ưu formatter Intl bounded16 và validation trùng; không bỏ validator. Lượt cuối: large-startup **5,18s**, restore **18,51s**, browser-export **3,05s**. Các lần M4a đã quan sát tương ứng 2,17–8,63s / 5,77–31,31s / 1,04–4,60s; M3c là 26,57 / 61,59 / 9,69s ở lần baseline. Cold/warm full chậm hơn baseline, không claim mọi load nhanh hơn. [Bảng đầy đủ, phương pháp và giới hạn](PERFORMANCE.md).
11. **Large-data:** text540.000bytes,4packs,2.000cards,4.000events,200attempts×20questions; backup11.087.067bytes. Restore/export round-trip exact; quá200 attempts bị từ chối, không cắt dữ liệu. Heap chỉ sample103–188MB trong các lần M4a, không peak/native/worker RAM.
12. **Storage/quota:** lỗi ghi báo Chưa lưu được, giữ memory để copy/export; read-failure không ghi lên kho chưa đọc. Persist request chỉ do nút người dùng, denied/error vẫn dùng được, không hứa permanent. Quota/abort được inject, không làm đầy ổ đĩa thật.
13. **Privacy/network:** observed traffic GET same-origin static assets; HTTPS media chỉ sau opt-in. PDF actions/script text không chạy. Không upload bytes/text/packs/cards/schedules/events/attempts/backup; không analytics/telemetry/backend. Cache inventories không chứa dữ liệu người dùng hoặc remote media. Evidence M2/M3a/M3b/M3c được suite chạy lại cùng M4a.
14. **Files:** 49 tệp thay đổi (25 tracked, 24 mới): validation/storage, lazy imports, offline client/panel/worker và CSS/focus/status; build/icon/update scripts, manifest/icons, deterministic fixtures/tests, Firefox config và docs. Inventory chính xác ở cuối report; `.agents`, AGENTS, package-lock không đổi. Không node_modules/dist/cache/secrets/generated outputs trong index; index rỗng.
15. **Unit/integration:** **180/180**, 13 files, 7 ca mới trên 173 baseline; lượt cuối 2,91s. Typecheck/lint/build PASS; audit 0 vulnerabilities; cả hai diff checks PASS.
16. **Primary browser:** **81/81 PASS, 12,6 phút**, Chromium/WSL gồm native visibility; 0 skip, 0 retry, không xfail. Log thực: `artifacts/m4a-browser-final.log`.
17. **Extra engine:** Firefox **155.0**, **1/1 PASS, 10,8s** trên bản cuối: PDF thật offline + Reader/FSRS/Quiz/cold shell, page errors=[]. Không claim full Firefox suite. Primary Chromium **153.0.8010.12**. Log: `artifacts/m4a-firefox-final.log`.
18. **Offline evidence:** `artifacts/m4a-offline-privacy.json`, `m4a-chromium-compatibility.json`, `m4a-firefox-compatibility.json`; manifest CDP installabilityErrors=[] và icon PNG dimensions được assert. Đây không phải OS install UI test.
19. **Update evidence:** `artifacts/m4a-update-quiz.json`, `m4a-update-review.json`, `m4a-update-draft.json`, `m4a-update-incomplete.json`. Source assertions trong `tests/update.spec.ts`, builds tạo bằng `npm run test:prepare-updates`.
20. **Migration evidence:** `artifacts/m4a-migration-v1.json` tới v5; `m4a-migration-failure-reference/record/future/interrupted.json`; toàn records/version bằng nhau khi lỗi. Existing M3a/M3b/M3c backup migration suites giữ nguyên.
21. **Mobile evidence:** `artifacts/m4a-mobile-reader.png`, `m4a-mobile-review.png`, `m4a-mobile-quiz.png`, `m4a-mobile-recovery.png`; đã mở xem. Kiểm viewport trực tiếp riêng đã làm; skip link chỉ hiện khi focus, tránh fixed element xuất hiện ngoài viewport trong full-page capture.
22. **Accessibility evidence:** keyboard/touch/reduced-motion/focus assertions trong hardening và baseline suites; phiên browser control thủ công desktop/390px, console warning/error=[]; contrast mẫu text5,01–11,68:1, outline3,30:1 trong `artifacts/m4a-contrast-samples.json`.
23. **Limitations/anomalies:** HEAD đầu lượt có commit normalize bổ sung đã kiểm. Đã sửa thông báo update nhầm lúc cài lần đầu và khe hở chuyển màn hình khi ghi FSRS/Quiz pending; đã tái hiện rồi kiểm lại. Các lỗi locator/đồng bộ test và lượt chạy trước được ghi trong TEST-ENVIRONMENT. Timing biến động, chưa xác định nguyên nhân môi trường. Chưa physical mobile/WebKit/Safari/iOS/screen-reader/OS install UI; Firefox chỉ smoke. Chưa worst-case32MiB/20k events, storage eviction/power loss/private mode mọi browser. Chỉ hỗ trợ hosting tại root `/`; backup vẫn cần, không bảo đảm mọi remote image offline. Không có công cụ cứu raw corrupted DB. Giữ toàn source/docs/tests/skills hiện hữu.
24. **git diff --stat:** output cuối được ghi bên dưới; Git mặc định không tính untracked files nên inventory mục25 bổ sung các file mới.
25. **git status --short:** output cuối bên dưới. Thay đổi để review, không staged/commit; HEAD198e771 giữ nguyên.

Lệnh và bằng chứng thực chạy: [TEST-ENVIRONMENT.md](TEST-ENVIRONMENT.md). Artifact/report được sinh tại `D:/oneword/artifacts` và `D:/oneword/playwright-report`, có .gitignore; không đưa vào stage.

<!-- GIT-REVIEW -->

```text
git log -5 --oneline --decorate
198e771 (HEAD -> main) chore: normalize repository line endings
12899e7 feat: add OneWord quiz engine
6a4feda feat: add FSRS spaced repetition to OneWord
c0283f7 feat: add OneWord study packs and flashcards
da305cc feat: add local PDF ingestion to OneWord
```

```text
git diff --stat
 README.md                            | 25 ++++++++++------
 docs/ARCHITECTURE.md                 | 29 +++++++++++++++++--
 docs/DATA-CONTRACTS.md               | 12 +++++++-
 docs/DECISIONS.md                    | 14 +++++++++
 docs/TEST-ENVIRONMENT.md             | 55 +++++++++++++++++++++++++++++++++++-
 index.html                           |  4 ++-
 package.json                         |  3 +-
 scripts/serve-built.mjs              |  2 +-
 src/application/backup.ts            |  3 +-
 src/application/library.ts           |  2 +-
 src/application/review-validation.ts |  4 +--
 src/application/review.ts            | 12 +++++++-
 src/storage/indexed-db.ts            | 29 +++++++++++--------
 src/storage/quiz-store.ts            |  3 +-
 src/ui/App.tsx                       | 51 ++++++++++++++++++++++++---------
 src/ui/PdfImport.tsx                 |  2 +-
 src/ui/QuizArea.tsx                  | 10 ++++---
 src/ui/styles.css                    | 12 ++++++++
 tests/pdf.spec.ts                    |  1 +
 tests/persistence.spec.ts            |  4 +--
 tests/quiz.spec.ts                   |  1 +
 tests/review.spec.ts                 |  2 +-
 tests/study.spec.ts                  |  4 +--
 tsconfig.json                        |  1 +
 vite.config.ts                       |  6 +++-
 25 files changed, 234 insertions(+), 57 deletions(-)
```

```text
git status --short
 M README.md
 M docs/ARCHITECTURE.md
 M docs/DATA-CONTRACTS.md
 M docs/DECISIONS.md
 M docs/TEST-ENVIRONMENT.md
 M index.html
 M package.json
 M scripts/serve-built.mjs
 M src/application/backup.ts
 M src/application/library.ts
 M src/application/review-validation.ts
 M src/application/review.ts
 M src/storage/indexed-db.ts
 M src/storage/quiz-store.ts
 M src/ui/App.tsx
 M src/ui/PdfImport.tsx
 M src/ui/QuizArea.tsx
 M src/ui/styles.css
 M tests/pdf.spec.ts
 M tests/persistence.spec.ts
 M tests/quiz.spec.ts
 M tests/review.spec.ts
 M tests/study.spec.ts
 M tsconfig.json
 M vite.config.ts
?? docs/ACCESSIBILITY.md
?? docs/M4A-REPORT.md
?? docs/OFFLINE.md
?? docs/PERFORMANCE.md
?? docs/RECOVERY.md
?? playwright.firefox.config.ts
?? public/icons/
?? public/manifest.webmanifest
?? scripts/build-update-fixtures.mjs
?? scripts/generate-icons.mjs
?? scripts/pwa.ts
?? src/offline/
?? src/storage/hardening.test.ts
?? src/ui/OfflinePanel.tsx
?? tests/compatibility.spec.ts
?? tests/fixtures/browser-library.ts
?? tests/fixtures/library.ts
?? tests/fixtures/production-server.ts
?? tests/hardening.spec.ts
?? tests/performance.spec.ts
?? tests/update.spec.ts
```

```text
git ls-files --others --exclude-standard
docs/ACCESSIBILITY.md
docs/M4A-REPORT.md
docs/OFFLINE.md
docs/PERFORMANCE.md
docs/RECOVERY.md
playwright.firefox.config.ts
public/icons/icon-192.png
public/icons/icon-512.png
public/icons/maskable-512.png
public/manifest.webmanifest
scripts/build-update-fixtures.mjs
scripts/generate-icons.mjs
scripts/pwa.ts
src/offline/client.ts
src/offline/worker.js
src/storage/hardening.test.ts
src/ui/OfflinePanel.tsx
tests/compatibility.spec.ts
tests/fixtures/browser-library.ts
tests/fixtures/library.ts
tests/fixtures/production-server.ts
tests/hardening.spec.ts
tests/performance.spec.ts
tests/update.spec.ts
```
