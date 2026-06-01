**Scratchy Structured Export System: Architecture and Implementation Record**

**Overview**

Scratchy is a tool for vibe-coding Scratch projects, written by a northern California stray with assistance from the Grok LLM. Users drag in an sb3 file (which is just a zip containing a project.json and asset files), Scratchy unpacks it, lets them view and work with it, and provides a bridge to LLMs. The bridge builds prompts containing the project data, sends them to an LLM via clipboard, and then accepts patches back from the LLM that modify the project. The modified project can be exported as an sb3 and opened in Scratch.

The core challenge we addressed is that Scratch’s native JSON format is hostile to LLM comprehension. Blocks are stored in a flat map keyed by random 20-character IDs like “TVUo8?tTBU?0V}0V%wYc”, with control flow encoded implicitly through next/parent references between these IDs. An LLM trying to understand or modify a Scratch project has to mentally reconstruct the program structure by tracing chains of opaque IDs, which wastes tokens and causes errors.

We built a “structured” export mode that translates the project into a more LLM-friendly representation with readable IDs and a pseudocode summary, while keeping the original “raw” mode fully intact as a fallback.

**Background and Motivation**

Scratchy is the smaller sibling of a larger project called Recursi, which is a JavaScript environment for vibe coding. Recursi handles JavaScript source files and has its own patching system for modifying methods within classes. Scratchy was built as an entry point because Scratch has an obvious underserved audience — kids are already trying to use AI with their Scratch projects, and there’s no good tool for it. The fact that Scratch projects are just JSON made it seem like a natural fit for LLM-assisted editing, but in practice the JSON format is arguably worse for LLMs than well-structured JavaScript because of its flat graph serialization with random IDs.

The structured mode was designed to address this without disrupting the working raw mode, since Scratchy needs to remain functional throughout development.

**Architecture: The Two-Mode System**

The system supports two modes: “raw” and “structured.” The active mode is stored in localStorage under the key “scratchy-export-mode” and defaults to “raw.” Users can toggle between modes via a dropdown in the prompt builder dialog. Both modes coexist permanently — this isn’t a migration from old to new, it’s two parallel paths that the user chooses between.

The mode affects two things: how the prompt is built when exporting for an LLM, and how patches are processed when pasting an LLM response back in. Everything else in the app (the viewer, the editor, the sb3 export, asset handling) is completely unaffected by the mode choice.

**File Organization and Responsibilities**

**ScratchyLLMBridge.js** is the orchestrator. It owns all the UI — the prompt builder dialog with its dictation widget, the paste dialog, the patch log display, clipboard handling. It does not contain any export logic or patch processing logic directly. Instead it delegates to the active exporter and processor based on the current mode. It holds references to instances of all four worker classes (two exporters, two processors) and lazily instantiates them. The key methods are getActiveExporter() and getActiveProcessor(), which check localStorage and return the appropriate instance.

**RawExporter.js** contains the original export logic extracted from ScratchyLLMBridge. It has three methods: getInstructions() returns the system prompt text that teaches the LLM about Scratch’s JSON format and the patch protocol. getEmptyPromptInstructions() returns additional instructions for when the user didn’t type a specific request. buildPrompt() takes the project data, file blobs, filename, user text, and flags for what to include, and returns the complete prompt string. In raw mode, the prompt contains the literal project.json with original IDs.

**StructuredExporter.js** is the new exporter that does all the interesting work. It has the same three public methods as RawExporter, but its buildPrompt does three additional things when code is included: it generates a bidirectional ID map (readable to original and original to readable), it produces a pseudocode summary of every sprite’s scripts, and it rewrites the project JSON with readable IDs substituted everywhere. It also exposes getReverseIdMap() so the patch processor can access the mapping. The instructions text is different from the raw version — it explains the readable ID format and tells the LLM to use readable IDs in patches.

**RawPatchProcessor.js** contains the original patch processing logic extracted from ScratchyLLMBridge. Its process() method takes the pasted text and the project data, tries several strategies to extract JSON from the text (scratchy-patch code fence, json code fence, raw JSON parse, brace-delimited substring extraction), and either applies patches via PatchManager or handles full project replacement. It returns an object with projectData, log, applied count, error count, and a fullReplace flag.

**StructuredPatchProcessor.js** is the new processor. It has the same text extraction logic as the raw processor, but before handing patches to PatchManager, it runs a resolution pass that translates all readable IDs back to original Scratch IDs. It receives a reference to the StructuredExporter via setExporter() so it can access the reverse ID map.

**PatchManager.js** is completely untouched. It handles the actual application of patches to the project data — replace, add\_blocks, delete\_blocks, set\_variable operations. It also has its own ID remapping logic for placeholder IDs (things starting with “new\_”, “llm\_”, “block\_”, or shorter than 8 characters), but in structured mode this remapping should rarely if ever trigger because the StructuredPatchProcessor resolves everything before PatchManager sees it.

**How Readable ID Generation Works**

The StructuredExporter’s \_generateIdMap method walks the entire project and builds the bidirectional mapping. The algorithm works as follows.

For each target (sprite or stage), it sanitizes the target name by replacing non-alphanumeric characters with underscores.

For variables, lists, and broadcasts, it creates IDs in the format targetName.var.humanName, targetName.list.humanName, targetName.broadcast.humanName. The human name comes from the first element of the value array (Scratch stores variables as \[humanReadableName, currentValue\]). Duplicate names within a target get disambiguated with numeric suffixes.

For blocks, it first finds all top-level blocks (blocks with topLevel true and parent null — these are the hat blocks that start scripts). For each hat block, it derives a script name from the opcode: event\_whenflagclicked becomes “whenFlag”, event\_whenkeypressed becomes “whenKey\_” plus the key, event\_whenbroadcastreceived becomes “whenRecv\_” plus the broadcast name, and so on. If there are multiple scripts with the same hat type on one sprite, they get disambiguated with numeric suffixes.

It then walks each script chain. The hat block itself gets the ID targetName.scriptName (like “Bee.whenFlag”). Each subsequent block in the next chain gets targetName.scriptName.shortOpcode\_N where N is the sequential position and shortOpcode is the opcode with the category prefix stripped and the remainder camelCased (so “motion\_movesteps” becomes “moveSteps”, “control\_if\_else” becomes “ifElse”).

For blocks inside substacks (the bodies of forever, repeat, if, if-else blocks), the method recurses. SUBSTACK inputs get a “.if” segment in the ID path, SUBSTACK2 gets “.else”. Other block inputs (reporters plugged into input slots) get “.arg\_inputname”. This means a block deep inside nested control flow might have an ID like “Bee.whenFlag.forever\_2.if.moveSteps\_1”.

Any blocks that weren’t reached by the chain traversal (orphaned blocks, loose reporters) get IDs like “targetName.orphan.opcode\_N”.

The mapping is stored on the exporter instance as this.\_idMap (original to readable) and this.\_reverseIdMap (readable to original). These are regenerated every time buildPrompt is called with includeCode true.

**How Pseudocode Generation Works**

The \_generatePseudocode method walks each target and each script, producing indented text that mirrors how the blocks look in the Scratch editor. Each target gets a header line with its name and variable values. Each script gets a header with its readable ID and then indented lines for each block.

The \_blockToPseudocode method has a switch statement covering common opcodes with human-readable descriptions: “go to x: 0 y: 0”, “move 10 steps”, “say Hello for 2 secs”, “forever:”, “if (condition):”, “set \[score\] to 0”, and so on. Control flow blocks that have substacks get a colon at the end and their body is indented below. If-else blocks get an “else:” line between the two substacks.

For opcodes not in the switch statement, it falls back to showing the short opcode name with its inputs and fields listed. This covers the common cases well and degrades gracefully for unusual blocks.

Input values are formatted by \_formatInputValue, which handles the nested array format Scratch uses. Literal values (like \[1, \[4, “100”\]\]) display the literal. Block references (where an input slot contains a reporter block) display the variable name if it’s a data\_variable block, or “(shortOpcode…)” for more complex reporters.

**How JSON Rewriting Works**

The \_rewriteProjectJson method deep-clones the entire project data, then walks every target replacing IDs with their readable equivalents. It replaces: variable keys, list keys, broadcast keys, block keys (the keys in the blocks object), and within each block it replaces next, parent, block references inside input arrays, and variable/broadcast IDs inside field arrays.

The input array handling uses a length heuristic — strings longer than 8 characters in certain positions within the nested input arrays are assumed to be block IDs. This works reliably for original Scratch IDs (which are 20 characters) but is something to be aware of.

The rewritten JSON is structurally identical to the original — same nesting, same fields, same values for everything that isn’t an ID. Just the IDs are different. This means the LLM can look at the pseudocode to understand the project and reference the JSON for precise structural details, and everything uses the same readable IDs throughout.

**How Patch Resolution Works**

When the LLM sends back patches using readable IDs, the StructuredPatchProcessor’s \_resolvePatches method translates everything back to original Scratch IDs before PatchManager ever sees the data.

It works in two passes. The first pass scans all patches for block objects (in add\_blocks and certain replace operations) and identifies genuinely new block IDs — readable IDs that don’t exist in the reverse map, meaning the LLM invented them for new blocks. For each new ID, it generates a fresh 20-character Scratch-style random ID. These go into a local newIdMap.

The second pass walks every patch and substitutes IDs everywhere they appear. It uses a deepResolve function that handles strings (checking both the reverse map and the new ID map), arrays (recursing into elements), and objects (recursing into values AND renaming keys). This catches block IDs in all the places they can appear: path arrays, blockIds arrays in delete operations, block object keys in add operations, next and parent fields, input arrays, and field arrays.

The key design choice here is that the processor handles ALL ID resolution — both mapping existing readable IDs back to originals and generating Scratch IDs for new blocks. This means PatchManager never sees readable IDs at all and its own placeholder ID remapping logic (which triggers on prefixes like “new\_” and “llm\_”) should never need to activate in structured mode.

**Important Implementation Details and Gotchas**

The ID map is regenerated on every export. This means if the user exports, applies some patches that change the block structure, and exports again, the IDs for unchanged blocks should remain the same (since they’re derived deterministically from position and opcode) but blocks that moved or were inserted could shift the numbering. In a multi-turn conversation where the user exports, gets patches, applies them, and exports again, the LLM might see some IDs change. This is acceptable but worth noting.

The \_getBlockIdFromInput method in the exporter uses a string length greater than 10 heuristic to distinguish block ID references from literal values in input arrays. This works for original Scratch IDs but could theoretically misidentify a short literal string as a non-ID or a long literal as an ID. In practice this hasn’t been a problem because Scratch’s native IDs are always 20 characters.

The deepResolve function in the processor renames object keys by deleting the old key and setting the new one while iterating over Object.keys. This is safe because it snapshots the keys before iterating, but if two readable IDs resolved to the same original ID (which shouldn’t happen but could in a malformed map), the second would silently overwrite the first.

Full project replacement in structured mode (where the LLM sends back an entire project.json with targets array instead of patches) currently passes through without any ID resolution. This means the project would retain readable IDs, which would break sb3 export. This is acceptable for now because the LLM should always be sending patches, not full replacements, and the instructions tell it to use the patch protocol.

The instructions text for structured mode is stored in the StructuredExporter’s getInstructions method. It’s a long string that explains the readable ID format, the patch protocol, and how to work with the project. If the user has edited the instructions in the instructions editor within the app, the buildPrompt method receives currentInstructions (which is whatever the user has in their editor) and uses that instead. The instructions from getInstructions are used as the default that gets loaded into the editor.

**Design Constraints for Future Work**

The raw mode must remain fully functional and untouched. It’s the fallback and the reference implementation. Any new work happens only in the Structured classes and potentially ScratchyLLMBridge’s wiring code.

PatchManager should remain untouched. It’s the core engine that both modes share, and it works well. Any mode-specific behavior belongs in the processors, not in PatchManager.

The bidirectional ID map is the single source of truth for ID translation. Both the exporter (for generating) and the processor (for resolving) use it. If the map generation logic changes, the resolution logic should still work without changes because it just does lookups.

New features should follow the same pattern: if it’s about how the project is presented to the LLM, it goes in StructuredExporter. If it’s about how LLM responses are translated back, it goes in StructuredPatchProcessor. If it’s about UI, it goes in ScratchyLLMBridge. If it’s about applying patches to project data, it goes in PatchManager.

**Possible Future Improvements**

Expanding the pseudocode opcode coverage to handle more blocks nicely, especially custom blocks (procedures), clone operations, pen extension blocks, and music blocks. The current fallback (showing the short opcode and inputs) works but isn’t as readable.

Stabilizing IDs across edits, possibly by caching the map within a session and only generating new IDs for genuinely new blocks rather than regenerating everything from position each time.

Handling full project replacement in structured mode by running the reverse of the JSON rewriting pass.

Making the pseudocode format richer — showing variable types, showing broadcast connections between sprites, showing costume switch logic more clearly.

Possibly allowing the LLM to send patches in a higher-level format (like pseudocode itself) that gets compiled into JSON patches, though this would be a significant undertaking.

Token optimization — for very large projects, allowing the user to select specific sprites or scripts to include in the export rather than sending everything.