### File: /Comments/maintenance.html

**Purpose**

A standalone, developer-facing webpage for performing maintenance and deployment tasks related to the Comments API. This page is not part of the main user-facing application.

**Functionality**

- **Live API Test**: Provides a button to send a request to the live production API. This is a simple health check to ensure the server is online and responding correctly.
- **API Deployment**: Features a button that triggers the deployment of the local `server/api.php` file to the production server. This action communicates with a local Node.js server endpoint which handles the secure SFTP transfer.
- **Dry Run Option**: The deployment functionality includes a 'Dry Run' checkbox, which allows the developer to see the planned deployment actions without actually transferring any files.
- **Client-Side Logic**: The interactivity of this page is powered by the `js/MaintenancePage.js` module.