# Builders

Builders are fluent API helpers used to construct complex JSON objects for ProPresenter. They are especially useful when creating or updating items via the REST API.

## Timer Builder
Used to create timer definitions.
```typescript
import { TimerBuilder } from 'propresenter-plus'

const timer = new TimerBuilder()
  .setName('Countdown')
  .setType('countdown') // 'countdown' | 'countup' | 'elapsed'
  .setDuration(300)      // 5 minutes
  .setLoop(false)
  .setEndAction('stop')  // 'none' | 'stop' | 'reset'
  .toJSON()
```

## Look Builder
Used to define "Looks" which control layer visibility and opacity.
```typescript
import { LookBuilder, LookLayerBuilder } from 'propresenter-plus'

const look = new LookBuilder()
  .setName('Sermon Look')
  .addLayer(new LookLayerBuilder('slide').setEnabled(true))
  .addLayer(new LookLayerBuilder('props').setEnabled(false))
  .toJSON()
```

## Presentation Builder
The most powerful builder, allowing you to create and update presentations directly via the API.
```typescript
import { PresentationBuilder } from 'propresenter-plus'

const builder = new PresentationBuilder()
  .setTitle('Great Is Thy Faithfulness')
  .setArtist('Thomas Chisholm')
  .addGroup('Verse 1', 'Great is Thy faithfulness, O God my Father...')
  .addGroup('Chorus', 'Great is Thy faithfulness! Morning by morning new mercies I see')

// Create on the server
const result = await builder.create({ library: 'Hymns' })
```

## Playlist Builder
Used to structure playlists and their items.
```typescript
import { PlaylistBuilder, PlaylistItemBuilder } from 'propresenter-plus'

const playlist = new PlaylistBuilder()
  .setName('Sunday Morning')
  .setType('presentation')
  .addItem(new PlaylistItemBuilder().setId({ uuid: '...' }))
  .toJSON()
```

## Message Builder
Used to create message templates and trigger them with tokens.
```typescript
import { MessageBuilder, MessageTriggerBuilder } from 'propresenter-plus'

// Create a template
const template = new MessageBuilder()
  .setName('Nursery Alert')
  .addToken('Child ID', '123', true)
  .toJSON()

// Trigger with values
const trigger = new MessageTriggerBuilder()
  .set('Child ID', '456')
  .toJSON()
```

## Clear Group Builder
Defines a group of layers to be cleared simultaneously.
```typescript
import { ClearGroupBuilder } from 'propresenter-plus'

const clearGroup = new ClearGroupBuilder()
  .setName('Clear All Visuals')
  .addLayer('slide')
  .addLayer('media')
  .addLayer('props')
  .toJSON()
```

## Collection Builders
Used for grouping Props or Macros.

### Prop Collection
```typescript
import { PropCollectionBuilder } from 'propresenter-plus'

const props = new PropCollectionBuilder()
  .setName('Service Props')
  .addProp({ uuid: '...' })
  .toJSON()
```

### Macro Collection
```typescript
import { MacroCollectionBuilder } from 'propresenter-plus'

const macros = new MacroCollectionBuilder()
  .setName('Setup Macros')
  .addMacro({ uuid: '...' })
  .toJSON()
```
