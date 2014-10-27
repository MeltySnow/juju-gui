/**
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2014 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';
(function() {

  describe('browser event handlers', function() {
    var Y, utils, browser, Browser;

    before(function(done) {
      var requires = [
        'base',
        'base-build',
        'subapp-browser-events',
        'juju-browser',
        'subapp-browser',
        'juju-tests-utils'
      ];
      Y = YUI(GlobalConfig).use(requires, function(Y) {
        utils = Y.namespace('juju-tests.utils');
        done();
      });
    });

    beforeEach(function() {
      Browser = Y.Base.create('mockbrowser', Y.Base,
          [Y.juju.browser.BrowserEventsExtension], {});
      browser = new Browser();
    });

    afterEach(function() {
      browser.destroy();
    });

    describe('changeState events', function() {
      var generateUrlStub, navigateStub;

      beforeEach(function() {
        // Setup state.
        var State = Y.Base.create('mockstate', Y.Base, [], {});
        var state = new State();
        generateUrlStub = utils.makeStubMethod(state, 'generateUrl', '/foo');
        browser.state = state;
        // Stub out the navigate function.
        navigateStub = utils.makeStubFunction();
        browser.navigate = navigateStub;
      });

      afterEach(function() {
        browser.state.destroy();
        generateUrlStub = null;
        navigateStub = null;
      });

      it('cancels the inspector retry timer', function() {
        var timer = {};
        var cancelStub = utils.makeStubFunction();
        timer.cancel = cancelStub;
        browser.set('inspectorRetryTimer', timer);
        browser._onChangeState({details: ['foo']});
        assert.equal(cancelStub.calledOnce(), true, 'timer was not canceled');
        assert.equal(browser.get('inspectorRetries'), 0);
      });

      it('navigates to the proper URL', function() {
        browser._onChangeState({details: ['foo']});
        assert.equal(browser.state.get('allowInspector'), true,
                     'inspector was not allowed');
        assert.equal(generateUrlStub.lastArguments()[0], 'foo',
                     'details were not passed to generateUrl');
        assert.equal(navigateStub.lastArguments()[0], '/foo',
                     'incorrect URL was passed to navigate');
      });
    });

    describe('serviceDeployed events', function() {
      beforeEach(function() {
        var Inspector = Y.Base.create('mockinspector', Y.Base, [], {}),
            inspector = new Inspector();
        var Model = Y.Base.create('mockmodel', Y.Base, [], {}),
            model = new Model();
        inspector.set('model', model);
        browser._inspector = inspector;
      });

      it('updates the active inspector appropriately', function(done) {
        var clientId = 'test',
            serviceName = 'test-0',
            inspector = browser._inspector;
        inspector.get('model').set('clientId', clientId);
        browser.on('changeState', function(e) {
          assert.equal(e.sectionA.component, 'inspector',
                       'the state component is not set to inspector');
          assert.equal(e.sectionA.metadata.id, serviceName,
                       'the state metadata id is not set properly');
          done();
        });
        browser._onServiceDeployed({
          clientId: clientId,
          serviceName: serviceName
        });
      });

      it('does nothing when there is no active inspector', function() {
        browser._inspector = null;
        var fireStub = utils.makeStubMethod(browser, 'fire');
        this._cleanups.push(fireStub.reset);
        browser._onServiceDeployed({
          clientId: 'test',
          serviceName: 'test-0'
        });
        assert.equal(fireStub.callCount(), 0);
      });

      it('does nothing when the active inspector is destroyed', function() {
        browser._inspector.set('destroyed', true);
        var fireStub = utils.makeStubMethod(browser, 'fire');
        this._cleanups.push(fireStub.reset);
        browser._onServiceDeployed({
          clientId: 'test',
          serviceName: 'test-0'
        });
        assert.equal(fireStub.callCount(), 0);
      });

      it('ignores services that don\'t matched the provided ID', function() {
        var inspector = browser._inspector;
        inspector.get('model').set('clientId', 'foobar');
        var fireStub = utils.makeStubMethod(browser, 'fire');
        this._cleanups.push(fireStub.reset);
        browser._onServiceDeployed({
          clientId: 'test',
          serviceName: 'test-0'
        });
        assert.equal(fireStub.callCount(), 0);
      });
    });

    describe('highlight events', function() {
      var db;

      beforeEach(function() {
        db = new Y.juju.models.Database();
        db.services.add([
          {id: 'mysql'},
          {id: 'wordpress'}
        ]);
        db.addUnits([
          {id: 'mysql/0', machine: '0'},
          {id: 'wordpress/0', machine: '0'}
        ]);
        browser.set('db', db);
        browser.set('topo', {
          fire: utils.makeStubFunction()
        });
      });

      it('sets hide flag on all unrelated units on highlight', function() {
        assert.equal(db.units.getById('mysql/0').hide, undefined);
        assert.equal(db.units.getById('wordpress/0').hide, undefined);
        browser._onHighlight({serviceName: 'mysql'});
        assert.equal(db.units.getById('mysql/0').hide, undefined);
        assert.equal(db.units.getById('wordpress/0').hide, true);
      });

      it('percolates the highlight event to the topology', function() {
        var args = {serviceName: 'mysql', highlightRelated: true},
            topo = browser.get('topo');
        browser._onHighlight(args);
        assert.equal(topo.fire.lastArguments()[0], 'highlight');
        assert.deepEqual(topo.fire.lastArguments()[1], args);
      });

      it('unsets hide flag on all unrelated units on unhighlight', function() {
        assert.equal(db.units.getById('mysql/0').hide, undefined);
        assert.equal(db.units.getById('wordpress/0').hide, undefined);
        browser._onUnhighlight({serviceName: 'mysql'});
        assert.equal(db.units.getById('mysql/0').hide, undefined);
        assert.equal(db.units.getById('wordpress/0').hide, false);
      });

      it('percolates the unhighlight event to the topology', function() {
        var args = {serviceName: 'mysql', unhighlightRelated: true},
            topo = browser.get('topo');
        browser._onUnhighlight(args);
        assert.equal(topo.fire.lastArguments()[0], 'unhighlight');
        assert.deepEqual(topo.fire.lastArguments()[1], args);
      });
    });

    describe('show events', function() {
      var db;

      beforeEach(function() {
        db = new Y.juju.models.Database();
        db.services.add([
          {id: 'mysql'},
          {id: 'wordpress'}
        ]);
        db.addUnits([
          {id: 'mysql/0', machine: '0'},
          {id: 'wordpress/0', machine: '0'}
        ]);
        browser.set('db', db);
        browser.set('topo', {
          fire: utils.makeStubFunction()
        });
      });

      it('sets fade flag on selected units on fade', function() {
        assert.equal(db.units.getById('mysql/0').fade, undefined);
        assert.equal(db.units.getById('wordpress/0').fade, undefined);
        browser._onFade({serviceNames: ['mysql']});
        assert.equal(db.units.getById('mysql/0').fade, true);
        assert.equal(db.units.getById('wordpress/0').fade, undefined);
      });

      it('percolates the fade event to the topology', function() {
        var topo = browser.get('topo');
        browser._onFade({serviceNames: ['mysql'], fadeLevel: 'hidden'});
        assert.equal(topo.fire.lastArguments()[0], 'fade');
        assert.deepEqual(topo.fire.lastArguments()[1],
                         {serviceNames: ['mysql'], alpha: '0.2'});
      });

      it('unsets fade flag on selected units on show', function() {
        assert.equal(db.units.getById('mysql/0').fade, undefined);
        assert.equal(db.units.getById('wordpress/0').fade, undefined);
        browser._onShow({serviceNames: ['mysql']});
        assert.equal(db.units.getById('mysql/0').fade, false);
        assert.equal(db.units.getById('wordpress/0').fade, undefined);
      });

      it('percolates the show event to the topology', function() {
        var topo = browser.get('topo');
        browser._onShow({serviceNames: ['mysql']});
        assert.equal(topo.fire.lastArguments()[0], 'show');
        assert.deepEqual(topo.fire.lastArguments()[1],
                         {serviceNames: ['mysql']});
      });
    });
  });
})();
