The core dashboard metric unit — icon, label, big tabular figure, and a caption or progress bar.

```jsx
<StatTile icon={<CoffeeIcon/>} label="Latte Factor" value="6,8 tr" sub="↓ 18% tháng này" subTone="positive" onClick={goLatte} />
<StatTile icon={<ShieldIcon/>} label="Quỹ dự phòng" value="3.2/6" pct={53} sub="53% mục tiêu" color="var(--zx-positive)" />
```

Pass `pct` (0–100) to show a ProgressBar instead of a plain caption. `subTone="positive"` colors the caption green.
