Pill segmented control for 2–3 short options (audience, device, layout toggles).

```jsx
<Segmented value={aud} onChange={setAud}
  options={[{value:'young',label:'Trẻ · Ấm'},{value:'mid',label:'Trung niên · Tư gia'}]} />
```

Set `dark` on dark surfaces. For >3 or long options, prefer a select.
