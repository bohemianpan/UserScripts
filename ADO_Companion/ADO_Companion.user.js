// ==UserScript==

// @name         ADO Companion
// @version      0.0.4
// @author       Dazhen Pan
// @description  A TamperMonkey userscript to improve ADO user experience. Based on https://alejandro5042.github.io/azdo-userscripts/
// @license      MIT

// @namespace    ADO
// @updateURL    https://microsoft.visualstudio.com/90b2a23c-cab8-4e7c-90e7-a977f32c1f5d/_apis/git/repositories/a45cf45f-f6db-438b-baf7-da6b3de589ba/items?path=/dev/Edge%20Code%20Companion.js&versionDescriptor%5BversionOptions%5D=0&versionDescriptor%5BversionType%5D=0&versionDescriptor%5Bversion%5D=user/dazhenp/tampermonkey_upstreamdiff&resolveLfs=true&%24format=octetStream&api-version=5.0&download=true
// @match        https://microsoft.visualstudio.com/*
// @match        https://dev.azure.com/microsoft/*

// @run-at       document-body
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js#sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8=
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-once/2.2.3/jquery.once.min.js#sha256-HaeXVMzafCQfVtWoLtN3wzhLWNs8cY2cH9OIQ8R9jfM=

// @require      https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.8.0/build/highlight.min.js#sha384-g4mRvs7AO0/Ol5LxcGyz4Doe21pVhGNnC3EQw5shw+z+aXDN86HqUdwXWO+Gz2zI
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@9.13.1/dist/sweetalert2.all.min.js#sha384-8oDwN6wixJL8kVeuALUvK2VlyyQlpEEN5lg6bG26x2lvYQ1HWAV0k8e2OwiWIX8X
// @require      https://gist.githubusercontent.com/alejandro5042/af2ee5b0ad92b271cd2c71615a05da2c/raw/45da85567e48c814610f1627148feb063b873905/easy-userscripts.js#sha384-t7v/Pk2+HNbUjKwXkvcRQIMtDEHSH9w0xYtq5YdHnbYKIV7Jts9fSZpZq+ESYE4v

// @grant        GM_addStyle

// ==/UserScript==

(function () {
    "use strict";
  
    // All REST API calls should fail after a timeout, instead of going on forever.
    $.ajaxSetup({ timeout: 5000 });
  
    function debug(...args) {
      // eslint-disable-next-line no-console
      console.log("[azdo-userscript]", args);
    }
  
    function error(...args) {
      // eslint-disable-next-line no-console
      console.error("[azdo-userscript]", args);
    }
  
    function main() {
      // Start modifying the page once the DOM is ready.
      if (document.readyState !== "loading") {
        onReady();
      } else {
        document.addEventListener("DOMContentLoaded", onReady);
      }
    }
  
    // For some reason, the url change isn't caught as expected, and I need to add a timer to check
    function watchLocationChanged() {
      let lastUrl;
      setInterval(() => {
        let currUrl = window.location.href;
        if (currUrl != lastUrl) {
          window.dispatchEvent(new CustomEvent("locationchange", null));
          lastUrl = currUrl;
        }
      }, 300);
    }
  
    function onReady() {
      watchLocationChanged();
      const pageData = JSON.parse(
        document.getElementById("dataProviders").innerHTML
      ).data;
      const theme = pageData["ms.vss-web.theme-data"].requestedThemeId;
      const isDarkTheme = /(dark|night|neptune)/i.test(theme);
  
      // Only
      eus.onUrl(/\/_git\/.*path=/gi, (session, urlMatch) => {
        addUpstreamDiffButtons(session);
        highlightMMFiles(session, isDarkTheme);
      });
    }
  
    function addUpstreamDiffButtons(session) {
      session.onFirst(
        document,
        ".bolt-header-commandbar-button-group",
        (button) => {
          if (eus.seen(button)) return;
  
          $(button).before(
            setupUpstreamDiffButton(() => {
              const path = getFilePath();
              const prBranch = $(".pr-header-branches a");
              if (prBranch.length != 0) {
                const branch = prBranch.attr("href");
                const branchUrl = `${window.location.origin}${branch}`;
                return `${branchUrl}&path=${path}&_a=compare&oversion=GBmirror/main`;
              } else {
                // If we can't find a branch
                // If we are on a commit page, then need to strip the commit info and append the main branch target branch
                // Example: https://microsoft.visualstudio.com/Edge/_git/chromium.src/commit/1373aca6f5f259f2439fd708b66f1f689fdcd954?path=/ios/chrome/browser/ui/toolbar/adaptive_toolbar_coordinator.h
                var targetUrl = window.location.href;
                if (targetUrl.includes("/commit/")) {
                  targetUrl = targetUrl.replace(/\/commit\/[^?]+/, '');
                  targetUrl = targetUrl + "&version=GBmain";
                }
                if (!targetUrl.includes("&_a=compare")) {
                  targetUrl = targetUrl + "&_a=compare";
                }
                return targetUrl + "&oversion=GBmirror/main";
               }
            })
          );
        }
      );
    }
  
    function setupUpstreamDiffButton(getUrl = () => window.location.href) {
      function navigateToUpstreamDiff() {
        let url = getUrl();
        if (!url) return;
        window.open(url, "_blank").focus();
      }
  
      const upstreamDiffButton = $("<button />")
        .attr(
          "class",
          "bolt-header-command-item-button bolt-button bolt-icon-button enabled bolt-focus-treatment"
        )
        .attr("type", "button")
        .attr("title", "Upstream Diff")
        .html(
          '<img src="https://www.chromium.org/_assets/icon-chromium-96.png" style="width: 16px; margin-right: 1ex;" alt="vscode.dev" /><span class="bolt-button-text body-m">Upstream Diff</span>'
        )
        .click((event) => {
          navigateToUpstreamDiff();
          event.stopPropagation();
        });
  
      $(document.body).on("keyup", (event) => {
        if (event.key === "." && event.target === document.body) {
          navigateToUpstreamDiff();
          event.stopPropagation();
        }
      });
  
      return upstreamDiffButton;
    }
  
    function highlightMMFiles(session, isDarkTheme) {
      setupHighlightStyles(isDarkTheme);
      session.onFirst(document, ".vss-base-editor", (editor) => {
        if (eus.seen(editor)) return;
        const path = decodeURI(getFilePath());
        const extension = getFileExt(path);
  
        if (extension == "mm") {
          session.onEveryNew(document, ".view-line", (line) => {
            const result = hljs.highlight("mm", line.innerText, true, null);
            // We must add the extra span at the end or sometimes, when adding a comment to a line, the highlighting will go away.
            line.innerHTML = `${result.value}<span style="user-select: none">&ZeroWidthSpace;</span>`;
          });
        }
      });
    }
  
    function setupHighlightStyles(isDarkTheme) {
      if (isDarkTheme) {
        addStyleOnce(
          "highlight",
          `
        .hljs {
            display: block;
            overflow-x: auto;
            background: #1e1e1e;
            color: #dcdcdc;
        }
  
        .hljs-keyword,
        .hljs-literal,
        .hljs-name,
        .hljs-symbol {
            color: #569cd6;
        }
  
        .hljs-link {
            color: #569cd6;
            text-decoration: underline;
        }
  
        .hljs-built_in,
        .hljs-type {
            color: #4ec9b0;
        }
  
        .hljs-class,
        .hljs-number {
            color: #b8d7a3;
        }
  
        .hljs-meta-string,
        .hljs-string {
            color: #d69d85;
        }
  
        .hljs-regexp,
        .hljs-template-tag {
            color: #9a5334;
        }
  
        .hljs-formula,
        .hljs-function,
        .hljs-params,
        .hljs-subst,
        .hljs-title {
            color: var(--text-primary-color, rgba(0, 0, 0, .7));
        }
  
        .hljs-comment,
        .hljs-quote {
            color: #57a64a;
            font-style: italic;
        }
  
        .hljs-doctag {
            color: #608b4e;
        }
  
        .hljs-meta,
        .hljs-meta-keyword,
        .hljs-tag {
            color: #9b9b9b;
        }
        .hljs-meta-keyword {
          font-weight: bold;
        }
  
        .hljs-template-variable,
        .hljs-variable {
            color: #bd63c5;
        }
  
        .hljs-attr,
        .hljs-attribute,
        .hljs-builtin-name {
            color: #9cdcfe;
        }
  
        .hljs-section {
            color: gold;
        }
  
        .hljs-emphasis {
            font-style: italic;
        }
  
        .hljs-strong {
            font-weight: 700;
        }
  
        .hljs-bullet,
        .hljs-selector-attr,
        .hljs-selector-class,
        .hljs-selector-id,
        .hljs-selector-pseudo,
        .hljs-selector-tag {
            color: #d7ba7d;
        }
  
        .hljs-addition {
            background-color: #144212;
            display: inline-block;
            width: 100%;
        }
  
        .hljs-deletion {
            background-color: #600;
            display: inline-block;
            width: 100%;
        }`
        );
      } else {
        addStyleOnce(
          "highlight",
          `
        .hljs{display:block;overflow-x:auto;padding:.5em;background:#fff;color:#000}.hljs-comment,.hljs-quote,.hljs-variable{color:green}.hljs-built_in,.hljs-keyword,.hljs-name,.hljs-selector-tag,.hljs-tag{color:#00f}.hljs-addition,.hljs-attribute,.hljs-literal,.hljs-section,.hljs-string,.hljs-template-tag,.hljs-template-variable,.hljs-title,.hljs-type{color:#a31515}.hljs-deletion,.hljs-meta,.hljs-selector-attr,.hljs-selector-pseudo{color:#2b91af}.hljs-doctag{color:grey}.hljs-attr{color:red}.hljs-bullet,.hljs-link,.hljs-symbol{color:#00b0e8}.hljs-emphasis{font-style:italic}.hljs-strong{font-weight:700}
      `
        );
      }
    }
  
    // Helper function to get path from URL query string.
    function getFilePath() {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("path") || "";
    }
  
    // Helper function to get the file extension out of a file path; e.g. `cs` from `blah.cs`.
    function getFileExt(path) {
      return /(?:\.([^.]+))?$/.exec(path)[1];
    }
  
    // Helper function to avoid adding CSS twice into a document.
    function addStyleOnce(id, style) {
      $(document.head)
        .once(id)
        .each(function () {
          $('<style type="text/css" />').html(style).appendTo(this);
        });
    }
    main();
  })();
  