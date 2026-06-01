
class UpdateControlPoints {
  static run(vertices, iterations) {
    if (!vertices || vertices.length === 0) {
      return;
    }
    if (vertices.length === 1) {
      vertices[0].controlPoints = [
        vertices[0].point.slice(),
        vertices[0].point.slice(),
      ];
      return;
    }

    const gu = GeometryUtils;

    for (const v of vertices) {
      v.controlPoints = [v.point.slice(), v.point.slice()];
    }

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < vertices.length; i++) {
        const vertex = vertices[i];
        const prevVertex = vertices[i - 1];
        const nextVertex = vertices[i + 1];

        let tangent;

        if (vertex.tangents[1]) {
          tangent = vertex.tangents[1];
        } else if (prevVertex && nextVertex) {
          const toNext = gu.makeUnitVector(
            nextVertex.controlPoints[0],
            vertex.point
          );
          const fromPrev = gu.makeUnitVector(
            vertex.point,
            prevVertex.controlPoints[1]
          );
          tangent = gu.normalize(gu.addVectors(toNext, fromPrev));
        } else if (nextVertex) {
          tangent = gu.makeUnitVector(
            nextVertex.controlPoints[0],
            vertex.point
          );
        } else if (prevVertex) {
          tangent = gu.makeUnitVector(
            vertex.point,
            prevVertex.controlPoints[1]
          );
        }

        if (!tangent) continue;

        // --- NEW: Apply tangent angle offset ---
        if (vertex.tangentAngleOffset) {
          tangent = gu.rotateVector(tangent, vertex.tangentAngleOffset);
        }
        // --- END NEW ---

        const balance = vertex.balance || 1;
        const curvature = vertex.curvature || 1;
        const reversedTangent = [-tangent[0], -tangent[1], -tangent[2] || 0];

        if (nextVertex) {
          const dist = gu.getDistance(vertex.point, nextVertex.point);
          const scale = (dist / 3) * curvature * (2 - balance);
          vertex.controlPoints[1] = gu.projectPoint(
            vertex.point,
            tangent,
            scale
          );
        } else {
          vertex.controlPoints[1] = vertex.point.slice();
        }

        if (prevVertex) {
          const dist = gu.getDistance(vertex.point, prevVertex.point);
          const scale = (dist / 3) * curvature * balance;
          vertex.controlPoints[0] = gu.projectPoint(
            vertex.point,
            reversedTangent,
            scale
          );
        } else {
          vertex.controlPoints[0] = vertex.point.slice();
        }
      }
    }
  }

}

