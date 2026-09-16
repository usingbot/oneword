# Kiến trúc M1a

Đây là mô tả triển khai trong phạm vi đã duyệt, không mở rộng quyền sang M1b.

## Ranh giới

- `src/ui/App.tsx`: UI, draft, focus/fullscreen, visibility/blur và keyboard adapters. Không tính lịch timing trong render.
- `src/application/document.ts`: mở TXT, validate, tạo document, revision, undo. Tất cả trong memory.
- `src/domain/reader.ts`: segmentation, duration, ReaderEngine độc lập React/DOM. UI subscribe qua useSyncExternalStore.
- `scripts/serve-built.mjs`: server local chỉ phục vụ dist để test WSL, bind 127.0.0.1; không phải backend ứng dụng.

State của engine: empty → ready → playing ↔ paused → completed. Loading/error/editing do use case/UI quản lý. Document mới, settings mới hoặc edit/undo hủy timer trước đó. Một callback trễ chỉ tiến một lượt; không có vòng lặp chạy bù theo wall clock.

## Quy tắc triển khai

- Dùng whitespace units; từ ghép/dấu trừ/Unicode giữ nguyên. Sentence mode dùng Intl.Segmenter('vi', sentence); không coi đây là phân tích ngôn ngữ hoàn hảo.
- Mỗi chunk giữ start/end offset trên text revision và units.
- Cơ bản: units × 60000 / WPM. Khi bật nghỉ dấu câu: cuối . ! ? … cộng một nhịp; cuối , ; : cộng nửa nhịp; xử lý dấu ngoặc/nháy đóng.
- Tốc độ 30–1200 WPM; custom count 1–100. Đây là giới hạn UI của M1a, không phải cam kết hiệu quả học.
- Pause giữ remaining duration bằng performance.now(); resume cần thao tác người dùng. visibilitychange(hidden) và window blur đều pause.
- Đổi chunk/speed dừng playback, tìm chunk chứa offset cũ. Edit/undo reset vị trí có thông báo để tránh bookmark sai revision.
- Fullscreen qua user activation; API từ chối thì focus view CSS. Nút thoát luôn có; toolbar tự ẩn khi đọc và hiện khi tương tác/focus bàn phím. Chữ dài wrap, vùng chữ có thể cuộn, không tự giảm cỡ chữ từng lượt. Không aria-live đọc dồn chữ.
- Nội dung chỉ render dưới dạng text, không HTML. UTF-8 decoder reject dữ liệu sai/nhị phân; cap 2 MiB. Không cleanup tự động.

## Dependency

Runtime chỉ React + React DOM. Dev: TypeScript, Vite/plugin-react, Vitest, ESLint/typescript-eslint, typings và Playwright. Version trực tiếp pin exact trong package.json, graph trong package-lock.json. Chưa cài Dexie, Ajv, PDF.js, ts-fsrs hoặc fake-indexeddb.

Node portable và Chromium Linux trong `.tools` bị Git ignore. Không sửa Node Windows hoặc môi trường hệ thống để chạy app.

CSP production giữ scripts self, không object hoặc remote font/media. Dev Vite bỏ meta CSP để dùng React refresh preamble; dev server vẫn loopback. Không có analytics, fetch text, remote image hoặc font CDN.

## Chưa triển khai

M1b: storage adapter, IndexedDB/revisions/bookmark/settings, backup/restore và failure handling. Hiện chưa có storage adapter giả hoặc schema DB. Không có service worker.
