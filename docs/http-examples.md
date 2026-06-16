# Internal HTTP & Presentation Examples

This document explains the internal HTTP client and provides raw JSON examples for the Presentation API.

## Internal HTTP Client
The library uses a lightweight wrapper around the native `fetch` API located in `src/utils/http.ts`.

### `HttpClient` Class
It handles base URLs, headers, and automatic JSON parsing.

```typescript
import { HttpClient } from './utils/http'

const client = new HttpClient({ baseUrl: 'http://localhost:1025' })

// GET request
const version = await client.get('/version')

// POST request
const result = await client.post('/v1/timers', { name: 'My Timer', duration: 60 })
```

## Presentation API: Raw REST Usage

If you are not using the `PresentationBuilder` and want to make direct HTTP calls (e.g., via `curl`, Postman, or another language), here is the technical specification.

### 1. Create Presentation
**Endpoint:** `POST /api/presentations`

**Query Parameters (Optional):**
*   `library`: Name of the library to save into.
*   `playlist`: Name of the playlist to add the presentation to.
*   `path`: Subfolder path within the library.
*   `theme`: Theme name to apply.

**Raw JSON Body:**
```json
{
  "title": "My New Song",
  "groups": [
    {
      "name": "Verse 1",
      "text": "First line\nSecond line"
    },
    {
      "name": "Chorus",
      "slides": [
        { "text": "Chorus Line 1" },
        { "text": "Chorus Line 2" }
      ]
    }
  ],
  "artist": "Optional Artist",
  "style": {
    "font": "Arial",
    "size": 50
  }
}
```

**Example `curl` Command:**
```bash
curl -X POST "http://localhost:5173/api/presentations?library=Default" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "API Demo",
       "groups": [{ "name": "V1", "text": "Hello World" }]
     }'
```

---

## Presentation API: Raw JSON Examples

The `PresentationBuilder.create()` method sends a `POST` request to `/api/presentations`. This is a unique feature of the ProPresenter Plus extension.

### 1. Example Request (Input)
When you use the builder like this:

```typescript
const builder = new PresentationBuilder()
  .setTitle('Amazing Grace')
  .setArtist('John Newton')
  .addGroup('Verse 1', 'Amazing grace! How sweet the sound\nThat saved a wretch like me!')
  .addGroup('Chorus', 'My chains are gone, I\'ve been set free')
  .body() // Returns the raw JSON object below
```

The raw JSON sent to the server looks like this:

```json
{
  "title": "Amazing Grace",
  "artist": "John Newton",
  "groups": [
    {
      "name": "Verse 1",
      "text": "Amazing grace! How sweet the sound\nThat saved a wretch like me!"
    },
    {
      "name": "Chorus",
      "text": "My chains are gone, I've been set free"
    }
  ],
  "style": {
    "font": "Arial",
    "size": 60,
    "align": "center"
  }
}
```

### 2. Example Response (Output)
The ProPresenter Plus server processes this, generates a native ProPresenter presentation, and returns a detailed metadata object:

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Amazing Grace",
  "filename": "Amazing Grace.pro",
  "filePath": "/Users/ProPresenter/Documents/Amazing Grace.pro",
  "groups": [
    {
      "uuid": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Verse 1",
      "slides": [
        {
          "uuid": "3e4d5f6g-7h8i-9j0k-1l2m-3n4o5p6q7r8s",
          "text": "Amazing grace! How sweet the sound\nThat saved a wretch like me!"
        }
      ]
    },
    {
      "uuid": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
      "name": "Chorus",
      "slides": [
        {
          "uuid": "z1y2x3w4-v5u6-t7s8-r9q0-p1o2n3m4l5k6",
          "text": "My chains are gone, I've been set free"
        }
      ]
    }
  ],
  "createdAt": "2026-06-16T10:00:00Z"
}
```

### Summary of the Flow
1. **Request**: You send high-level text and metadata.
2. **Processing**: The server parses the text, applies formatting (if provided), creates the `.pro` file structure, and saves it to the ProPresenter library.
3. **Response**: You receive the UUIDs and paths needed to immediately trigger or playlist the new presentation.
