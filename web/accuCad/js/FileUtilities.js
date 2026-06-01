
class FileUtilities {
  static saveToFile(elements, filename = 'scene.json') {
    const filtered = elements.filter(
      (el) => el.type === 'path' || el.type === 'capsule'
    );
    const json = JSON.stringify(
      filtered.map((el) => el.toJSON()),
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  static loadFromFile(baseController) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function (event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (e) {
        const jsonString = e.target.result;
        const data = JSON.parse(jsonString);
        const elements = data
          .map((item) => {
            if (item.type === 'path') return PathElement.fromJSON(item);
            if (item.type === 'capsule') return CapsuleElement.fromJSON(item);
            return null;
          })
          .filter((el) => el !== null);

        elements.forEach((el) => {
          baseController.cadElements.push(el);
          if (el.type === 'path') {
            const cmd = new DrawPathCommand(baseController);
            cmd.tempElement = el;
            cmd.updatePermanentGeometry();
          } else if (el.type === 'capsule') {
            const cmd = new DrawCapsuleCommand(baseController);
            cmd.tempElement = el;
            cmd.finalizeCapsule();
          }
        });
        console.log('Loaded elements:', elements);
      };
      reader.readAsText(file);
    };
    input.click();
  }

}

