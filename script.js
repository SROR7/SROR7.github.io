const form = document.getElementById("calculator-form");
const message = document.getElementById("message");
const resultSection = document.getElementById("result-section");
const resultsBody = document.getElementById("results-body");

// Convert the user's mathematical expression into a JavaScript function
function compileFunction(expression) {
    let code = expression.trim()
        .replace(/\^/g, "**")
        .replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|abs|log|ln|exp|floor|ceil|round)\s*\(/gi,
            (match, name) => `Math.${name.toLowerCase() === "ln" ? "log" : name}(`)
        .replace(/\bPI\b/gi, "Math.PI")
        .replace(/\bE\b/g, "Math.E");

    if (!/^[0-9xX+\-*/().,\sA-Za-z_]*$/.test(code)) {
        throw new Error("The function contains unsupported characters.");
    }

    const allowedWords = new Set([
        "x", "X", "Math", "sin", "cos", "tan",
        "asin", "acos", "atan", "sqrt", "abs",
        "log", "exp", "floor", "ceil", "round",
        "PI", "E"
    ]);

    const words = code.match(/[A-Za-z_]+/g) || [];

    for (const word of words) {
        if (!allowedWords.has(word)) {
            throw new Error(`Unsupported name: ${word}`);
        }
    }

    let evaluator;

    try {
        evaluator = new Function("x", `"use strict"; return (${code});`);
    } catch {
        throw new Error("Invalid function. Check the expression syntax.");
    }

    return (value) => {
        const result = Number(evaluator(value));

        if (!Number.isFinite(result)) {
            throw new Error("The function produced an invalid number.");
        }

        return result;
    };
}

// Calculate the derivative numerically
function derivative(f, x) {
    const h = 1e-6 * Math.max(1, Math.abs(x));

    return (f(x + h) - f(x - h)) / (2 * h);
}

// Newton-Raphson algorithm
function calculateNewtonRaphson(f, initialValue, tolerance, maxIterations) {

    const rows = [];
    let currentX = initialValue;

    for (let i = 0; i < maxIterations; i++) {

        const fx = f(currentX);
        const dfx = derivative(f, currentX);

        if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) {
            throw new Error(`Derivative is zero at iteration ${i}.`);
        }

        // Newton-Raphson formula
        const nextX = currentX - fx / dfx;

        if (!Number.isFinite(nextX)) {
            throw new Error("The calculation diverged.");
        }

        rows.push({
            iteration: i + 1,
            x: currentX,
            fx: fx,
            dfx: dfx,
            nextX: nextX
        });

        // Check convergence
        if (
            Math.abs(nextX - currentX) < tolerance ||
            Math.abs(f(nextX)) < tolerance
        ) {
            return {
                root: nextX,
                rows: rows,
                converged: true
            };
        }

        // Update current X for the next iteration
        currentX = nextX;
    }

    return {
        root: currentX,
        rows: rows,
        converged: false
    };
}

// Format numbers
function formatNumber(value) {
    return Number(value).toPrecision(10);
}

// Handle Calculate button
form.addEventListener("submit", (event) => {

    event.preventDefault();

    message.textContent = "";
    resultSection.classList.add("hidden");
    resultsBody.innerHTML = "";

    try {

        // Get user inputs
        const expression = document.getElementById("function").value;

        const initialValue = Number(
            document.getElementById("x0").value
        );

        const tolerance = Number(
            document.getElementById("tolerance").value
        );

        const maxIterations = Number(
            document.getElementById("max-iterations").value
        );

        if (!Number.isFinite(initialValue)) {
            throw new Error("Enter a valid initial value.");
        }

        if (!Number.isFinite(tolerance) || tolerance <= 0) {
            throw new Error("Tolerance must be greater than zero.");
        }

        if (
            !Number.isInteger(maxIterations) ||
            maxIterations < 1 ||
            maxIterations > 1000
        ) {
            throw new Error("Maximum iterations must be between 1 and 1000.");
        }

        // Compile mathematical function
        const f = compileFunction(expression);

        // Execute Newton-Raphson
        const result = calculateNewtonRaphson(
            f,
            initialValue,
            tolerance,
            maxIterations
        );

        // Display final root
        document.getElementById("root-result").textContent =
            `Approximate root: ${formatNumber(result.root)}`;

        document.getElementById("status-result").textContent =
            result.converged
                ? `Converged in ${result.rows.length} iteration(s).`
                : `Maximum iterations reached without convergence.`;

        // Display iteration table
        for (const row of result.rows) {

            const tr = document.createElement("tr");

            const values = [
                row.iteration,
                formatNumber(row.x),
                formatNumber(row.fx),
                formatNumber(row.dfx),
                formatNumber(row.nextX)
            ];

            values.forEach(value => {

                const td = document.createElement("td");

                td.textContent = value;

                tr.appendChild(td);

            });

            resultsBody.appendChild(tr);
        }

        resultSection.classList.remove("hidden");

    } catch (error) {

        message.textContent = error.message;

    }

});