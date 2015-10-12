/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2013 Canonical Ltd.

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


describe('deployer bar view', function() {
  var container, db, ECS, ecs, importBundleFile, mockEvent,
      models, testUtils, utils, changesUtils, view, View, views, Y;

  before(function(done) {
    var requirements = [
      'changes-utils',
      'deployer-bar',
      'environment-change-set',
      'event-simulate',
      'juju-models',
      'juju-tests-utils',
      'juju-views',
      'node',
      'node-event-simulate'
    ];
    Y = YUI(GlobalConfig).use(requirements, function(Y) {
      models = Y.namespace('juju.models');
      utils = Y.namespace('juju-tests.utils');
      views = Y.namespace('juju.views');
      ECS = Y.namespace('juju').EnvironmentChangeSet;
      changesUtils = window.juju.utils.ChangesUtils;
      View = views.DeployerBarView;
      mockEvent = { halt: function() {} };
      done();
    });
  });

  beforeEach(function() {
    db = new models.Database();
    ecs = new ECS({db: db});
    container = utils.makeContainer(this, 'deployer-bar');
    importBundleFile = utils.makeStubFunction();
    view = new View({
      container: container,
      db: db,
      ecs: ecs,
      bundleImporter: {
        importBundleFile: importBundleFile
      }
    }).render();
  });

  afterEach(function() {
    window.clearTimeout(ecs.descriptionTimer);
    ecs.destroy();
    container.remove(true);
    view.destroy();
  });

  // Add a service and a unit to the given database.
  var addEntities = function(db) {
    db.services.add({id: 'django', charm: 'cs:trusty/django-1'});
    db.addUnits({id: 'django/0'});
  };

  it('should exist in the views namespace', function() {
    assert(views.DeployerBarView);
  });

  it('should apply the wrapping class to the container', function() {
    assert.equal(container.hasClass('deployer-bar'), true);
  });

  it('should increase changes when a service is added', function() {
    ecs.changeSet.abc123 = { foo: 'foo', index: 0 };
    assert.equal(view._getChangeCount(ecs), 1);
  });

  it('should disabled the deploy button if there are no changes', function() {
    assert.equal(container.one('.deploy-button').hasClass('disabled'), true);
  });

  it('should enable the deploy button if there are changes', function() {
    addEntities(db);
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    assert.equal(container.one('.deploy-button').hasClass('disabled'), false);
  });

  it('should not show the summary panel when there are no changes', function() {
    container.one('.deploy-button').simulate('click');
    assert.equal(container.hasClass('summary-open'), false);
  });

  it('should show the summary panel when there are changes', function() {
    addEntities(db);
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    container.one('.deploy-button').simulate('click');
    assert.equal(container.hasClass('summary-open'), true);
  });

  it('should not show the summary panel if the deploy button is disabled',
      function() {
        addEntities(db);
        ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
        container.one('.deploy-button').addClass('disabled');
        // Must use a full reference to this button after the class has been
        // added. Don't try and move the reference to a variable.
        container.one('.deploy-button').simulate('click');
        assert.equal(container.hasClass('summary-open'), false);
      });

  it('shows a summary of major uncommitted changes for deployment', function() {
    // We must add at least one major change
    var machine = {};
    ecs.lazyAddMachines([[machine]], { modelId: 'new-0' });

    var changesStub = utils.makeStubMethod(view, '_getChangeCount', 0),
        deployStub = utils.makeStubMethod(view, '_getDeployedServices', []),
        relationsStub = utils.makeStubMethod(view, '_getAddRelations', []);
    this._cleanups.push(changesStub.reset);
    this._cleanups.push(deployStub.reset);
    this._cleanups.push(relationsStub.reset);
    view._showSummary();
    assert.equal(
        container.hasClass('summary-open'), true,
        'Summary is not open.'
    );
    assert.notEqual(
        container.one('.summary-panel'), null,
        'Summary panel HTML is not present.'
    );
    assert.notEqual(
        container.one('.post-summary'), null,
        'Deployment confirmation not present.'
    );
  });

  it('shows only the changelog if there are no major changes', function() {
    // We must add at least one change
    var containerMachine = {
      parentId: 'new-0', containerType: 'lxc'
    };
    ecs.lazyAddMachines([[containerMachine]], { modelId: 'new-1' });
    var changesStub = utils.makeStubMethod(view, '_getChangeCount', 0),
        deployStub = utils.makeStubMethod(view, '_getDeployedServices', []),
        relationsStub = utils.makeStubMethod(view, '_getAddRelations', []);
    this._cleanups.push(changesStub.reset);
    this._cleanups.push(deployStub.reset);
    this._cleanups.push(relationsStub.reset);
    view._showSummary();
    assert.equal(
        container.hasClass('summary-open'), true,
        'Summary is not open.'
    );
    assert.equal(
        container.one('.summary-panel'), null,
        'Summary panel HTML exists when it should not.'
    );
    assert.notEqual(
        container.one('.post-summary'), null,
        'Deployment confirmation not present.'
    );
    assert.equal(
        container.one('.panel.summary .changes').hasClass('open'), true,
        'Changelog not open when it should be.'
    );
  });

  it('can toggle the recent changes in the summary panel', function() {
    var majorChangeStub = utils.makeStubMethod(view, '_hasMajorChanges', true);
    this._cleanups.push(majorChangeStub);
    view._showSummary();
    var changesNode = container.one('.panel.summary .changes');
    var toggleNode = changesNode.one('.toggle');
    assert.equal(changesNode.hasClass('open'), false,
        'The changes should initially be closed');
    toggleNode.simulate('click');
    assert.equal(changesNode.hasClass('open'), true,
        'The changes node should have had the open class added');
    toggleNode.simulate('click');
    assert.equal(changesNode.hasClass('open'), false,
        'The changes node should have had the open class removed');
  });

  it('can close all panels', function() {
    container.addClass('changes-open summary-open');
    view.close();
    assert.equal(container.hasClass('changes-open'), false);
    assert.equal(container.hasClass('summary-open'), false);
  });

  it('can show a list of recent changes', function() {
    var changesStub = utils.makeStubMethod(changesUtils,
        'generateAllChangeDescriptions', []);
    this._cleanups.push(changesStub.reset);
    view._showChanges();
    assert.equal(container.hasClass('changes-open'), true,
        'Changes should be open.');
    assert.notEqual(container.one('.panel.changes'), null,
        'Summary panel HTML should be present.');
  });

  it('should commit on confirmation', function() {
    var stubCommit = utils.makeStubMethod(ecs, 'commit');
    this._cleanups.push(stubCommit.reset);
    view.deploy(mockEvent);
    assert.equal(stubCommit.calledOnce(), true,
                 'ECS commit not called');
    assert.equal(container.hasClass('summary-open'), false,
                 'summary-open class still present');
  });

  it('closes the inspector on deploy', function() {
    var stubCommit = utils.makeStubMethod(ecs, 'commit');
    var fireStub = utils.makeStubMethod(view, 'fire');
    this._cleanups.push(fireStub.reset);
    this._cleanups.push(stubCommit.reset);
    view.deploy(mockEvent);
    assert.equal(fireStub.callCount(), 1);
    assert.deepEqual(fireStub.lastArguments(), ['changeState', {
      sectionA: {
        component: null,
        metadata: {id: null}}}]);
    assert.equal(stubCommit.calledOnce(), true,
                 'ECS commit not called');
  });

  it('updates when the change set is modified', function(done) {
    view.update = function(evt) {
      done();
    };
    view.render();
    view.get('ecs').fire('changeSetModified');
  });

  it('notifies the user when a change set is completed', function(done) {
    view.notifyCommitFinished = function(evt) {
      done();
    };
    view.render();
    view.get('ecs').fire('currentCommitFinished');
  });

  it('displays the most recent change as a notification on update', function() {
    var stubGet = utils.makeStubMethod(view, '_getChangeNotification');
    view.render();
    view.update();
    assert.equal(stubGet.calledOnce(), true);
  });

  it('closes the summary', function() {
    view.hideSummary(mockEvent);
    assert.equal(container.hasClass('summary-open'), false);
  });

  it('can display the constraints', function() {
    ecs.lazyAddMachines([[{
      modelId: 'new0',
      constraints: {
        mem: 1024
      }
    }]], { modelId: 'new-0' });
    view._showSummary();
    assert.equal(container.one('.summary-panel li').get(
        'text').replace(/\s+/g, ' ').trim(),
        'new-0 created with constraints ( mem=1024MB )');
  });

  it('displays correctly with null constraints', function() {
    ecs.lazyAddMachines([[{
      modelId: 'new0',
      constraints: {
        mem: null
      }
    }]], { modelId: 'new-0' });
    view._showSummary();
    assert.equal(container.one('.summary-panel li').get(
        'text').replace(/\s+/g, ' ').trim(),
        'new-0 created');
  });

  it('retrieves all the unit changes', function() {
    db.services.add([
      {id: 'ghost-django-1', name: 'django', charm: 'cs:trusty/django-1'},
      {id: 'ghost-django-2', name: 'django', charm: 'cs:trusty/django-1'},
      {id: 'rails', charm: 'cs:utopic/rails-42',
        icon: 'http://example.com/foo'}
    ]);
    db.addUnits([
      {id: 'ghost-django-1/0'},
      {id: 'ghost-django-2/0'},
      {id: 'rails/1'}
    ]);
    // XXX kadams54 2014-08-08: this is a temporary hack right now
    // because the ECS doesn't batch operations. Add 10 units and
    // you'll get 10 log entries with numUnits set to 1. Once
    // numUnits reflects the actual number being added, we can
    // update the test.
    ecs.lazyAddUnits(['django', 1], {modelId: 'ghost-django-1/0'});
    ecs.lazyAddUnits(['django', 1], {modelId: 'ghost-django-2/0'});
    ecs.lazyAddUnits(['rails', 1], {modelId: 'rails/1'});
    var delta = view._getChanges(ecs.changeSet, db.services, db.units),
        results = delta.changes.addUnits;
    assert.lengthOf(results, 2);
    assert.deepEqual(results[0], {
      numUnits: 2,
      icon: undefined,
      serviceName: 'django'
    });
    assert.deepEqual(results[1], {
      numUnits: 1,
      icon: 'http://example.com/foo',
      serviceName: 'rails'
    });
  });

  it('retrieves all the machine changes', function() {
    var machine = {};
    ecs.lazyAddMachines([[machine]], { modelId: 'new-0' });
    ecs.lazyAddMachines([[machine]], { modelId: 'new-1' });
    var delta = view._getChanges(ecs.changeSet, db.services, db.units),
        results = delta.changes.addMachines;
    assert.lengthOf(results, 2);
    assert.deepEqual(results[0], machine);
    assert.deepEqual(results[1], machine);
  });

  it('ignores container changes in the summary', function() {
    var machine = {};
    ecs.lazyAddMachines([[machine]], { modelId: 'new-0' });
    var container = {
      parentId: 'new-0', containerType: 'lxc'
    };
    ecs.lazyAddMachines([[container]], { modelId: 'new-1' });
    var delta = view._getChanges(ecs.changeSet, db.services, db.units),
        results = delta.changes.addMachines;
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0], machine);
  });

  it('retrieves all of the _set_config changes', function() {
    db.services.add([
      { id: 'foo', displayName: 'foo', icon: 'foo-icon' },
      // To test the ghost config set.
      { id: '12345$', displayName: '(bar)', icon: 'bar-icon' }
    ]);
    var command1 = {
      method: '_set_config',
      args: ['foo']
    };
    var command2 = {
      method: '_set_config',
      args: ['12345$']
    };
    ecs._createNewRecord('setConfig', command1, []);
    ecs._createNewRecord('setConfig', command2, []);
    var delta = view._getChanges(ecs.changeSet, db.services, db.units),
        results = delta.changes.setConfigs;
    assert.lengthOf(results, 2);
    assert.deepEqual(results, [
      {
        icon: 'foo-icon',
        serviceName: 'foo'
      },
      {
        icon: 'bar-icon',
        serviceName: '12345$'
      }
    ]);
  });

  describe('config conflict', function() {
    it('shows a message if there are conflicting config values', function() {
      db.services.add({
        id: 'foo', _conflictedFields: ['bar']
      });
      view._showSummary();
      assert.equal(
          container.one('a.resolve-conflict').get('text'),
          'foo');
    });

    it('will navigate to the inspector on click', function() {
      db.services.add({
        id: 'foo', _conflictedFields: ['bar']
      });
      view._showSummary();
      var hide = utils.makeStubMethod(view, 'hideSummary');
      var fire = utils.makeStubMethod(view, 'fire');
      this._cleanups.concat([hide, fire]);
      container.one('a.resolve-conflict').simulate('click');
      assert.equal(hide.callCount(), 1);
      assert.equal(fire.lastArguments()[0], 'changeState');
      assert.deepEqual(fire.lastArguments()[1], {
        sectionA: {
          component: 'inspector',
          metadata: {
            id: 'foo'
          }}});
    });
  });

  it('can export the environment', function() {
    var exportStub = utils.makeStubMethod(view, '_exportFile');
    this._cleanups.push(exportStub.reset);
    container.one('.export').simulate('click');
    assert.equal(exportStub.calledOnce(), true,
        'exportFile should have been called');
  });

  it('can open the import file dialogue', function() {
    // The file input is hidden and the dialogue is opened by a
    // javascript click event. Stubbing out the click so we can test
    // that it is called.
    var clickStub = utils.makeStubMethod(container.one(
        '.import-file').getDOMNode(), 'click');
    this._cleanups.push(clickStub.reset);
    container.one('.import').simulate('click');
    assert.equal(clickStub.calledOnce(), true,
        'the file input should have been clicked');
  });

  it('can import a bundle file', function() {
    container.one('.import-file').simulate('change');
    assert.equal(importBundleFile.callCount(), 1);
  });

  it('can set the height mode to small', function() {
    assert.equal(container.hasClass('mode-min'), false);
    container.one('.action-list .min').simulate('click');
    assert.equal(container.hasClass('mode-min'), true);
  });

  it('can set the height mode to medium', function() {
    assert.equal(container.hasClass('mode-mid'), false);
    container.one('.action-list .mid').simulate('click');
    assert.equal(container.hasClass('mode-mid'), true);
  });

  it('can set the height mode to large', function() {
    assert.equal(container.hasClass('mode-max'), false);
    container.one('.action-list .max').simulate('click');
    assert.equal(container.hasClass('mode-max'), true);
  });

  it('disables the deploy button after deploy', function() {
    var stubToggle = utils.makeStubMethod(view, '_toggleDeployButtonStatus');
    view.deploy({halt: utils.makeStubFunction()});
    assert.equal(stubToggle.calledOnce(), true, 'Button not disabled');
  });

  it('does not change the deploy label after the first deploy', function() {
    var deployButton = container.one('.deploy-button');
    assert.equal(deployButton.get('text').trim(), 'Commit');
    view.deploy({halt: utils.makeStubFunction()});
    assert.equal(deployButton.get('text').trim(), 'Commit');
  });

  it('shows the commit label after deploy and re-render', function() {
    var deployButton = container.one('.deploy-button');
    view.deploy({halt: utils.makeStubFunction()});
    assert.equal(deployButton.get('text').trim(), 'Commit');
    view.render();
    assert.equal(deployButton.get('text').trim(), 'Commit');
  });

  it('changes the confirm message and button after first deploy', function() {
    assert.equal(container.one('.confirm-button').get('text').trim(),
        'Confirm');
    assert.equal(container.one('.post-summary p').get(
        'text').trim().replace(/\s+/g, ' '), 'Deploy changes?');
    view.deploy({halt: utils.makeStubFunction()});
    view.render();
    assert.equal(container.one('.confirm-button').get('text').trim(), 'Commit');
    assert.equal(container.one('.post-summary p').get(
        'text').trim().replace(/\s+/g, ' '), 'Commit changes?');
  });

  it('should display if there are unplaced units', function() {
    addEntities(db);
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    container.one('.deploy-button').simulate('click');
    assert.notEqual(container.one('.unplaced-panel'), null);
  });

  it('only displays the count of non-subordinate unplaced units', function() {
    addEntities(db);
    db.services.add({id: 'subs', charm: 'cs:trusty/subs-1', subordinate: true});
    db.addUnits({id: 'subs/0'});
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    ecs.lazyAddUnits(['subs', 1], {modelId: 'subs/0'});
    container.one('.deploy-button').simulate('click');
    assert.equal(
        container.one('.unplaced-panel p').get('text'),
        'You have 1 unplaced unit, do you want to:');
  });

  it('should not display if there are no unplaced units', function() {
    addEntities(db);
    var unit = db.units.getById('django/0');
    unit.machine = '0';
    ecs.lazyAddUnits(['django', 1, '0'], {modelId: 'django/0'});
    container.one('.deploy-button').simulate('click');
    assert.equal(container.one('.unplaced-panel'), null);
  });

  it('should default to leave unplaced', function() {
    addEntities(db);
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    container.one('.deploy-button').simulate('click');
    assert.equal(container.one('#leave-unplaced').get('checked'), true);
    assert.equal(container.one('#autodeploy').get('checked'), false);
  });

  it('should default to automatically place when set', function() {
    localStorage.setItem('auto-place-default', 'true');
    addEntities(db);
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    container.one('.deploy-button').simulate('click');
    assert.equal(container.one('#leave-unplaced').get('checked'), false);
    assert.equal(container.one('#autodeploy').get('checked'), true);
    localStorage.removeItem('auto-place-default');
  });

  it('should autodeploy unplaced units if instructed', function() {
    addEntities(db);
    var autoplaceStub = utils.makeStubMethod(view, '_autoPlaceUnits');
    utils.makeStubMethod(view.get('ecs'), 'commit');
    ecs.lazyAddUnits(['django', 1], {modelId: 'django/0'});
    container.one('.deploy-button').simulate('click');
    container.one('input[value="autodeploy"]').set('checked', true);
    view.deploy({halt: utils.makeStubFunction()});
    assert.equal(autoplaceStub.calledOnce(), true);
  });

  describe('Commit onboarding', function() {
    afterEach(function() {
      localStorage.clear();
    });

    it('should hide commit onboarding when dismissed', function() {
      var onboarding = container.one('.commit-onboarding');
      onboarding.removeClass('hidden');
      onboarding.one('.close').simulate('click');
      assert.equal(onboarding.hasClass('hidden'), true);
    });

    it('should show commit onboarding one time only', function() {
      var onboarding = container.one('.commit-onboarding');
      view._showCommitOnboarding();
      assert.equal(onboarding.hasClass('hidden'), false,
                   'onboarding should be shown initially');
      onboarding.one('.close').simulate('click');
      assert.equal(localStorage.getItem('commit-onboarding'), 'dismissed',
                   'flag indicating onboarding dismissed should be set');
      assert.equal(onboarding.hasClass('hidden'), true,
                   'onboarding should be hidden');
      view._showCommitOnboarding();
      assert.equal(onboarding.hasClass('hidden'), true,
                   'onboarding should still be hidden');
    });
  });
});
