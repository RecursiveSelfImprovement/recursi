class Interpolator {
    static getValue(x, map) {
      if (!map || map.length === 0) return 0; 
      if (x <= map[0][0]) return map[0][1];
      if (x >= map[map.length - 1][0]) return map[map.length - 1][1];

      for (let i = 0; i < map.length - 1; i++) {
        if (map[i] && map[i+1] && typeof map[i][0] === 'number' && typeof map[i+1][0] === 'number') {
            if (x >= map[i][0] && x < map[i + 1][0]) {
              const x0 = map[i][0];
              const y0 = map[i][1];
              const x1 = map[i + 1][0];
              const y1 = map[i + 1][1];
              const denom = x1 - x0;
              if (denom === 0) return y0;
              const t = (x - x0) / denom;
              return y0 + t * (y1 - y0);
            }
        } else {
            console.warn("Invalid map entry in Interpolator.getValue");
            return 0; 
        }
      }
      return map[map.length - 1][1];
    }
  }