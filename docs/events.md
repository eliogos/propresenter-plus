# Events Reference

The `ProPresenter` class uses Server-Sent Events (SSE) to provide real-time updates from ProPresenter. You can listen to these events using the `.on()` method.

## Usage Example

```typescript
import { createProPresenter } from 'propresenter-plus'

const pro = createProPresenter('localhost')

// Listen for slide changes
pro.on('slideChange', (data) => {
  console.log('Now showing:', data.presentation.name)
})

// Connect to start receiving events
await pro.connect()
```

## Available Events

| Event Name | Description | Data Type |
| --- | --- | --- |
| `slideChange` | Fires when the active slide changes or is re-triggered. | `ProSlideStatus` |
| `slideIndexChange` | Fires when the index of the current slide changes. | `ProSlideIndex` |
| `presentationChange` | Fires when a different presentation becomes active. | `{ presentation?: ProPresentation }` |
| `announcementDestinationChange` | Fires when the announcement layer destination changes. | `ProAnnouncementActive` |
| `announcementIndex` | Fires when the active announcement slide index changes. | `ProAnnouncementIndex` |
| `timerChange` | Fires when a timer starts, stops, or updates (sent frequently). | `ProTimerCurrent` |
| `layerChange` | Fires when a layer (Media, Slide, Props, etc.) is cleared or triggered. | `ProLayerStatus` |
| `stageMessage` | Fires when the stage display message is updated. | `ProStageMessage` |
| `audioActiveChange` | Fires when the active audio playlist changes. | `unknown` |
| `audioFocusedChange` | Fires when the focused audio playlist changes. | `unknown` |
| `connected` | Fires when the SSE connection is successfully established. | `void` |
| `disconnected` | Fires when the connection is lost. | `void` |
| `error` | Fires when a connection error occurs. | `Error` |

## Event Details

### `slideChange`
This is usually the most used event. It provides the full state of the current slide, including the presentation name, slide index, and uuid.

### `timerChange`
Note that this event can fire very frequently (often every second) if you have active timers running, as ProPresenter streams the "current" time of all active timers.

### `layerChange`
Useful for UI state. It tells you exactly what is visible on the Audience and Stage screens across all layers (Video, Image, Slide, Props, etc.).

### `stageMessage`
Fires whenever a user updates the "Stage Message" in ProPresenter, allowing you to build custom "Confidence Monitors" or alert systems.

## Connection Management
The library automatically attempts to reconnect if the connection is dropped. Use `pro.disconnect()` to stop listening and close the connection.
