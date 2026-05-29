document.addEventListener('DOMContentLoaded', () => {

    const predictButton = document.getElementById('predictButton');
    const cashoutBtn = document.getElementById('cashoutBtn');
    const resultDiv = document.getElementById('result');
    const circleLoader = document.querySelector('.circle-loader-container');
    const priceIndicator = document.getElementById('priceIndicator');
    const multiplierText = document.getElementById('multiplier');

    let isFlying = false;
    let hasCashedOut = false;
    let currentMultiplier = 1;
    let baseValueGlobal = 0;

    const MIN_VALUE = 0.50;
    const MAX_VALUE = 2.50;

    predictButton.addEventListener('click', async () => {

        try {

            startUI();

            const cloudPower = await scanClouds();

            let simulatedValue = generateSimulatedValue();
            simulatedValue *= cloudPower;

            baseValueGlobal = simulatedValue;

            priceIndicator.textContent = `$${simulatedValue.toFixed(2)}`;

            const finalMultiplier = await animateFlight(simulatedValue);

            if (!hasCashedOut) {
                resultDiv.innerHTML = `
                    <div style="color:red;font-weight:bold;font-size:18px;">
                        💥 PERDISTE (no retiraste)
                    </div>
                `;
            }

        } catch (error) {

            resultDiv.innerHTML = `❌ Error`;

        } finally {

            isFlying = false;
            predictButton.disabled = false;
            circleLoader.style.display = 'none';

        }

    });

    // 💸 BOTÓN RETIRAR
    cashoutBtn.addEventListener('click', () => {

        if (!isFlying || hasCashedOut) return;

        hasCashedOut = true;

        const ganancia = baseValueGlobal * currentMultiplier;

        resultDiv.innerHTML = `
            <div style="color:#00ff9c;font-weight:bold;font-size:18px;">
                💸 RETIRASTE A ${currentMultiplier.toFixed(2)}x
            </div>

            <div style="color:#ffd700;margin-top:10px;">
                Ganancia: $${ganancia.toFixed(2)}
            </div>
        `;
    });

    function startUI() {
        predictButton.disabled = true;
        circleLoader.style.display = 'flex';
        hasCashedOut = false;
    }

    function generateSimulatedValue() {
        return Math.random() * (MAX_VALUE - MIN_VALUE) + MIN_VALUE;
    }

    function generateCrashPoint() {

        let r = Math.random();

        if (r < 0.50) return 1 + Math.random() * 0.5;
        if (r < 0.80) return 1.5 + Math.random() * 1;
        if (r < 0.95) return 2.5 + Math.random() * 2;

        return 4.5 + Math.random() * 5;
    }

    async function animateFlight(baseValue) {

        const canvas = document.getElementById('chart');
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        let x = 0;
        let multiplier = 1;

        isFlying = true;

        const crashPoint = generateCrashPoint();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        while (multiplier < crashPoint) {

            multiplier += 0.03 + Math.random() * 0.03;

            currentMultiplier = multiplier;

            const value = baseValue * multiplier;

            priceIndicator.textContent = `$${value.toFixed(2)}`;
            multiplierText.textContent = multiplier.toFixed(2) + "x";

            resultDiv.innerHTML = `
                <div style="color:#00ff9c;font-weight:bold;">
                    ✈️ ${multiplier.toFixed(2)}x
                </div>
            `;

            x += 4;
            const y = canvas.height - (multiplier * 45);

            ctx.lineTo(x, y);
            ctx.strokeStyle = "#00ff9c";
            ctx.shadowColor = "#00ff9c";
            ctx.shadowBlur = 10;
            ctx.stroke();

            await delay(40);

            if (x > canvas.width) break;
            if (hasCashedOut) break;
        }

        isFlying = false;

        if (!hasCashedOut) {
            resultDiv.innerHTML = `
                <div style="color:red;font-weight:bold;font-size:18px;">
                    💥 CRASH en ${multiplier.toFixed(2)}x
                </div>
            `;
        }

        return multiplier;
    }

    async function scanClouds() {

        let cloudPower = 0.8 + Math.random() * 0.6;

        resultDiv.innerHTML = `☁️ Analizando...`;

        for (let i = 0; i < 15; i++) {
            priceIndicator.textContent = `$${(Math.random()*10).toFixed(2)}`;
            await delay(50);
        }

        return cloudPower;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

});