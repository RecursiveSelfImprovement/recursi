// File: src/IrvTabulator.js

class IrvTabulator {
  constructor(electionData) {
    this.data = electionData;
  } // end constructor

  run() {
    // Perform the IRV count and return the data needed for the Sankey diagram widget.
    const irvResults = IRV.tabulate(this.data);
    return irvResults;
  } // end run

} // end class IrvTabulator