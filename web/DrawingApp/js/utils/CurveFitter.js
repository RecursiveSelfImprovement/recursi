class CurveFitter {
  static fit(points, maxError = 2.5, progressCallback) {
    if (!Array.isArray(points)) {
      throw new TypeError('First argument should be an array');
    }
    // Filter duplicates
    const cleanPoints = points.filter(
      (point, i) =>
        i === 0 ||
        !(point[0] === points[i - 1][0] && point[1] === points[i - 1][1])
    );

    if (cleanPoints.length < 2) {
      return [];
    }

    const len = cleanPoints.length;
    const leftTangent = this.createTangent(cleanPoints[1], cleanPoints[0]);
    const rightTangent = this.createTangent(
      cleanPoints[len - 2],
      cleanPoints[len - 1]
    );

    return this.fitCubic(
      cleanPoints,
      leftTangent,
      rightTangent,
      maxError,
      progressCallback
    );
  }

  static fitCubic(points, leftTangent, rightTangent, error, progressCallback) {
    const MaxIterations = 20;
    let bezCurve, u, uPrime, maxError, splitPoint, prevErr, prevSplit;
    let centerVector, toCenterTangent, fromCenterTangent, beziers;

    // Use heuristic if region only has 2 points
    if (points.length === 2) {
      const dist = this.vectorLen(this.subtract(points[0], points[1])) / 3.0;
      bezCurve = [
        points[0],
        this.addArrays(points[0], this.mulItems(leftTangent, dist)),
        this.addArrays(points[1], this.mulItems(rightTangent, dist)),
        points[1],
      ];
      return [bezCurve];
    }

    u = this.chordLengthParameterize(points);
    [bezCurve, maxError, splitPoint] = this.generateAndReport(
      points,
      u,
      u,
      leftTangent,
      rightTangent,
      progressCallback
    );

    if (maxError < error) {
      return [bezCurve];
    }

    // Iterate to improve fit
    if (maxError < error * error) {
      uPrime = u;
      prevErr = maxError;
      prevSplit = splitPoint;

      for (let i = 0; i < MaxIterations; i++) {
        uPrime = this.reparameterize(bezCurve, points, uPrime);
        [bezCurve, maxError, splitPoint] = this.generateAndReport(
          points,
          u,
          uPrime,
          leftTangent,
          rightTangent,
          progressCallback
        );

        if (maxError < error) {
          return [bezCurve];
        } else if (splitPoint === prevSplit) {
          let errChange = maxError / prevErr;
          if (errChange > 0.9999 && errChange < 1.0001) {
            break;
          }
        }
        prevErr = maxError;
        prevSplit = splitPoint;
      }
    }

    // Fitting failed, split point and recurse
    beziers = [];
    centerVector = this.subtract(
      points[splitPoint - 1],
      points[splitPoint + 1]
    );

    if (centerVector[0] === 0 && centerVector[1] === 0) {
      centerVector = this.subtract(
        points[splitPoint - 1],
        points[splitPoint]
      ).reverse();
      centerVector[0] = -centerVector[0];
    }

    toCenterTangent = this.normalize(centerVector);
    fromCenterTangent = this.mulItems(toCenterTangent, -1);

    beziers = beziers.concat(
      this.fitCubic(
        points.slice(0, splitPoint + 1),
        leftTangent,
        toCenterTangent,
        error,
        progressCallback
      )
    );
    beziers = beziers.concat(
      this.fitCubic(
        points.slice(splitPoint),
        fromCenterTangent,
        rightTangent,
        error,
        progressCallback
      )
    );
    return beziers;
  }

  static generateAndReport(
    points,
    paramsOrig,
    paramsPrime,
    leftTangent,
    rightTangent,
    progressCallback
  ) {
    const bezCurve = this.generateBezier(
      points,
      paramsPrime,
      leftTangent,
      rightTangent
    );
    const [maxError, splitPoint] = this.computeMaxError(
      points,
      bezCurve,
      paramsOrig
    );

    if (progressCallback) {
      progressCallback({
        bez: bezCurve,
        points: points,
        params: paramsOrig,
        maxErr: maxError,
        maxPoint: splitPoint,
      });
    }
    return [bezCurve, maxError, splitPoint];
  }

  static generateBezier(points, parameters, leftTangent, rightTangent) {
    let bezCurve, a, det_C0_C1, det_C0_X, det_X_C1, alpha_l, alpha_r;
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    bezCurve = [firstPoint, null, null, lastPoint];

    // Compute the A's
    const A = [];
    for (let i = 0; i < parameters.length; i++) {
      const u = parameters[i];
      const ux = 1 - u;
      A.push([
        this.mulItems(leftTangent, 3 * u * (ux * ux)),
        this.mulItems(rightTangent, 3 * ux * (u * u)),
      ]);
    }

    const C = [
      [0, 0],
      [0, 0],
    ];
    const X = [0, 0];

    for (let i = 0; i < points.length; i++) {
      const u = parameters[i];
      const aArr = A[i];

      C[0][0] += this.dot(aArr[0], aArr[0]);
      C[0][1] += this.dot(aArr[0], aArr[1]);
      C[1][0] += this.dot(aArr[0], aArr[1]);
      C[1][1] += this.dot(aArr[1], aArr[1]);

      const tmp = this.subtract(
        points[i],
        this.bezier_q([firstPoint, firstPoint, lastPoint, lastPoint], u)
      );

      X[0] += this.dot(aArr[0], tmp);
      X[1] += this.dot(aArr[1], tmp);
    }

    det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
    det_C0_X = C[0][0] * X[1] - C[1][0] * X[0];
    det_X_C1 = X[0] * C[1][1] - X[1] * C[0][1];

    alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
    alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;

    const segLength = this.vectorLen(this.subtract(firstPoint, lastPoint));
    const epsilon = 1.0e-6 * segLength;

    if (alpha_l < epsilon || alpha_r < epsilon) {
      bezCurve[1] = this.addArrays(
        firstPoint,
        this.mulItems(leftTangent, segLength / 3.0)
      );
      bezCurve[2] = this.addArrays(
        lastPoint,
        this.mulItems(rightTangent, segLength / 3.0)
      );
    } else {
      bezCurve[1] = this.addArrays(
        firstPoint,
        this.mulItems(leftTangent, alpha_l)
      );
      bezCurve[2] = this.addArrays(
        lastPoint,
        this.mulItems(rightTangent, alpha_r)
      );
    }

    return bezCurve;
  }

  static reparameterize(bezier, points, parameters) {
    return parameters.map((p, i) =>
      this.newtonRaphsonRootFind(bezier, points[i], p)
    );
  }

  static newtonRaphsonRootFind(bez, point, u) {
    const d = this.subtract(this.bezier_q(bez, u), point);
    const qprime = this.bezier_qprime(bez, u);
    const numerator = this.mulMatrix(d, qprime);
    const denominator =
      this.sum(this.squareItems(qprime)) +
      2 * this.mulMatrix(d, this.bezier_qprimeprime(bez, u));

    if (denominator === 0) return u;
    return u - numerator / denominator;
  }

  static chordLengthParameterize(points) {
    let u = [];
    let currU, prevU, prevP;

    points.forEach((p, i) => {
      currU = i ? prevU + this.vectorLen(this.subtract(p, prevP)) : 0;
      u.push(currU);
      prevU = currU;
      prevP = p;
    });
    return u.map((x) => x / prevU);
  }

  static computeMaxError(points, bez, parameters) {
    let dist,
      maxDist = 0,
      splitPoint = points.length / 2;
    const t_distMap = this.mapTtoRelativeDistances(bez, 10);

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const t = this.find_t(bez, parameters[i], t_distMap, 10);
      const v = this.subtract(this.bezier_q(bez, t), point);
      dist = v[0] * v[0] + v[1] * v[1];

      if (dist > maxDist) {
        maxDist = dist;
        splitPoint = i;
      }
    }
    return [maxDist, splitPoint];
  }

  static mapTtoRelativeDistances(bez, B_parts) {
    let B_t_curr;
    let B_t_dist = [0];
    let B_t_prev = bez[0];
    let sumLen = 0;

    for (let i = 1; i <= B_parts; i++) {
      B_t_curr = this.bezier_q(bez, i / B_parts);
      sumLen += this.vectorLen(this.subtract(B_t_curr, B_t_prev));
      B_t_dist.push(sumLen);
      B_t_prev = B_t_curr;
    }
    return B_t_dist.map((x) => x / sumLen);
  }

  static find_t(bez, param, t_distMap, B_parts) {
    if (param < 0) return 0;
    if (param > 1) return 1;

    for (let i = 1; i <= B_parts; i++) {
      if (param <= t_distMap[i]) {
        const tMin = (i - 1) / B_parts;
        const tMax = i / B_parts;
        const lenMin = t_distMap[i - 1];
        const lenMax = t_distMap[i];
        return ((param - lenMin) / (lenMax - lenMin)) * (tMax - tMin) + tMin;
      }
    }
    return 0;
  }

  static createTangent(pointA, pointB) {
    return this.normalize(this.subtract(pointA, pointB));
  }

  // --- Math Helpers ---

  static mulItems(items, multiplier) {
    return [items[0] * multiplier, items[1] * multiplier];
  }
  static mulMatrix(m1, m2) {
    return m1[0] * m2[0] + m1[1] * m2[1];
  }
  static subtract(arr1, arr2) {
    return [arr1[0] - arr2[0], arr1[1] - arr2[1]];
  }
  static addArrays(arr1, arr2) {
    return [arr1[0] + arr2[0], arr1[1] + arr2[1]];
  }
  static sum(items) {
    return items.reduce((sum, x) => sum + x);
  }
  static dot(m1, m2) {
    return this.mulMatrix(m1, m2);
  }
  static vectorLen(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  }
  static squareItems(items) {
    return [items[0] * items[0], items[1] * items[1]];
  }
  static normalize(v) {
    const len = this.vectorLen(v);
    if (len === 0) return [0, 0];
    return [v[0] / len, v[1] / len];
  }

  // --- Bezier Helpers ---

  static bezier_q(ctrlPoly, t) {
    const tx = 1.0 - t;
    const pA = this.mulItems(ctrlPoly[0], tx * tx * tx);
    const pB = this.mulItems(ctrlPoly[1], 3 * tx * tx * t);
    const pC = this.mulItems(ctrlPoly[2], 3 * tx * t * t);
    const pD = this.mulItems(ctrlPoly[3], t * t * t);
    return this.addArrays(this.addArrays(pA, pB), this.addArrays(pC, pD));
  }

  static bezier_qprime(ctrlPoly, t) {
    const tx = 1.0 - t;
    const pA = this.mulItems(
      this.subtract(ctrlPoly[1], ctrlPoly[0]),
      3 * tx * tx
    );
    const pB = this.mulItems(
      this.subtract(ctrlPoly[2], ctrlPoly[1]),
      6 * tx * t
    );
    const pC = this.mulItems(
      this.subtract(ctrlPoly[3], ctrlPoly[2]),
      3 * t * t
    );
    return this.addArrays(this.addArrays(pA, pB), pC);
  }

  static bezier_qprimeprime(ctrlPoly, t) {
    return this.addArrays(
      this.mulItems(
        this.addArrays(
          this.subtract(ctrlPoly[2], this.mulItems(ctrlPoly[1], 2)),
          ctrlPoly[0]
        ),
        6 * (1.0 - t)
      ),
      this.mulItems(
        this.addArrays(
          this.subtract(ctrlPoly[3], this.mulItems(ctrlPoly[2], 2)),
          ctrlPoly[1]
        ),
        6 * t
      )
    );
  }

}

