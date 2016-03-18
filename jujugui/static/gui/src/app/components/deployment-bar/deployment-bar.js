/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2015 Canonical Ltd.

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

YUI.add('deployment-bar', function() {

  juju.components.DeploymentBar = React.createClass({
    propTypes: {
      exportEnvironmentFile: React.PropTypes.func.isRequired,
      renderDragOverNotification: React.PropTypes.func.isRequired,
      hasEntities: React.PropTypes.bool.isRequired,
      importBundleFile: React.PropTypes.func.isRequired,
      showInstall: React.PropTypes.bool.isRequired
    },

    previousNotifications: [],

    /**
      Get the current state of the deployment bar.

      @method getInitialState
      @returns {Object} The current state.
    */
    getInitialState: function() {
      return {
        latestChangeDescription: null
      };
    },

    componentWillReceiveProps: function(nextProps) {
      this._updateLatestChange(nextProps.currentChangeSet);
    },

    /**
      Update the state with the latest change if it has changed.

      @method _updateLatestChange
      @param {Object} currentChangeSet The collection of ecs changes.
    */
    _updateLatestChange: function(changeSet) {
      var keys = Object.keys(changeSet);
      var latestChange = keys[keys.length - 1];
      var previousIndex = this.previousNotifications.indexOf(latestChange);
      if (latestChange && previousIndex === -1) {
        var change = changeSet[latestChange];
        this.previousNotifications.push(latestChange);
        this.setState({
          latestChangeDescription: this.props.generateChangeDescription(change)
        });
      }
    },

    /**
      Get the label for the deploy button.

      @method _getDeployButtonLabel
      @param {Boolean} hasCommits Does the env have commits.
      @returns {String} the label for the deploy button
    */
    _getDeployButtonLabel: function(hasCommits) {
      return hasCommits ? 'Commit changes' : 'Deploy changes';
    },

    /**
      Export the env when the button is clicked.

      @method _handleExport
    */
    _handleExport: function() {
      this.props.exportEnvironmentFile();
    },

    /**
      Open a file picker when the button is clicked.

      @method _handleImportClick
    */
    _handleImportClick: function() {
      var input = this.refs['file-input'];
      if (input) {
        input.click();
      }
    },

    /**
      When file is submitted the drag over animation is triggered and the file
      is passed to the utils function.

      @method _handleImportFile
    */
    _handleImportFile: function() {
      var inputFile = this.refs['file-input'].files[0];
      if(inputFile) {
        this.props.renderDragOverNotification(false);
        this.props.importBundleFile(inputFile);
        setTimeout(() => {
          this.props.hideDragOverNotification();}, 600);
      }
    },

    /**
      Generate the install button if it should be displayed.

      @method _generateInstallButton
      @returns {Object} The install button.
    */
    _generateInstallButton: function() {
      if (!this.props.showInstall) {
        return;
      }
      return (
        <a className="deployment-bar__install-button"
          href="https://jujucharms.com/get-started"
          target="_blank">
          Install Juju
        </a>);
    },

    /**
      Returns the classes for the button based on the provided props.
      @method _generateClasses
      @returns {String} The collection of class names.
    */
    _generateClasses: function() {
      return classNames(
        'deployment-bar',
        {
          'deployment-bar--initial': !this.props.hasEntities &&
            Object.keys(this.props.currentChangeSet).length === 0
        }
      );
    },

    /**
      Display the deployment summary when the deploy button is clicked.

      @method _deployAction
    */
    _deployAction: function() {
      this.props.changeActiveComponent('summary');
    },

    render: function() {
      var changeCount = Object.keys(this.props.currentChangeSet).length;
      return (
        <juju.components.Panel
          instanceName="deployment-bar-panel"
          visible={true}>
          <div className={this._generateClasses()}>
            <span className="deployment-bar__import link"
              onClick={this._handleImportClick}
              role="button"
              tabIndex="0">
              Import
            </span>
            <span className="deployment-bar__export link"
              onClick={this._handleExport}
              role="button"
              tabIndex="0">
              Export
            </span>
            {this._generateInstallButton()}
            <juju.components.DeploymentBarNotification
              change={this.state.latestChangeDescription} />
            <div className="deployment-bar__deploy">
              <juju.components.GenericButton
                action={this._deployAction}
                type="blue"
                disabled={changeCount === 0}
                title={changeCount.toString()} />
              <juju.components.GenericButton
                action={this._deployAction}
                type="confirm"
                disabled={changeCount === 0}
                title={this._getDeployButtonLabel(this.props.hasCommits)} />
            </div>
            <input className="deployment-bar__file"
              type="file"
              onChange={this._handleImportFile}
              accept=".zip,.yaml,.yml"
              ref="file-input" />
          </div>
        </juju.components.Panel>
      );
    }
  });

}, '0.1.0', { requires: [
  'deployment-bar-notification',
  'generic-button',
  'panel-component'
]});
