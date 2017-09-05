$(document).ready(function() {
  var $window = $(window)
  var $document = $(document)
  var $html = $('html')

  $("pre").html(function (index, html) {
      return html.replace(/^(.*)$/mg, [
        '<div class="line">',
          '<div class="line-number"><!-- placeholder --></div>',
          '<span class="line-content">$1</span></span>',
        '</div>'
    ].join(''))
  });

  // make TOC sticky
  var $toc = $(".g-left-panel");
  if ($toc.length) {
    var stickyTop = $toc.offset().top - 100;
    $window.on('scroll', function(){
      ($window.scrollTop() >= stickyTop) ? $toc.addClass('d-fixed') : $toc.removeClass('d-fixed');
    });
  }


  $window.on('hashchange', correctHashScroll)
  correctHashScroll()

  function correctHashScroll() {
    var currentScroll = $document.scrollTop();
    var mastheadHeight = $('#masthead').outerHeight() + 15; // extra padding
    console.log(mastheadHeight)
    console.log(currentScroll)
    if (window.location.hash && currentScroll > mastheadHeight) {
      console.log('reducing scroll from ' + currentScroll)
      $document.scrollTop(currentScroll - mastheadHeight)
    }
  }

  function populateUserHistoryData() {
    $.ajax({
      method: 'GET',
      url: '/reading-history/docs.json',
      data: {
        limit: 4
      },
      json: true
    }).always(function(data) {
      var recentlyViewedHolder = '#me ul.recently-viewed-content';
      var mostViewedHolder = '#me ul.most-viewed-content';
      var recentlyViewed = data.recentlyViewed;
      var mostViewed = data.mostViewed;

      addElements(recentlyViewed, {
        target: '#me .popup',
        header: '<h3>Recently Viewed</h3>',
        ul: '<ul class="recently-viewed-content"></ul>'
      });

      addElements(mostViewed, {
        target: '#me .popup',
        header: '<h3>Most Viewed</h3>',
        ul: '<ul class="most-viewed-content"></ul>'
      });
    })
  }

  $html.one('mouseenter', '.user-tools', populateUserHistoryData);

  function addElements(data, elementAttributes) {
    var $target = $(elementAttributes.target);

    if (data.length == 0) {
      if (elementAttributes.header === '<h3>Most Viewed</h3>') {return;}
      $target.html("<p>You've viewed no stories!</p>");
      return;
    }

    var items = data.map(function(el) {
      var item = el.doc;
      var folder = (item.folder || {}).prettyName || ''; // lets not try to show a folder if there isn't one
      var path = item.path ? item.path : '#';
      return [
      '<li>',
        '<a href="' + path + '">',
          '<p class="docs-title">' + item.prettyName + '</p>',
          '<p class="docs-attr">',
            '<span class="docs-folder">' + folder + '</span>',
            '<span class="timestamp">(' + el.lastViewed + ')</span>',
          '</p>',
         '</a>',
      '</li>'
      // use .join() to turn to html string
      ].join('')
    });

    var ul = $(elementAttributes.ul).append(items.join(''));

    $target.append(elementAttributes.header + ul.prop('outerHTML')); // perform all the DOM manipulation as a single operation
  }

})

function personalizeHomepage(userId) {

  // Personalize the team listing on the left.
  // Most-frequently-visited teams are inserted at the top, then padded with default entries.
  fetchHistory('teams', userId, function(data) {
    var items = data.mostViewed.map(function(el) {
      // kill existing elements that on the mostViewed list to avoid dupes
      $('ul.teams-cat-list li[data-team-id="' + el.team.id + '"]').detach()

      return '<li><a class="button btn-cat" href="' + el.team.path + '">' + el.team.prettyName + '</a></li>'
    }).join('')

    var numToPrune = $('ul.teams-cat-list li').length - data.mostViewed.length
    $('ul.teams-cat-list li:gt(' + numToPrune + ')').detach()
    $('ul.teams-cat-list').prepend(items)
  })

  /*
    This code swaps "Favorite Docs" into the "Useful Docs" panel if you have at least three favorites.
    We decided that we'll disable for v1 but perhaps incorporate after initial launch.

    fetchHistory('docs', userId, function(data) {
      var favorites = data.mostViewed.filter(function(el) {
        return el.viewCount > 5
      })

      if(favorites.length < 3) { return }

      var items = favorites.map(function (el) {
         return '<li><a href="' + el.doc.path + '">' + el.doc.prettyName + '</a></li>'
      })

      $('.featured-cat-container h3').html('Favorite Docs')
      $('ul.featured-cat-list').html(items)
    })
  */
}

function fetchHistory(type, userId, cb) {
  var key = "libraryHistory:" + userId + ':' + type
  var data

  if(data = localStorage.getItem(key)) {
    data = JSON.parse(data)

    // refresh localStorage data in the background if it's older than an hour
    if(!data.ts || new Date(data.ts) < (new Date() - 60 * 60 * 1000)) {
      refreshHistory(key, type)
    }

    return cb(data.history)
  } else {
    return refreshHistory(key, type, cb)
  }
}

function refreshHistory(localStorageKey, type, cb) {
  $.ajax('/reading-history/' + type + '.json?limit=5', {
    success: function(data) {
      localStorage.setItem(localStorageKey, JSON.stringify({ ts: new Date(), history: data }))
      if(cb) { return cb(data) }
    }
  })
}
