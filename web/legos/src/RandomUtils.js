class RandomUtils {
  //------ pickWeighted
  static pickWeighted(items) {
    let total = 0;
    for (const o of items) {
      total += o.weight;
    }
    let r = Math.random() * total;
    for (const o of items) {
      r -= o.weight;
      if (r <= 0) return o.item;
    }
    return items[items.length - 1].item;
  } //----- end pickWeighted

  //------ randInt
  static randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

} //----- end class RandomUtils

