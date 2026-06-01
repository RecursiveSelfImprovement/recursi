
class ControllerSetup {
  static initializeController(baseController, scene) {
    baseController.registerCommand(
      'rectangle',
      new DrawRectangleCommand(baseController)
    );
    baseController.registerCommand('arc', new DrawArcCommand(baseController));
    baseController.registerCommand('path', new DrawPathCommand(baseController));
    baseController.registerCommand(
      'curve',
      new DrawCurveCommand(baseController)
    );
    baseController.registerCommand(
      'circle',
      new DrawCircleCommand(baseController)
    );
    baseController.registerCommand(
      'capsule',
      new DrawCapsuleCommand(baseController)
    );
    baseController.registerCommand(
      'blackkey',
      new DrawBlackKeyCommand(baseController)
    );
    baseController.registerCommand(
      'select',
      new ElementPickCommand(baseController)
    );

    baseController.setCommandByName('rectangle');
    baseController.setColor('#00ff00');
    baseController.setLineWidth(2);

    baseController.setDrawingPlane('top');

    baseController.accuDraw = new AccuDraw(baseController.view, {
      squircleAmount: 0.3,
      center: [0, 0, 0],
      color: 0x88ccff,
      size: 0.7,
      cameraOffset: 0.01,
    });
    scene.add(baseController.accuDraw.getObject3D());
    baseController.setDrawingPlane('top');
  }

}

