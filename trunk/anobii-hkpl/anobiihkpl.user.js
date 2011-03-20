// ==UserScript==
// @name           aNobii with HKPL
// @version        2
// @namespace      http://ellab.org/
// @description    Add ability to search Hong Kong Public Library online catalogue in aNobii pages including shelf, wishlist and search result
// @require        http://ellab-gm.googlecode.com/svn/tags/lib-utils-2/ellab-utils.js
// @require        http://ellab-gm.googlecode.com/svn/tags/lib-big5-1/ellab-big5.js
// @resource       loading http://ellab-gm.googlecode.com/svn/tags/anobii-hkpl-2/loading.gif
// @resource       shadowAlpha http://ellab-gm.googlecode.com/svn/tags/anobii-hkpl-2/shadowAlpha.png
// @include        http://www.anobii.com/books/*
// @include        http://www.anobii.com/wishlist*
// @include        http://www.anobii.com/*/books*
// @include        http://www.anobii.com/*/wishlist*
// @include        http://www.anobii.com/search*
// @include        http://www.anobii.com/contributors/*
// @include        http://www.anobii.com/tags/*
// @include        http://www.anobii.com/news_neighbor*
// @include        http://libcat.hkpl.gov.hk/webpac_cjk/wgbroker.exe*
// @include        http://libcat.hkpl.gov.hk/webpac_eng/wgbroker.exe*
// ==/UserScript==

/*
Author: Angus http://angusdev.mysinablog.com/
              http://angusdev.blogspot.com/
              http://twitter.com/angusdev
Date:   2010-03-03

Version history:
2    03-Mar-2010    Issue #3 Handle multiple results from hkpl
                    Issue #4 Search books with punctuation in their name usually return no result from HKPL
                    Issue #7 Search button does not show up in book detail page after anobii revamp
1    10-Nov-2009    Initial release
*/

(function(){

var utils = org.ellab.utils;
var extract = org.ellab.utils.extract;

var LANG = new Array();
LANG['SEARCH'] = '搜尋';
LANG['SEARCH_HKPL'] = '搜尋公共圖書館';
LANG['SEARCH_PREV'] = '上一頁';
LANG['SEARCH_NEXT'] = '下一頁';
LANG['NOTFOUND'] = '沒有紀錄';
LANG['FOUND1'] = '共 ';
LANG['FOUND2'] = ' 本，';
LANG['FOUND3'] = ' 本在館內架上';
LANG['MULTIPLE'] = '多於一個結果';
LANG['PROCESSING'] = '正在處理/準備註銷';
LANG['ERROR'] = '錯誤';
LANG['UNKNOWN'] = '錯誤';

var HKPL_TEXT_ON_SHELF = '館內架上';
var HKPL_TEXT_CHECKED_OUT = '借出';
var HKPL_TEXT_IN_TRANSIT = '轉移中';
var HKPL_TEXT_CLOSED_STACK = '閉架';

var ONSHELF_LIB_REMOVE_REGEXP= [
  [/公共圖書館/g, ''], 
  [/香港中央圖書館/g, '中央'], 
  [/&LTscript>processData%28'.*'%29;&LT\/script>/g, function(m) { return eval('"\\u'+m.match(/%28'(.*)'%29/)[1]+'";'); } ],
  [/%[a-zA-Z0-9]{2}/g, function(m) { return unescape(m); } ]
];

var SEARCH_LINK_ID_PREFIX = 'anobii-with-hkpl-search-id-';
var SUPER_SEARCH_LINK_ID_PREFIX = 'anobii-with-hkpl-supersearch-id-';
var MULTI_RESULT_LAYER_ID_PREFIX = 'anobii-with-hkpl-multiple-id-';
var MULTI_RESULT_PREV_LINK_ID_PREFIX = 'anobii-with-hkpl-multiple-prev-';
var MULTI_RESULT_NEXT_LINK_ID_PREFIX = 'anobii-with-hkpl-multiple-next-';

var MULTI_RESULT_LAYER_CLASS = 'anobii-with-hkpl-multiple-layer';
var MULTI_RESULT_SEARCH_INLINE_CLASS = 'anobii-with-hkpl-search-inline';

var SESSION_ID_KEY = 'ellab-anobii-hkpl-session';
var g_domainPrefix = 'http://libcat.hkpl.gov.hk';
var g_sessionId = utils.getSession(SESSION_ID_KEY);
var g_loading = false;
var LOADING_IMG = utils.getResourceURL('loading', 'loading.gif');
var SHADOWALPHA_IMG = utils.getResourceURL('shadowAlpha', 'shadowAlpha.png');

function DEBUG(msg) {
  //if (console && console.log) console.log(msg);
}

function decimalToHex(d, padding) {
  var hex = Number(d).toString(16);
  padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

  while (hex.length < padding) {
    hex = '0' + hex;
  }

  return hex.toUpperCase();
}

function encodeUTF8(s) {
  s = s.replace(/\r\n/g,'\n');
  var utftext = [];

  for (var i=0 ; i<s.length ; i++) {
    var c = s.charCodeAt(i);

    if (c < 2048) {
      utftext.push(s[i]);
    }
    else {
      utftext.push(decimalToHex((c >> 12) | 224, 2) +
                   decimalToHex(((c >> 6) & 63) | 128, 2) +
                   decimalToHex((c & 63) | 128, 2));
    }
  }

  return utftext;
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

  var res = document.evaluate("//div[@id='product_info']/div[@class='info']/h1[@class='title']", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
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
    var matched = ele.innerHTML.match(/^\s*([^<]+)/);
    if (matched) {
      var bookName = matched[1].replace(/^s+/, '').replace(/\s+$/, '');

      // build the super search link in original book name
      // in super search link, click on a word of the book name will search the partial book name up to that word
      // first split the book name to different search English word, number or other character
      var superSearchWords = [];
      var tmpBookName = utils.decodeHTML(bookName);
      while (tmpBookName) {
        var resSearchWord = tmpBookName.match(/^[a-zA-Z0-9]+/);
        if (resSearchWord) {
          superSearchWords.push(resSearchWord[0]);
        }
        else {
          resSearchWord = tmpBookName.match(/^\s+/);
          if (resSearchWord) {
            superSearchWords.push(resSearchWord[0]);
          }
          else {
            superSearchWords.push(tmpBookName[0]);
          }
        }
        tmpBookName = tmpBookName.substring(superSearchWords[superSearchWords.length-1].length);
      }
      
      var superSearchHTML = '';
      for (var j=0; j<superSearchWords.length; j++) {
        if (/^\s+$/.test(superSearchWords[j])) {
          // space, no link
          superSearchHTML += superSearchWords[j];
        }
        else {
          superSearchHTML += '<a id="'+ SUPER_SEARCH_LINK_ID_PREFIX + i + '-' + j +'" href="javascript:void(0)">' + utils.encodeHTML(superSearchWords[j]) + '</a>';
        }
      }
      ele.innerHTML = ele.innerHTML.replace(bookName, superSearchHTML);
      for (var j=0; j<superSearchWords.length; j++) {
        var superSearch = document.getElementById(SUPER_SEARCH_LINK_ID_PREFIX + i + '-' + j);
        if (superSearch) {
          var searchPhrase = bookName.substring(0, j+1);
          var searchPhrase = superSearchWords.slice(0, j+1).join('');
          superSearch.setAttribute('name', searchPhrase);
          superSearch.setAttribute('title', LANG['SEARCH'] +' ' + searchPhrase);
          attachSearchLinkListener(superSearch);
        }
      }
      
      var search = document.createElement('a');
      search.innerHTML = LANG['SEARCH_HKPL'];
      search.href = 'javascript:void(0)';
      search.setAttribute('name', bookName);
      search.setAttribute('id', SEARCH_LINK_ID_PREFIX + i);
      attachSearchLinkListener(search);
      
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

function onClickSearch(searchLink, isRetry) {
  // isRetry is true when sessionId is null or not valid
  if (!isRetry && g_loading) {
    return;
  }

  var originSearchLink = searchLink;
  
  if (searchLink.getAttribute('id')) {
    var searchId = searchLink.getAttribute('id').match('^' + SUPER_SEARCH_LINK_ID_PREFIX + '(\\d+)');
    if (searchId) {
      searchId = searchId[1];
      // check if it is a supersearch link, fake the program to the normal search link so the result will show on the normal search link
      searchLink = document.getElementById(SEARCH_LINK_ID_PREFIX + searchId);
      
      // remove the multi result of previous search
      var multipleLayer = document.getElementById(MULTI_RESULT_LAYER_ID_PREFIX + searchId);
      if (multipleLayer) {
        multipleLayer.parentNode.removeChild(multipleLayer);
      }
    }
  }
  
  searchLink.setAttribute('already-visited', 'true');
  g_loading = true;

  searchLink.innerHTML = '<img src="' + LOADING_IMG + '" border="0"/>';
  if (!g_sessionId) {
    getHKPLSessionId (function() { onClickSearch(searchLink, true); });
    return;
  }

  var urlPrefix = g_domainPrefix + '/webpac_cjk/wgbroker.exe?' + g_sessionId + '+-access+top.books-page+search+open+BT+';
  var urlSuffix = '%23%23A:NONE%23NONE:NONE::%23%23';
  var url = '';

  if (originSearchLink.getAttribute('name')) {
    var big5url = '';
    var utf8array = encodeUTF8(originSearchLink.getAttribute('name'));
    for (var i=0;i<utf8array.length;i++) {
      if (utf8array[i].length == 6) {
        var big5 = org.ellab.big5.utf82big5(utf8array[i]);
        if (big5) {
          if (big5 >= 'A140' && big5 <= 'A3BF') {
            // replace "Graphical characters" with space
            if (i < utf8array.length - 1) {
              big5url += '%20';
            }
          }
          else {
            big5url += '%' + big5[0] + big5[1] + '%' + big5[2] + big5[3];
          }
        }
      }
      else {
        big5url += utf8array[i]=='_'?'%20':encodeURIComponent(utf8array[i]);
      }
    }
    url = urlPrefix + big5url + urlSuffix;
  }
  else if (originSearchLink.getAttribute('searchurl')) {
    url = g_domainPrefix + originSearchLink.getAttribute('searchurl');
  }

  DEBUG(url);
  if (url) {
    org.ellab.utils.crossOriginXMLHttpRequest({
      method: 'GET',
      url: url,
      overrideMimeType: 'text/html; charset=big5',
      onload: function(t) {
        g_loading = false;
        onLoadSearch(searchLink, t.responseText, url);
      }
    });
  }
  else {
    // make a fake response to report error
    g_loading = false;
    onLoadSearch(searchLink, '', url);
  }
}

function moveMultipleResultLayer(divShadow, searchLink) {
  var minLeftMargin = 10;
  var minWidth = 300;
  var divWidth = 500;
  var divBorder = 0;
  var divPadding = 0;
  var shadowWidth = 6;
  var top = utils.calcOffsetTop(searchLink);
  top += searchLink.offsetHeight + shadowWidth + 6; // hardcode a vertical gap of 6px
  var left = utils.calcOffsetLeft(searchLink);
  left = left + shadowWidth + searchLink.offsetWidth - divWidth - divBorder * 2 - divPadding * 2;
  if (left < minLeftMargin) {
    divWidth = Math.max(minWidth, divWidth - (minLeftMargin - left));
    left = minLeftMargin;
  }

  divShadow.style.left = left + 'px';
  divShadow.style.top = top + 'px';

  var divContent = divShadow.getElementsByTagName('DIV')[0];
  if (divContent) {
      divContent.setAttribute('style',
                              'width:' + divWidth + 'px; padding:' + divPadding + 'px; background-color:white;' +
                              'margin:-' + shadowWidth + 'px ' + shadowWidth + 'px ' + shadowWidth + 'px -' + shadowWidth + 'px;' +
                              'border:' + divBorder + 'px solid grey;');
  }
}

function expandMultipleResult(searchLink, t) {
  var res = t.match(/<A HREF=\"\/webpac_cjk\/wgbroker\.exe\?[^\"]+search\+select[^\"]+\">/gi);
  if (res) {
    var html = '';
    for (var i=0;i<res.length;i++) {
      var searchUrl = res[i].match(/\"([^\"]+)\"/)[1];
      var s = extract(t, res[i], i<res.length-1?'<A':'</TABLE>');
      // remove <script> tag
      while (s.indexOf('<SCRIPT>') >= 0) {
        s = extract(s, '', '<SCRIPT>' ) + extract(s, '</SCRIPT>');
      }
      while (s.indexOf('<script>') >= 0) {
        s = extract(s, '', '<script>' ) + extract(s, '</script>');
      }
      // remove trailing tr
      if (s.indexOf('</TR>') >= 0) s = extract(s, '', '</TR>');
      if (s.indexOf('<TR') >= 0) s = extract(s, '', '<TR');

      s = '<td>' + s + '</td>';
      // cleanup td attr
      s = s.replace(/<td[^\>]*>/ig, '<td>');
      // remove leading and trailing space of <td>
      s = s.replace(/>\s*(&nbsp;)?\s*/g, '>');
      s = s.replace(/\s*(&nbsp;)?\s*</g, '<');
      // convert book name to direct link
      s = s.replace(/<td>([^<]+)<\/td>/i, '<td><a href="' + g_domainPrefix + searchUrl + '" target="_blank">$1</a></td>');
      // add the search inline button after the first cell
      s = s.replace(/<\/td>/i, '</td><td><a style="white-space:nowrap; color:#6a0;" class="' + MULTI_RESULT_SEARCH_INLINE_CLASS + '" href="javascript:void(0);"' +
                               ' searchurl="' + searchUrl + '">' +
                               LANG['SEARCH'] + '</a></td>');

      html += '<tr>' + s + '</tr>';
    }
    if (html) {
      var searchLinkId = searchLink.getAttribute('id');
      var searchId = searchLinkId.match(/\d$/)[0];

      // add prev/next page link if needed
      var prevPageRes = t.match(/prev_page_value=\"([^\"]+)\"/);
      var nextPageRes = t.match(/next_page_value=\"([^\"]+)\"/);
      if (prevPageRes || nextPageRes) {
         function createSearchInlineLink(id, url, text) {
           return '<a style="white-space:nowrap; color:#6a0;" class="' + MULTI_RESULT_SEARCH_INLINE_CLASS + '" href="javascript:void(0);"' +
                  (id?' id="' + id + '"':'') +
                  ' searchurl="' + url + '">' + text + '</a>';
         }
         var prevHTML = prevPageRes?createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, prevPageRes[1], LANG['SEARCH_PREV']):'';
         var nextHTML = nextPageRes?createSearchInlineLink(MULTI_RESULT_NEXT_LINK_ID_PREFIX + searchId, nextPageRes[1], LANG['SEARCH_NEXT']):'';
         if (prevHTML && nextHTML) {
           // add the space separater
           nextHTML = ' ' + nextHTML;
         }
         html = html + '<tr><td colspan="4">' + prevHTML + nextHTML + '</td></tr>';
      }

      // set td style
      html = html.replace(/<td([^>]*)>/ig, '<td$1 style="border:1px solid grey; padding:2px 4px 2px 4px; text-align:left;">');

      html = '<table width="100%">' + html + '</table>';

      // for some cases searchLink is not the original search link of that book (e.g. searchLink is 'Next')
      var originalSearchLink = document.getElementById(SEARCH_LINK_ID_PREFIX + searchId);
      // remove previous div if exists (e.g. searchLink is 'Next')
      var divShadow = document.getElementById(MULTI_RESULT_LAYER_ID_PREFIX + searchId);
      if (divShadow) {
        divShadow.parentNode.removeChild(divShadow);
        divShadow = null;
      }
      divShadow = document.createElement('div');
      divShadow.setAttribute('id', MULTI_RESULT_LAYER_ID_PREFIX + searchId);
      divShadow.className = MULTI_RESULT_LAYER_CLASS;
      divShadow.setAttribute('style',
                             'position:absolute; padding:0px; background:url(' + SHADOWALPHA_IMG + ') no-repeat right bottom;');

      divContent = document.createElement('div');
      divContent.innerHTML = html;

      // attach the click event of search link
      var searchRes = utils.getElementsByClassName(MULTI_RESULT_SEARCH_INLINE_CLASS, divContent);
      for (var i=0;i<searchRes.length;i++) {
        var search = searchRes[i];
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
      }

      if (searchLinkId.match('^' + SEARCH_LINK_ID_PREFIX)) {
        searchLink.addEventListener('mouseover', function(e) {
          var searchId = e.target.getAttribute('id');
          if (searchId) {
            searchId = searchId.match(/\d$/);
            if (searchId) {
              searchId = searchId[0];
              var multipleLayer = document.getElementById(MULTI_RESULT_LAYER_ID_PREFIX + searchId);
              if (multipleLayer) {
                moveMultipleResultLayer(multipleLayer, e.target);
                multipleLayer.style.display = '';
              }
            }
          }
        }, false);
      }

      divShadow.appendChild(divContent);
      moveMultipleResultLayer(divShadow, originalSearchLink);
      document.body.appendChild(divShadow);
    }
  }
}

// HKPL's encoding algorithm is like a compression algorithm:
// (=aaa,bbb|ccc|,|ddd)(2x3,1,3x2)|eee|fff|(2,1)
// where everything inside () is for encoding, others will be directly copy to the final string
// for strings inside (), starts with '=' is to define the repeating element,
// others control the sequence of the elements, e.g. 3x2 means the second element will appears 3 times
// and they are comma separated
// the example above will expand to :
// bbb|ccc|bbb|ccc|bbb|ccc|aaa|ddd|ddd|ddd|eee|fff|bbb|ccc|aaa
// ..........(2x3).........(1)....(3x2)...|eee|fff|..(2)...(1)
function decodeHKPLFunnyEncoding(s) {
  var defstr = s.match(/\(=([^\)]*)\)/);
  var def = new Array();
  if (defstr) {
    defstr = defstr[1];
    def = defstr.split(',');
  }

  // remove the definition block
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

  return s;
}

// attache the click event to the search link and super search link
function attachSearchLinkListener(a) {
  a.addEventListener('click', function(e) {
    if (e.target.getAttribute('already-visited')) {
      e.stopPropagation();
    }
    else {
      onClickSearch(e.target, false);
      e.stopPropagation();
      e.preventDefault();
    }
  }, false);
}

function onLoadSearch(searchLink, t, url) {
  DEBUG('onLoadSearch');
  
  if (t.indexOf('An Error Occured While Submitting Your Request to WebPAC') >= 0) {
    // session id not valid, need to retry
    DEBUG('Get Session ID');
    getHKPLSessionId (function() { onClickSearch(searchLink, true); });
    return;
  }

  if (t.indexOf('ERRORError retrieving record') >= 0) {
    searchLink.innerHTML = LANG['ERROR'];
  }
  else if (t.indexOf('<!-- File nohits.tem : NoHits Page Template File -->') >= 0) {
    searchLink.innerHTML = LANG['NOTFOUND'];
  }
  else if (t.indexOf('<!-- File long.tem ') >= 0) {
    var clnRes = t.match(/<SCRIPT>codedLibNames\[libNameBlock\+\+\]=\"([^\"]+)\";<\/SCRIPT>/g);
    if (clnRes && clnRes.length) {
      var cln = [];
      var cs = [];
      for (var i=0 ; i<clnRes.length ; i++) {
        var codedLibNames = clnRes[i];
        codedLibNames = extract(codedLibNames, '<SCRIPT>codedLibNames[libNameBlock++]="', '";</SCRIPT>');
        codedLibNames = decodeHKPLFunnyEncoding(codedLibNames);
        cln = cln.concat(codedLibNames.split('|'));
      }
      var csRes = t.match(/<SCRIPT>codedStatuses\[libCollBlock\+\+\]=\"([^\"]+)\";<\/SCRIPT>/g);
      for (var i=0 ; csRes && i<csRes.length ; i++) {
        var codedStatuses = csRes[i];
        codedStatuses = extract(codedStatuses, '<SCRIPT>codedStatuses[libCollBlock++]="', '";</SCRIPT>');
        codedStatuses = decodeHKPLFunnyEncoding(codedStatuses);
        cs = cs.concat(codedStatuses.split('|'));
      }

      var total = cs.length;
      var onshelfTotal = 0;
      var onshelfLib = [];
      for (var i=0 ; i<cs.length ; i++) {
        if (cs[i] == HKPL_TEXT_ON_SHELF) {
          ++onshelfTotal;
          if (i<cln.length) {
            var libname = cln[i];
            for (var j=0 ; j<ONSHELF_LIB_REMOVE_REGEXP.length ; j++) {
              libname = libname.replace(ONSHELF_LIB_REMOVE_REGEXP[j][0], ONSHELF_LIB_REMOVE_REGEXP[j][1]);
            }
            onshelfLib.push(libname);
          }
        }
      }
      searchLink.innerHTML = LANG['FOUND1'] + total + LANG['FOUND2'] + onshelfTotal + LANG['FOUND3'];
      
      if (onshelfLib.length) {
        var onshelfLibString = onshelfLib[0];
        var lastItemCount = 1;
        for (var i=1 ; i<onshelfLib.length ; i++) {
          if (onshelfLib[i] == onshelfLib[i-1]) {
            ++lastItemCount;
          }
          else {
            if (lastItemCount > 1) {
              onshelfLibString += ' (' + lastItemCount + ')';
              lastItemCount = 1;
            }
            onshelfLibString += ', ' + onshelfLib[i];
          }
        }

        searchLink.title = onshelfLibString;
      }
    }
    else {
      searchLink.innerHTML = LANG['PROCESSING'];
    }
  }
  else if (t.indexOf('<!-- File brief.tem : Brief View Template File ') >= 0) {
    searchLink.innerHTML = LANG['MULTIPLE'];
    expandMultipleResult(searchLink, t);
  }
  else {
    searchLink.innerHTML = LANG['UNKNOWN'];
    // clear the session ID and restart
    g_sessionId = null;
    utils.setSession(SESSION_ID_KEY, g_sessionId);
  }

  searchLink.href = url;
  searchLink.target = '_blank';
}

function isValidISBN(isbn) {
  if (isbn && isbn.length == 10) {
    var total = 0;
    for (var i=0 ; i<9 ; i++) {
      total += (i+1) * parseInt(isbn[i], 10);
    }
    total = total % 11;
    return total==10?(isbn[9] == 'X'):(total == parseInt(isbn[9], 10));
  }
  else if (isbn && isbn.length == 13) {
    var total = 0;
    for (var i=0 ; i<12 ; i++) {
      total += (i%2?3:1) * parseInt(isbn[i], 10);
    }
    total = 10 - total % 10;
    total = total==10?0:total;
    return total == parseInt(isbn[12], 10);
  }
  else {
    return false;
  }
}

function hkplAddAnobiiLink() {
  if (document.evaluate("//form[@name='limitHoldings']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue) {
    // has the Limit Holdings form means it is a book detail page
    var res = document.evaluate("//td[@valign='top' and not(@width)]", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i=0 ; i<res.snapshotLength ; i++) {
      var td = res.snapshotItem(i);
      var isbn = td.textContent.match(/^[0-9]{9,13}X?/);
      if (isbn) {
        isbn = isbn[0];
        if (isValidISBN(isbn)) {
          var loading = document.createElement('img');
          loading.src = LOADING_IMG;
          td.appendChild(loading);
          org.ellab.utils.crossOriginXMLHttpRequest({
            method: 'GET',
            url: 'http://www.anobii.com/search?isbn=' + isbn + '&searchAdvance=Search',
            onload: function(t) {
              t = extract(t.responseText, '<div id="shelf_wrap" class="list_view">');
              var img = extract(t, 'src="', '" class="book_cover_');
              var bookid = extract(t, '<tr id="', '"');
              //no_cover_small.jpg
              td.removeChild(loading);
              td.innerHTML = '<a href="http://www.anobii.com/books/' + bookid + '" target="_blank"><img src="' + img.replace('type=1', 'type=3') + '"/><br/>' + td.innerHTML + '</a>';
            }
          });
        }
      }
    }
  }
}

if (document.location.href.match(/anobii\.com/)) {
  document.body.addEventListener('click', function(e) {
    var res = utils.getElementsByClassName(MULTI_RESULT_LAYER_CLASS);
    for (var i=0;i<res.length;i++) {
      res[i].style.display = 'none';
    }
  }, false);

  processBookList();
}
else if (document.location.href.match(/hkpl\.gov\.hk/)) {
  hkplAddAnobiiLink();
}

})();