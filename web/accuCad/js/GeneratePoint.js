
class GeneratePoint {
  static generate({
    clientPoint,
    domElement,
    size,
    camera,
    origin,
    planeNormal,
    indexEnabled = false,
    indexTolerance = 0.05,
    rotationMatrix,
    markerSize = 1,
  }) {
    const rect = domElement.getBoundingClientRect();

    const elementPoint = [
      (clientPoint[0] - rect.left) * (size[0] / rect.width),
      (clientPoint[1] - rect.top) * (size[1] / rect.height),
    ];

    const ndcX = (elementPoint[0] / size[0]) * 2 - 1;
    const ndcY = -(elementPoint[1] / size[1]) * 2 + 1;

    const rayOrigin = [camera.position.x, camera.position.y, camera.position.z];
    let rayDir = null;

    if (camera instanceof THREE.PerspectiveCamera) {
      const mouseWorld = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      const dir = new THREE.Vector3()
        .subVectors(mouseWorld, camera.position)
        .normalize();
      rayDir = [dir.x, dir.y, dir.z];
    } else if (camera instanceof THREE.OrthographicCamera) {
      const worldPos = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);
      const dir = new THREE.Vector3()
        .subVectors(worldPos, camera.position)
        .normalize();
      rayDir = [dir.x, dir.y, dir.z];
    }

    function intersectRayPlane(rayOrigin, rayDir, planePoint, planeNormal) {
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const denom = dot(rayDir, planeNormal);
      if (Math.abs(denom) < 1e-6) {
        return null;
      }
      const diff = subtract(planePoint, rayOrigin);
      const t = dot(diff, planeNormal) / denom;
      if (t < 0) return null;
      return [
        rayOrigin[0] + rayDir[0] * t,
        rayOrigin[1] + rayDir[1] * t,
        rayOrigin[2] + rayDir[2] * t,
      ];
    }

    const targetProjectedPoint = intersectRayPlane(
      rayOrigin,
      rayDir,
      origin,
      planeNormal
    );
    const originProjectedPoint = targetProjectedPoint;

    let indexedPoint = originProjectedPoint;
    let indexedToAxis = '';

    if (indexEnabled && originProjectedPoint) {
      const V = [
        originProjectedPoint[0] - origin[0],
        originProjectedPoint[1] - origin[1],
        originProjectedPoint[2] - origin[2],
      ];

      const X_axis = rotationMatrix[0];
      const Y_axis = rotationMatrix[1];

      const x_local = V[0] * X_axis[0] + V[1] * X_axis[1] + V[2] * X_axis[2];
      const y_local = V[0] * Y_axis[0] + V[1] * Y_axis[1] + V[2] * Y_axis[2];

      const tolerance = indexTolerance * markerSize;

      const distToX = Math.abs(y_local); // Distance from X axis is abs(y)
      const distToY = Math.abs(x_local); // Distance from Y axis is abs(x)

      // FIX: Allow dual indexing (xy) by checking both independently.
      // Previously, these were mutually exclusive (distToX < distToY), preventing
      // origin snap (where distToX approx distToY) and preventing XY return.
      if (distToX < tolerance) {
        indexedToAxis += 'x';
      }
      if (distToY < tolerance) {
        indexedToAxis += 'y';
      }

      // Calculate snap point based on what was matched
      if (indexedToAxis.includes('x') && indexedToAxis.includes('y')) {
        // Snap to Origin (Both 0)
        indexedPoint = [origin[0], origin[1], origin[2]];
      } else if (indexedToAxis === 'x') {
        // Snap to X axis (keep X, zero Y)
        indexedPoint = [
          origin[0] + x_local * X_axis[0],
          origin[1] + x_local * X_axis[1],
          origin[2] + x_local * X_axis[2],
        ];
      } else if (indexedToAxis === 'y') {
        // Snap to Y axis (keep Y, zero X)
        indexedPoint = [
          origin[0] + y_local * Y_axis[0],
          origin[1] + y_local * Y_axis[1],
          origin[2] + y_local * Y_axis[2],
        ];
      }
    }

    return {
      screenPoint: clientPoint,
      targetProjectedPoint,
      originProjectedPoint,
      indexedPoint,
      indexedToAxis,
    };
  }

}

