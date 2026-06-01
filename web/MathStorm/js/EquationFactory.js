class EquationFactory {

constructor() {
        // Use smaller numbers for easier testing initially
        this.maxOperand = 9;
        this.maxResult = 81; // For addition/multiplication
    } // end constructor

/**
     * Creates a random math problem from the available types.
     * @returns {Array} An array of piece data objects representing a full equation.
     */
    createProblem() {
        const problemTypes = [
            this.createMultiplicationProblem,
            this.createAdditionProblem,
            this.createSubtractionProblem,
            this.createDivisionProblem,
        ];
        // Choose a random problem type function from the array and call it.
        const randomProblemGenerator = problemTypes[Math.floor(Math.random() * problemTypes.length)];
        return randomProblemGenerator.call(this);
    } // end createProblem

createMultiplicationProblem() {
        const a = Math.ceil(Math.random() * this.maxOperand);
        const b = Math.ceil(Math.random() * this.maxOperand);
        const product = a * b;

        return [
            { value: a, type: 'number' },
            { value: '×', type: 'operator' },
            { value: b, type: 'number' },
            { value: '=', type: 'operator' },
            { value: product, type: 'number' },
        ];
    } // end createMultiplicationProblem

createAdditionProblem() {
        const a = Math.ceil(Math.random() * (this.maxResult / 2));
        const b = Math.ceil(Math.random() * (this.maxResult / 2));
        const sum = a + b;
        return [
            { value: a, type: 'number' },
            { value: '+', type: 'operator' },
            { value: b, type: 'number' },
            { value: '=', type: 'operator' },
            { value: sum, type: 'number' },
        ];
    } // end createAdditionProblem

createSubtractionProblem() {
        const a = Math.ceil(Math.random() * this.maxResult);
        const b = Math.ceil(Math.random() * a); // Ensures b is not greater than a for a positive result
        const difference = a - b;
        return [
            { value: a, type: 'number' },
            { value: '−', type: 'operator' },
            { value: b, type: 'number' },
            { value: '=', type: 'operator' },
            { value: difference, type: 'number' },
        ];
    } // end createSubtractionProblem

createDivisionProblem() {
        // To guarantee an integer result, we generate the result and a divisor first.
        const result = Math.ceil(Math.random() * this.maxOperand);
        const b = Math.ceil(Math.random() * this.maxOperand);
        const a = result * b;
        return [
            { value: a, type: 'number' },
            { value: '÷', type: 'operator' },
            { value: b, type: 'number' },
            { value: '=', type: 'operator' },
            { value: result, type: 'number' },
        ];
    } // end createDivisionProblem
} // end class EquationFactory

