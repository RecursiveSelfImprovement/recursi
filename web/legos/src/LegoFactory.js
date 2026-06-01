class LegoFactory {
  _getMaterial() {
    if (!this._legoMaterial) {
      this._legoMaterial = new THREE.MeshPhysicalMaterial({
        metalness: 0,
        roughness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1,
      });
    }
    return this._legoMaterial;
  }

  constructor() {
    this.STUD_DIAMETER = 4.8;
    this.STUD_HEIGHT = 1.6;
    this.STUD_SPACING = 8.0; // The core grid unit
    this.PLATE_THICKNESS = 3.2;
    this.BRICK_HEIGHT = 9.6;

    this.studGeometry = new THREE.CylinderGeometry(
      this.STUD_DIAMETER / 2, // radiusTop
      this.STUD_DIAMETER / 2, // radiusBottom
      this.STUD_HEIGHT, // height
      16 // radialSegments
    );
  }

  createLego(studWidth, studLength, isPlate = false) {
    const bodyWidth = studWidth * this.STUD_SPACING;
    const bodyLength = studLength * this.STUD_SPACING;
    const bodyHeight = isPlate ? this.PLATE_THICKNESS : this.BRICK_HEIGHT;

    const material = this._getMaterial().clone();

    const bodyGeometry = new THREE.BoxGeometry(
      bodyWidth,
      bodyHeight,
      bodyLength
    );
    bodyGeometry.translate(0, bodyHeight / 2, 0);
    const bodyMesh = new THREE.Mesh(bodyGeometry, material);

    const legoPiece = new THREE.Group();
    legoPiece.add(bodyMesh);

    // --- Add Studs on Top ---
    const startX = -(bodyWidth / 2) + this.STUD_SPACING / 2;
    const startZ = -(bodyLength / 2) + this.STUD_SPACING / 2;

    for (let w = 0; w < studWidth; w++) {
      for (let l = 0; l < studLength; l++) {
        // We can reuse the same stud geometry instance
        const studMesh = new THREE.Mesh(this.studGeometry, material);
        // Position the stud relative to the group's origin (0,0,0)
        studMesh.position.set(
          startX + w * this.STUD_SPACING,
          bodyHeight + this.STUD_HEIGHT / 2,
          startZ + l * this.STUD_SPACING
        );
        legoPiece.add(studMesh);
      }
    }

    // Store some metadata on the object for later use
    legoPiece.userData.isLegoBrick = true;
    legoPiece.userData.dimensions = {
      studWidth,
      studLength,
      isPlate,
      totalHeight: bodyHeight + this.STUD_HEIGHT,
    };

    // The entire group's origin is at the center of its base plane.
    return legoPiece;
  }

}