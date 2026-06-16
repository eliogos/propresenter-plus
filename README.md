# ProPresenter Plus

A modern API library for controlling and interacting with ProPresenter.

## Features

- **Event-driven:** Listen for slide changes, timer updates, and more.
- **Full API coverage:** Control presentations, media, audio, messages, and timers.
- **File support:** Generate and manipulate `.pro` and `.pro6` files directly.
- **Strongly typed:** Built with TypeScript for a great developer experience.

## Installation

```bash
npm install propresenter-plus
```

## Quick Start

```typescript
import { createProPresenter } from 'propresenter-plus'

const pro = createProPresenter('localhost')

// Listen for events
pro.on('slideChange', (status) => {
  console.log('Current Slide:', status.current.text)
})

// Connect to the ProPresenter API
await pro.connect()

// Trigger the next slide
await pro.presentation.triggerNext()
```

## Documentation

- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [File Builders](./docs/builders.md)

## Development

This project is organized into modular components:

- `src/builders/`: Tools for creating ProPresenter data structures.
- `src/utils/`: Common utilities for HTTP and SSE.
- `src/versions/`: Version-specific file logic.
- `src/types/`: TypeScript definitions.

## License

ISC
