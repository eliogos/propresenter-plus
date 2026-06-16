# Getting Started

## Requirements
- ProPresenter (with Network Link enabled)
- Node.js 18+

## Connection
To connect to ProPresenter, you need to know the IP address and port (default is 1025).

```typescript
const pro = createProPresenter('192.168.1.50', 1025)
await pro.connect()
```
