# Môi trường kiểm thử M1a

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
