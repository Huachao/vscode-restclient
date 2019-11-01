// @ts-check
'use strict';

(function () {

  function onLoad() {
    const code = document.getElementsByTagName('code')[0];
    let [...childs] = code.childNodes;
    childs.filter(n => n.nodeType === 1).forEach(n => {
      n.addEventListener('click', toggleLines);
    });
  }

  function toggleLines(e) {
    const iconSpan = e.target;
    const lineSpan = iconSpan.parentNode;
    const blockEndNum = getFoldingRangeEnd(lineSpan);
    const isExpandAction = lineSpan.classList.contains('collapsed');
    if (isExpandAction) {
      lineSpan.classList.remove('collapsed');
    } else {
      lineSpan.classList.add('collapsed');
    }

    let span = lineSpan;
    let excludeEndLineNum = -1;
    while (span = span.nextElementSibling) {
      const currentLineNum = getLineNum(span);
      if (currentLineNum > blockEndNum) {
        break;
      }

      if (currentLineNum <= excludeEndLineNum) {
        continue;
      }

      if (isCollapsedStartLineSpan(span)) {
        excludeEndLineNum = getFoldingRangeEnd(span);
      }

      span.classList.toggle('hidden-line');
      if (isExpandAction) {
        span.nextSibling.textContent = '\n';
      } else {
        span.nextSibling.textContent = '';
      }
    }
  }

  function foldLineSpan(lineSpan) {
    const blockEndNum = getFoldingRangeEnd(lineSpan);
    lineSpan.classList.add('collapsed');

    let span = lineSpan;
    let excludeEndLineNum = -1;
    while (span = span.nextElementSibling) {
      const currentLineNum = getLineNum(span);
      if (currentLineNum > blockEndNum) {
        break;
      }

      if (currentLineNum <= excludeEndLineNum) {
        continue;
      }

      if (isCollapsedStartLineSpan(span)) {
        excludeEndLineNum = getFoldingRangeEnd(span);
      }

      span.classList.add('hidden-line');
      span.nextSibling.textContent = '';
    }
  }

  function unfoldLineSpan(lineSpan) {
    const blockEndNum = getFoldingRangeEnd(lineSpan);
    lineSpan.classList.remove('collapsed');

    let span = lineSpan;
    let excludeEndLineNum = -1;
    while (span = span.nextElementSibling) {
      const currentLineNum = getLineNum(span);
      if (currentLineNum > blockEndNum) {
        break;
      }

      if (currentLineNum <= excludeEndLineNum) {
        continue;
      }

      if (isCollapsedStartLineSpan(span)) {
        excludeEndLineNum = getFoldingRangeEnd(span);
      }

      span.classList.remove('hidden-line');
      span.nextSibling.textContent = '\n';
    }
  }

  function getLineNum(element) {
    return parseInt(element.attributes.getNamedItem('start').value);
  }

  function getFoldingRangeEnd(element) {
    return parseInt(element.attributes.getNamedItem('range-end').value);
  }

  function isCollapsedStartLineSpan(element) {
    return element.classList.contains('collapsed');
  }

  window.addEventListener('message', event => {
    const message = event.data;
    const code = document.getElementsByTagName('code')[0];
    const [...childs] = code.childNodes;
    // @ts-ignore
    const lineSpans = childs.filter(n => n.nodeType === 1 && n.hasAttribute('range-start'));
    switch (message.command) {
      case 'foldAll':
        lineSpans.forEach(foldLineSpan);
        break;

      case 'unfoldAll':
        lineSpans.forEach(unfoldLineSpan);
        break;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onLoad);
  } else {
    onLoad();
  }
})()