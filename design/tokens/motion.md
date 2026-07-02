# HCMUS GPA Motion Tokens

Motion dùng để giúp sinh viên hiểu trạng thái, không dùng để trang trí quá mức.

- `page-reveal`: 420-560ms, ease-out mềm
- `card-rise`: 480-620ms, stagger 70-100ms
- `progress`: 900-1100ms, đồng bộ số và thanh/vòng tiến độ
- `hover`: 180-240ms, nâng nhẹ hoặc đổi bóng
- `toast`: 260ms vào, 220ms ra, tự ẩn sau vài giây

Luôn tôn trọng `prefers-reduced-motion`: không slide dài, không count-up kéo dài, giữ thông tin đọc được ngay.

Các animation mới nên dùng primitive hoặc class dùng chung trong `app/globals.css`; tránh mỗi feature tự tạo timing riêng.
