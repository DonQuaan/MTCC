# MTCC — Mod Theme Claude Code

Mod `giao-dien-dep` cho Claude Code: một thế giới nền SVG động sống theo giờ thật Việt Nam — 24 tiết khí, mặt trời và trăng
theo giờ, thời tiết (nắng, mây, sương, mưa phùn, mưa rào, mưa to, tuyết hiếm), camera lia chậm qua 12 khung cảnh của một thế
giới liền mạch. Kèm Studio đổi giao diện, 4 bản in tĩnh, và một dòng trạng thái nhỏ: giờ · tiết khí · trời · cảnh đang xem.

*A Claude Code mod: a living SVG world that follows real Vietnam time (solar terms, sun and moon, weather), a Studio to
switch themes, four static plates, and a small status band.*

## Cài

Ở dấu nhắc của một phiên Claude Code trong terminal:

```
/plugin install giao-dien-dep --marketplace DonQuaan/MTCC
```

Trả lời `y` khi được hỏi thêm marketplace, rồi chọn phạm vi (mặc định: user).

Từ shell:

```
claude plugin install giao-dien-dep --marketplace DonQuaan/MTCC
```

Trong app Claude desktop (nơi `/plugin` không chạy): bấm **+** cạnh ô nhập → **Plugins** → **Add marketplace** với
`DonQuaan/MTCC` → **Add plugin**.

## Dùng

| Lệnh | Việc |
| --- | --- |
| `/giao-dien` | Mở Studio |
| `/giao-dien the-gioi` | Dùng thế giới nền |
| `/giao-dien cua-so` | Xem cảnh trong một khung cạnh khung chat ("Thế giới nền", hoặc "Hình nền" khi dùng bản in tĩnh) |
| `/giao-dien tu-mo <bat\|tat>` | Tự mở khung đó mỗi phiên khi app chưa vẽ nền sau khung chat (mặc định: bật) |
| `/giao-dien dia-hinh` · `son-mai` · `thien-do` · `giay-do` | Một trong 4 bản in tĩnh |
| `/giao-dien troi <tu-nhien\|nang\|may-it\|may-vua\|may-nhieu\|gio\|suong\|phun\|mua\|mua-rao\|mua-to\|tuyet>` | Xem trước thời tiết |
| `/giao-dien mua <tu-nhien\|xuan\|ha\|thu\|dong>` | Xem trước mùa |
| `/giao-dien gio <that\|binh-minh\|trua\|hoang-hon\|dem>` | Xem một giờ khác (thời gian vẫn trôi) |
| `/giao-dien chi-tiet <day-du\|nhe>` | Mức chi tiết (máy nóng thì chọn nhẹ) |
| `/giao-dien kinh <trong\|mo\|duc>` | Độ mờ lớp kính trên nền |
| `/giao-dien thanh <bat\|tat>` | Hiện/ẩn dòng trạng thái |
| `/giao-dien tat` | Tắt hình nền |

## Nền sau khung chat

- Nền chỉ vẽ trong app Claude desktop (tab Code); terminal không vẽ nền.
- App chỉ vẽ nền khi lớp vẽ nền của nó được bật — việc này do một cờ tính năng phía máy chủ của app quyết định, mod không đổi
  được. Khi chưa bật, mỗi phiên trong app desktop mod tự mở một lần khung xem cảnh cạnh khung chat ("Thế giới nền", hoặc
  "Hình nền" khi dùng bản in tĩnh). Tắt bằng `/giao-dien tu-mo tat`; mở lại bất cứ lúc nào bằng nút **Cửa sổ** trên dòng
  trạng thái hoặc `/giao-dien cua-so`. Khi app bật lớp này, nền tự hiện sau khung chat và khung không tự mở nữa.
- Bản vẽ được thay mới đúng lúc hết mỗi khung 2 phút; hoạt ảnh chỉ dùng transform và opacity.

## Phát triển

```
claude plugin validate .
claude plugin test .
npx -y @biomejs/biome@2.6.6 lint
```

Thư mục `.claude-plugin/types/` (kiểu TypeScript mà `tsconfig.json` dựa vào) do Claude Code sinh ra khi nạp mod, nên không
nằm trong repo: nạp mod một lần rồi mới chạy `tsc -p .`.

Đã thử trên Claude Code 2.1.317 và app Claude desktop 4.23118 (Windows).

## Giấy phép

MIT — xem [LICENSE](LICENSE).
