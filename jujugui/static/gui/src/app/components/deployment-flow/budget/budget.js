/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2016 Canonical Ltd.

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

YUI.add('deployment-budget', function() {

  juju.components.DeploymentBudget = React.createClass({
    propTypes: {
      acl: React.PropTypes.object.isRequired
    },

    render: function() {
      var disabled = this.props.acl.isReadOnly();
      return (
        <div>
          <div className="deployment-budget__form twelve-col">
            <div className="four-col">
              <juju.components.InsetSelect
                disabled={disabled}
                label="Budget"
                options={[{
                  label: 'test budget',
                  value: 'test-budget'
                }]} />
            </div>
            <div className="three-col">
              <span className="deployment-budget__increase link">
                Increase budget
              </span>
            </div>
          </div>
          <juju.components.BudgetChart />
        </div>
      );
    }

  });

}, '0.1.0', {
  requires: [
    'budget-chart',
    'inset-select'
  ]
});