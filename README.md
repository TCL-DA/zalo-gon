# Zalo gọn

Bộ "độ" **Zalo PC trên Windows** cho người dùng công việc: ẩn quảng cáo, chế độ riêng tư, đánh dấu khách đang chờ trả lời, gõ tắt, chặn gửi nhầm tiền/báo giá vào nhóm, xuất cuộc trò chuyện ra Markdown/HTML, và cho AI (Claude Code qua MCP) đọc đúng những cuộc bạn cho phép.

> **Không sửa file nào của Zalo, không bẻ khoá, không đụng vào cơ sở dữ liệu đã mã hoá.** Lối tắt mở Zalo kèm cổng gỡ lỗi của Electron (chỉ nghe `127.0.0.1:9333`), rồi chèn các module JS vào trang đang chạy. Cập nhật Zalo xong vẫn dùng được; muốn bỏ thì mở Zalo bằng lối tắt gốc.

## Có gì

| Module | Phím tắt | Làm gì |
|---|---|---|
| `05-ao-te.js` | `Ctrl+Shift+Y` | Áo **teenage engineering**: nền sáng #f6f8f7, nét kẻ đen, 0 bo góc, 0 đổ bóng, chữ đậm 600/700 cho dễ đọc; tin của mình = khối đen. Viết đè **640 biến thiết kế** của Zalo nên phủ cả những màn hình chưa mở. Mặc định BẬT |
| `10-an-danh-sach.js` | | Gom/ẩn phần danh sách gây nhiễu |
| `20-rieng-tu.js` | `Ctrl+Shift+B` | Làm mờ ảnh đại diện + nội dung chat; rê chuột vào mới rõ |
| `30-gio-lam.js` | `Ctrl+Shift+G` | Trong giờ làm thì làm mờ các cuộc "ồn ào" |
| `40-quang-cao.js` | | Ẩn khối quảng cáo trong danh sách |
| `60-khach-cho.js` | | Chat 1-1 người kia nhắn sau cùng, quá N giờ chưa trả lời → chấm đỏ + số giờ chờ |
| `70-trello.js` | `Ctrl+Shift+T` | Tạo thẻ Trello từ tin nhắn đang rê chuột *(cần script Trello riêng)* |
| `75-cho-claude-doc.js` | `Ctrl+Shift+A` | Bật/tắt cho AI đọc cuộc trò chuyện này |
| `80-chan-gui-nham.js` | | Gửi vào **nhóm** mà tin có số tiền / "báo giá" / số tài khoản → hỏi lại, Enter lần nữa mới gửi |
| `85-kho.js` | `Ctrl+Shift+K` | Nhập/xuất/kiểm kê kho bằng máy quét QR ngay trong Zalo *(cần script sổ kho riêng)* |
| `90-go-tat.js` | `/mã` + `Tab` | Gõ tắt đoạn văn bản hay dùng (địa chỉ, email, số điện thoại…) |
| `95-phim-nhay.js` | | Phím điều hướng nhanh |
| `97-xuat.js` | `Ctrl+Shift+S` | Lưu cuộc trò chuyện đang mở ra Markdown + HTML |
| `98-thanh-nut.js` | | Thanh nút cạnh ô nhập |
| `99-tro-giup.js` | `F1` | Bảng phím tắt |

Kèm **MCP server** `mcp_zalo.py` cho Claude Code: `zalo_danh_sach`, `zalo_doc`, `zalo_soan_nhap`, `zalo_nhan` (thống kê nhãn). **Không có lệnh gửi** — AI chỉ soạn nháp vào ô nhập, bạn tự bấm Enter.

## Cần gì

- Windows + Zalo PC (bản cài cho người dùng: `%LOCALAPPDATA%\Programs\Zalo\Zalo-<phiên bản>`)
- PowerShell 5.1 (có sẵn)
- Python 3.11+ với `websockets` (`pip install websockets`) — cho `bridge.py` và MCP

## Cài

```powershell
git clone https://github.com/<ban>/zalo-gon.git
cd zalo-gon
copy cau-hinh.mau.json cau-hinh.json
copy claude-doc.mau.json claude-doc.json
pip install websockets
# mở Zalo kèm phần độ:
powershell -NoProfile -ExecutionPolicy Bypass -File .\zalo-gon.ps1
```

Sửa `cau-hinh.json` theo máy mình (giờ làm, gõ tắt, thư mục xuất file, đường dẫn Chrome…). Sửa xong thì **đóng Zalo, mở lại** bằng `zalo-gon.ps1`.

Muốn mở im lặng (không nháy cửa sổ PowerShell): trỏ lối tắt Zalo vào `zalo-gon.vbs`. Giữ lại lối tắt gốc để còn đường mở Zalo bình thường.

### Áo giao diện hoạt động thế nào

Zalo PC dựng gần như toàn bộ giao diện bằng **biến CSS** (`--text-primary`, `--layer-background`, `--cta-link`…, khoảng 640 biến, khai ở `:root .default` / `:root .dark`). Giao diện tối chỉ là 211 luật phủ lên class `dark` ở `<body>`.

Áo làm 3 lớp: (1) gỡ class `dark` → có ngay bản sáng sẵn có của Zalo; (2) viết đè bộ biến thiết kế → phủ luôn cả những màn hình chưa mở bao giờ; (3) vài chục luật viết tay cho chỗ Zalo cắm thẳng mã màu, cộng luật hình khối (0 bo góc, 0 đổ bóng) và nét riêng của TE. Không sửa file nào của Zalo — gỡ thuộc tính `data-otl-skin` trên `<html>` là về y như cũ.

### Mở kiểu gì cũng có phần độ

Mặc định phần độ chỉ có khi mở Zalo bằng `zalo-gon.ps1` / `zalo-gon.vbs`. Bấm biểu tượng Zalo gốc, thanh tác vụ hay để Zalo tự chạy cùng máy thì **không có**. Muốn lúc nào cũng có:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\cai-tu-dong.ps1
# gỡ: ... -File .\cai-tu-dong.ps1 -Go
```

Lệnh này đặt một lối tắt vào thư mục **Startup**, chạy `zalo-canh.vbs` → `zalo-gon.exe` (hoặc `zalo-canh.ps1` nếu chưa build exe). Cứ ~8 giây nó xem Zalo đang chạy mà thiếu phần độ thì chèn lại; Zalo mở không kèm cổng gỡ lỗi thì nó mở lại Zalo kèm cổng (mất vài giây). Đang gọi (`ZaloCall.exe` có cửa sổ) thì nó để yên. Nhật ký: `zalo-canh.log`.

### `zalo-gon.exe` (Rust) — người canh + cầu nối trong một tiến trình

Từ 20/11/2026 `rust\` thay hai tiến trình chạy mãi (`zalo-canh.ps1` ~110 MB + `bridge.py` ~30 MB) bằng một file ~570 KB, chạy ~8 MB RAM:

- Giữ một kết nối CDP thường trực; **rớt kết nối mà Zalo vẫn chạy thì tự nối lại** (bản Python cũ coi rớt = Zalo tắt rồi thoát hẳn → các nút gọi máy im lặng tới khi mở lại Zalo).
- Kiểm phần độ qua chính kết nối đó, chỉ gọi `zalo-gon.ps1` khi thật sự mất (không đẻ PowerShell mỗi 8 giây).
- Làm thẳng: danh sách cho AI đọc (🤖), lưu cuộc trò chuyện, mở link Trello. Trello / sổ kho vẫn là Python của từng nơi: exe bật `bridge.py --tho` khi có lệnh, tắt sau 10 phút không dùng.

Build: `powershell -File rust\build.ps1` (cần Rust; ghi chú bẫy đường dẫn có dấu cách nằm trong file). Chưa có exe thì mọi thứ chạy kiểu cũ bằng `zalo-canh.ps1` + `bridge.py`.

## Cấu hình

Mọi thứ nằm trong `cau-hinh.json` (xem `cau-hinh.mau.json` để biết từng khoá):

- `duong_dan.chrome` — bỏ trống thì dùng đường dẫn Chrome mặc định
- `duong_dan.trello_mcp` — thư mục chứa module `otl_trello.py` của bạn; để trống thì tắt `70-trello.js`
- `duong_dan.so_kho` — thư mục chứa `so_kho.py` của bạn; để trống thì tắt `85-kho.js`

Hai module Trello và Sổ kho gọi script riêng của từng nơi làm (không có trong repo này) — cứ xem chúng là ví dụ cách nối Zalo với hệ thống nội bộ qua `bridge.py`.

## Cách hoạt động

```
lối tắt → zalo-gon.ps1 ──► mở Zalo.exe --remote-debugging-port=9333 (chỉ 127.0.0.1)
                       ├─► CDP Runtime.evaluate: chèn cau-hinh.json + modules\*.js vào trang
                       └─► bật zalo-gon.exe (Runtime.addBinding '__otlGonBridgeSend')

trang Zalo ──binding──► zalo-gon.exe ──► ghi file / (bridge.py --tho: script nội bộ) ──► trả kết quả về trang
Claude Code ──MCP────► mcp_zalo.py ──CDP──► trang Zalo (chỉ cuộc có trong claude-doc.json)
```

CSP của Zalo chặn `fetch` tới `127.0.0.1`, nên trang nói với máy qua **CDP binding** chứ không qua HTTP.

## Riêng tư & an toàn

- `cau-hinh.json` và `claude-doc.json` **không được commit** (đã có trong `.gitignore`) — chúng chứa tên người, địa chỉ, nội dung gõ tắt của riêng bạn.
- **Cổng gỡ lỗi 9333 không có xác thực.** Nó chỉ nghe `127.0.0.1` nên máy khác trong mạng không vào được, nhưng *mọi tiến trình chạy trên máy bạn* đều nối vào được và khi đó đọc được toàn bộ cuộc trò chuyện, thậm chí **gửi tin thay bạn**. Đây là cái giá phải trả để chèn được tính năng mà không sửa file Zalo. Chỉ dùng trên máy cá nhân bạn tin được; đừng dùng trên máy dùng chung, máy công ty nhiều người đăng nhập, hay máy đang chạy phần mềm lạ. Không cần nữa thì mở Zalo bằng lối tắt gốc.
- Danh sách cho phép AI đọc ghi theo **tên hiển thị**. Người ngoài đặt được tên nhóm và biệt danh, nên nếu có hai cuộc trùng tên thì cả nút 🤖 và MCP đều **từ chối** thay vì đoán — đổi tên cho khác nhau rồi làm lại.
- MCP chỉ đọc được cuộc đã bật `Ctrl+Shift+A`. Đọc tin = mở cuộc đó → người kia thấy "đã xem".
- Không có lệnh gửi tin trong repo này. Cố tình thêm vào là tự chịu.
- Zalo có thể đổi DOM bất cứ lúc nào → module hỏng thì chỉ hỏng phần độ, Zalo vẫn chạy (mỗi file bọc `try/catch`).

Không liên quan gì tới VNG / Zalo. Dùng cho máy của chính bạn.

## Góp sức

Chú thích trong code viết tiếng Việt không dấu, không phụ thuộc thư viện ngoài (JS thuần ES5 cho chắc với Electron cũ). Thêm tính năng = thêm 1 file `modules/NN-ten.js` dùng các hàm sẵn có trong `00-loi.js` (`G.css`, `G.toast`, `G.panel`, `G.luu`…).

## Giấy phép

MIT — xem [LICENSE](LICENSE).

### Áo bị mất vía ở đâu — và cách vá cả loại

Ba lỗi cùng một gốc: **ao TE tắt đổ bóng, mà Zalo lại dùng đổ bóng làm việc chính**.

1. **Lớp nổi mất viền.** 185 luật của Zalo tách menu, popover, hộp thoại, nút trôi khỏi nền
   *chỉ bằng* `box-shadow`. Tắt bóng xong, nút cuộn-xuống thành ô **trắng trên nền trắng**.
   Vá cả loại: luật nào có `box-shadow` thì thêm `outline:1px` (outline không đẩy lại bố cục
   như `border`). 182 luật được trả lại nét.
2. **Chữ trắng trên nền sáng.** Toast báo tin mới của Zalo là chữ trắng trên nền tối; áo đổi nền
   thành sáng nhưng chữ vẫn trắng → tin hiện ra **vô hình (1,07:1)**. Vá từng chỗ thì không bao
   giờ hết vì còn hàng chục màn hình chưa mở. Nên có **người canh tương phản**: so màu chữ thật
   với nền thật, dưới 2,6:1 thì đổi sang mực hoặc giấy. Chạy lúc máy rảnh, rút hết hàng chứ
   không cắt ngang.
3. **Chọn nhầm tên.** `#chatInfo` khớp **0 luật** trong bảng CSS của Zalo — bảng thông tin bên
   phải tên thật là `.chat-info`. Trước khi viết luật thì đếm xem tên đó có thật không.

### 120 Hz

Màn hình chạy **120 Hz nhưng Zalo chỉ vẽ 60 khung/giây** (đo được: khung 16,66 ms).
Ba cờ chống "ngủ" có sẵn không gỡ được trần đó. Phải thêm `--disable-frame-rate-limit`
**và** `--disable-gpu-vsync` lúc mở Zalo (đã thêm vào `zalo-gon.ps1`) — thiếu một trong hai
thì vẫn đứng ở 60. **Chỉ có tác dụng sau khi mở lại Zalo.** Đánh đổi: có thể xé hình nhẹ khi
cuộn nhanh, GPU ăn điện hơn; bỏ hai cờ cuối là về 60.

### Viết CSS cho Zalo: hai thứ làm máy giật

Module chuyển động đã **bỏ** (31/10, theo yêu cầu). Giữ lại bài học vì nó đúng cho mọi luật
CSS viết đè lên Zalo. Đo bằng cách ép tính lại kiểu + dàn trang (`body.offsetHeight` +
`getComputedStyle`), lấy trung vị 25 lần: **2,8 ms → 0,1 ms**.

1. **`[class*="..."]`** — mỗi lần Zalo vẽ lại khung (liên tục), Chromium phải dò chuỗi class
   của cả cây DOM cho từng luật kiểu đó. Chỉ dùng tên class có thật.
2. **Luật dấu sao kèm tiền tố tổ tiên** — `html[data-otl-skin="te"] *{...}` bắt Chromium, với
   từng phần tử trong ~2.800, leo ngược lên kiểm tra thuộc tính. Gộp các luật `*` thành **một**,
   bỏ tiền tố, rồi bật/tắt bằng `sheet.disabled` (bảng `otl-gon-ao-te-chung-css`).

⚠️ **Đừng đo bằng fps.** Có hoạt ảnh thì `requestAnimationFrame` khoá vào vsync 16,7 ms; không
có thì chạy tự do vài ms — so hai cái đó là so nhầm. Đo thời gian tính lại kiểu mới đúng.
