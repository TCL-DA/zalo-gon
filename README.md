# Zalo gọn

Bộ "độ" **Zalo PC trên Windows** cho người dùng công việc: ẩn quảng cáo, chế độ riêng tư, đánh dấu khách đang chờ trả lời, gõ tắt, chặn gửi nhầm tiền/báo giá vào nhóm, xuất cuộc trò chuyện ra Markdown/HTML, và cho AI (Claude Code qua MCP) đọc đúng những cuộc bạn cho phép.

> **Không sửa file nào của Zalo, không bẻ khoá, không đụng vào cơ sở dữ liệu đã mã hoá.** Lối tắt mở Zalo kèm cổng gỡ lỗi của Electron (chỉ nghe `127.0.0.1:9333`), rồi chèn các module JS vào trang đang chạy. Cập nhật Zalo xong vẫn dùng được; muốn bỏ thì mở Zalo bằng lối tắt gốc.

## Có gì

| Module | Phím tắt | Làm gì |
|---|---|---|
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
                       └─► bật bridge.py (Runtime.addBinding '__otlGonBridgeSend')

trang Zalo ──binding──► bridge.py ──► ghi file / gọi script nội bộ ──► trả kết quả về trang
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
