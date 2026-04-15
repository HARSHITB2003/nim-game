(function () {
  'use strict';

  var canvas, ctx, rows, cols, data;
  var CHAR_W = 11, CHAR_H = 14;
  var SCROLL_SPEED = 0.25;
  var EDGE_FRACTION = 0.28;
  var MAX_ALPHA = 0.22;
  var offset = 0;

  function buildData() {
    var totalRows = (Math.floor(canvas.height / CHAR_H) + 2) * 2;
    cols = Math.floor(canvas.width / CHAR_W);
    data = [];
    for (var r = 0; r < totalRows; r++) {
      var row = [];
      for (var c = 0; c < cols; c++) {
        row.push(Math.random() > 0.5 ? '1' : '0');
      }
      data.push(row);
    }
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    rows = Math.floor(canvas.height / CHAR_H) + 2;
    buildData();
    offset = 0;
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '10px "Share Tech Mono", "Courier New", monospace';

    var rowOffset = Math.floor(offset / CHAR_H);
    var pixelOffset = offset % CHAR_H;
    var totalDataRows = data.length;
    var edgeCols = Math.floor(cols * EDGE_FRACTION);

    for (var r = 0; r < rows + 1; r++) {
      var rowIdx = (r + rowOffset) % totalDataRows;
      var y = r * CHAR_H - pixelOffset;

      for (var c = 0; c < cols; c++) {
        var leftDist  = c / edgeCols;
        var rightDist = (cols - 1 - c) / edgeCols;
        var edgeFactor = Math.min(leftDist, rightDist, 1);
        var alpha = edgeFactor * edgeFactor * MAX_ALPHA;
        if (alpha < 0.004) continue;

        ctx.fillStyle = 'rgba(0,255,234,' + alpha.toFixed(3) + ')';
        ctx.fillText(data[rowIdx][c], c * CHAR_W, y);
      }
    }

    offset += SCROLL_SPEED;
    requestAnimationFrame(tick);
  }

  function init() {
    var container = document.createElement('div');
    container.className = 'bg-particles';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;';

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';

    container.appendChild(canvas);
    document.body.insertBefore(container, document.body.firstChild);

    ctx = canvas.getContext('2d');
    resize();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    tick();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
