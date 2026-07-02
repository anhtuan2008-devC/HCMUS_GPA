# HCMUS GPA Color Tokens

Nguồn cảm hứng: hệ nhận diện HCMUS dùng tông xanh đặc trưng cho tri thức, sự bền vững và tầm nhìn khoa học.

## Brand

- `brand-primary`: `#003F88`
- `brand-primary-strong`: `#012E6F`
- `brand-navy`: `#001936`
- `brand-accent`: `#0766FF`
- `brand-sky-soft`: `#EAF3FF`

## Surfaces

- `background`: `#F4F8FF`
- `surface`: `#FFFFFF`
- `surface-soft`: `#F7FAFF`
- `surface-tint`: `#EAF3FF`
- `line`: `rgba(0, 25, 54, 0.12)`

## States

- `success`: `#1F8A68`
- `warning`: `#F5A524`
- `danger`: `#C44949`

Không thêm hex mới trực tiếp trong component nếu có thể mở rộng token trước.

## Implementation Notes

- Component code dùng CSS variables như `var(--brand-primary)`, không dùng token màu xanh legacy.
- Chart/SVG cũng dùng token (`var(--brand-accent)`, `var(--brand-navy)`, `var(--chart-grid)`) để tránh lệch brand.
- Tailwind arbitrary color chỉ dùng để trỏ về token, ví dụ `bg-[var(--brand-primary)]`.
