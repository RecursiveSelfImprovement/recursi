### File: /Comments/css/comments.css

**Purpose**

This file provides all the visual styling for the comments application. It uses a modern, variable-based approach for easy theming and maintenance.

**Key Features**

- **CSS Variables**: A comprehensive set of CSS variables (`--var-name`) is defined in the `:root` selector. This allows for global control over the application's color scheme, fonts, and spacing, making it highly customizable.
- **Component-Based Styling**: The CSS is organized into logical sections that correspond to the application's components, such as `.comments-app-container`, `.comment-thread`, `.comment-node`, and `.comment-post-box`.
- **State Styling**: Defines styles for various comment states, such as `.is-expanded`, `.has-children`, and `.is-deleted`, which are dynamically applied by the JavaScript logic.
- **Dark Theme**: The default variables are configured for a dark, IDE-like theme.