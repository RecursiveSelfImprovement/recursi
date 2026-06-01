<!-- 25% -->
# FileUtilities

`FileUtilities` is a static class that encapsulates all logic related to saving the current scene to a file and loading a scene from a file.

### Core Philosophy

This class abstracts away the browser-specific APIs for file handling and the serialization/deserialization logic for the application's data model. It provides a simple, high-level interface for file operations, keeping the rest of the application clean from these details.

<!-- 50% -->

### Primary API Usage

These methods are typically triggered by user commands defined in `SmartDrawKeys`.

```javascript
// To save the current scene
FileUtilities.saveToFile(baseController.cadElements, 'my-drawing.json');

// To load a scene from a file
FileUtilities.loadFromFile(baseController);
```

<!-- 75% -->

### How It Works

-   **`saveToFile(elements, filename)`**: 
    1.  It filters the `elements` array to include only serializable types (currently `path` and `capsule`).
    2.  It calls the `.toJSON()` method on each element to get a plain JavaScript object representation.
    3.  It uses `JSON.stringify` to convert the array of objects into a JSON string.
    4.  It creates a `Blob`, generates an object URL for it, and programmatically creates and clicks an `<a>` tag to trigger a file download in the browser.

-   **`loadFromFile(baseController)`**: 
    1.  It programmatically creates and clicks an `<input type="file">` element to open the browser's file selection dialog.
    2.  When a file is chosen, it uses a `FileReader` to read the file's content as text.
    3.  It parses the JSON string back into an array of objects.
    4.  It iterates through the data, using the `type` property of each object to call the appropriate static `fromJSON()` method (e.g., `PathElement.fromJSON(data)`), which reconstructs the element's data model.
    5.  Crucially, for each newly created element, it instantiates the corresponding `Draw...Command` and uses its rendering methods (`updatePermanentGeometry` or `finalizeCapsule`) to recreate the visual `threejsObject` in the scene.