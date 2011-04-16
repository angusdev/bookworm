(function(){

function registerNS(ns) {
  var nsParts = ns.split(".");
  var root = window;

  for (var i=0; i<nsParts.length; i++) {
    if (typeof root[nsParts[i]] == "undefined") {
      root[nsParts[i]] = new Object();
    }
    root = root[nsParts[i]];
  }
}

registerNS("org.ellab.utils");

org.ellab.utils.isChrome = navigator.userAgent.match(/Chrome/)?true:false;

org.ellab.utils.extract = function(s, prefix, suffix) {
  var i = s.indexOf(prefix);
  if (i >= 0) {
    s = s.substring(i + prefix.length);
  }
  else {
    return '';
  }
  if (suffix) {
    i = s.indexOf(suffix);
    if (i >= 0) {
      s = s.substring(0, i);
    }
    else {
      return '';
    }
  }
  return s;
};

org.ellab.utils.crossOriginXMLHttpRequest_GM = function(params) {
  GM_xmlhttpRequest({
      method: params.method,
      url: params.url,
      overrideMimeType: params.overrideMimeType,
      onload: function(response){
        if (response.status == 301 || response.status == 302 || response.status == 303) {
          var loc = /Location: ([^\n]*)\n/.exec(response.responseHeaders)[1];
          GM_xmlhttpRequest({method:params.method, overrideMimeType: params.overrideMimeType, url:loc, onload:arguments.callee});
          return;
        }
        params.onload.call(this, response);
      }
  });
};

org.ellab.utils.crossOriginXMLHttpRequest_Chrome = function(params) {
  params.onComplete = function(status, data) {
    if (status == 200) {
      var response = {status:status, responseText:data};
      if (params.onload) {
        params.onload.call(this, response);
      }
    }
  };
  proxyXHR(params);
};

org.ellab.utils.crossOriginXMLHttpRequest = function(params) {
  if (this.isChrome) {
    this.crossOriginXMLHttpRequest_Chrome(params);
  }
  else {
    this.crossOriginXMLHttpRequest_GM(params);
  }
};

org.ellab.utils.getCookie = function(name) {
  if (document.cookie.length>0) {
    var start = document.cookie.indexOf(name + '=');
    if (start >= 0) {
      start = start + name.length + 1;
      var end = document.cookie.indexOf(';', start);
      if (end < 0) {
        end = document.cookie.length;
      }
      return unescape(document.cookie.substring(start, end));
    }
  }
  return '';
};

org.ellab.utils.setCookie = function(name, value, expiredays) {
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + expiredays);
  document.cookie =name + "=" + escape(value) + ((expiredays==null)?'':';expires=' + exdate.toGMTString());
};

org.ellab.utils.getSession = function(name) {
  if (window.sessionStorage && window.sessionStorage.getItem) {
    return window.sessionStorage.getItem(name);
  }
  else {
    return this.getCookie(name);
  }
}

org.ellab.utils.setSession = function(name, value) {
  if (window.sessionStorage && window.sessionStorage.setItem) {
    return window.sessionStorage.setItem(name, value);
  }
  else {
    return this.setCookie(name, value);
  }
}

org.ellab.utils.getResourceURL = function(name, file) {
  if (typeof GM_getResourceURL != 'undefined') {
    return GM_getResourceURL(name);
  }
  else if (typeof chrome != 'undefined' && typeof chrome.extension != 'undefined' && typeof chrome.extension.getURL != 'undefined') {
    return chrome.extension.getURL(file);
  }
  else {
    return file;
  }
}

org.ellab.utils.calcOffsetTop = function(node) {
  var top = 0;
  do {
    if (!isNaN(node.offsetTop)) top += node.offsetTop;
  } while (node = node.offsetParent);

  return top;
}

org.ellab.utils.calcOffsetLeft = function(node) {
  var left = 0;
  do {
    if (!isNaN(node.offsetLeft)) left += node.offsetLeft;
  } while (node = node.offsetParent);

  return left;
}

org.ellab.utils.xpath = function(xpath, ele) {
  return document.evaluate(xpath, ele?ele:document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

org.ellab.utils.xpathl = function(xpath, ele) {
  return document.evaluate(xpath, ele?ele:document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}

org.ellab.utils.getElementsByClassName = function(className, node) {
  if (!className) {
    return [];
  }
  node = node || document;
  if (node.getElementsByClassName) {
    return node.getElementsByClassName(className);
  }
  else {
    var res = document.evaluate(".//*[contains(concat(' ', @class, ' '), ' " + className + " ')]", node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    var result = [];
    for (var i=0;i<res.snapshotLength;i++) {
      result.push(res.snapshotItem(i));
    }
    return result;
  }
}

org.ellab.utils.decodeHTML = function(s) {
  s = s.replace('&gt;', '>', 'g');
  s = s.replace('&lt;', '<', 'g');
  s = s.replace('&quot;', '"', 'g');
  s = s.replace('&amp;', '&', 'g');
  return s;
}

org.ellab.utils.encodeHTML = function(s) {
  s = s.replace('&', '&amp;', 'g');
  s = s.replace('>', '&gt;', 'g');
  s = s.replace('<', '&lt;', 'g');
  s = s.replace('"', '&quot;', 'g');
  return s;
}

org.ellab.utils.jsonParse = function(s) {
  if (typeof(JSON) != 'undefined' && JSON.parse) {
    return JSON.parse(s);
  }
  else {
    return eval(s);
  }
}

})();