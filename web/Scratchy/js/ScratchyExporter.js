class ScratchyExporter {
  constructor(app) {
    this._app = app;
  }

  async exportSb3() {
    const app = this._app;
    if (!app.projectData || !app.zipEntries) {
      app.statusDiv.textContent = 'No project loaded — load an .sb3 first.';
      return;
    }

    app.statusDiv.textContent = 'Building .sb3...';

    try {
      const blob = await this.getSb3Blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = app.loadedFileName || 'project.sb3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      app.statusDiv.textContent = `Saved ${a.download} (${(
        blob.size / 1024
      ).toFixed(1)} KB)`;
    } catch (e) {
      app.statusDiv.textContent = `Export failed: ${e.message}`;
      console.error(e);
    }
  }

  async getSb3Blob() {
    const app = this._app;
    if (!app.projectData || !app.zipEntries) {
      throw new Error('No project data loaded');
    }

    const zip = new JSZip();
    zip.file('project.json', JSON.stringify(app.projectData));

    for (const [filename, entry] of Object.entries(app.fileBlobs)) {
      if (filename === 'project.json') continue;
      if (entry.data instanceof Blob) {
        zip.file(filename, entry.data);
      }
    }

    return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
}

