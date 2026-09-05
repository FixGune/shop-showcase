// === Калькулятор размера груди ===
function calculateSize() {
    const underbust = parseInt(document.getElementById('underbust').value);
    const bust = parseInt(document.getElementById('bust').value);
    const resultDiv = document.getElementById('result');
    const sizeResult = document.getElementById('size-result');

    if (!underbust || !bust) {
        alert('Пожалуйста, введите оба значения');
        return;
    }

    // Расчёт размера чашки
    const difference = bust - underbust;
    let cup = '';
    
    if (difference <= 10) cup = 'AA';
    else if (difference <= 12) cup = 'A';
    else if (difference <= 14) cup = 'B';
    else if (difference <= 16) cup = 'C';
    else if (difference <= 18) cup = 'D';
    else if (difference <= 20) cup = 'DD';
    else if (difference <= 22) cup = 'E';
    else cup = 'F+';

    // Расчёт базового размера (70, 75, 80...)
    let bandSize = '';
    if (underbust <= 72) bandSize = '70';
    else if (underbust <= 77) bandSize = '75';
    else if (underbust <= 82) bandSize = '80';
    else if (underbust <= 87) bandSize = '85';
    else if (underbust <= 92) bandSize = '90';
    else bandSize = '95+';

    // Итоговый размер
    const finalSize = `${bandSize}${cup}`;
    sizeResult.textContent = finalSize;
    resultDiv.classList.remove('hidden');
}