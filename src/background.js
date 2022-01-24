chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.contentScriptQuery == 'ajax') {console.log(request.url);console.log(request.params);
      fetch(request.url, request.params)
          .then(response => response.text())
          .then(text => sendResponse(text))
          .catch(error => console.error(error));
      return true;  // Will respond asynchronously.
    }
  });
