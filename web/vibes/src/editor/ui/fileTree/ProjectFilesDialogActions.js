class ProjectFilesDialogActions {

  constructor(options = {}) {
    this.manager = options.manager || null;
  }

  showInputDialog(
    manager = this.manager,
    title,
    message,
    defaultValue,
    onConfirm
  ) {
    if (!manager) {
      return null;
    }

    const input = makeElement("input", {
      type: "text",
      value: defaultValue,
      style: {
        width: "100%",
        marginTop: "10px",
        padding: "8px",
        backgroundColor: "var(--bg-input, #3c3c3c)",
        color: "var(--text-primary, #fff)",
        border: "1px solid var(--border-color, #555)",
        borderRadius: "3px"
      },
      onkeydown: (event) => {
        if (event.key === "Enter") {
          onConfirm(input.value);
          manager._activeDialog.close();
        }
      }
    });

    setTimeout(() => {
      input.focus();

      const lastDot = String(defaultValue || "").lastIndexOf(".");
      const lastSlash = String(defaultValue || "").lastIndexOf("/");

      if (lastDot > lastSlash) {
        input.setSelectionRange(lastSlash + 1, lastDot);
      } else {
        input.select();
      }
    }, 50);

    const content = makeElement("div", {}, [
      makeElement("p", { style: { marginBottom: "5px" } }, message),
      input
    ]);

    manager._activeDialog = UITools.makeDialog({
      title,
      content,
      width: "400px",
      buttons: [
        { label: "Cancel" },
        {
          label: "OK",
          className: "primary",
          onClick: () => {
            onConfirm(input.value);
          }
        }
      ]
    });

    return manager._activeDialog;
  }

  handleDelete(manager = this.manager, node) {
    if (!manager || !node) {
      return false;
    }

    const isDir = node.type === "directory";
    const warning = isDir
      ? `Are you sure you want to delete the folder "${node.name}" and ALL its contents?`
      : `Are you sure you want to delete "${node.name}"?`;

    UITools.makeDialog({
      title: isDir ? "Delete Folder" : "Delete File",
      content: makeElement("div", {}, [
        makeElement("p", {}, warning),
        makeElement(
          "p",
          {
            style: {
              color: "#f48771",
              fontSize: "0.9em",
              marginTop: "10px"
            }
          },
          "This action cannot be undone."
        )
      ]),
      buttons: [
        { label: "Cancel" },
        {
          label: "Delete",
          className: "danger",
          onClick: () => {
            manager.app.commands
              .deleteFile({ path: node.id, skipConfirm: true })
              .then(() => {
                manager.removeNode(node.id);
              })
              .catch((error) => {
                manager.app.uiManager.setStatus(
                  `Error deleting: ${error.message}`,
                  true
                );
              });
          }
        }
      ]
    });

    return true;
  }

}