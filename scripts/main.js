// @ts-check
'use strict';

(function () {

  function onLoad() {
    const code = document.getElementsByTagName('code')[0];
    const [...childs] = code.childNodes;
    // @ts-ignore
    childs.filter(n => n.nodeType === 1 && n.hasAttribute('range-start')).forEach(n => {
      n.addEventListener('click', toggleLines);
    });
  }

  function toggleLines(e, collapse) {
    let lineSpan, recursive, isExpandAction;
    if (arguments.length === 2) {
      lineSpan = e;
      recursive = true;
      isExpandAction = !collapse;
      if (isExpandAction) {
        lineSpan.classList.remove('collapsed');
      } else {
        lineSpan.classList.add('collapsed');
      }
    } else {
      lineSpan = e.target.parentNode;
      recursive = e.shiftKey;
      isExpandAction = isCollapspedLine(lineSpan);
      lineSpan.classList.toggle('collapsed');
    }
    const blockEndNum = getFoldingRangeEnd(lineSpan);

    let span = lineSpan;
    let currentLineNum = getLineNum(lineSpan);
    let skipLineEndNum = -1;
    while ((span = span.nextElementSibling) && ++currentLineNum <= blockEndNum) {
      if (isExpandAction) {
        if (currentLineNum > skipLineEndNum || recursive) {
          span.classList.remove('hidden-line');
          span.nextSibling.textContent = '\n';

          if (isCollapspedLine(span)) {
            skipLineEndNum = getFoldingRangeEnd(span);
            if (recursive) {
              span.classList.remove('collapsed');
            }
          }
        }
      } else {
        if (isRangeStartLine(span) && recursive) {
          span.classList.add('collapsed');
        }

        span.classList.add('hidden-line');
        span.nextSibling.textContent = '';
      }
    }
  }

  function getLineNum(element) {
    return parseInt(element.attributes.getNamedItem('start').value);
  }

  function isRangeStartLine(element) {
    return element.hasAttribute('range-start');
  }

  function isCollapspedLine(element) {
    return element.classList.contains('collapsed');
  }

  function getFoldingRangeEnd(element) {
    return parseInt(element.attributes.getNamedItem('range-end').value);
  }

  window.addEventListener('message', event => {
    const message = event.data;
    const code = document.getElementsByTagName('code')[0];
    const [...childs] = code.childNodes;
    // @ts-ignore
    const lineSpan = childs.find(n => n.nodeType === 1 && n.hasAttribute('range-start'));
    toggleLines(lineSpan, message.command === 'foldAll');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onLoad);
  } else {
    onLoad();
  }
})()