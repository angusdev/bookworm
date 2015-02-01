// ==UserScript==
// @name           Bookworm
// @version        5
// @namespace      http://ellab.org/
// @description    Integrate aNobii, Hong Kong Public Library and books.com.tw. Features like searching Hong Kong Public Library online catalogue in aNobii pages. Auto filling the Hong Kong Public Library Book Suggestion form with information from books.com.tw
// @require        http://ellab-gm.googlecode.com/svn/tags/lib-utils-5/ellab-utils.js
// @resource       loading http://ellab-gm.googlecode.com/svn/tags/anobii-hkpl-3/loading.gif
// @include        http://www.anobii.com/books/*
// @include        http://www.anobii.com/wishlist*
// @include        http://www.anobii.com/*/books*
// @include        http://www.anobii.com/*/wishlist*
// @include        http://www.anobii.com/search*
// @include        http://www.anobii.com/contributors/*
// @include        http://www.anobii.com/tags/*
// @include        http://www.anobii.com/news_neighbor*
// @include        http://webcat.hkpl.gov.hk/*
// @include        https://webcat.hkpl.gov.hk/*
// @include        https://www.hkpl.gov.hk/tc_chi/collections/collections_bs/collections_bs.html*
// @include        http://www.books.com.tw/exep/prod/booksfile.php?item=*
// ==/UserScript==

/*
Author: Angus http://angusdev.mysinablog.com/
              http://angusdev.blogspot.com/
              http://twitter.com/angusdev
Date:   2012-09-18

Version history:
5    18-Sep-2012    Issue #29 Search by subtitle
                    Issue #30 Cross check HKPL ISBN to avoid displaying the result of another book with same book name
                    Issue #36 HKPL 2012 Jan revamp
                    Issue #37 Upgrade to Chrome Manifest version 2
4    09-Apr-2011    Issue #22 Fix the bug of inconsistent style search books.com.tw link
                    Issue #23 Fix the bug that show multiple search books.com.tw links
                    Issue #24 Link from books.com.tw to anobii
                    Issue #25 Display anobii rating in HKPL and Books.com.tw book detail page
                    Issue #28 Fix the bug of duplicated search HKPL link in Chrome 12
3    24-Mar-2011    Issue #8 Let user search partial book name if full name not found in hkpl
                    Issue #9 Show prev/next page when multiple result has more than 1 page
                    Issue #10 In HKPL search result, show list of libraries that has the book on shelf
                    Issue #13 In HKPL book detail page, show link to anobii book page using ISBN
                    Issue #17 Integrate HKPL book suggestion and books.com.tw for one click book suggestion
                    Issue #19 Fix the bug that didn't show the search HKPL link if viewing others bookshelf in gallery mode
                    Issue #20 Rename extension name to "Bookworm"
                    Issue #21 Show link to search books.com.tw if not found in HKPL
2    03-Mar-2010    Issue #3 Handle multiple results from hkpl
                    Issue #4 Fix the bug that search books with punctuation in their name usually return no result from HKPL
                    Issue #7 Fix the bug that search button does not show up in book detail page after anobii revamp
1    10-Nov-2009    Initial release
*/

/*jshint devel:true */
/*global chrome, console, window, org, GM_addStyle, unsafeWindow, toTrad */
(function(){
'use strict';

var utils = org.ellab.utils;
var extract = org.ellab.utils.extract;
var xpath = org.ellab.utils.xpath;
var xpathl = org.ellab.utils.xpathl;
var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var ANOBII_LANG_EN = 'en';
var ANOBII_LANG_TC = 'zh-TW';
var ANOBII_LANG_SC = 'zh-CN';
var LANG_EN = 0;
var LANG_TC = 1;
var LANG_SC = 2;
var g_lang = LANG_TC;

var LANG = [];

LANG['SEARCH'] = ['Search', '搜尋', '搜寻'];
LANG['SEARCH_HKPL'] = ['Search HKPL', '搜尋公共圖書館', '搜寻公共图书馆'];
LANG['SEARCH_PREV'] = ['Previous', '上一頁', '上一页'];
LANG['SEARCH_NEXT'] = ['Next', '下一頁', '下一页'];
LANG['NOTFOUND'] = ['Not found', '沒有紀錄', '没有纪录'];
LANG['HKPL_FOUND_ONSHELF'] = ['$1 on shelf', '$1 本架上', '$1 本架上'];
LANG['HKPL_FOUND_RESERVE'] = [', $1 reservation', ' $1 個預約', ' $1 个预约'];
LANG['MULTIPLE'] = ['Multiple Result', '多於一個結果', '多于一个结果'];
LANG['PROCESSING'] = ['Processing', '正在處理/準備註銷', '正在处理/准备注销'];
LANG['SEARCH_BOOKS_TW'] = ['Search 博客來', '搜尋博客來', '搜寻博客来'];
LANG['ERROR'] = ['Error', '錯誤', '错误'];
LANG['UNKNOWN'] = ['Error', '錯誤', '错误'];

LANG['ANOBII_EDIT_BOOK_MOREDATE_0'] = ['Today', '今天', '今天'];
LANG['ANOBII_EDIT_BOOK_MOREDATE_1'] = ['Yesterday', '昨天', '昨天'];
LANG['ANOBII_EDIT_BOOK_MOREDATE_2'] = ['2 days ago', '前天', '前天'];

LANG['GET_SUGGESTION'] = '填寫內容';
LANG['LOADING'] = ['Loading...', '載入中...', '载入中...'];
LANG['INVALID_SUGGESTION_URL'] = '不正確的 URL，只支援「博客來 http://www.books.com.tw」';

LANG['HKPL_SUGGESTION'] = '圖書館購書建議';

LANG['ANOBII_RATING'] = ['Anobii Rating', 'aNobii 評級', 'aNobii 评级'];
LANG['ANOBII_RATING_DOUBAN_PEOPLE_COUNT'] = ['$1/$2', '$1 人評價 $2 人擁有', '$1 人评价 $2 人拥有'];
LANG['DOUBAN_PAGE'] = ['Douban Page', '豆瓣網頁', '豆瓣网页'];
LANG['DOUBAN_REVIEW'] = ['Douban Review', '豆瓣評論', '豆瓣评论'];
LANG['DOUBAN_HEADING'] = ['$1 Reviews', '$1 則評論', '$1 则评论'];
LANG['DOUBAN_REVIEW_ALL_EDITION'] = ['$1 Reviews (all editions)', '$1 則評論(所有版本)', '$1 则评论(所有版本)'];
LANG['DOUBAN_HELPFUL'] = ['$1 people find this helpful', '$1 個人認為這是很有幫助', '$1 个人认为这是很有帮助'];
LANG['DOUBAN_MORE'] = [' ... (continue)', ' ...(繼續) ', ' ...(继续) '];
LANG['DOUBAN_COMMENT'] = [' ($1 feedbacks) ', ' ($1 個回應) ', ' ($1 个回应) '];
LANG['DOUBAN_TIME'] = [' said on $1', '在 $1 說', '在 $1 说'];
LANG['DOUBAN_COMMENT_PREV'] = ['← Previous', '← 前一頁', '← 前一页'];
LANG['DOUBAN_COMMENT_NEXT'] = ['Next →', '後一頁 →', '后一页 →'];

// k - key
// lng - lang, if null use g_lang
function lang(k, lng) {
  lng = lng || g_lang;

  var v = LANG[k];
  if (typeof(v) === 'undefined') {
    return k;
  }
  else {
    if (typeof(v) === 'string') {
      return v;
    }
    else {
      return v[lng];
    }
  }
}

var SUGGEST_COUNTRY = [];
SUGGEST_COUNTRY['TC'] = ['台灣', '香港', '中國'];

var HKPL_TEXT_ON_SHELF = '館內架上';
var HKPL_TEXT_CHECKED_OUT = '借出';
var HKPL_TEXT_IN_TRANSIT = '轉移中';
var HKPL_TEXT_CLOSED_STACK = '閉架';

var ONSHELF_LIB_REMOVE_REGEXP = [
  [/公共圖書館/g, ''],
  [/香港中央圖書館/g, '中央'],
  [/&LTscript>processData%28'.*'%29;&LT\/script>/g, function(m) { return eval('"\\u'+m.match(/%28'(.*)'%29/)[1]+'";'); } ],
  [/%[a-zA-Z0-9]{2}/g, function(m) { return decodeURIComponent(m); } ]
];

var SEARCH_LINK_ID_PREFIX = 'bookworm-search-id-';
var SUPER_SEARCH_LINK_ID_PREFIX = 'bookworm-supersearch-id-';
var MULTI_RESULT_LAYER_ID_PREFIX = 'bookworm-multiple-id-';
var MULTI_RESULT_PREV_LINK_ID_PREFIX = 'bookworm-multiple-prev-';
var MULTI_RESULT_NEXT_LINK_ID_PREFIX = 'bookworm-multiple-next-';

var SEARCH_LINK_CLASS = 'bookworm-search-book-link'; // css class name for the search link
var SUPERSEARCH_LINK_CLASS = 'bookworm-supersearch-link'; // css class name for the super search link
var SEARCH_ADDINFO_CLASS = 'bookworm-search-addinfo'; // css class name for addition info on search result
var SEARCH_ADDINFO_BOOKS_TW_CLASS = 'bookworm-search-addinfo-books-tw'; // css class name for search books.tw
var SEARCH_ADDINFO_BOOKNAME_CLASS = 'bookworm-search-addinfo-bookname'; // css class name for additional book name
var MULTI_RESULT_LAYER_CLASS = 'bookworm-multiple-layer';
var MULTI_RESULT_SEARCH_INLINE_CLASS = 'bookworm-search-inline';
var ANOBII_EDIT_BOOK_MOREDATE_CLASS = 'bookworm-moredate'; // css class name for for implement 'yesterday', '2 days ago' shortcut button
var ANOBII_EDIT_BOOK_MOREDATE_ATTR = 'bookworm-moredate-diff'; // attribute for implement 'yesterday' (-1), '2 days ago' (-2) shortcut button

var GET_SUGGESTION_BUTTON_ID = 'bookworm-get-suggestion-button';

var SEARCH_ISBN_ATTR = 'bookworm-isbn';

var DOUBAN_REVIEW_TAB_REF = 'douban-review'; // the ref='xxx' of the tab li
var DOUBAN_REVIEW_DIV_ID = 'bookworm-douban-review'; // div to store the douban review HTML for tab switching
var DOUBAN_REVIEW_FULLINFO_URL_ATTR = 'bookworm-douban-review-fullinfo'; // the attribute name to store the fullinfo review json url
var DOUBAN_FEEDBACK_URL_ATTR = 'bookworm-douban-feedback-url'; // the attribute name to store the URL of feedback div
var DOUBAN_REVIEW_API_URL_ATTR = 'bookworm-douban-review-api'; // the attribtue name to store the review json url
var DOUBAN_REVIEW_ALL_EDITION_ATTR = 'bookworm-douban-review-all-edition'; // the attribtue name to store the all edition review count

var LOADING_IMG = utils.getResourceURL('loading', 'loading.gif');

var SESSION_ID_KEY = 'ellab-anobii-hkpl-session';
var g_domainPrefix = 'http://webcat.hkpl.gov.hk';
var g_pageType = '';  // indicates which page is in, used by different function to show different presentations
var g_loading = false;
var g_options = {
  anobiiexpandtag: true,
  translatetc: true
};

var PAGE_TYPE_ANOBII = 1;
var PAGE_TYPE_HKPL_BOOK = 2;
var PAGE_TYPE_HKPL_SUGGESTION = 3;
var PAGE_TYPE_BOOKS_TW_BOOK = 4;
var PAGE_TYPE_DOUBAN_BOOK = 5;

var DISPLAY_BOOK = 0;
var DISPLAY_SIMPLE = 1;
var DISPLAY_LIST = 2;
var DISPLAY_GALLERY = 3;
var DISPLAY_SHELF = 4;

var g_displayMode = DISPLAY_BOOK;

var SEARCH_TYPE_NAME = 1;
var SEARCH_TYPE_ISBN = 2;
var SEARCH_TYPE_URL = 3;

var SEARCH_RESULT_SINGLE = 1;
var SEARCH_RESULT_MULTI = 2;
var SEARCH_RESULT_NOTFOUND = 3;
var SEARCH_RESULT_ERROR = 4;

function DEBUG(msg) {
  //if (typeof unsafeWindow !== 'undefined' && unsafeWindow.console && unsafeWindow.console.log) unsafeWindow.console.log(msg); else if (typeof console != 'undefined' && console.log) console.log(msg);
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

// MMM D YYYY
function formatAnobiiDate(d) {
  if (d) {
    var m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return m[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  else {
    return '';
  }
}

function parseDateYYYYMMDDHHMMSS(str) {
  if (!str) return null;


  var res = str.match(/(\d{4})\-(\d{1,2})\-(\d{1,2})(\s+(\d{1,2})\:(\d{1,2})(\:(\d{1,2}))?)?(\s|$)/m);
  if (res) {
    var y = res[1];
    var m = res[2];
    var d = res[3];
    var h = res[5] || 0;
    var mi = res[6] || 0;
    var s = res[8] || 0;

    return new Date(y, m, d, h, mi, s);
  }
  else {
    return null;
  }
}

function processBookList() {
  g_displayMode = DISPLAY_BOOK;
  var res = xpathl("//div[@class='bookData bookDataRight']/h1");
  if (res.snapshotLength === 0) {
    res = xpathl("//table[@class='simple_list_view_container']//td[@class='title']//a");
    if (res.snapshotLength > 0) {
      g_displayMode = DISPLAY_SIMPLE;
    }
    else {
      res = xpathl("//ul[@class='item_text']//li[@class='title']//a");
      if (res.snapshotLength > 0) {
        g_displayMode = DISPLAY_LIST;
      }
      else {
        res = xpathl("//ul[@class='gallery_view_container']//li[@class='title']//a");
        if (res.snapshotLength > 0) {
          g_displayMode = DISPLAY_GALLERY;
        }
        // Not support shelf mode yet
        //else {
        //  res = xpathl("//ul[@class='shelf_view_container']//dt//a");
        //  if (res.snapshotLength > 0) {
        //    g_displayMode = DISPLAY_SHELF;
        //  }
        //}
      }
    }
  }

  DEBUG('g_displayMode=' + g_displayMode);

  for (var i=0; i<res.snapshotLength; i++) {
    var ele = res.snapshotItem(i);
    var matched = ele.innerHTML.match(/^\s*([^<]+)/);
    if (matched) {
      var bookName = matched[1].replace(/^s+/, '').replace(/\s+$/, '');
      var subtitle;

      var superSearchStartId = buildSuperSearch(ele, bookName, i, 0);

      switch (g_displayMode) {
        case DISPLAY_BOOK:
          subtitle = xpath("../h2[@class='subtitle']", ele);
          break;
        case DISPLAY_LIST:
        case DISPLAY_GALLERY:
          subtitle = xpath("../../li[@class='subtitle']", ele);
          break;
        case DISPLAY_SIMPLE:
          subtitle = xpath("./span[@class='subtitle']", ele);
          break;
      }
      if (subtitle) {
        buildSuperSearch(subtitle, subtitle.textContent, i, superSearchStartId);
        subtitle.className += ' ' + SUPERSEARCH_LINK_CLASS;
      }

      var search = document.createElement('a');
      search.innerHTML = lang('SEARCH_HKPL');
      search.href = '#';
      search.className = SEARCH_LINK_CLASS;
      search.setAttribute('name', bookName);
      search.setAttribute('id', SEARCH_LINK_ID_PREFIX + i);
      attachSearchLinkListener(search);

      var isbn;
      switch (g_displayMode) {
        case DISPLAY_BOOK:
          isbn = xpath('//div[@id="product_details"]//span[text()="ISBN-13:"]');
          if (!isbn) {
            isbn = xpath('//div[@id="product_details"]//span[text()="ISBN-10:"]');
          }
          if (isbn) {
            isbn = xpath('../strong', isbn);
            if (isbn) {
              isbn = extractISBN(isbn.textContent);
              if (isbn) {
                search.setAttribute(SEARCH_ISBN_ATTR, isbn);
              }
            }
          }
          search.setAttribute('style', 'float:right; color:#6a0;');
          search.className += ' subtitle';
          ele.appendChild(search);

          anobiiAddDoubanComments(isbn);

          break;
        case DISPLAY_GALLERY:
          search.className += ' subtitle';
          var li = document.createElement('li');
          li.appendChild(search);
          var optionsLi = ele.parentNode.parentNode.getElementsByClassName('options');
          if (optionsLi && optionsLi.length) {
            optionsLi[0].style.position = 'static';
            ele.parentNode.parentNode.insertBefore(li, optionsLi[0]);
          }
          else {
            ele.parentNode.parentNode.appendChild(li);
          }
          break;
        case DISPLAY_LIST:
          isbn = xpath('../../li[@class="details"]', ele);
          if (isbn) {
            isbn = extractISBN(isbn.textContent);
            if (isbn) {
              search.setAttribute(SEARCH_ISBN_ATTR, isbn);
            }
          }
          search.setAttribute('style', 'float:right; color:#6a0;');
          ele.parentNode.appendChild(search);
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

function buildSuperSearch(ele, bookName, searchLinkId, superSearchStartId) {
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
      superSearchHTML += '<a id="'+ SUPER_SEARCH_LINK_ID_PREFIX + searchLinkId + '-' + (superSearchStartId + j) +'" href="javascript:void(0)">' + utils.encodeHTML(superSearchWords[j]) + '</a>';
    }
  }
  ele.innerHTML = ele.innerHTML.replace(bookName, superSearchHTML);
  for (var k=0; k<superSearchWords.length; k++) {
    var superSearch = document.getElementById(SUPER_SEARCH_LINK_ID_PREFIX + searchLinkId + '-' + (superSearchStartId + k));
    if (superSearch) {
      var searchPhrase = superSearchWords.slice(0, k+1).join('');
      superSearch.setAttribute('name', searchPhrase);
      superSearch.setAttribute('title', lang('SEARCH') +' ' + searchPhrase);
      attachSearchLinkListener(superSearch);
    }
  }

  return superSearchWords.length;
}

function onClickSearch(searchLink) {
  if (g_loading) {
    return;
  }

  var originSearchLink = searchLink;
  var searchParam = { type:0, isbn:'', name:'' };

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
      // remove search books.com.tw link
      var list = searchLink.parentNode.getElementsByClassName(SEARCH_ADDINFO_CLASS);
      for (var i=list.length-1; i>=0; i--) {
        searchLink.parentNode.removeChild(list[i]);
      }
    }
  }

  searchLink.setAttribute('already-visited', 'true');
  g_loading = true;
  searchLink.innerHTML = '<img src="' + LOADING_IMG + '" border="0"/>';

  var bookName = searchLink.getAttribute('name');
  var searchName = originSearchLink.getAttribute('name');
  var url;

  var isbn = originSearchLink.getAttribute(SEARCH_ISBN_ATTR);
  if (isbn) {
    searchParam.type = SEARCH_TYPE_ISBN;
    searchParam.isbn = isbn;
    url = g_domainPrefix + '/search/query?match_1=PHRASE&field_1=isbn&term_1=' + isbn + '&theme=WEB';
  }
  else if (searchName) {
    searchParam.type = SEARCH_TYPE_NAME;
    searchParam.name = searchName;
    url = g_domainPrefix + '/search/query?match_1=PHRASE&field_1=t&term_1=' + encodeURIComponent(searchName) + '&sort=dateBookAdded%3Bdescending&theme=WEB';
  }
  else if (originSearchLink.getAttribute('searchurl')) {
    searchParam.type = SEARCH_TYPE_URL;
    url = originSearchLink.getAttribute('searchurl');
  }

  DEBUG(url);
  if (url) {
    utils.crossOriginXMLHttpRequest({
      method: 'GET',
      url: url,
      onload: function(t) {
        g_loading = false;
        onLoadSearchHKPL(searchLink, t.responseText, url, searchParam, bookName);
      }
    });
  }
  else {
    // make a fake response to report error
    g_loading = false;
    onLoadSearchHKPL(searchLink, '', url);
  }
}

function moveMultipleResultLayer(divContent, searchLink) {
  var minLeftMargin = 10;
  var minWidth = 300;
  var divWidth = 500;
  var top = utils.calcOffsetTop(searchLink);
  top += searchLink.offsetHeight + 6; // hardcode a vertical gap of 6px
  var left = utils.calcOffsetLeft(searchLink);
  left = left + searchLink.offsetWidth - divWidth;
  if (left < minLeftMargin) {
    divWidth = Math.max(minWidth, divWidth - (minLeftMargin - left));
    left = minLeftMargin;
  }

  divContent.setAttribute('style', 'left: ' + left + 'px; top: ' + top + 'px; width:' + divWidth + 'px;');
}

function buildMultipleResult(searchLink, result) {
  DEBUG('buildMultipleResult');
  if (!result.booklist || result.booklist.length === 0) return;

  var html = '';
  for (var i_result=0 ; i_result<result.booklist.length ; i_result++) {
    var book = result.booklist[i_result];
    var tr = '<tr>' +
             '<td><a href="' + book.bookURL + '" target="_blank">' + utils.encodeHTML(book.bookName) + '</a></td>' +
             '<td>' + lang('HKPL_FOUND_ONSHELF').replace('$1', book.onshelfTotal) +
             (book.reserveCount?lang('HKPL_FOUND_RESERVE').replace('$1', book.reserveCount):'') +
             '</td>' +
             '<td>' + (book.publishYear || '&nbsp;') + '</td>' +
             '</tr>';
             //'<td><a style="white-space:nowrap; color:#6a0;" class="' + MULTI_RESULT_SEARCH_INLINE_CLASS + '" href="javascript:void(0);"' + ' searchurl="' + searchUrl + '">' + lang('SEARCH') + '</a></td>');

    html += tr;
  }

  if (html) {
    var searchLinkId = searchLink.getAttribute('id');
    var searchId = searchLinkId.match(/\d$/)[0];

    // add prev/next page link if needed
    if (result.totalPage > 1) {
      var createSearchInlineLink = function(id, url, page, text) {
        if (url.match(/pageNumber=\d+/)) {
          url = url.replace(/pageNumber=\d+/, 'pageNumber=' + page);
        }
        else {
          url = url + '&pageNumber=' + page;
        }
        return '<a style="white-space:nowrap; color:#6a0;" class="' + MULTI_RESULT_SEARCH_INLINE_CLASS + '" href="javascript:void(0);"' +
               (id?' id="' + id + '"':'') +
               ' searchurl="' + url + '">' + text + '</a>';
      };
      var prevHTML = result.currPage>1?createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, result.searchURL, result.currPage - 1, lang('SEARCH_PREV')):'';
      var nextHTML = result.currPage<result.totalPage?createSearchInlineLink(MULTI_RESULT_NEXT_LINK_ID_PREFIX + searchId, result.searchURL, result.currPage + 1, lang('SEARCH_NEXT')):'';
      var pagingHTML = '';
      var lastPageInPagingHTML = 0;
      // first 3 pages
      for (var i_StartPage=1 ; i_StartPage<=Math.min(3, result.totalPage) ; i_StartPage++) {
        DEBUG('Start Page:' + i_StartPage);
        lastPageInPagingHTML = i_StartPage;
        pagingHTML += '&nbsp;&nbsp;' +
          (result.currPage==i_StartPage?i_StartPage:createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, result.searchURL, i_StartPage, i_StartPage));
      }
      // middle 5 pages
      DEBUG('lastPageInPagingHTML='+lastPageInPagingHTML+'result.currPage-2='+(result.currPage-2)+',result.currPage+2='+(result.currPage+2)+',result.totalPage='+result.totalPage);
      var middlePagesStartPage = Math.max(4, result.currPage-2);
      for (var i_midPage=middlePagesStartPage ; i_midPage<=Math.min(result.currPage+2, result.totalPage) ; i_midPage++) {
        DEBUG('Middle Page:' + i_midPage);
        if (i_midPage == middlePagesStartPage) {
          if (i_midPage == lastPageInPagingHTML+2) {
            // if that gap is only 1 page (e.g. 2 3 4 ... 6 7 8), we should show the page number instead of a elipsis symbol
            pagingHTML += '&nbsp;&nbsp;' + createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, result.searchURL, i_midPage-1, i_midPage-1);
          }
          else if (i_midPage > lastPageInPagingHTML+2) {
            pagingHTML += '&nbsp;&nbsp;...';
          }
        }
        lastPageInPagingHTML = i_midPage;
        pagingHTML += '&nbsp;&nbsp;' +
          (result.currPage==i_midPage?i_midPage:createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, result.searchURL, i_midPage, i_midPage));
      }
      // final 3 pages
      DEBUG('lastPageInPagingHTML='+lastPageInPagingHTML+'result.currPage+2='+(result.currPage+2)+',result.totalPage-2='+(result.totalPage-2)+',result.totalPage='+result.totalPage);
      var finalPagesStartPage = Math.max(result.currPage+3, result.totalPage-2);
      for (var i_finalPage=finalPagesStartPage;i_finalPage<=result.totalPage;i_finalPage++) {
        DEBUG('Final Page:' + i_finalPage);
        if (i_finalPage == finalPagesStartPage) {
          if (i_finalPage == lastPageInPagingHTML+2) {
            // if that gap is only 1 page (e.g. 2 3 4 ... 6 7 8), we should show the page number instead of a elipsis symbol
            pagingHTML += '&nbsp;&nbsp;' + createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, result.searchURL, i_finalPage-1, i_finalPage-1);
          }
          else if (i_finalPage > lastPageInPagingHTML+2) {
            pagingHTML += '&nbsp;&nbsp;...';
          }
        }
        pagingHTML += '&nbsp;&nbsp;' +
          (result.currPage==i_finalPage?i_finalPage:createSearchInlineLink(MULTI_RESULT_PREV_LINK_ID_PREFIX + searchId, result.searchURL, i_finalPage, i_finalPage));
      }
      if (prevHTML && nextHTML) {
        // add the space separater
        nextHTML = ' ' + nextHTML;
      }
      html = '<tr><td colspan="4">' + prevHTML + nextHTML + pagingHTML + '</td></tr>' + html;
    }

    // set td style
    html = html.replace(/<td([^>]*)>/ig, '<td$1 style="border:1px solid grey; padding:2px 4px 2px 4px; text-align:left;">');

    html = '<table width="100%">' + html + '</table>';

    // for some cases searchLink is not the original search link of that book (e.g. searchLink is 'Next')
    var originalSearchLink = document.getElementById(SEARCH_LINK_ID_PREFIX + searchId);
    // remove previous div if exists (e.g. searchLink is 'Next')
    var divContent = document.getElementById(MULTI_RESULT_LAYER_ID_PREFIX + searchId);
    if (divContent) {
      divContent.parentNode.removeChild(divContent);
      divContent = null;
    }
    divContent = document.createElement('div');
    divContent.setAttribute('id', MULTI_RESULT_LAYER_ID_PREFIX + searchId);
    divContent.className = MULTI_RESULT_LAYER_CLASS;
    divContent.innerHTML = html;

    var searchRes = utils.getElementsByClassName(MULTI_RESULT_SEARCH_INLINE_CLASS, divContent);
    for (var i_searchRes=0 ; i_searchRes<searchRes.length ; i_searchRes++) {
      var search = searchRes[i_searchRes];
      attachSearchLinkListener(search);
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

    moveMultipleResultLayer(divContent, originalSearchLink);
    document.body.appendChild(divContent);
  }
}

function parseSearchHKPLResult(t) {
  DEBUG('parseSearchHKPLResult');

  var bookName, onshelfTotal, reserveCount, bookURL, publishYear, onshelfLib;

  onshelfTotal = extract(t, '<span class="availabilityTotal">', '</span>');
  if (onshelfTotal) {
    onshelfTotal = onshelfTotal.match(/\d+/);
    if (onshelfTotal) {
      onshelfTotal = parseInt(onshelfTotal[0], 10);
    }
  }
  onshelfTotal = onshelfTotal || 0;

  reserveCount = extract(t, '<span class="requestCount" dir="ltr">', '</span>');
  if (reserveCount) {
    reserveCount = reserveCount.match(/\d+/);
    if (reserveCount) {
      reserveCount = parseInt(reserveCount[0], 10);
    }
  }
  reserveCount = reserveCount || 0;

  publishYear = extract(t, '<div class="itemFields">', '</table>');
  if (publishYear) {
    // skip first td, which is the publisher
    publishYear = extract(publishYear, '<td class="label" dir="ltr">');
    if (publishYear) {
      // 2nd td is publish year
      publishYear = extract(publishYear, '<td class="label" dir="ltr">');
      if (publishYear) {
        publishYear = publishYear.match(/<span dir="ltr">([^<]+)<\/span>/);
        if (publishYear) {
          publishYear = publishYear[1];
        }
      }
    }
  }

  t = extract(t, '<div class="recordNumber">');
  var booklink = t.match(/<a href=\"..(\/lib\/item\?id=chamo\:\d+&amp;theme=WEB)\".*>([^<]+)<\/a>/);

  if (booklink) {
    bookURL = g_domainPrefix + booklink[1];
    bookName = booklink[2];
  }

  var availLocDiv = extract(t, '<div class="search-availability">', '</div>');
  if (availLocDiv) {
    var availLocRes = availLocDiv.match(/<span class="availabilityLocation" dir="ltr">([^<]+)<\/span>\s*<span class="availabilityCount" dir="ltr">([^<]+)<\/span>/g);
    if (availLocRes) {
      onshelfLib = [];
      for (var i=0;i<availLocRes.length;i++) {
        var library = availLocRes[i].match(/<span class="availabilityLocation" dir="ltr">([^<]+)<\/span>\s*<span class="availabilityCount" dir="ltr">([^<]+)<\/span>/);
        if (library) {
          var libname = library[1];
          var libcount = library[2].match(/\d+/);
          libcount = libcount?parseInt(libcount, 10):0;

          for (var j=0 ; j<ONSHELF_LIB_REMOVE_REGEXP.length ; j++) {
            libname = libname.replace(ONSHELF_LIB_REMOVE_REGEXP[j][0], ONSHELF_LIB_REMOVE_REGEXP[j][1]);
          }
          onshelfLib.push({name:libname, count:libcount});
        }
      }
    }
  }

  return { bookName:bookName, onshelfTotal:onshelfTotal, reserveCount:reserveCount, bookURL:bookURL, publishYear:publishYear, onshelfLib:onshelfLib };
}

// attache the click event to the search link and super search link
function attachSearchLinkListener(ele) {
  ele.addEventListener('click', function(e) {
    if (!e.target.getAttribute('already-visited')) {
      onClickSearch(e.target);
      // don't need to prevent default if already-visit (i.e go to the url directly)
      e.preventDefault();
    }
    e.stopPropagation();

    return false;
  }, false);
}

function onLoadSearchHKPL(searchLink, t, url, searchParam, bookName) {
  DEBUG('onLoadSearchHKPL:type=' + searchParam.type + ',url=' + url);

  var searchResult = { status:0, searchURL:url, resultCount:0, currPage:0, totalPage:0, itemsPerPage:0, booklist:[] };
  var oldt = t;
  var forceNotFound = false;

  var resultCountDiv = extract(t, '<div class="resultCount">');
  if (resultCountDiv) {
    resultCountDiv = resultCountDiv.match(/\d+/);
    if (resultCountDiv) {
      searchResult.resultCount = parseInt(resultCountDiv[0], 10);
    }
  }
  DEBUG('resultCount=' + searchResult.resultCount);

  if (searchResult.resultCount > 0) {
    if (searchParam.type == SEARCH_TYPE_ISBN) {
      // double verify the search term is originally search
      var res = t.match(/<span class="searchValue" title=\"([0-9|xX]+)\">/);
      if (!res || !isEqualISBN(res[1], searchParam.isbn)) {
        // somehow it is redirect to another isbn
        forceNotFound = true;
      }
    }

    // parse paging information
    var currPageRes = url.match(/&pageNumber=(\d+)/);
    searchResult.currPage = currPageRes?parseInt(currPageRes[1], 10):1;
    var itemsPerPageRes = extract(t, '<select id="search-pagesize"', '</select>');
    if (itemsPerPageRes) {
      itemsPerPageRes = itemsPerPageRes.match(/<option selected=\"selected\" value=\"(\d+)\">/);
      if (itemsPerPageRes) {
        searchResult.itemsPerPage = parseInt(itemsPerPageRes[1], 10);
        searchResult.totalPage = Math.ceil(searchResult.resultCount / searchResult.itemsPerPage);
      }
    }
  }

  if (forceNotFound || searchResult.resultCount === 0) {
    // not found
    searchLink.innerHTML = lang('NOTFOUND');

    if (bookName) {
      var a = document.createElement('a');
      a.innerHTML = lang('SEARCH_BOOKS_TW');
      a.href = '#';
      a.setAttribute('bookname', bookName);
      a.className = searchLink.className + ' ' + SEARCH_ADDINFO_CLASS + ' ' + SEARCH_ADDINFO_BOOKS_TW_CLASS;
      a.addEventListener('click', function(e) {
        var form = document.createElement('form');
        form.action = 'http://search.books.com.tw/exep/prod_search.php';
        form.method = 'get';
        form.target = '_blank';
        var hidden = document.createElement('input');
        hidden.name = 'cat';
        hidden.value = 'BKA';
        form.appendChild(hidden);
        hidden = document.createElement('input');
        hidden.name = 'key';
        hidden.value = bookName;
        form.appendChild(hidden);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        e.stopPropagation();
        e.preventDefault();
        return false;
      }, false);
      searchLink.parentNode.appendChild(a);
    }
  }
  else if (searchResult.resultCount == 1) {
    // single result
    searchResult.status = SEARCH_RESULT_SINGLE;

    var parsedSingle = parseSearchHKPLResult(t);
    if (parsedSingle) {
      if (parsedSingle.onshelfLib && parsedSingle.onshelfLib.length) {
        var onshelfLibString = '';
        for (var i=0;i<parsedSingle.onshelfLib.length;i++) {
          if (parsedSingle.onshelfLib[i].count) {
            onshelfLibString += (onshelfLibString?', ':'') + parsedSingle.onshelfLib[i].name + (parsedSingle.onshelfLib[i].count > 1?'('+ parsedSingle.onshelfLib[i].count + ')':'');
          }
        }
        searchLink.title = onshelfLibString;
      }

      searchLink.innerHTML = lang('HKPL_FOUND_ONSHELF').replace('$1', parsedSingle.onshelfTotal) +
                             (parsedSingle.reserveCount?lang('HKPL_FOUND_RESERVE').replace('$1', parsedSingle.reserveCount):'');

      // show the book name if it is search by name, in case the result is incorrect
      if (searchParam.type == SEARCH_TYPE_NAME) {
        var div = document.createElement('div');
        div.innerHTML = parsedSingle.bookName;
        div.title = utils.decodeHTML(parsedSingle.bookName);
        div.className = searchLink.className + ' ' + SEARCH_ADDINFO_CLASS + ' ' + SEARCH_ADDINFO_BOOKNAME_CLASS;
        utils.removeClass(div, SEARCH_LINK_CLASS);  // this is not a search link
        searchLink.parentNode.appendChild(div);
      }

      // the link should point to the book instead of serach result
      url = parsedSingle.bookURL;
    }
  }
  else if (searchResult.resultCount > 1) {
    searchResult.status = SEARCH_RESULT_MULTI;

    searchLink.innerHTML = lang('MULTIPLE');

    t = extract(oldt, '<li class="record">');
    while (t) {
      var parsedMultiple = parseSearchHKPLResult(t);
      if (parsedMultiple) {
        searchResult.booklist.push(parsedMultiple);
      }
      t = extract(t, '<li class="record">');
    }

    // page links
    t = extract(oldt, '<div class="pageLinks">', '</div>');
  }
  else {
    searchLink.innerHTML = lang('UNKNOWN');
  }

  DEBUG(searchResult);
  searchLink.href = url;
  searchLink.target = '_blank';
  if (searchResult.status == SEARCH_RESULT_MULTI) {
    buildMultipleResult(searchLink, searchResult);
  }
}

function parseDoubanValue(data, k, v, defaultValue) {
  var res;
  var key = data[k];
  if (key) {
    if (v) {
      res = key[v];
    }
    else {
      // no v specified
      res = key;
    }
  }

  return res || defaultValue;
}

function parseDoubanLinks(obj) {
  var res = {};
  for (var i=0 ; i<obj.length ; i++) {
    res[obj[i]['@rel']] = obj[i]['@href'];
  }

  return res;
}

function anobiiAddDoubanComments_onload_toHTML(review) {
  DEBUG('anobiiAddDoubanComments_onload_toHTML review entry length=' + review.entry.length);

  var html = '';
  for (var i=0 ; i<review.entry.length ; i++) {
    var entry = review.entry[i];
    var authorLinks = parseDoubanLinks(entry.author.link);
    var authorIconHTML = '';
    if (authorLinks['icon']) {
       authorIconHTML = '<a href="' + authorLinks['alternate'] + '"><img height="24" width="24" src="' + authorLinks['icon'] + '"></a>';
    }
    DEBUG('Douban author link');
    DEBUG(authorLinks);

    // comment time
    var reviewTime = null;
    try {
      reviewTime = new Date(Date.parse(entry['published']['$t']));
    }
    catch (err) {
      DEBUG(err);
    }

    // rating
    var rating = parseDoubanValue(entry, 'gd:rating', '@value', 0);
    var ratingHTML = '';
    DEBUG('Douban rating=' + rating);
    if (rating) {
      for (var i_rating=0 ; i_rating < parseInt(rating, 10) ; i_rating++) {
        ratingHTML += '<img src="http://static.anobii.com/anobi/live/image/star_self_1.gif">';
      }
      for (i_rating=0 ; i_rating < 5 - parseInt(rating, 10) ; i_rating++) {
        ratingHTML += '<img src="http://static.anobii.com/anobi/live/image/star_self_0.gif">';
      }
    }

    // useful / useless
    var useful = parseDoubanValue(entry, 'db:votes', '@value', 0);
    var useless = parseDoubanValue(entry, 'db:useless', '@value', 0);
    var helpfulHTML = '';
    if (useful + useless > 0) {
      helpfulHTML = '<p class="helpful">' + lang('DOUBAN_HELPFUL').replace('$1', useful + '/' + (useful + useless)) + '</p>';
    }

    // reviwe fullinfo url
    var reviewLinks = parseDoubanLinks(entry.link);
    var reviewFullInfoURL = reviewLinks['alternate'].replace('\/review\/', '/j/review/') + '/fullinfo';

    // comment count
    var commentCount = parseDoubanValue(entry, 'db:comments', '@value', 0);
    DEBUG('Douban comment=' + commentCount);
    var commentCountHTML = '';
    if (commentCount) {
      commentCountHTML = ' | <a href="' + reviewLinks['alternate'] + '" class="feedbacks_link" target="_blank">' +
                         lang('DOUBAN_COMMENT').replace('$1', commentCount) + '</a>';
    }

    // follow Anobii comment HTML structure to simulate the UI
    var ulhtml =
      /*jshint multistr:true */
      '<ul class="comment_block"> \
        <li> \
          <div class="comment_entry"> \
            <div class="comment_entry_inner"> \
              <div class="comment_entry_content">' +
                helpfulHTML +
                ratingHTML +
        '       <h4>' + entry['title']['$t'] + '</h4> \
                <div class="comment_shorten"> \
                  <p>' +
                    entry['summary']['$t'] +
                    '<a href="' + reviewLinks['alternate'] +'" target="_blank" class="continue" ' + DOUBAN_REVIEW_FULLINFO_URL_ATTR + '="' + reviewFullInfoURL + '">' +
                    lang('DOUBAN_MORE').replace('$1', parseDoubanValue(entry, 'db:comments', '@value', 0)) + '</a>' +
        '         </p> \
                </div> \
              </div> \
              <div class="clear"></div> \
            </div> \
          </div> \
          <p class="comment_details">' +
            authorIconHTML +
        '   <a href="' + authorLinks['alternate'] + '">' + entry['author']['name']['$t'] + '</a>' +
            lang('DOUBAN_TIME').replace('$1', formatAnobiiDate(reviewTime)) +
            commentCountHTML +
        ' </p> \
        </li> \
      </ul>';
      /*jshint multistr:false */
    html += ulhtml;
  }

  return html;
}

function anobiiAddDoubanComments_onload(review, apiurl, allEditionCount) {
  DEBUG('anobiiAddDoubanComments_onload allEditionCount=' + allEditionCount);

  var totalResult = review['opensearch:totalResults']['$t'];

  var doubanReviewURL = parseDoubanLinks(review['link'])['alternate'];
  var doubanBookURL = doubanReviewURL.replace('/reviews', '');

  // store the list of review in a dummy div for tab switching
  var divDoubanReview = document.getElementById(DOUBAN_REVIEW_DIV_ID);
  if (!divDoubanReview) {
    divDoubanReview = document.createElement('div');
    divDoubanReview.style.display = 'none';
    divDoubanReview.setAttribute('id', DOUBAN_REVIEW_DIV_ID);
    document.body.appendChild(divDoubanReview);
  }

  if (typeof(allEditionCount) === 'undefined') {
    allEditionCount = xpath('//a[@' + DOUBAN_REVIEW_ALL_EDITION_ATTR + ']/@' + DOUBAN_REVIEW_ALL_EDITION_ATTR);
    if (allEditionCount) {
      allEditionCount = parseInt(allEditionCount.value, 10);
    }
    else {
      allEditionCount = 0;
    }
    DEBUG('get allEditionCount from dom=' + allEditionCount);
  }

  var allEditionCountHTML = '';
  if (allEditionCount != totalResult && allEditionCount > 0) {
    allEditionCountHTML =  '<span style="color:black;"> | </span><a href="' + doubanReviewURL + '" ' + DOUBAN_REVIEW_ALL_EDITION_ATTR + '="' + allEditionCount + '" target="_blank">' +
                           lang('DOUBAN_REVIEW_ALL_EDITION').replace('$1', allEditionCount) + '</a></span>';
  }

  divDoubanReview.innerHTML = '<h2 class="section_heading"><strong>' + lang('DOUBAN_HEADING').replace('$1', totalResult) + ' </strong>' +
                              allEditionCountHTML +
                              '<span style="color:black;"> | </span><a href="' + doubanBookURL + '" target="_blank">' + lang('DOUBAN_PAGE') + '</a></h2>';

  divDoubanReview.innerHTML += anobiiAddDoubanComments_onload_toHTML(review);
  anobiiAddDoubanComments_pagination(review, divDoubanReview, apiurl);

  return true;
}

function anobiiAddDoubanComments_createTab(review, allEditionCount) {
  // create the Douban review tab

  DEBUG('anobiiAddDoubanComments_createTab');

  // existing anobii review tab
  var lireview = xpath('//ul[@id="product_content_tabs"]/li[@ref="reviews"]');
  if (!lireview) return false;

  var totalResult = parseInt(review['opensearch:totalResults']['$t'], 10);

  var liDoubanReview = document.createElement('li');
  liDoubanReview.setAttribute('ref', DOUBAN_REVIEW_TAB_REF);
  if (!totalResult) {
    liDoubanReview.className = 'disabled';
  }
  var a = document.createElement('a');
  a.href = '#';
  var allEditionCountHTML = '';
  if (allEditionCount != totalResult && allEditionCount > 0) {
    allEditionCountHTML = '/' + allEditionCount;
  }
  a.innerHTML = lang('DOUBAN_REVIEW') + (totalResult?(' <small>(' + totalResult + allEditionCountHTML + ')</small>'):'');
  a.addEventListener('click', anobiiAddDoubanComments_onClickTab, false);
  liDoubanReview.appendChild(a);
  lireview.parentNode.insertBefore(liDoubanReview, lireview.nextSibling);
}

function anobiiAddDoubanComments_onClickTab(e) {
  // turn off the active tab
  var from;
  var lis = document.getElementById('product_content_tabs').getElementsByTagName('li');
  for (var i=0 ; i<lis.length ; i++) {
    var thisli = lis[i];
    if (utils.hasClass(thisli, 'selected')) {
      utils.removeClass(thisli, 'selected');
      from = thisli.getAttribute('ref');
    }
  }
  // make douban review tab active
  var liDoubanReview = xpath('//li[@ref="' + DOUBAN_REVIEW_TAB_REF + '"]');
  if (liDoubanReview) {
    utils.addClass(liDoubanReview, 'selected');
  }

  // call the anobii javascript switchTabContent
  // switchTabContent will store the existing tab's HTML to a dummy DIV for restoring
  // fake it that is not switched so it will only store the HTML and will not actually switch tab
  utils.inject('switchTabContent("' + from + '", "' + from + '");');

  // we do the HTML swapping here
  document.getElementById('tab_content').innerHTML = '<div>' + document.getElementById(DOUBAN_REVIEW_DIV_ID).innerHTML + '</div>';

  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  return false;
}

function anobiiAddDoubanComments_addClickEvent() {
  // single event listener to capture all 'More' link
  document.getElementById('tab_content').addEventListener('click', function(e) {
    var target = e.target;
    if (target.tagName && target.tagName.toUpperCase() === 'A') {
      var fullinfourl = target.getAttribute(DOUBAN_REVIEW_FULLINFO_URL_ATTR);
      var reviewapiurl = target.getAttribute(DOUBAN_REVIEW_API_URL_ATTR);
      if (fullinfourl) {
        // Full review info, call the json api to display content

        // the loading img will be remove by below innerHTML replace
        var imgFullInfo = document.createElement('img');
        imgFullInfo.src = LOADING_IMG;
        target.parentNode.insertBefore(imgFullInfo, target.nextSibling);

        utils.crossOriginXMLHttpRequest({
          method: 'GET',
          url: fullinfourl,
          onload: function(t) {
            try {
              var fullinfoJSON = (g_options.translatetc && g_lang != LANG_SC)?toTrad(t.responseText):t.responseText;
              var fullinfo = utils.parseJSON(fullinfoJSON);
              // remove the review HTML and extra <br/>
              e.target.parentNode.innerHTML = utils.extract(fullinfo.html, null, '<div class="review-panel"').replace(/(\s*<br\/>\s*)+$/, '');
            }
            catch (err) {
              e.target.innerHTML = lang('ERROR');
            }
          }
        });
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      else if (reviewapiurl) {
        // Paging

        // the loading img will be remove by below innerHTML replace
        var imgPaging = document.createElement('img');
        imgPaging.src = LOADING_IMG;
        target.parentNode.insertBefore(imgPaging, target.nextSibling);

        utils.crossOriginXMLHttpRequest({
          method: 'GET',
          url: reviewapiurl,
          onload: function(t) {
            try {
              var reviewJSON = (g_options.translatetc && g_lang != LANG_SC)?toTrad(t.responseText):t.responseText;
              var review = utils.parseJSON(reviewJSON);
              if (review) {
                anobiiAddDoubanComments_onload(review, reviewapiurl);
                anobiiAddDoubanComments_onClickTab(); // simulate click the tab to reload the data
                var top = utils.calcOffsetTop(document.getElementById('product_content_tabs'));
                var left = window.pageXOffset || document.documentElement.scrollLeft;
                window.scrollTo(left, top - 10);
              }
            }
            catch (err) {
              e.target.innerHTML = lang('ERROR');
            }
          }
        });
        e.stopPropagation();
        e.preventDefault();
        return false;
      }
      else if (utils.hasClass(target, 'feedbacks_link')) {
        // douban comment link, get the HTML and parse the comments block

        // check if the feedback already created, if yes, just toggle otherwise call ajax and create one
        var feedbackres = xpath('//div[@' + DOUBAN_FEEDBACK_URL_ATTR + '="' + target.href + '"]');
        if (feedbackres) {
          feedbackres.style.display = feedbackres.style.display?'':'none';
        }
        else {
          // load the feedback

          var imgLoadingFeedback = document.createElement('img');
          imgLoadingFeedback.src = LOADING_IMG;
          target.parentNode.insertBefore(imgLoadingFeedback, target.nextSibling);

          utils.crossOriginXMLHttpRequest({
            method: 'GET',
            url: target.href,
            onload: function(t) {
              imgLoadingFeedback.parentNode.removeChild(imgLoadingFeedback);
              imgLoadingFeedback = null;

              t = t.responseText;
              var feedbackHTML = '';
              var feedback = utils.extract(t, '<span class="comment-item"');

              while (feedback) {
                feedback = utils.extract(feedback, '', '<div class="align-right">');
                feedback = (g_options.translatetc && g_lang != LANG_SC)?toTrad(feedback):feedback;
                // <h3 ...><span class="pl">[time]<a href="http://www.douban.com/people/[id]/">[name]</a></span></h3>
                var feedbackSenderLine = utils.extract(feedback, '<h3', '</h3>');
                feedbackSenderLine = feedbackSenderLine.replace(/^[^>]*>/, '').replace('class="pl"', '');
                var feedbackTime = parseDateYYYYMMDDHHMMSS(feedbackSenderLine);
                var feedbackSender = utils.extract(feedbackSenderLine, '<a ', '</a>');
                if (feedbackSender) {
                  feedbackSender = '<a ' + feedbackSender + '</a>';
                }

                feedback = utils.extract(feedback, '</h3>');

                /*jshint multistr:true */
                feedbackHTML +=
                  '<ul class="feedback feedback_block"> \
                    <li class="content">' +
                      feedback +
                  ' </li> \
                    <li class="comment_details">' +
                      feedbackSender + ' ' + lang('DOUBAN_TIME').replace('$1', formatAnobiiDate(feedbackTime)) +
                  ' </li> \
                  </ul>';
                /*jshint multistr:false */

                t = utils.extract(t, '<div class="align-right">');
                feedback = utils.extract(t, '<span class="comment-item"');
              }

              var divFeedbacksWrap = document.createElement('div');
              divFeedbacksWrap.className = 'feedbacks_wrap';
              divFeedbacksWrap.setAttribute(DOUBAN_FEEDBACK_URL_ATTR, target.href);
              divFeedbacksWrap.innerHTML = feedbackHTML;

              var parentUl = utils.parent(target, 'ul');
              if (parentUl) {
                parentUl.parentNode.insertBefore(divFeedbacksWrap, parentUl.nextSibling);
              }
            }
          });
        }

        e.stopPropagation();
        e.preventDefault();
        return false;
      }
    }
  }, true);
}

function anobiiAddDoubanComments_pagination(review, container, apiurl) {
  var totalResult = review['opensearch:totalResults']['$t'];
  var itemsPerPage = parseDoubanValue(review, 'opensearch:itemsPerPage', '$t', 0);
  var startIndex = parseDoubanValue(review, 'opensearch:startIndex', '$t', 0);
  DEBUG('anobiiAddDoubanComments_pagination totalResult=' + totalResult + ', itemsPerPage=' + itemsPerPage + ', startIndex=' + startIndex);
  var html = '';

  function makeAPIURL(page) {
    return apiurl.replace(/&start\-index=\d*/, '') + '&start-index=' + ((page-1) * itemsPerPage + 1);
  }

  if (totalResult > itemsPerPage) {
    var currPage = Math.ceil(startIndex / itemsPerPage);
    var totalPage = Math.ceil(totalResult / itemsPerPage);
    DEBUG('anobiiAddDoubanComments_pagination currPage=' + currPage);
    for (var i=1 ; i<=totalPage ; i++) {
      var pageHTML = '';
      if (i === currPage) {
        pageHTML = '<span class="current">' + i + '</span>';
      }
      else {
        pageHTML = '<a href="#" ' + DOUBAN_REVIEW_API_URL_ATTR + '="' + makeAPIURL(i) + '">' + i + '</a>';
      }
      html += pageHTML;
    }

    // totalPage must > 1
    if (currPage > 1) {
      html = '<a href="#" class="prev" ' + DOUBAN_REVIEW_API_URL_ATTR + '="' + makeAPIURL(currPage - 1) + '">' + lang('DOUBAN_COMMENT_PREV') + '</a>' + html;
    }
    if (currPage != totalPage) {
      html += '<a href="#" class="next" ' + DOUBAN_REVIEW_API_URL_ATTR + '="' + makeAPIURL(currPage + 1) + '">' + lang('DOUBAN_COMMENT_NEXT') + '</a>';
    }
    html = '<p class="pagination_wrap">' + html + '</p>';

    var div = document.createElement('div');
    div.innerHTML = html;

    container.appendChild(div);
  }
}

function anobiiAddDoubanComments(isbn) {
  DEBUG('anobiiAddDoubanComments isbn=' + isbn);

  if (!isbn) return;

  var apiurl = 'http://api.douban.com/book/subject/isbn/' + isbn + '/reviews?alt=json';
  utils.crossOriginXMLHttpRequest({
    method: 'GET',
    url: apiurl,
    onload: function(t) {
      try {
        var reviewJSON = (g_options.translatetc && g_lang != LANG_SC)?toTrad(t.responseText):t.responseText;
        var review = utils.parseJSON(reviewJSON);

        utils.crossOriginXMLHttpRequest({
          method: 'GET',
          url: parseDoubanLinks(review['link'])['alternate'],
          onload: function(t) {
            var title = utils.extract(t.responseText, '<title>', '</title>');
            if (title) {
              title = title.match(/(\d+)\)\s*$/);
            }
            title = title?title[1]:0;
            if (anobiiAddDoubanComments_onload(review, apiurl, title)) {
              anobiiAddDoubanComments_createTab(review, title);
              anobiiAddDoubanComments_addClickEvent();
            }
          }
        });
      }
      catch (err) {
        DEBUG(err);
      }
    }
  });
}

function anobiiEditBookAddMoreDate() {
  var div = document.getElementById('edit_book_div');
  if (div) {
    var observer = new MutationObserver(function(mutations, observer) {
      xpathl('//a[@class="starton_today" or @class="gotthison_today"]').each(function() {
        var buttonSet = [
          { label: 'ANOBII_EDIT_BOOK_MOREDATE_0', datediff: 0 },
          { label: 'ANOBII_EDIT_BOOK_MOREDATE_1', datediff: -1 },
          { label: 'ANOBII_EDIT_BOOK_MOREDATE_2', datediff: -2 }
        ];
        for (var i=buttonSet.length-1 ; i>=0 ; i--) {
          // use insertBefore, so reverse the order
          var a = document.createElement('a');
          a.innerHTML = lang(buttonSet[i].label);
          a.className = ANOBII_EDIT_BOOK_MOREDATE_CLASS;
          a.setAttribute(ANOBII_EDIT_BOOK_MOREDATE_ATTR, buttonSet[i].datediff);
          a.href = '#';
          this.parentNode.insertBefore(a, this.nextSibling);
        }

        // remove the existing today button, which doesn't work
        this.parentNode.removeChild(this);
      });

      div.addEventListener('click', function(e) {
        var target = e.target;

        if (target.className === ANOBII_EDIT_BOOK_MOREDATE_CLASS) {
          var datediff = parseInt(target.getAttribute(ANOBII_EDIT_BOOK_MOREDATE_ATTR), 10);
          if (!isNaN(datediff)) {
            var parentDiv = utils.parent(target, function() { return utils.hasClass(this, 'datePickerSet'); });
            if (parentDiv) {
              var dates = parentDiv.getElementsByTagName('select');
              if (dates && dates.length === 3) {
                var year  = dates[0];
                var month = dates[1];
                var day   = dates[2];

                year.removeAttribute('disabled');
                month.removeAttribute('disabled');
                day.removeAttribute('disabled');

                var today = new Date();
                today.setDate(today.getDate() + datediff);
                var i = 0;
                for (i = 0; i < dates[0].options.length; i++) {
                  if (dates[0].options[i].value == today.getFullYear().toString()) {
                    break;
                  }
                }
                dates[0].options.selectedIndex = i;
                dates[1].options.selectedIndex = today.getMonth()+1;
                dates[2].options.selectedIndex = today.getDate();
              }
            }
          }

          e.stopPropagation();
          e.preventDefault();
          return false;
        }
      }, true);
    });
    observer.observe(div, { childList: true });
  }
}

function extractISBN(s) {
  var isbn = s.match(/\s*([0-9]{9,13}X?)/);
  if (isbn) {
    isbn = isbn[1];
    if (isValidISBN(isbn)) {
      return isbn;
    }
  }

  return null;
}

function calcISBNCheckDigit(isbn) {
  var total = 0;
  if (isbn && (isbn.length == 9 || isbn.length == 10)) {
    for (var i=0 ; i<9 ; i++) {
      total += (i+1) * parseInt(isbn[i], 10);
    }
    total = total % 11;
    return (total==10)?'X':(''+total);
  }
  else if (isbn && (isbn.length == 12 || isbn.length == 13)) {
    for (var j=0 ; j<12 ; j++) {
      total += (j%2?3:1) * parseInt(isbn[j], 10);
    }
    total = 10 - total % 10;
    total = total==10?0:total;
    return ''+total;
  }
  else {
    return '';
  }
}

function isValidISBN(isbn) {
  if (typeof isbn == 'undefined' || !isbn || (isbn.length != 10 && isbn.length != 13)) {
    return false;
  }

  var checkDigit = calcISBNCheckDigit(isbn);
  return (checkDigit && checkDigit == isbn[isbn.length-1]);
}

function isbn10To13(isbn) {
  if (typeof isbn == 'undefined' || !isbn || isbn.length != 10) {
    return '';
  }

  var isbn13 = '978' + isbn.substring(0, 9);
  return isbn13 + calcISBNCheckDigit(isbn13);
}

function isEqualISBN(a, b) {
  DEBUG('isEqualISBN ' + a + ', ' + b);
  if (typeof a == 'undefined' || typeof b == 'undefined' || !a || !b || !isValidISBN(a) || !isValidISBN(b)) {
    return false;
  }

  if (a.length == b.length) {
    return a == b;
  }
  if (a.length == 10) {
    a = isbn10To13(a);
    DEBUG('isEqualISBN a converted to ' + a);
  }
  if (b.length == 10) {
    b = isbn10To13(b);
    DEBUG('isEqualISBN b converted to ' + b);
  }

  return a == b;
}

function testISBNFunctions() {
  var failCase = [];
  function assertValid(a) {
    if (!isValidISBN(a)) {
      failCase.push(a + ' should be valid');
    }
  }
  function assertNotValid(a) {
    if (isValidISBN(a)) {
      failCase.push(a + ' should be invalid');
    }
  }
  function assertEqual(a, b) {
    if (!isEqualISBN(a, b)) {
      failCase.push(a + ' and ' + b + ' should be equal');
    }
  }
  function printResult() {
    if (failCase.length > 0) {
      alert(failCase.join('\n'));
    }
    else {
      alert('Test complete');
    }
  }

  assertValid('9570518944');
  assertValid('9789570518948');
  assertValid('9573324237');
  assertValid('9789573324232');
  assertValid('9866702588');
  assertValid('9789866702587');
  assertValid('9579016089');
  assertValid('9789579016087');

  assertNotValid('978957901608');
  assertNotValid('1234567890');
  assertNotValid('1234567890123');

  assertEqual('9570518944', '9789570518948');
  assertEqual('9573324237', '9789573324232');
  assertEqual('9866702588', '9789866702587');
  assertEqual('9579016089', '9789579016087');
  assertEqual('9789570518948', '9570518944');
  assertEqual('9789573324232', '9573324237');
  assertEqual('9789866702587', '9866702588');
  assertEqual('9789579016087', '9579016089');

  printResult();
}

function hkplAddAnobiiLink() {
  var res = xpathl("//div[@id='itemView']/div[@class='itemFields']/table/tbody/tr/td[2]");
  for (var i=0 ; i<res.snapshotLength ; i++) {
    addAnobiiLink(res.snapshotItem(i), true);
  }
}

function booksTWAddAnobiiLink() {
  // assuming <li><meta itemprop="productID" content="isbn:9789866614187">ISBN：9789866614187</li>

  var res = xpath("//li/meta[@itemprop='productID' and contains(@content, 'isbn:')]");
  if (res) {
    // find the appendTo element (the top right info box)
    // div
    //   div
    //     h1[itemprop="name"] Book Name
    //   div
    //     ul
    //       li authoer
    //       li publisher
    //       li ...
    //       li <-- insert here
    var bookname = xpath("//h1[@itemprop='name']");
    if (bookname) {
      var infobox = xpath("./ul", utils.nextSibling(bookname.parentNode, 'div'));
      if (infobox) {
        var isbn = res.getAttribute('content').match(/isbn\:(.*)/);
        if (isbn) {
          var li = document.createElement('li');
          li.innerHTML = 'ISBN：<span>' + isbn[1] + '</span>';
          infobox.appendChild(li);
          addAnobiiLink(li.getElementsByTagName('span')[0], false);
        }
      }
    }
  }
}

function addAnobiiLink(ele, showCover) {
  var isbn = extractISBN(ele.textContent);
  if (isbn) {
    var loading = document.createElement('img');
    loading.src = LOADING_IMG;
    loading.setAttribute('style', 'vertical-align:middle;margin-left:5px;');
    ele.appendChild(loading);
    utils.crossOriginXMLHttpRequest({
      method: 'GET',
      url: 'http://iapp2.anobii.com/InternalAPI/html/iapp2/search/search-book?keyword=' + isbn + '&page=1&itemPerPage=1',
      onload: function(t) {
        ele.removeChild(loading);
        if (t.status == 200) {
          try {
            var obj = utils.parseJSON(t.responseText);
            if (obj && obj[0].totalRecord > 0) {

              obj = obj[0];
              var bookId = obj.resultFinal[0].encryptItemId;
              ele.innerHTML = '<a href="http://www.anobii.com/" target="_blank">' +
                              (showCover?'<img src="' + obj.resultFinal[0].imageUrl.replace('type=1', 'type=3') + '"/><br/>':'') +
                              ele.textContent.replace(/\s+$/g,'') + '</a><img src="http://static.anobii.com/favicon.ico" style="vertical-align:middle;margin-left:5px;' +
                              (showCover?'margin-top:5px;':'') +
                              '"/>';
              addAnobiiRating(ele, bookId);
            }
          }
          catch (err) {
            ele.innerHTML = isbn + ' ' + lang('ERROR');
          }
        }
      }
    });
  }
}

function addAnobiiRating(ele, bookId) {
  var loading = document.createElement('img');
  loading.src = LOADING_IMG;
  loading.setAttribute('style', 'vertical-align:middle;margin-left:5px;');
  ele.appendChild(loading);
  utils.crossOriginXMLHttpRequest({
    method: 'GET',
    url: 'http://iapp2.anobii.com/InternalAPI/html/iapp2/item/book?itemId=' + bookId + '&description=0',
    onload: function(t) {
      ele.removeChild(loading);
      if (t.status == 200) {
        var obj = utils.parseJSON(t.responseText);
        if (obj && obj.length > 0) {
          obj = obj[0];
          var isbn = obj.bookDetail['isbn-13'] || obj.bookDetail['isbn-10'];
          var anobiiBookURL = 'http://www.anobii.com/books/' + isbn + '/' + bookId;
          var a = ele.getElementsByTagName('a');
          if (a && a.length > 0) {
            for (var ai=0 ; ai<a.length ; ai++) {
              a[ai].href = anobiiBookURL;
            }
          }

          if (obj.totalOwner > 0) {
            var rateInt = parseInt(obj.averageRate, 10);
            var ratePtFive = (obj.averageRate == rateInt)?0:1;

            if (obj.averageRate > 0) {
              if (g_pageType == PAGE_TYPE_DOUBAN_BOOK)  {
                var interest_sectl = document.getElementById('interest_sectl');
                if (interest_sectl) {
                  var divDoubanRating = document.createElement('div');
                  divDoubanRating.className = 'rating_wrap clearbox';
                  divDoubanRating.innerHTML = '<p class="pl">' + lang('ANOBII_RATING') + '</p>' +
                                              '<p class="rating_self clearfix"><span class="ll bigstar' + (parseFloat(obj.averageRate) * 10) + '"></span>' +
                                              '<strong class="ll rating_num">' + rateInt + '.' + (ratePtFive * 5) + '</strong>' +
                                              '<p class="rating_self font_normal">(<a href="' + anobiiBookURL + '" target="_blank"><span>' +
                                              lang('ANOBII_RATING_DOUBAN_PEOPLE_COUNT').replace('$1', obj.totalRatePerson).replace('$2', obj.totalOwner) +
                                              '</span></a>)</p>';
                  interest_sectl.appendChild(divDoubanRating);
                }
              }
              else {
                var rating = '';

                // filled star
                for (var i=0; i<rateInt; i++) {
                  rating += '<img src="http://static.anobii.com/anobi/live/image/star_self_1.gif" width="10" height="10"/>';
                }
                // half filled star
                if (ratePtFive) {
                  rating += '<img src="http://static.anobii.com/anobi/live/image/star_self_05.gif" width="10" height="10"/>';
                }
                // unfilled star
                for (var j=rateInt+ratePtFive; j<5; j++) {
                  rating += '<img src="http://static.anobii.com/anobi/live/image/star_self_0.gif" width="10" height="10"/>';
                }

                rating += ' (' + obj.totalRatePerson + '/' + obj.totalOwner + ')';
                if (g_pageType == PAGE_TYPE_HKPL_BOOK) {
                  var parentTr = utils.parent(ele, 'tr');
                  if (parentTr) {
                    var tr = document.createElement('tr');
                    tr.innerHTML = '<tr valign="CENTER"><td width="20%" valign="top"><strong>' + lang('ANOBII_RATING') + '</strong>' +
                                   '<td valign="top">' + rating + '</td></tr>';
                    parentTr.parentNode.insertBefore(tr, parentTr.nextSibling);
                  }
                }
                else if (g_pageType == PAGE_TYPE_BOOKS_TW_BOOK)  {
                  var parentLi = utils.parent(ele, 'li');
                  if (parentLi) {
                    var li = document.createElement('li');
                    li.innerHTML = lang('ANOBII_RATING') + '：<span class="bookworm-anobii-rating">' + rating +  '</span>';
                    parentLi.parentNode.insertBefore(li, parentLi.nextSibling);
                  }
                }
              }
            }
          }
        }
      }
    }
  });
}

function _hkplSuggestion_booksTW(t) {
  if (t && t.responseText) {
    t = t.responseText;
  }
  else {
    return;
  }

  var res = xpath("//form[@name='entryform1']//input[@value='Book']");
  if (res) {
    res.checked = true;
  }

  // <h1 itemprop="name">bookname</h1>
  t = extract(t, '<h1 itemprop="name">');
  res = extract(t, null, '</h1>');
  document.getElementById('title').value = res?res:'';
  // <a href="http://search.books.com.tw/exep/prod_search.php?key=XXXXX&f=author">
  res = t.match(/<a href=\"[^\"]*f=author\">([^<]+)/);
  document.getElementById('author').value = res?res[1]:'';
  // <span itemprop="brand">Publisher</span>
  res = extract(t, '<span itemprop="brand">', '</span>');
  document.getElementById('publisher').value = res || '';

  // <span itemprop="brand">Publisher</span></li><li>出版日期：2007/09/28</li>
  res = extract(extract(t, '<span itemprop="brand">'), '<li>', '</li>');
  document.getElementById('place').value = res || '';

  // <meta itemprop='productID' content='isbn:xxxxx'/>
  res = t.match(/<meta itemprop='productID' content='isbn\:(.*)'\/>/);
  if (res) {
    document.getElementById('isbn').value = res[1];
    xpath("//form[@name='entryform1']//input[@value='ISBN']").checked = true;
  }

  document.getElementById('recommend').focus();
}

function _hkplSuggestion_onclick() {
  if (g_loading) {
    return;
  }

  var where = document.getElementById('where');
  if (!where) {
    return;
  }
  var url = where.value;
  if (/^https?:\/\/[^\/]*\.books\.com\.tw/.test(url)) {
    g_loading = true;
    document.getElementById(GET_SUGGESTION_BUTTON_ID).value = lang('LOADING');
    utils.crossOriginXMLHttpRequest({
      method: 'GET',
      url: url,
      overrideMimeType: 'text/html; charset=big5',
      onload: function(t) {
        g_loading = false;
        _hkplSuggestion_booksTW(t);
        document.getElementById(GET_SUGGESTION_BUTTON_ID).value = lang('GET_SUGGESTION');
      }
    });
  }
  else {
    alert(lang('INVALID_SUGGESTION_URL'));
  }
}

function hkplSuggestion() {
  var place = document.getElementById('place');
  if (place) {
    var suggestButtonOnClick = function(e) {
      place.value = e.target.getAttribute('value') + ' ' + place.value;
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    var suggestCountry = SUGGEST_COUNTRY['TC'];
    for (var i=0; i<suggestCountry.length; i++) {
      var a = document.createElement('a');
      a.innerHTML = suggestCountry[i];
      a.href = '#';
      a.setAttribute('style', 'margin-left:10px;');
      a.setAttribute('value', suggestCountry[i]);
      a.addEventListener('click', suggestButtonOnClick, false);
      place.parentNode.appendChild(a);
    }
  }

  var where = document.getElementById('where');
  if (where) {
    var input = document.createElement('input');
    input.setAttribute('id', GET_SUGGESTION_BUTTON_ID);
    input.type = 'button';
    input.value = lang('GET_SUGGESTION');
    input.addEventListener('click', function(e) {
      _hkplSuggestion_onclick(e);
    }, false);
    where.parentNode.appendChild(input);

    if (/autofill=1$/.test(document.location.href)) {
      if (document.referrer) {
        where.value = document.referrer;
        _hkplSuggestion_onclick();
      }
    }
  }
}

function booksTWAddHKPLSuggestionLink() {
  // assuming
  // div
  //   div.btn
  //     a[href~=comment] Comment button
  //   div.btn           <-- insert here
  //     a suggstion
  var res = xpath("//div[@class='btn']//a[contains(@href, '/prod_comment/comment_guide/')]");
  if (res) {
    var div = document.createElement('div');
    div.className = 'btn';
    div.setAttribute('style', 'margin-top: 5px;');
    div.innerHTML = '<a href="#" class="type02_btn02"><span><span>' + lang('HKPL_SUGGESTION') + '</span></span></a>';
    div.getElementsByTagName('a')[0].addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      var form = document.createElement('form');
      form.action = 'https://www.hkpl.gov.hk/tc/about-us/collection-develop/suggestion.html';
      form.method = 'get';
      form.target = '_blank';
      var hidden = document.createElement('input');
      hidden.name = 'autofill';
      hidden.value = '1';
      form.appendChild(hidden);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    }, false);
    res.parentNode.parentNode.appendChild(div);
  }
}

function doubanAddAnobiiLink() {
  var res = xpath("//div[@id='info']//span[text()='ISBN:']");
  if (res) {
    res = res.nextSibling;
    if (res) {
      // use span to replace the textNode
      var span = document.createElement('span');
      span.innerHTML = res.textContent;
      res.parentNode.insertBefore(span, res);
      res.parentNode.removeChild(res);
      addAnobiiLink(span, false);
    }
  }
}

// main

// temp solution for Issue #28 Duplicated search HKPL link in Chrome 12
if (typeof(document) != 'undefined' && document.body && document.body.getAttribute('bookworm-loaded')) {
  return;
}
else {
  document.body.setAttribute('bookworm-loaded', 'true');
}

if (/anobii\.com/.test(document.location.href)) {
  g_pageType = PAGE_TYPE_ANOBII;
  ///g_anobiiLanguage = documen
  var anobiilang = xpath('//select[@name="languageId"]/option[@selected]/@value');
  if (anobiilang) {
    anobiilang = anobiilang.value;
    if (anobiilang == ANOBII_LANG_TC) {
      g_lang = LANG_TC;
    }
    else if (anobiilang == ANOBII_LANG_SC) {
      g_lang = LANG_SC;
    }
    else if (anobiilang == ANOBII_LANG_EN) {
      g_lang = LANG_EN;
    }
  }
  DEBUG('Anobii lang=' + g_lang);

  /*jshint multistr:true, newcap:false */
  if (typeof(GM_addStyle) !== 'undefined') {
    GM_addStyle('.bookworm-search-addinfo { clear:both; float:right; } \
                 .gallery_view .shelf dl { padding-bottom:0 !important; } \
                 .gallery_view .bookworm-search-book-link { display:block; background:none; padding-left:0; float:none; } \
                 .bookworm-supersearch-link.subtitle a:link { color:black; } \
                 .bookworm-supersearch-link.subtitle a:hover { color:#039; } \
                 .simple_list_view .shelf .title .bookworm-supersearch-link.subtitle a { font-weight:normal; } \
                 .bookworm-search-addinfo-books-tw, .bookworm-search-addinfo-books-tw:hover, \
                 .bookworm-search-book-link, .bookworm-search-book-link:hover \
                   { color:#6a0 !important; } \
                 .bookworm-search-addinfo-bookname { font-weight:normal; overflow:hidden; text-overflow:ellipsis; width:100px; white-space:nowrap; } \
                 .gallery_view .bookworm-search-addinfo-bookname: { width:100%; } \
                 .bookworm-anobii-expand-tag #tagSuggest p { max-height: none !important; } \
                 .bookworm-multiple-layer { position:absolute; background-color:white; box-shadow: 6px 6px 10px #aaa; } \
                 .bookworm-moredate { margin-left:7px; }');
  }
  /*jshint multistr:false, newcap:true */

  // expand tag list in edit shelf dialog
  if (g_options.anobiiexpandtag) {
    document.body.className += ' bookworm-anobii-expand-tag';
  }

  document.body.addEventListener('click', function(e) {
    var res = utils.getElementsByClassName(MULTI_RESULT_LAYER_CLASS);
    for (var i=0;i<res.length;i++) {
      res[i].style.display = 'none';
    }
  }, false);

  processBookList();

  anobiiEditBookAddMoreDate();
}
else if (/\/lib\/item\?id=chamo\:\d+/.test(document.location.href)) {
  g_pageType = PAGE_TYPE_HKPL_BOOK;

  hkplAddAnobiiLink();
}
else if (/suggestion\.html/.test(document.location.href)) {
  g_pageType = PAGE_TYPE_HKPL_SUGGESTION;

  hkplSuggestion();
}
else if (/books\.com\.tw\/products\/\d+/.test(document.location.href)) {
  g_pageType = PAGE_TYPE_BOOKS_TW_BOOK;

  booksTWAddHKPLSuggestionLink();
  booksTWAddAnobiiLink();
}
else if (/\/\/book\.douban\.com\/subject\/\d+/.test(document.location.href)) {
  g_pageType = PAGE_TYPE_DOUBAN_BOOK;
  g_lang = LANG_SC;

  doubanAddAnobiiLink();
}

})();
