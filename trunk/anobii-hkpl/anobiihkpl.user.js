// ==UserScript==
// @name           aNobii with HKPL
// @version        2
// @namespace      http://ellab.org/
// @description    Add ability to search Hong Kong Public Library online catalogue in aNobii pages including shelf, wishlist and search result
// @require        http://ellab-gm.googlecode.com/svn/tags/lib-utils-1/ellab-utils.js
// @require        http://ellab-gm.googlecode.com/svn/tags/lib-big5-1/ellab-big5.js
// @include        http://www.anobii.com/books/*
// @include        http://www.anobii.com/wishlist*
// @include        http://www.anobii.com/*/books*
// @include        http://www.anobii.com/*/wishlist*
// @include        http://www.anobii.com/search*
// @include        http://www.anobii.com/contributors/*
// @include        http://www.anobii.com/tags/*
// @include        http://www.anobii.com/news_neighbor*
// ==/UserScript==

/*
Author: Angus http://angusdev.mysinablog.com/
              http://angusdev.blogspot.com/
Date:   2009-11-10

Version history:
2                   Fix issue #4 Search books with punctuation in their name usually return no result from HKPL
1    10-Nov-2008    Initial release
*/

(function(){

var utils = org.ellab.utils;
var extract = org.ellab.utils.extract;

var LANG = new Array();
LANG['SEARCH'] = '搜尋公共圖書館';
LANG['NOTFOUND'] = '沒有紀錄';
LANG['FOUND1'] = '共 ';
LANG['FOUND2'] = ' 本，';
LANG['FOUND3'] = ' 本在館內架上';
LANG['MULTIPLE'] = '多於一個結果';
LANG['PROCESSING'] = '正在處理/準備註銷';
LANG['UNKNOWN'] = '錯誤';

var HKPL_TEXT_ON_SHELF = '館內架上';
var HKPL_TEXT_CHECKED_OUT = '借出';
var HKPL_TEXT_IN_TRANSIT = '轉移中';
var HKPL_TEXT_CLOSED_STACK = '閉架';

var SESSION_ID_KEY = 'ellab-anobii-hkpl-session';
var g_sessionId = utils.getSession(SESSION_ID_KEY);
var g_loading = false;
var LOADING_SRC = 'data:image/gif;base64,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';

function parseUTF8URL(url) {
  var array = new Array();
  for (var i=0;i<url.length;i++) {
    if (url[i] == '%') {
      if (i<url.length-2) {
        array.push(url.substring(i, i+3));
        i += 2;
      }
      else {
        array.push(url.substring(i));
        i = url.length;
      }
    }
    else {
      array.push(url[i]);
    }
  }

  var finalarray = new Array();
  for (var i=0;i<array.length;i++) {
    if (array[i][0] == '%' && array[i+1][0] == '%' && array[i+2][0] == '%' && array[i][1] == 'C' || array[i][1] == 'E') {
      finalarray.push(array[i] + array[i+1][1] + array[i+1][2] + array[i+2][1] + array[i+2][2]);
      i += 2;
    }
    else {
      finalarray.push(array[i]);
    }
  }

  return finalarray;
}

function getHKPLSessionId(func) {
  org.ellab.utils.crossOriginXMLHttpRequest({
    method: 'GET',
    url: 'http://libcat.hkpl.gov.hk/webpac_cjk/wgbroker.exe?new+-access+top.main-page',
    onload: function(t) {
      var res = t.responseText.match(/\/webpac_cjk\/wgbroker\.exe\?(\d+)\+-access\+top\.books\-page/);
      g_sessionId = res?res[1]:null;
      utils.setSession(SESSION_ID_KEY, g_sessionId);
      func.call(this);
    }
  });
}

function processBookList() {
  var DISPLAY_BOOK = 0;
  var DISPLAY_SIMPLE = 1;
  var DISPLAY_LIST = 2;
  var DISPLAY_GALLERY = 3;
  var DISPLAY_SHELF = 4;

  var displayMode = DISPLAY_BOOK;

  var res = document.evaluate("//body[@id='book_page']//div[@id='larger_wrap']//ul[@id='item_box_text']/li[@class='title']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  if (res.snapshotLength == 0) {
    res = document.evaluate("//table[@class='simple_list_view_container']//td[@class='title']//a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    if (res.snapshotLength > 0) {
      displayMode = DISPLAY_SIMPLE;
    }
    else {
      res = document.evaluate("//ul[@class='item_text']//li[@class='title']//a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
      if (res.snapshotLength > 0) {
        displayMode = DISPLAY_LIST;
      }
      else {
        res = document.evaluate("//ul[@class='gallery_view_container']//li[@class='title']//a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        if (res.snapshotLength > 0) {
          displayMode = DISPLAY_GALLERY;
        }
        // Not support shelf mode yet
        //else {
        //  res = document.evaluate("//ul[@class='shelf_view_container']//dt//a", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        //  if (res.snapshotLength > 0) {
        //    displayMode = DISPLAY_SHELF;
        //  }
        //}
      }
    }
  }

  for (var i=0; i<res.snapshotLength; i++) {
    var ele = res.snapshotItem(i);
    var matched = false;
    var url = '';
    if (displayMode == DISPLAY_BOOK) {
      url = document.location.href;
    }
    else {
      url = ele.href;
    }
    url = url.replace(/:_span_classsubtitle[^\/]*/g, '');
    var matched = url.match(/^http:\/\/(www\.)?anobii\.com\/books\/([\s:%_a-zA-Z0-9]+)\//);
    if (matched) {
      var bookName = matched[2];

      var search = document.createElement('a');
      search.innerHTML = LANG['SEARCH'];
      search.href = 'javascript:void(0)';
      search.setAttribute('name', bookName);
      search.addEventListener('click', function(e) {
        if (e.target.getAttribute('already-visited')) {
          e.stopPropagation();
        }
        else {
          onClickSearch(e.target, false);
          e.stopPropagation();
          e.preventDefault();
        }
      }, false);
      switch (displayMode) {
        case DISPLAY_BOOK:
          search.setAttribute('style', 'float:right; color:#6a0;');
          search.className = 'subtitle';
          ele.appendChild(search);
          break;
        case DISPLAY_GALLERY:
          search.setAttribute('style', 'display:block; color:#6a0;background:none;padding-left:0px;');
          search.className = 'subtitle';
          var lis = ele.parentNode.parentNode.getElementsByTagName('li');
          if (lis && lis.length > 0) {
            lis[lis.length - 1].style.bottom = '-38px';
            lis[lis.length - 1].appendChild(search);
          }
          break;
        default:
          search.setAttribute('style', 'float:right; color:#6a0;');
          ele.parentNode.appendChild(search);
          break;
      }

      search = null;
    }
  }
}

function onClickSearch(ele, isRetry) {
  // isRetry is true when sessionId is null or not valid
  if (!isRetry && g_loading) {
    return;
  }

  ele.setAttribute('already-visited', 'true');
  g_loading = true;

  ele.innerHTML = '<img src="' + LOADING_SRC + '" border="0"/>';
  if (!g_sessionId) {
    getHKPLSessionId (function() { onClickSearch(ele, true); });
    return;
  }

  var big5url = '';
  var utf8array = parseUTF8URL(ele.getAttribute('name'));
  for (var i=0;i<utf8array.length;i++) {
    if (utf8array[i][0] == '%' && utf8array[i].length == 7) {
      var big5 = org.ellab.big5.utf82big5(utf8array[i].substring(1));
      if (big5) {
        if (big5 >= 'A140' && big5 <= 'A3BF') {
          // replace "Graphical characters" with space
          big5url += '%20';
        }
        else {
          big5url += '%' + big5[0] + big5[1] + '%' + big5[2] + big5[3];
        }
      }
    }
    else {
      big5url += utf8array[i]=='_'?' ':utf8array[i];
    }
  }
  var urlprefix = 'http://libcat.hkpl.gov.hk/webpac_cjk/wgbroker.exe?' + g_sessionId + '+-access+top.books-page+search+open+BT+';
  var urlsuffix = '%23%23A:NONE%23NONE:NONE::%23%23';
  var url = urlprefix + big5url + urlsuffix;
  org.ellab.utils.crossOriginXMLHttpRequest({
    method: 'GET',
    url: url,
    overrideMimeType: 'text/html; charset=big5',
    onload: function(t) {
      g_loading = false;
      onLoadSearch(ele, t.responseText, url);
    }
  });
}

function onLoadSearch(ele, t, url) {
  if (t.indexOf('An Error Occured While Submitting Your Request to WebPAC') >= 0) {
    // session id not valid, need to retry
    getHKPLSessionId (function() { onClickSearch(ele, true); });
    return;
  }

  if (t.indexOf('<!-- File nohits.tem : NoHits Page Template File -->') >= 0) {
    ele.innerHTML = LANG['NOTFOUND'];;
  }
  else if (t.indexOf('<!-- File long.tem ') >= 0) {
    var checker = extract(t, '<SCRIPT>codedLibNames[libNameBlock++]="', '";</SCRIPT>');
    if (checker) {
      var total = 0;
      var onshelfTotal = 0;
      var res = t.match(/<SCRIPT>codedStatuses\[libCollBlock\+\+\]=\"([^\"]*)\";<\/SCRIPT>/g);
      for (var i=0 ; res && i<res.length ; i++) {
        var s = res[i];
        s = extract(s, '<SCRIPT>codedStatuses[libCollBlock++]="', '";</SCRIPT>');
        var defstr = s.match(/\(=([^\)]*)\)/);
        var def = new Array();
        if (defstr) {
          defstr = defstr[1];
          def = defstr.split(',');
        }

        s = s.replace(/\(=([^\)]*)\)/, '');
        s = s.replace(/\([^\)]+\)/g, function(matched) {
          matched = matched.replace('(', '').replace(')', '');
          var splitted = matched.split(',');
          var result = '';
          for (var j=0 ; j<splitted.length ; j++) {
            var splitted2 = splitted[j].split('x');
            if (splitted2.length > 1) {
              for (var k=0 ; k<parseInt(splitted2[0], 10) ; k++) {
                result += def[parseInt(splitted2[1]) - 1];
              }
            }
            else {
              result += def[parseInt(splitted2[0]) - 1];
            }
          }
          return result;
        });

        if (s) {
          var splitted = s.split('|');
          total += splitted.length;
          for (var j=0;j<splitted.length;j++) {
            if (splitted[j] == HKPL_TEXT_ON_SHELF) {
              onshelfTotal++;
            }
          }
        }
      }
      ele.innerHTML = LANG['FOUND1'] + total + LANG['FOUND2'] + onshelfTotal + LANG['FOUND3'];
    }
    else {
      ele.innerHTML = LANG['PROCESSING'];
    }
  }
  else if (t.indexOf('<!-- File brief.tem : Brief View Template File ') >= 0) {
    ele.innerHTML = LANG['MULTIPLE'];
  }
  else {
    ele.innerHTML = LANG['UNKNOWN'];
  }

  ele.href = url;
  ele.target = '_blank';
}

processBookList();

})();