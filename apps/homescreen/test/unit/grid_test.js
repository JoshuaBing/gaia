'use strict';

mocha.globals(['mozRequestAnimationFrame']);

requireApp('homescreen/test/unit/mock_page.js');
requireApp('homescreen/test/unit/mock_icon.js');
requireApp('homescreen/test/unit/mock_dock_manager.js');
requireApp('homescreen/test/unit/mock_home_state.js');
requireApp('homescreen/test/unit/mock_pagination_bar.js');
requireApp('homescreen/test/unit/mock_app.js');
requireApp('homescreen/test/unit/mock_apps_mgmt.js');
requireApp('homescreen/test/unit/mock_configurator.js');
requireApp('homescreen/test/unit/mock_hidden_apps.js');
requireApp('homescreen/test/unit/mock_manifest_helper.js');

requireApp('homescreen/js/grid.js');

var mocksHelperForGrid = new MocksHelper([
  'DockManager',
  'HomeState',
  'Page',
  'Dock',
  'Icon',
  'PaginationBar',
  'Configurator',
  'HIDDEN_APPS',
  'ManifestHelper',
  'getDefaultIcon'
]);

mocksHelperForGrid.init();

suite('grid.js >', function() {
  var TAP_THRESHOLD = 10;
  var SWIPE_THRESHOLD = 0.5;
  var TINY_TIMEOUT = 50;
  var SAVE_STATE_WAIT_TIMEOUT = 200;

  var wrapperNode, containerNode;
  var realMozApps;

  var mocksHelper = mocksHelperForGrid;

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    realMozApps = window.navigator.mozApps;
    window.navigator.mozApps = {
      mgmt: MockAppsMgmt
    };

  });

  suiteTeardown(function() {
    window.navigator.mozApps = realMozApps;

    mocksHelper.suiteTeardown();
  });

  setup(function(done) {
    mocksHelper.setup();

    var fakeMarkup =
      '<div id="icongrid" class="apps" role="main">' +
        '<div id="landing-page" data-current-page="true">' +
        '</div>' +
      '</div>' +
      '<div class="dockWrapper"></div>' +
      '<div id="landing-overlay"></div>';

    wrapperNode = document.createElement('div');
    wrapperNode.innerHTML = fakeMarkup;
    document.body.appendChild(wrapperNode);

    containerNode = document.getElementById('icongrid');

    var options = {
      gridSelector: '.apps',
      dockSelector: '.dockWrapper',
      tapThreshold: TAP_THRESHOLD,
      swipeThreshold: SWIPE_THRESHOLD,
      swipeFriction: 0.1,
      swipeTransitionDuration: 300
    };

    GridManager.init(options, done);
  });

  teardown(function() {
    mocksHelper.teardown();

    wrapperNode.parentNode.removeChild(wrapperNode);
  });

  function ensurePanningSuite() {
    suite('ensurePanning >', function() {
      var realRequestAnimationFrame;

      setup(function() {
        GridManager.ensurePanning();
        MockPage.mTeardown();

        realRequestAnimationFrame = window.mozRequestAnimationFrame;
        window.mozRequestAnimationFrame = function(func) {
          setTimeout(function() {
            func();
          });
        };
      });

      teardown(function() {
        window.mozRequestAnimationFrame = realRequestAnimationFrame;
        realRequestAnimationFrame = null;
      });

      test('should be able to pan', function(done) {
        var evt = document.createEvent('MouseEvent');

        evt.initMouseEvent('mousedown', true, true, window,
          0, 100, 100, 100, 100, false, false, false, false, 0, null);
        containerNode.dispatchEvent(evt);

        evt = document.createEvent('MouseEvent');

        evt.initMouseEvent('mousemove', true, true, window,
          0, 200, 100, 200, 100, false, false, false, false, 0, null);
        containerNode.dispatchEvent(evt);

        assert.equal(document.body.dataset.transitioning, 'true');

        setTimeout(function() {
          done(function() {
            var currentPage = document.getElementById('landing-page');
            assert.include(currentPage.style.MozTransform, 'translateX');
          });
        }, TINY_TIMEOUT);
      });
    });
  }

  ensurePanningSuite();

  suite('onDragStart >', function() {
    setup(function() {
      GridManager.onDragStart();
    });

    ensurePanningSuite();
  });

  suite('install app >', function() {
    var mockApp;

    setup(function(done) {
      // we want to test only this call
      MockHomeState.mLastSavedGrid = null;
      mockApp = new MockApp();
      MockAppsMgmt.mTriggerOninstall(mockApp);
      setTimeout(done.bind(null, undefined), SAVE_STATE_WAIT_TIMEOUT);
    });

    test('should save the state', function() {
      assert.ok(MockHomeState.mLastSavedGrid);
    });

    suite('updating app >', function() {
      setup(function(done) {
        // we want to test only this call
        MockHomeState.mLastSavedGrid = null;
        mockApp.mTriggerDownloadApplied();
        setTimeout(done.bind(null, undefined), SAVE_STATE_WAIT_TIMEOUT);
      });

      test('should save the state', function() {
        assert.ok(MockHomeState.mLastSavedGrid);
      });
    });
  });

});
