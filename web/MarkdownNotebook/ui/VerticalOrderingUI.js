/**
 * Manages drag-and-drop vertical reordering of items within a parent container.
 * Assumes items are direct children of the parentElement.
 */
class VerticalOrderingUI {
  /**
   * @param {HTMLElement} parentElement - The container whose children will be reordered.
   * @param {Array<object>} items - An array of objects, where each object must have:
   *   - `element`: The DOM element representing the item (a child of parentElement).
   *   - `dragElement`: The specific DOM element within `element` that acts as the drag handle.
   *   This array *must* be kept in sync with the DOM order by the calling code after a drop.
   * @param {boolean} [debug=false] - Enable console logging for debugging.
   */
  constructor(parentElement, items, debug = false) {
    if (!parentElement || typeof parentElement.children === 'undefined') {
        throw new Error("VerticalOrderingUI: Invalid parentElement provided.");
    }
     if (!Array.isArray(items)) {
        throw new Error("VerticalOrderingUI: Invalid 'items' array provided.");
    }

    this.parentElement = parentElement;
    this.items = items; // This class reads this array but MUTATES THE DOM.
                         // The caller is responsible for updating this array after drop.
    this.debug = debug; // Toggle debug logging

    // The placeholder element indicating drop position
    this.placeholder = this.createPlaceholder();

    // Drag state variables
    this.draggingItem = null;     // The item object being dragged { element, dragElement }
    this.dragGhost = null;      // The visual clone following the mouse
    this.startMouseOffsetY = 0; // Mouse offset within the drag handle
    this.dragStartIndex = -1;   // Original index of the dragged item
    this.insertionIndex = -1;   // Calculated target index for dropping

    // Bound event handlers to maintain 'this' context
    this.mouseMoveHandler = this.onMouseMove.bind(this);
    this.mouseUpHandler = this.onMouseUp.bind(this);

    // Attach initial listeners
    this.initializeDragListeners();

    // Optional: Debug key listener
    if (this.debug) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 's' || e.key === 'S') { // Check for 's' or 'S'
          console.log("--- VerticalOrderingUI Debug Info ---");
          this.debugOutput();
          console.log("------------------------------------");
        }
      });
      console.log("VerticalOrderingUI: Debug mode enabled. Press 'S' to log state.");
    }
  }

  /**
   * Creates the visual placeholder element.
   * @returns {HTMLElement} The placeholder div.
   * @private
   */
  createPlaceholder() {
      const ph = document.createElement('div');
      ph.className = 'drag-placeholder'; // For potential CSS styling
      ph.style.position = 'relative';
      ph.style.height = '4px'; // Minimal height, adjust as needed
      ph.style.margin = '8px 0'; // Add some margin to separate from items
      ph.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Semi-transparent yellow default
      ph.style.border = '1px dashed #cccc00'; // Dashed yellow border
      ph.style.pointerEvents = 'none'; // Allow mouse events to pass through
      ph.style.zIndex = '9999';
      // Debug text styling
      ph.style.fontSize = '10px';
      ph.style.color = '#333';
      ph.style.textAlign = 'center';
      ph.style.overflow = 'visible';
      return ph;
  }

  /**
   * Attaches mousedown listeners to the drag handles of the items.
   * Call this if items are added dynamically after initialization.
   * @param {Array<object>} [newItems=null] - Optional array of new items to attach listeners to. If null, attaches to all current items.
   */
  initializeDragListeners(newItems = null) {
    const itemsToProcess = newItems || this.items;
     if (!Array.isArray(itemsToProcess)) return;

    itemsToProcess.forEach(item => {
       if (!item || !item.dragElement || !item.element) {
           if (this.debug) console.warn("VerticalOrderingUI: Skipping invalid item in initializeDragListeners", item);
           return;
       }
      // Check if listener is already attached to prevent duplicates
      if (!item.dragElement.__draggableInitedVU) {
        item.dragElement.__draggableInitedVU = true; // Mark as initialized
        item.dragElement.style.cursor = 'grab'; // Set initial cursor

        // Use bind to ensure 'this' context and pass the specific item
        const mouseDownListener = this.onMouseDown.bind(this, item);
        item.dragElement.addEventListener('mousedown', mouseDownListener);

        // Store listener reference on the element for potential future removal
        item.dragElement.__vuMouseDownListener = mouseDownListener;
      }
    });
  }

  /**
   * Removes drag listeners. Call before discarding the UI instance or items.
   */
  removeEventListeners() {
      this.items.forEach(item => {
          if (item && item.dragElement && item.dragElement.__vuMouseDownListener) {
              item.dragElement.removeEventListener('mousedown', item.dragElement.__vuMouseDownListener);
              delete item.dragElement.__draggableInitedVU;
              delete item.dragElement.__vuMouseDownListener;
              item.dragElement.style.cursor = ''; // Reset cursor
          }
      });
       // Remove debug listener if added
      // document.removeEventListener('keydown', ...);
  }

  /**
   * Logs the current order of items in the internal array vs. the DOM.
   * @private
   */
  debugOutput() {
    const getItemLabel = (item) => {
      if (!item || !item.element) return '(invalid item)';
      // Try to get a title or first bit of text for identification
      return item.element.title || (item.element.textContent || '').trim().substring(0, 20) + '...';
    };

    const arrayOrder = this.items.map((item, i) => `${i}: '${getItemLabel(item)}'`).join('\n  ');

    const domChildren = Array.from(this.parentElement.children);
    const domOrder = domChildren.map((child, i) => {
      const foundItem = this.items.find(item => item.element === child);
      let label;
      if (foundItem) {
          label = `${this.items.indexOf(foundItem)}: '${getItemLabel(foundItem)}'`;
      } else if (child === this.placeholder) {
          label = `<-- PLACEHOLDER (Target: ${this.insertionIndex}) -->`;
      } else if (child === this.draggingItem?.element) {
           label = `<-- DRAGGING ELEMENT (Original: ${this.dragStartIndex}) -->`;
      }
       else {
          label = `(Unknown element)`;
      }
      return `${i}: ${label}`;
    }).join('\n  ');

    console.log(`Internal Array Order (${this.items.length} items):\n  ${arrayOrder}`);
    console.log(`DOM Order (${domChildren.length} children):\n  ${domOrder}`);
    console.log(`Dragging: ${this.draggingItem ? `'${getItemLabel(this.draggingItem)}'` : 'None'}, Start Index: ${this.dragStartIndex}, Insertion Index: ${this.insertionIndex}`);
  }

  /**
   * Handles the mousedown event on a drag handle. Initiates the drag operation.
   * @param {object} item - The item object ({ element, dragElement }) being dragged.
   * @param {MouseEvent} e - The mousedown event object.
   * @private
   */
  onMouseDown(item, e) {
    // Only allow left mouse button drags
    if (e.button !== 0) return;
    // Prevent dragging if already dragging another item
    if (this.draggingItem) return;

    e.preventDefault(); // Prevent text selection during drag
    e.stopPropagation(); // Prevent triggering other listeners

    this.draggingItem = item;
    this.dragStartIndex = this.items.findIndex(i => i.element === item.element);

    if (this.dragStartIndex === -1) {
        console.error("VerticalOrderingUI: Dragged item not found in internal items array!");
        this.draggingItem = null;
        return;
    }

    const dragRect = item.dragElement.getBoundingClientRect();
    const elementRect = item.element.getBoundingClientRect();
    this.startMouseOffsetY = e.clientY - elementRect.top; // Offset relative to the whole element, not just handle

    // Create and style the drag ghost (visual clone)
    this.dragGhost = item.element.cloneNode(true); // Clone the whole element for visual feedback
    this.dragGhost.style.position = 'fixed'; // Use fixed positioning for viewport relativity
    this.dragGhost.style.pointerEvents = 'none'; // Ghost should not interfere with mouse events
    this.dragGhost.style.opacity = '0.75';
    this.dragGhost.style.zIndex = '10000'; // Ensure ghost is above other elements
    this.dragGhost.style.width = `${elementRect.width}px`; // Match original width
    this.dragGhost.style.height = `${elementRect.height}px`; // Match original height
    this.dragGhost.style.left = `${elementRect.left}px`;
    this.dragGhost.style.top = `${e.clientY - this.startMouseOffsetY}px`; // Initial position at mouse
    this.dragGhost.style.boxShadow = '0 6px 15px rgba(0,0,0,0.3)'; // Add shadow to lift it visually
    this.dragGhost.style.cursor = 'grabbing'; // Ghost shows grabbing cursor
    document.body.appendChild(this.dragGhost);

    // Style the original element being dragged
    item.element.style.opacity = '0.4'; // Dim the original element
    item.element.style.transition = 'opacity 0.2s ease'; // Smooth transition
    item.dragElement.style.cursor = 'grabbing'; // Change cursor on the handle

    // Add document-level listeners for move and up events
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('mouseleave', this.mouseUpHandler); // Handle mouse leaving window

    if (this.debug) console.log(`Drag Start: Item ${this.dragStartIndex}`);
  }

  /**
   * Handles the mousemove event during a drag operation.
   * Updates the ghost position and calculates the insertion point.
   * @param {MouseEvent} e - The mousemove event object.
   * @private
   */
  onMouseMove(e) {
    if (!this.draggingItem) return;

    e.preventDefault();

    // Move the ghost element
    const newTop = e.clientY - this.startMouseOffsetY;
    this.dragGhost.style.top = `${newTop}px`;
    // Keep ghost left position fixed, or update if horizontal movement is desired
    // this.dragGhost.style.left = `${e.clientX - this.startMouseOffsetX}px`;

    // --- Calculate Insertion Index ---
    // Iterate through the *current DOM order* of potential drop targets (excluding the dragged item itself)
    const currentChildren = Array.from(this.parentElement.children);
    let newInsertionIndex = 0; // Default to the beginning
    let foundPlaceholder = false;

    for (let i = 0; i < currentChildren.length; i++) {
        const child = currentChildren[i];

        // Skip the placeholder itself and the original item being dragged
        if (child === this.placeholder || child === this.draggingItem.element) {
            if (child === this.placeholder) foundPlaceholder = true;
            continue;
        }

        const rect = child.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY < midY) {
            // If mouse is above the midpoint, insert before this child
             newInsertionIndex = i;
             // If we haven't encountered the placeholder yet in the DOM scan,
             // and the target index is *after* the placeholder's current DOM position,
             // we need to decrement the index because the placeholder will be removed.
             // This logic gets complex. A simpler way is to calculate based on `this.items` array.

            break; // Found insertion point
        }
        // If mouse is below midpoint, potential insertion is after this child
        newInsertionIndex = i + 1;
    }

    // --- Simpler Index Calculation based on `this.items` ---
    // This assumes `this.items` reflects the logical order before the current move started.
    let calculatedIndex = 0;
    for (let i = 0; i < this.items.length; i++) {
        // Skip the item being dragged when calculating position relative to others
        if (i === this.dragStartIndex) continue;

        const item = this.items[i];
        const rect = item.element.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (e.clientY < midY) {
            calculatedIndex = i;
             // Adjust index if inserting *after* the original position
            if (calculatedIndex > this.dragStartIndex) {
               calculatedIndex -= 1; // Account for removal of dragged item later
            }
            break; // Found position relative to non-dragged items
        }
         // If below all items checked so far
         calculatedIndex = i + 1;
          if (calculatedIndex > this.dragStartIndex) {
            calculatedIndex -= 1;
          }
    }
     // Clamp index to valid range [0, items.length - 1]
     calculatedIndex = Math.max(0, Math.min(calculatedIndex, this.items.length - 1));

    // -- Use the DOM-based calculation, it's more reliable for placeholder positioning --
    // Correct the DOM-based index if placeholder was before the insertion point
     const currentPlaceholderIndex = currentChildren.indexOf(this.placeholder);
     if (foundPlaceholder && newInsertionIndex > currentPlaceholderIndex) {
         newInsertionIndex--; // Decrement because placeholder will be removed before insertion
     }
     // Clamp index relative to the number of actual items
     newInsertionIndex = Math.max(0, Math.min(newInsertionIndex, this.items.length));

    // Only update placeholder if index changes to avoid unnecessary DOM manipulation
    if (newInsertionIndex !== this.insertionIndex) {
        this.insertionIndex = newInsertionIndex;

        // Determine the target element to insert before
        let insertBeforeElement = null;
        let currentItemIndex = 0;
        for(let i = 0; i < this.parentElement.children.length; i++) {
            const child = this.parentElement.children[i];
            // Skip the element being dragged
             if (child === this.draggingItem.element) continue;
             if (currentItemIndex === this.insertionIndex) {
                 insertBeforeElement = child;
                 break;
             }
             currentItemIndex++;
        }

        // Insert the placeholder at the new position
        if (insertBeforeElement) {
            this.parentElement.insertBefore(this.placeholder, insertBeforeElement);
        } else {
             // If insertBeforeElement is null, append to the end
            this.parentElement.appendChild(this.placeholder);
        }

        // Update placeholder styling (e.g., valid/invalid drop target)
        this.updatePlaceholderStyling();

        if (this.debug) {
            this.placeholder.textContent = `Drop Target Index: ${this.insertionIndex}`;
        }
    }
  }

  /**
   * Handles the mouseup event, finalizing the drag operation.
   * Moves the element in the DOM and cleans up listeners and styles.
   * @param {MouseEvent} e - The mouseup event object.
   * @private
   */
  onMouseUp(e) {
    if (!this.draggingItem) return;

    e.preventDefault();

    // Remove document-level listeners
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
    document.removeEventListener('mouseleave', this.mouseUpHandler);

    // Remove ghost element
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    // Remove placeholder element
    if (this.placeholder.parentNode) {
      this.placeholder.remove();
    }

    // Reset style of the dragged element
    this.draggingItem.element.style.opacity = '';
    this.draggingItem.element.style.transition = '';
    this.draggingItem.dragElement.style.cursor = 'grab';

    // --- Move the Element in the DOM ---
    // Check if a valid move occurred (insertionIndex differs from startIndex)
    // Note: insertionIndex is relative to items *excluding* the dragged one.
    // The actual DOM index might need adjustment.
    if (this.insertionIndex !== -1 && this.insertionIndex !== this.dragStartIndex) {

         // Find the element currently at the target DOM position (adjusted for placeholder/dragged item)
         const currentChildren = Array.from(this.parentElement.children);
         let targetElement = null;
         let elementCount = 0;
         for(let i = 0; i < currentChildren.length; i++) {
             const child = currentChildren[i];
             if (child === this.draggingItem.element) continue; // Skip dragged element
             if (elementCount === this.insertionIndex) {
                targetElement = child;
                break;
             }
             elementCount++;
         }

         if (targetElement) {
            // Insert the dragged element before the target element
            this.parentElement.insertBefore(this.draggingItem.element, targetElement);
         } else {
             // If no targetElement (insertionIndex is at the end), append it
             this.parentElement.appendChild(this.draggingItem.element);
         }

        if (this.debug) console.log(`Drag End: Moved item from ${this.dragStartIndex} to DOM position before ${targetElement ? 'element ' + Array.from(this.parentElement.children).indexOf(targetElement) : 'end'}. Target Index: ${this.insertionIndex}`);

        // --- IMPORTANT ---
        // The DOM has been updated. The caller *must* now update the `this.items` array
        // to reflect the new DOM order for subsequent drags to work correctly.
        // This class does NOT modify the `this.items` array itself.
        // Example of how caller might update:
        // const draggedItem = this.items.splice(this.dragStartIndex, 1)[0];
        // this.items.splice(this.insertionIndex, 0, draggedItem); // Adjust insertionIndex if needed based on old vs new pos

        // Emit a custom event to notify the parent component of the drop
        const dropEvent = new CustomEvent('vu-drop', {
            detail: {
                item: this.draggingItem,
                originalIndex: this.dragStartIndex,
                newIndex: this.insertionIndex // The logical index where it should be inserted in the array
            },
            bubbles: true, // Allow event to bubble up
            cancelable: true
        });
        this.parentElement.dispatchEvent(dropEvent);

    } else {
        if (this.debug) console.log(`Drag End: No move occurred (Start: ${this.dragStartIndex}, Target: ${this.insertionIndex})`);
        // No move needed, item snaps back visually as styles are reset.
    }

    // Reset drag state
    this.draggingItem = null;
    this.dragStartIndex = -1;
    this.insertionIndex = -1;
  }

  /**
   * Updates the placeholder's style, potentially indicating if the drop position is invalid.
   * @private
   */
  updatePlaceholderStyling() {
    // Example: Check if dropping at the current location is a no-op
    const isNoOp = this.insertionIndex === this.dragStartIndex;

    if (isNoOp && this.debug) {
      // Indicate no-op in debug mode (e.g., different color)
      this.placeholder.style.backgroundColor = 'rgba(255, 165, 0, 0.5)'; // Orange tint
      this.placeholder.style.border = '1px dashed #cc8400';
      this.placeholder.textContent = `No change at Index: ${this.insertionIndex}`;

    } else {
      // Default valid drop style
      this.placeholder.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Yellow
      this.placeholder.style.border = '1px dashed #cccc00';
       if (this.debug) {
            this.placeholder.textContent = `Drop Target Index: ${this.insertionIndex}`;
        } else {
            this.placeholder.textContent = ''; // No text if not debugging
        }
    }
  }
}

