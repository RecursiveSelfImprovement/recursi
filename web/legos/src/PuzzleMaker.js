
class PuzzleMaker {

  constructor({ structureBuilder, scene }) {
    this.builder = structureBuilder;
    this.scene   = scene;
    this.mapAtoB = new Map(); // idA -> idB
    this.differences = [];    // {type, a:idA, b:idB, info}
    this.groupA = new THREE.Group();
    this.groupB = new THREE.Group();
    this.scene.add(this.groupA);
    this.scene.add(this.groupB);
  } //----- end constructor

  //------ cloneRotateSplit
  cloneRotateSplit(angleDeg = 90, offsetStuds = 40, studSpacing = 8) {
    // Move existing bricks to groupA
    this.builder.bricks.forEach(rec => {
      this.groupA.add(rec.mesh);
    });

    // Deep clone to B
    const angleRad = angleDeg * Math.PI / 180;
    this.builder.bricks.forEach(rec => {
      const clone = rec.mesh.clone(true);
      this.groupB.add(clone);
      clone.position.applyAxisAngle(new THREE.Vector3(0,1,0), angleRad);
      clone.position.x += offsetStuds * studSpacing;
      const idB = rec.id + 100000; // crude unique
      this.mapAtoB.set(rec.id, idB);
    });
  } //----- end cloneRotateSplit

  //------ chooseDifferences
  chooseDifferences(count = 1) {
    // TODO: implement real picking logic
    this.differences.length = 0;
  }

} //----- end class PuzzleMaker

