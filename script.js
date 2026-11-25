const form = document.getElementById("calculator-form");
const message = document.getElementById("message");
const resultSection = document.getElementById("result-section");
const graphSection = document.getElementById("graph-section");
const resultsBody = document.getElementById("results-body");

let functionChart = null;

// Convert mathematical expression into JavaScript function
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


// Calculate derivative using Central Difference Method
function derivative(f, x) {

    const h = 1e-6 * Math.max(1, Math.abs(x));

    return (f(x + h) - f(x - h)) / (2 * h);
}


// Newton-Raphson Algorithm
function calculateNewtonRaphson(f, initialValue, tolerance, maxIterations) {

    const rows = [];
    let currentX = initialValue;

    for (let i = 0; i < maxIterations; i++) {

        const fx = f(currentX);
        const dfx = derivative(f, currentX);

        if (!Number.isFinite(dfx) || Math.abs(dfx) < 1e-14) {
            throw new Error(`The derivative is zero or too close to zero at iteration ${i}.`);
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

        // Move to the next iteration
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


// Draw Function Graph
function drawFunctionGraph(f, initialValue, result) {

    const allX = [initialValue, result.root];

    result.rows.forEach(row => {
        allX.push(row.x, row.nextX);
    });

    let minX = Math.min(...allX);
    let maxX = Math.max(...allX);

    let span = maxX - minX;

    if (span === 0) {
        span = Math.max(1, Math.abs(minX) * 0.5);
    }

    minX -= span * 0.5;
    maxX += span * 0.5;

    const curvePoints = [];
    const sampleCount = 250;

    // Generate points for the function curve
    for (let i = 0; i <= sampleCount; i++) {

        const x = minX + (maxX - minX) * i / sampleCount;

        try {
            const y = f(x);

            if (Number.isFinite(y)) {
                curvePoints.push({ x: x, y: y });
            }

        } catch {
            // Skip invalid points
        }
    }

    // Generate iteration points
    const iterationPoints = result.rows.map(row => ({
        x: row.x,
        y: row.fx
    }));

    // Destroy previous graph
    if (functionChart) {
        functionChart.destroy();
    }

    const ctx = document
        .getElementById("function-chart")
        .getContext("2d");

    functionChart = new Chart(ctx, {

        type: "scatter",

        data: {

            datasets: [

                {
                    label: "f(x)",
                    data: curvePoints,
                    showLine: true,
                    borderColor: "#2367b1",
                    backgroundColor: "#2367b1",
                    pointRadius: 0,
                    borderWidth: 2,
                    parsing: false
                },

                {
                    label: "Newton-Raphson iterations",
                    data: iterationPoints,
                    showLine: false,
                    backgroundColor: "#e07827",
                    borderColor: "#e07827",
                    pointRadius: 5,
                    parsing: false
                },

                {
                    label: "X-axis",
                    data: [
                        { x: minX, y: 0 },
                        { x: maxX, y: 0 }
                    ],
                    showLine: true,
                    borderColor: "#98a2b3",
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    parsing: false
                }

            ]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            plugins: {

                tooltip: {
                    callbacks: {
                        label: context =>
                            `x: ${context.parsed.x.toFixed(6)}, y: ${context.parsed.y.toFixed(6)}`
                    }
                }

            },

            scales: {

                x: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "x"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "f(x)"
                    }
                }

            }
        }

    });
}


// Handle Calculate Button
form.addEventListener("submit", (event) => {

    event.preventDefault();

    message.textContent = "";

    resultSection.classList.add("hidden");
    graphSection.classList.add("hidden");

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

        // Display root
        document.getElementById("root-result").textContent =
            `Approximate root: ${formatNumber(result.root)}`;

        document.getElementById("status-result").textContent =
            result.converged
                ? `Converged in ${result.rows.length} iteration(s).`
                : "Maximum iterations reached without convergence.";

        // Display iterations in table
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

        // Display results and graph
        resultSection.classList.remove("hidden");
        graphSection.classList.remove("hidden");

        drawFunctionGraph(f, initialValue, result);

    } catch (error) {

        message.textContent = error.message;

    }

});