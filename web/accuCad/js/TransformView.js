
class TransformView {
  static async transform(transformObj, threeDView) {
    console.log('    [TransformView] transform() received:', transformObj);
    const view = threeDView || window.threeDView;
    if (!view) {
      console.error('transform: threeDView is not available.');
      return;
    }

    const camera = view.camera;
    const currentFov = camera.fov;
    const originalEnvRotation = view.envRotation || 0;
    let newEnvRotation = originalEnvRotation;
    const camPos = camera.position.clone();
    const targetPos = view.target.clone();
    const dx = camPos.x - targetPos.x;
    const dy = camPos.y - targetPos.y;
    const dz = camPos.z - targetPos.z;
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let direction = new THREE.Vector3(
      dx / distance,
      dy / distance,
      dz / distance
    );
    let newCamPos = camPos.clone();
    let newTargetPos = targetPos.clone();
    let newFov = currentFov;

    if (transformObj.dfov && transformObj.dfov !== 0) {
      newFov = currentFov + transformObj.dfov;
      newFov = Math.max(1, Math.min(140, newFov));
      const currentFovRadians = THREE.MathUtils.degToRad(currentFov);
      const newFovRadians = THREE.MathUtils.degToRad(newFov);
      const scalingFactor =
        Math.tan(currentFovRadians / 2) / Math.tan(newFovRadians / 2);
      const newDistance = distance * scalingFactor;
      newCamPos.x = targetPos.x + direction.x * newDistance;
      newCamPos.y = targetPos.y + direction.y * newDistance;
      newCamPos.z = targetPos.z + direction.z * newDistance;
      const ndx = newCamPos.x - targetPos.x;
      const ndy = newCamPos.y - targetPos.y;
      const ndz = newCamPos.z - targetPos.z;
      distance = Math.sqrt(ndx * ndx + ndy * ndy + ndz * ndz);
      direction.set(ndx / distance, ndy / distance, ndz / distance);
    }

    const finalFovRadians = THREE.MathUtils.degToRad(newFov);
    let diag = 2 * distance * Math.tan(finalFovRadians / 2);
    if (transformObj.ddiag && transformObj.ddiag !== 0) {
      const dd = transformObj.ddiag;
      let factor = dd > 0 ? 1 + dd / 100 : 1 / (1 + -dd / 100);
      const newDiag = diag * factor;
      const newDistance = newDiag / (2 * Math.tan(finalFovRadians / 2));
      newCamPos.x = targetPos.x + direction.x * newDistance;
      newCamPos.y = targetPos.y + direction.y * newDistance;
      newCamPos.z = targetPos.z + direction.z * newDistance;
      distance = newDistance;
      diag = newDiag;
    }
    if (transformObj.dx || transformObj.dy || transformObj.dz) {
      const adjX = ((transformObj.dx || 0) / 300) * distance;
      const adjY = ((transformObj.dy || 0) / 300) * distance;
      const adjZ = ((transformObj.dz || 0) / 300) * distance;
      newCamPos.x += adjX;
      newCamPos.y += adjY;
      newCamPos.z += adjZ;
      newTargetPos.x += adjX;
      newTargetPos.y += adjY;
      newTargetPos.z += adjZ;
    }
    if (
      (transformObj.spin && transformObj.spin !== 0) ||
      (transformObj.tilt && transformObj.tilt !== 0)
    ) {
      const deltaSpin = (((transformObj.spin || 0) / 5) * Math.PI) / 180;
      const deltaTilt = (((transformObj.tilt || 0) / 5) * Math.PI) / 180;
      let vecX = newCamPos.x - newTargetPos.x;
      let vecY = newCamPos.y - newTargetPos.y;
      let vecZ = newCamPos.z - newTargetPos.z;
      const r = Math.sqrt(vecX * vecX + vecY * vecY + vecZ * vecZ);
      let theta = Math.acos(vecY / r);
      let phi = Math.atan2(vecZ, vecX);
      theta += deltaTilt;
      phi += deltaSpin;
      theta = Math.max(0, Math.min(Math.PI, theta));
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      vecX = r * sinTheta * cosPhi;
      vecY = r * cosTheta;
      vecZ = r * sinTheta * sinPhi;
      newCamPos.set(
        newTargetPos.x + vecX,
        newTargetPos.y + vecY,
        newTargetPos.z + vecZ
      );
    }

    camera.fov = newFov;
    camera.updateProjectionMatrix();
    camera.position.copy(newCamPos);
    view.target.copy(newTargetPos);
    camera.lookAt(newTargetPos);
    if (transformObj.denvRot && transformObj.denvRot !== 0) {
      newEnvRotation = originalEnvRotation + transformObj.denvRot;
      view.envRotation = newEnvRotation;
    }

    const fCamPos = camera.position.clone();
    const fTargetPos = view.target.clone();
    const fdx = fCamPos.x - fTargetPos.x;
    const fdy = fCamPos.y - fTargetPos.y;
    const fdz = fCamPos.z - fTargetPos.z;
    const fr = Math.sqrt(fdx * fdx + fdy * fdy + fdz * fdz);
    let thetaFinal = Math.acos(fdy / fr);
    let phiFinal = Math.atan2(fdz, fdx);
    let tiltDegrees = THREE.MathUtils.radToDeg(thetaFinal);
    let spinDegrees = THREE.MathUtils.radToDeg(phiFinal);
    const finalFov = camera.fov;
    const finalDiag = 2 * fr * Math.tan(THREE.MathUtils.degToRad(finalFov));

    return {
      spin: Math.round(spinDegrees * 100) / 100,
      tilt: Math.round(tiltDegrees * 100) / 100,
      fov: Math.round(finalFov * 100) / 100,
      targetX: Math.round(fTargetPos.x * 100) / 100,
      targetY: Math.round(fTargetPos.y * 100) / 100,
      targetZ: Math.round(fTargetPos.z * 100) / 100,
      diag: Math.round(finalDiag * 100) / 100,
      envRotation: Math.round(newEnvRotation * 100) / 100,
    };
  }

  static animateTransformToPoint(newTargetArray, durationSeconds, threeDView) {
    const view = threeDView || window.threeDView;
    if (!view) return;
    if (!Array.isArray(newTargetArray) || newTargetArray.length !== 3) {
      console.error(
        'newTargetArray must be an array of three numbers [x, y, z]'
      );
      return;
    }
    const startTime = performance.now();
    const initialTarget = view.target.clone();
    const finalTarget = new THREE.Vector3(
      newTargetArray[0],
      newTargetArray[1],
      newTargetArray[2]
    );
    let lastDesiredTarget = initialTarget.clone();
    const step = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      let t = elapsed / durationSeconds;
      if (t > 1) t = 1;
      const desiredTarget = new THREE.Vector3().lerpVectors(
        initialTarget,
        finalTarget,
        t
      );
      const delta = desiredTarget.clone().sub(lastDesiredTarget);
      lastDesiredTarget.copy(desiredTarget);
      const camera = view.camera;
      const currentTarget = view.target.clone();
      const distance = camera.position.distanceTo(currentTarget) || 1;
      const adjustments = {
        dx: (delta.x * 300) / distance,
        dy: (delta.y * 300) / distance,
        dz: (delta.z * 300) / distance,
      };
      TransformView.transform(adjustments, view)
        .then((finalValues) => {
          if (window.tableDialog) {
            // This is another global to tackle later
            window.tableDialog.updateValues({
              target: [
                finalValues.targetX,
                finalValues.targetY,
                finalValues.targetZ,
              ],
              spin: finalValues.spin,
              tilt: finalValues.tilt,
              perspective: finalValues.fov,
              diagonal: finalValues.diag,
              lights: finalValues.envRotation,
            });
          }
        })
        .catch((err) => console.error(err));
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }

  static setViewDepth(newPoint, threeDView) {
    const view = threeDView || window.threeDView;
    if (!view) return;
    if (
      !Array.isArray(newPoint) ||
      newPoint.length !== 3 ||
      !newPoint.every((n) => typeof n === 'number' && isFinite(n))
    ) {
      console.error(
        'setViewDepth: newPoint must be an array of 3 finite numbers'
      );
      return;
    }
    const camera = view.camera;
    const camPos = [camera.position.x, camera.position.y, camera.position.z];
    const currentTarget = [view.target.x, view.target.y, view.target.z];
    const viewDir = GeometryUtils3D.makeUnitVector(currentTarget, camPos);
    if (!viewDir) {
      console.error(
        'setViewDepth: Camera and target coincide, no valid direction'
      );
      return;
    }
    const vecToNewPoint = GeometryUtils3D.makeVector(newPoint, camPos);
    const dot = GeometryUtils3D.dotProduct(vecToNewPoint, viewDir);
    if (dot <= 0) return;
    const distanceAlongView = dot;
    const newTarget = GeometryUtils3D.projectPoint(
      camPos,
      viewDir,
      distanceAlongView
    );
    view.target.set(newTarget[0], newTarget[1], newTarget[2]);
    camera.lookAt(view.target);
  }

}

