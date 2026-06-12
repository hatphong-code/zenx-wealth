Surface container for ZenX screens — use `card` for boxed sections, `open` for the default airy "Ít khung" layout.

```jsx
<Panel variant="open" first>{heroContent}</Panel>
<Panel variant="card" hero>{heroContent}</Panel>
```

Variants: `variant="card"` (surface + border + shadow) vs `variant="open"` (transparent, top hairline). `hero` adds the gradient background; `first` removes the leading hairline/spacing in an open stack.
