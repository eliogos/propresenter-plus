# REST API Reference

ProPresenter Plus provides a high-level wrapper around the ProPresenter 7 REST API. It is organized into several sub-modules.

## Presentation
Control and query presentations.

| Method | Description |
| --- | --- |
| `pro.presentation.getActive()` | Get details of the active presentation. |
| `pro.presentation.getFocused()` | Get the currently focused presentation identifier. |
| `pro.presentation.getByUuid(uuid)` | Get presentation details by UUID. |
| `pro.presentation.triggerActive()` | Trigger the active presentation. |
| `pro.presentation.triggerNext()` | Trigger the next slide in the active presentation. |
| `pro.presentation.triggerPrev()` | Trigger the previous slide in the active presentation. |
| `pro.presentation.triggerIndex(i)` | Trigger a specific slide index. |

## Timers
Manage ProPresenter timers.

| Method | Description |
| --- | --- |
| `pro.timers.getAll()` | List all timers. |
| `pro.timers.startAll()` | Start all timers. |
| `pro.timers.stopAll()` | Stop all timers. |
| `pro.timers.create(data)` | Create a new timer (use `TimerBuilder`). |
| `pro.timers.control(id, op)` | Start, stop, or reset a specific timer. |

## Playlists
Manage and trigger playlist items.

| Method | Description |
| --- | --- |
| `pro.playlist.getAll()` | List all playlists. |
| `pro.playlist.create(data)` | Create a new playlist (use `PlaylistBuilder`). |
| `pro.playlist.triggerFocused()` | Trigger the focused playlist. |
| `pro.playlist.focusNext()` | Focus the next playlist. |

## Special: Presentation Creation (ProPresenter Plus)
The `PresentationBuilder` interacts with an extended API endpoint not found in the standard ProPresenter REST API.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/presentations` | `POST` | Create a new presentation from raw text. |
| `/api/presentations/:id` | `PATCH` | Update an existing presentation. |

### Example
```typescript
import { PresentationBuilder } from 'propresenter-plus'

const builder = new PresentationBuilder()
  .setTitle('New Song')
  .addGroup('Chorus', 'Lyrics go here...')

const result = await builder.create()
```

## SSE (Server-Sent Events)
The library automatically handles SSE connections to provide real-time updates.

```typescript
pro.on('slideChange', (data) => {
  console.log('Slide changed to:', data.presentation.name)
})

await pro.connect()
```
