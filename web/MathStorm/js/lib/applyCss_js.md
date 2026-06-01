# js/lib/applyCss.js

## Overview

A simple but powerful utility function for dynamically injecting CSS rules into the document. It creates or updates a `<style>` tag in the document's `<head>`.

## Functionality

- **Idempotency:** It accepts an optional `id` parameter. If a `<style>` tag with that ID already exists, it updates its content; otherwise, it creates a new one. This prevents duplicate style blocks from being added.
- **Efficiency:** It checks if the new CSS content is different from the existing content before performing a DOM update, avoiding unnecessary reflows.