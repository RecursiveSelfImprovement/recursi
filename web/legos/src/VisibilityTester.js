
class VisibilityTester {
  constructor({ scene, raycaster = null }) {
    this.scene = scene;
    this.raycaster = raycaster || new THREE.Raycaster();

    this.testDirs = [
      new THREE.Vector3( 1,  0.35,  0).normalize(),
      new THREE.Vector3(-1,  0.35,  0).normalize(),
      new THREE.Vector3( 0,  0.35,  1).normalize(),
      new THREE.Vector3( 0,  0.35, -1).normalize(),
      new THREE.Vector3( 1,  0.35,  1).normalize(),
      new THREE.Vector3(-1,  0.35,  1).normalize(),
      new THREE.Vector3( 1,  0.35, -1).normalize(),
      new THREE.Vector3(-1,  0.35, -1).normalize()
    ];
  } 

  pieceIsVisibleEnough(meshGroup, threshold = 0.25, samplesPerDir = 6) {
    const bbox = new THREE.Box3().setFromObject(meshGroup);
    const pts = this._sampleBox(bbox, samplesPerDir);

    let visibleCount = 0;
    const total = this.testDirs.length * pts.length;

    for (const dir of this.testDirs) {
      for (const p of pts) {
        const origin = p.clone().addScaledVector(dir, 500); // far away
        const rayDir = dir.clone().multiplyScalar(-1);
        this.raycaster.set(origin, rayDir);
        const hits = this.raycaster.intersectObject(meshGroup, true);
        if (hits.length > 0) {
          visibleCount++;
        }
      }
    }

    return (visibleCount / total) >= threshold;
  }

  _sampleBox(box, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const rx = Math.random();
      const ry = Math.random();
      const rz = Math.random();
      pts.push(new THREE.Vector3(
        THREE.MathUtils.lerp(box.min.x, box.max.x, rx),
        THREE.MathUtils.lerp(box.min.y, box.max.y, ry),
        THREE.MathUtils.lerp(box.min.z, box.max.z, rz)
      ));
    }
    return pts;
  }

}
