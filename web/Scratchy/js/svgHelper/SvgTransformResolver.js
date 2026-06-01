class SvgTransformResolver {
  static resolveAllTransforms(svgElement) {
    const clone = svgElement.cloneNode(true);
    SvgTransformResolver._processNode(clone, [1, 0, 0, 1, 0, 0]);
    return clone;
  }

  static _processNode(node, parentMatrix) {
    if (node.nodeType !== 1) return;
    let localMatrix = SvgTransformResolver._getTransformMatrix(node);
    let combined = SvgTransformResolver._multiplyMatrices(
      parentMatrix,
      localMatrix
    );

    if (node.hasAttribute('transform')) {
      node.removeAttribute('transform');
    }

    const tag = node.tagName ? node.tagName.toLowerCase() : '';

    if (tag === 'path') {
      SvgTransformResolver._transformPath(node, combined);
      combined = [1, 0, 0, 1, 0, 0];
    } else if (tag === 'rect') {
      SvgTransformResolver._transformRect(node, combined);
      combined = [1, 0, 0, 1, 0, 0];
    } else if (tag === 'circle') {
      SvgTransformResolver._transformCircle(node, combined);
      combined = [1, 0, 0, 1, 0, 0];
    } else if (tag === 'ellipse') {
      SvgTransformResolver._transformEllipse(node, combined);
      combined = [1, 0, 0, 1, 0, 0];
    } else if (tag === 'line') {
      SvgTransformResolver._transformLine(node, combined);
      combined = [1, 0, 0, 1, 0, 0];
    } else if (tag === 'polyline' || tag === 'polygon') {
      SvgTransformResolver._transformPoly(node, combined);
      combined = [1, 0, 0, 1, 0, 0];
    }

    for (const child of Array.from(node.childNodes)) {
      SvgTransformResolver._processNode(child, combined);
    }
  }

  static _applyMatrixToPoint(m, x, y) {
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  }

  static _multiplyMatrices(a, b) {
    return [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5],
    ];
  }

  static _getTransformMatrix(el) {
    const t = el.getAttribute('transform');
    if (!t) return [1, 0, 0, 1, 0, 0];
    let result = [1, 0, 0, 1, 0, 0];
    const regex = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(t)) !== null) {
      const type = match[1];
      const vals = match[2].split(/[\s,]+/).map(Number);
      let m = [1, 0, 0, 1, 0, 0];
      if (type === 'matrix' && vals.length >= 6) {
        m = vals.slice(0, 6);
      } else if (type === 'translate') {
        m = [1, 0, 0, 1, vals[0] || 0, vals[1] || 0];
      } else if (type === 'scale') {
        const sx = vals[0] || 1;
        const sy = vals.length > 1 ? vals[1] : sx;
        m = [sx, 0, 0, sy, 0, 0];
      } else if (type === 'rotate') {
        const a = ((vals[0] || 0) * Math.PI) / 180;
        const cx = vals[1] || 0;
        const cy = vals[2] || 0;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        if (cx || cy) {
          m = SvgTransformResolver._multiplyMatrices(
            [1, 0, 0, 1, cx, cy],
            SvgTransformResolver._multiplyMatrices(
              [cos, sin, -sin, cos, 0, 0],
              [1, 0, 0, 1, -cx, -cy]
            )
          );
        } else {
          m = [cos, sin, -sin, cos, 0, 0];
        }
      } else if (type === 'skewX') {
        const a = Math.tan(((vals[0] || 0) * Math.PI) / 180);
        m = [1, 0, a, 1, 0, 0];
      } else if (type === 'skewY') {
        const a = Math.tan(((vals[0] || 0) * Math.PI) / 180);
        m = [1, a, 0, 1, 0, 0];
      }
      result = SvgTransformResolver._multiplyMatrices(result, m);
    }
    return result;
  }

  static _transformPath(el, matrix) {
    const d = el.getAttribute('d');
    if (!d) return;
    const parsed = SvgTransformResolver.parsePathToAbsolute(d);
    for (const seg of parsed) {
      SvgTransformResolver._transformSegment(seg, matrix);
    }
    el.setAttribute('d', SvgTransformResolver.serializePath(parsed));
  }

  static _transformSegment(seg, m) {
    const t = seg.type;
    if (t === 'M' || t === 'L' || t === 'T') {
      const p = SvgTransformResolver._applyMatrixToPoint(m, seg.x, seg.y);
      seg.x = p[0];
      seg.y = p[1];
    } else if (t === 'C') {
      const p1 = SvgTransformResolver._applyMatrixToPoint(m, seg.x1, seg.y1);
      const p2 = SvgTransformResolver._applyMatrixToPoint(m, seg.x2, seg.y2);
      const p = SvgTransformResolver._applyMatrixToPoint(m, seg.x, seg.y);
      seg.x1 = p1[0];
      seg.y1 = p1[1];
      seg.x2 = p2[0];
      seg.y2 = p2[1];
      seg.x = p[0];
      seg.y = p[1];
    } else if (t === 'S') {
      const p2 = SvgTransformResolver._applyMatrixToPoint(m, seg.x2, seg.y2);
      const p = SvgTransformResolver._applyMatrixToPoint(m, seg.x, seg.y);
      seg.x2 = p2[0];
      seg.y2 = p2[1];
      seg.x = p[0];
      seg.y = p[1];
    } else if (t === 'Q') {
      const p1 = SvgTransformResolver._applyMatrixToPoint(m, seg.x1, seg.y1);
      const p = SvgTransformResolver._applyMatrixToPoint(m, seg.x, seg.y);
      seg.x1 = p1[0];
      seg.y1 = p1[1];
      seg.x = p[0];
      seg.y = p[1];
    } else if (t === 'A') {
      const p = SvgTransformResolver._applyMatrixToPoint(m, seg.x, seg.y);
      const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
      const sy = Math.sqrt(m[2] * m[2] + m[3] * m[3]);
      seg.rx *= sx;
      seg.ry *= sy;
      seg.x = p[0];
      seg.y = p[1];
    } else if (t === 'H') {
      const p = SvgTransformResolver._applyMatrixToPoint(m, seg.x, 0);
      seg.x = p[0];
    } else if (t === 'V') {
      const p = SvgTransformResolver._applyMatrixToPoint(m, 0, seg.y);
      seg.y = p[1];
    }
  }

  static parsePathToAbsolute(d) {
    const result = [];
    const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
    if (!commands) return result;
    let cx = 0,
      cy = 0;
    let mx = 0,
      my = 0;

    for (const cmd of commands) {
      const type = cmd[0];
      const nums = (
        cmd.substring(1).match(/-?[\d]*\.?\d+(?:[eE][-+]?\d+)?/g) || []
      ).map(Number);
      const isRel = type === type.toLowerCase();
      const T = type.toUpperCase();

      if (T === 'Z') {
        result.push({ type: 'Z' });
        cx = mx;
        cy = my;
        continue;
      }

      let i = 0;
      do {
        if (T === 'M') {
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          if (result.length === 0 || i === 2) {
            result.push({ type: 'M', x, y });
            mx = x;
            my = y;
          } else {
            result.push({ type: 'L', x, y });
          }
          cx = x;
          cy = y;
        } else if (T === 'L') {
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'L', x, y });
          cx = x;
          cy = y;
        } else if (T === 'H') {
          const x = nums[i++] + (isRel ? cx : 0);
          result.push({ type: 'L', x, y: cy });
          cx = x;
        } else if (T === 'V') {
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'L', x: cx, y });
          cy = y;
        } else if (T === 'C') {
          const x1 = nums[i++] + (isRel ? cx : 0);
          const y1 = nums[i++] + (isRel ? cy : 0);
          const x2 = nums[i++] + (isRel ? cx : 0);
          const y2 = nums[i++] + (isRel ? cy : 0);
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'C', x1, y1, x2, y2, x, y });
          cx = x;
          cy = y;
        } else if (T === 'S') {
          const x2 = nums[i++] + (isRel ? cx : 0);
          const y2 = nums[i++] + (isRel ? cy : 0);
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'S', x2, y2, x, y });
          cx = x;
          cy = y;
        } else if (T === 'Q') {
          const x1 = nums[i++] + (isRel ? cx : 0);
          const y1 = nums[i++] + (isRel ? cy : 0);
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'Q', x1, y1, x, y });
          cx = x;
          cy = y;
        } else if (T === 'T') {
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'T', x, y });
          cx = x;
          cy = y;
        } else if (T === 'A') {
          const rx = nums[i++];
          const ry = nums[i++];
          const rotation = nums[i++];
          const largeArc = nums[i++];
          const sweep = nums[i++];
          const x = nums[i++] + (isRel ? cx : 0);
          const y = nums[i++] + (isRel ? cy : 0);
          result.push({ type: 'A', rx, ry, rotation, largeArc, sweep, x, y });
          cx = x;
          cy = y;
        } else {
          break;
        }
      } while (i < nums.length);
    }
    return result;
  }

  static serializePath(segments, precision = 4) {
    const r = (v) => {
      const rounded =
        Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision);
      return String(rounded);
    };
    return segments
      .map((s) => {
        switch (s.type) {
          case 'M':
            return `M${r(s.x)} ${r(s.y)}`;
          case 'L':
            return `L${r(s.x)} ${r(s.y)}`;
          case 'C':
            return `C${r(s.x1)} ${r(s.y1)} ${r(s.x2)} ${r(s.y2)} ${r(s.x)} ${r(
              s.y
            )}`;
          case 'S':
            return `S${r(s.x2)} ${r(s.y2)} ${r(s.x)} ${r(s.y)}`;
          case 'Q':
            return `Q${r(s.x1)} ${r(s.y1)} ${r(s.x)} ${r(s.y)}`;
          case 'T':
            return `T${r(s.x)} ${r(s.y)}`;
          case 'A':
            return `A${r(s.rx)} ${r(s.ry)} ${r(s.rotation)} ${s.largeArc} ${
              s.sweep
            } ${r(s.x)} ${r(s.y)}`;
          case 'Z':
            return 'Z';
          default:
            return '';
        }
      })
      .join('');
  }

  static pathToRelative(segments, precision = 4) {
    const r = (v) => {
      const rounded =
        Math.round(v * Math.pow(10, precision)) / Math.pow(10, precision);
      return String(rounded);
    };
    let cx = 0,
      cy = 0;
    return segments
      .map((s) => {
        let out;
        switch (s.type) {
          case 'M':
            out = `m${r(s.x - cx)} ${r(s.y - cy)}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'L':
            out = `l${r(s.x - cx)} ${r(s.y - cy)}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'C':
            out = `c${r(s.x1 - cx)} ${r(s.y1 - cy)} ${r(s.x2 - cx)} ${r(
              s.y2 - cy
            )} ${r(s.x - cx)} ${r(s.y - cy)}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'S':
            out = `s${r(s.x2 - cx)} ${r(s.y2 - cy)} ${r(s.x - cx)} ${r(
              s.y - cy
            )}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'Q':
            out = `q${r(s.x1 - cx)} ${r(s.y1 - cy)} ${r(s.x - cx)} ${r(
              s.y - cy
            )}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'T':
            out = `t${r(s.x - cx)} ${r(s.y - cy)}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'A':
            out = `a${r(s.rx)} ${r(s.ry)} ${r(s.rotation)} ${s.largeArc} ${
              s.sweep
            } ${r(s.x - cx)} ${r(s.y - cy)}`;
            cx = s.x;
            cy = s.y;
            return out;
          case 'Z':
            return 'z';
          default:
            return '';
        }
      })
      .join('');
  }

  static convertShapeToPath(el) {
    const tag = el.tagName.toLowerCase();
    const g = (a, d) => parseFloat(el.getAttribute(a)) || d || 0;
    let d = '';
    if (tag === 'rect') {
      const x = g('x', 0),
        y = g('y', 0),
        w = g('width', 0),
        h = g('height', 0);
      const rx = Math.min(g('rx', 0), w / 2),
        ry = Math.min(g('ry', rx), h / 2);
      if (rx > 0 || ry > 0) {
        d = `M${x + rx} ${y} H${x + w - rx} A${rx} ${ry} 0 0 1 ${x + w} ${
          y + ry
        } V${y + h - ry} A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} H${
          x + rx
        } A${rx} ${ry} 0 0 1 ${x} ${y + h - ry} V${y + ry} A${rx} ${ry} 0 0 1 ${
          x + rx
        } ${y}Z`;
      } else {
        d = `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      }
    } else if (tag === 'circle') {
      const cx = g('cx', 0),
        cy = g('cy', 0),
        r = g('r', 0);
      d = `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${
        cx - r
      } ${cy}Z`;
    } else if (tag === 'ellipse') {
      const cx = g('cx', 0),
        cy = g('cy', 0),
        rx = g('rx', 0),
        ry = g('ry', 0);
      d = `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${
        cx + rx
      } ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    } else if (tag === 'line') {
      d = `M${g('x1', 0)} ${g('y1', 0)}L${g('x2', 0)} ${g('y2', 0)}`;
    } else if (tag === 'polyline' || tag === 'polygon') {
      const pts = (el.getAttribute('points') || '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      for (let i = 0; i < pts.length - 1; i += 2) {
        d += (i === 0 ? 'M' : 'L') + pts[i] + ' ' + pts[i + 1];
      }
      if (tag === 'polygon') d += 'Z';
    }
    return d;
  }

  static _transformRect(el, m) {
    const d = SvgTransformResolver.convertShapeToPath(el);
    const parsed = SvgTransformResolver.parsePathToAbsolute(d);
    for (const seg of parsed) SvgTransformResolver._transformSegment(seg, m);
    SvgTransformResolver._replaceWithPath(
      el,
      SvgTransformResolver.serializePath(parsed)
    );
  }

  static _transformCircle(el, m) {
    const d = SvgTransformResolver.convertShapeToPath(el);
    const parsed = SvgTransformResolver.parsePathToAbsolute(d);
    for (const seg of parsed) SvgTransformResolver._transformSegment(seg, m);
    SvgTransformResolver._replaceWithPath(
      el,
      SvgTransformResolver.serializePath(parsed)
    );
  }

  static _transformEllipse(el, m) {
    const d = SvgTransformResolver.convertShapeToPath(el);
    const parsed = SvgTransformResolver.parsePathToAbsolute(d);
    for (const seg of parsed) SvgTransformResolver._transformSegment(seg, m);
    SvgTransformResolver._replaceWithPath(
      el,
      SvgTransformResolver.serializePath(parsed)
    );
  }

  static _transformLine(el, m) {
    const d = SvgTransformResolver.convertShapeToPath(el);
    const parsed = SvgTransformResolver.parsePathToAbsolute(d);
    for (const seg of parsed) SvgTransformResolver._transformSegment(seg, m);
    SvgTransformResolver._replaceWithPath(
      el,
      SvgTransformResolver.serializePath(parsed)
    );
  }

  static _transformPoly(el, m) {
    const d = SvgTransformResolver.convertShapeToPath(el);
    const parsed = SvgTransformResolver.parsePathToAbsolute(d);
    for (const seg of parsed) SvgTransformResolver._transformSegment(seg, m);
    SvgTransformResolver._replaceWithPath(
      el,
      SvgTransformResolver.serializePath(parsed)
    );
  }

  static _replaceWithPath(el, dAttr) {
    const ns = 'http://www.w3.org/2000/svg';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', dAttr);
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      if (
        [
          'd',
          'x',
          'y',
          'width',
          'height',
          'cx',
          'cy',
          'r',
          'rx',
          'ry',
          'x1',
          'y1',
          'x2',
          'y2',
          'points',
          'transform',
        ].includes(name)
      )
        continue;
      path.setAttribute(name, attr.value);
    }
    if (el.parentNode) {
      el.parentNode.replaceChild(path, el);
    }
  }

  static roundPathCoordinates(svgElement, precision = 2) {
    const clone = svgElement.cloneNode(true);
    clone.querySelectorAll('path').forEach((path) => {
      const d = path.getAttribute('d');
      if (!d) return;
      const parsed = SvgTransformResolver.parsePathToAbsolute(d);
      path.setAttribute(
        'd',
        SvgTransformResolver.serializePath(parsed, precision)
      );
    });
    return clone;
  }

  static rescaleViewBox(svgElement, newViewBox) {
    const clone = svgElement.cloneNode(true);
    const oldVB = clone.getAttribute('viewBox');
    if (!oldVB) return clone;
    const [ox, oy, ow, oh] = oldVB.split(/[\s,]+/).map(Number);
    const [nx, ny, nw, nh] = newViewBox;
    const sx = nw / ow;
    const sy = nh / oh;
    const dx = nx - ox * sx;
    const dy = ny - oy * sy;
    const matrix = [sx, 0, 0, sy, dx, dy];
    clone.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
    SvgTransformResolver._processNode(clone, matrix);
    return clone;
  }

  static getBoundingBoxOfPaths(svgElement) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const expand = (x, y) => {
      if (isNaN(x) || isNaN(y)) return;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    };

    const processElement = (el) => {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      let d = null;

      if (tag === 'path') {
        d = el.getAttribute('d');
      } else if (
        ['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'].includes(
          tag
        )
      ) {
        d = SvgTransformResolver.convertShapeToPath(el);
      }

      if (!d || !d.trim()) return;

      const parsed = SvgTransformResolver.parsePathToAbsolute(d);
      for (const seg of parsed) {
        if (seg.x !== undefined && seg.y !== undefined) expand(seg.x, seg.y);
        if (seg.x1 !== undefined && seg.y1 !== undefined)
          expand(seg.x1, seg.y1);
        if (seg.x2 !== undefined && seg.y2 !== undefined)
          expand(seg.x2, seg.y2);
      }
    };

    const walk = (node) => {
      if (node.nodeType !== 1) return;
      processElement(node);
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    };

    walk(svgElement);

    if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  static fitContentToViewBox(svgElement, targetVB, padding = 0) {
    let clone = SvgTransformResolver.resolveAllTransforms(
      svgElement.cloneNode(true)
    );

    clone
      .querySelectorAll('rect, circle, ellipse, line, polyline, polygon')
      .forEach((el) => {
        const d = SvgTransformResolver.convertShapeToPath(el);
        if (d) SvgTransformResolver._replaceWithPath(el, d);
      });

    const bb = SvgTransformResolver.getBoundingBoxOfPaths(clone);
    if (bb.width <= 0 || bb.height <= 0) return null;

    const [vbX, vbY, vbW, vbH] = targetVB;

    const usableW = vbW - padding * 2;
    const usableH = vbH - padding * 2;
    const scale = Math.min(usableW / bb.width, usableH / bb.height);

    const srcCenterX = bb.x + bb.width / 2;
    const srcCenterY = bb.y + bb.height / 2;

    const destCenterX = vbX + vbW / 2;
    const destCenterY = vbY + vbH / 2;

    console.log('[fitContentToViewBox] Source BB:', JSON.stringify(bb));
    console.log('[fitContentToViewBox] Source center:', srcCenterX, srcCenterY);
    console.log('[fitContentToViewBox] Target VB:', vbX, vbY, vbW, vbH);
    console.log('[fitContentToViewBox] Dest center:', destCenterX, destCenterY);
    console.log('[fitContentToViewBox] Scale:', scale);

    clone.querySelectorAll('path').forEach((pathEl) => {
      const d = pathEl.getAttribute('d');
      if (!d) return;
      const parsed = SvgTransformResolver.parsePathToAbsolute(d);
      for (const seg of parsed) {
        SvgTransformResolver._remapSegmentCoords(
          seg,
          (x, y) => {
            const nx = (x - srcCenterX) * scale + destCenterX;
            const ny = (y - srcCenterY) * scale + destCenterY;
            return [nx, ny];
          },
          scale
        );
      }
      pathEl.setAttribute('d', SvgTransformResolver.serializePath(parsed));
    });

    clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);

    const verifyBB = SvgTransformResolver.getBoundingBoxOfPaths(clone);
    console.log('[fitContentToViewBox] Result BB:', JSON.stringify(verifyBB));
    console.log(
      '[fitContentToViewBox] Result center:',
      verifyBB.x + verifyBB.width / 2,
      verifyBB.y + verifyBB.height / 2
    );

    return clone;
  }

  static _remapSegmentCoords(seg, mapFn, scale) {
    const t = seg.type;
    if (t === 'M' || t === 'L' || t === 'T') {
      const [nx, ny] = mapFn(seg.x, seg.y);
      seg.x = nx;
      seg.y = ny;
    } else if (t === 'C') {
      const [nx1, ny1] = mapFn(seg.x1, seg.y1);
      const [nx2, ny2] = mapFn(seg.x2, seg.y2);
      const [nx, ny] = mapFn(seg.x, seg.y);
      seg.x1 = nx1;
      seg.y1 = ny1;
      seg.x2 = nx2;
      seg.y2 = ny2;
      seg.x = nx;
      seg.y = ny;
    } else if (t === 'S') {
      const [nx2, ny2] = mapFn(seg.x2, seg.y2);
      const [nx, ny] = mapFn(seg.x, seg.y);
      seg.x2 = nx2;
      seg.y2 = ny2;
      seg.x = nx;
      seg.y = ny;
    } else if (t === 'Q') {
      const [nx1, ny1] = mapFn(seg.x1, seg.y1);
      const [nx, ny] = mapFn(seg.x, seg.y);
      seg.x1 = nx1;
      seg.y1 = ny1;
      seg.x = nx;
      seg.y = ny;
    } else if (t === 'A') {
      const [nx, ny] = mapFn(seg.x, seg.y);
      seg.rx *= scale;
      seg.ry *= scale;
      seg.x = nx;
      seg.y = ny;
    }
  }
}

