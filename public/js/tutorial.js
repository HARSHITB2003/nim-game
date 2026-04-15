'use strict';

const stepNodes = Array.from(document.querySelectorAll('.tutorial-step'));
const stepSquares = Array.from(document.querySelectorAll('[data-step-square]'));

const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');

const miniBoard = document.getElementById('miniBoard');
const miniResetBtn = document.getElementById('miniResetBtn');

let currentStep = 1;
let miniHeaps = [1, 2, 3];

function showStep(stepNumber) {
  currentStep = Math.max(1, Math.min(5, stepNumber));

  stepNodes.forEach((node) => {
    const nodeStep = Number(node.dataset.step);
    node.style.display = nodeStep === currentStep ? 'block' : 'none';
  });

  stepSquares.forEach((square) => {
    const squareStep = Number(square.dataset.stepSquare);
    square.classList.toggle('active', squareStep === currentStep);
  });

  prevStepBtn.disabled = currentStep === 1;
  nextStepBtn.disabled = currentStep === 5;
}

function renderMiniBoard() {
  miniBoard.innerHTML = '';

  miniHeaps.forEach((heapSize, heapIndex) => {
    const row = document.createElement('div');
    row.className = 'mini-row';

    const label = document.createElement('span');
    label.className = 'mini-label';
    label.textContent = `Row ${heapIndex + 1} (${heapSize})`;

    const stones = document.createElement('div');
    stones.className = 'mini-stones';

    if (heapSize === 0) {
      const empty = document.createElement('span');
      empty.className = 'mini-empty';
      empty.textContent = 'Empty';
      stones.appendChild(empty);
    } else {
      for (let stoneIndex = 0; stoneIndex < heapSize; stoneIndex += 1) {
        const stone = document.createElement('button');
        stone.type = 'button';
        stone.className = 'mini-stone';
        stone.title = 'Remove from here to end of row';

        stone.addEventListener('click', () => {
          const stonesToRemove = heapSize - stoneIndex;
          miniHeaps[heapIndex] = Math.max(0, miniHeaps[heapIndex] - stonesToRemove);
          renderMiniBoard();
        });

        stones.appendChild(stone);
      }
    }

    row.appendChild(label);
    row.appendChild(stones);
    miniBoard.appendChild(row);
  });
}

prevStepBtn.addEventListener('click', () => {
  showStep(currentStep - 1);
});

nextStepBtn.addEventListener('click', () => {
  showStep(currentStep + 1);
});

miniResetBtn.addEventListener('click', () => {
  miniHeaps = [1, 2, 3];
  renderMiniBoard();
});

showStep(1);
renderMiniBoard();
