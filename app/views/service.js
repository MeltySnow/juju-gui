'use strict';

YUI.add('juju-view-service', function(Y) {

var views = Y.namespace('juju.views'),
    Templates = views.Templates,
    models = Y.namespace('juju.models');

var BaseServiceView = Y.Base.create('BaseServiceView', Y.View, [views.JujuBaseView], {

    initializer: function() {
        console.log('View: initialized:', this.name);
        this.bindModelView();
    }

});


var ServiceRelations = Y.Base.create('ServiceRelationsView', Y.View, [views.JujuBaseView], {

    template: Templates['service-relations'],

    render: function() {
        var container = this.get('container'),
                 self = this,
                    m = this.get('domain_models');
        var service = this.get('model');
        container.setHTML(this.template(
            {'service': service.getAttrs(),
             'relations': service.get('rels'),
             'charm': this.renderable_charm(service.get('charm'), m)}
            ));
    }
});

views.service_relations = ServiceRelations;


var ServiceConstraints = Y.Base.create('ServiceConstraintsView', Y.View, [views.JujuBaseView], {

    template: Templates['service-constraints'],

    render: function() {
        var container = this.get('container'),
                 self = this,
                    m = this.get('domain_models');
        var service = this.get('model');
        var constraints = service.get('constraints');
        var display_constraints = [];

        for (var key in constraints) {
            display_constraints.push({'name': key, 'value': constraints[key]});
        }

        var generics = ['cpu', 'mem', 'arch'];
        for (var idx in generics) {
            var gkey = generics[idx];
            if (! (gkey in constraints)) {
                display_constraints.push({'name': gkey, 'value': ''});
            }
        }

        console.log('service constraints', display_constraints);
        container.setHTML(this.template(
            {'service': service.getAttrs(),
             'constraints': display_constraints,
             'charm': this.renderable_charm(service.get('charm'), m)}
            ));
    }

});

views.service_constraints = ServiceConstraints;

var ServiceConfigView = Y.Base.create('ServiceConfigView', Y.View, [views.JujuBaseView], {

    template: Templates['service-config'],

    render: function () {
        var container = this.get('container'),
                 self = this,
                    m = this.get('domain_models');
        var service = this.get('model');

        if (!service || !service.get('loaded')) {
            console.log('not connected / maybe');
            return this;
        }

        console.log('config', service.get('config'));
        var charm_url = service.get('charm');

        // combine the charm schema and the service values for display.
        var charm =  m.charms.getById(charm_url);
        var config = service.get('config');
        var schema = charm.get('config');

        var settings = [];
        var field_def;

        for (var field_name in config) {
            field_def = schema[field_name];
            settings.push(Y.mix(
                {'name': field_name, 'value': config[field_name]}, field_def));
        }

        console.log('render view svc config', service.getAttrs(), settings);

        container.setHTML(this.template(
            {'service': service.getAttrs(),
             'settings': settings,
             'charm': this.renderable_charm(service.get('charm'), m)}
            ));
    }
});

views.service_config = ServiceConfigView;

var ServiceView = Y.Base.create('ServiceView', Y.View, [views.JujuBaseView], {

    template: Templates.service,

    render: function () {
        var container = this.get('container'),
                   db = this.get('domain_models'),
              service = this.get('model'),
                  app = this.get('app');

        var add_units_cb = function(evt) {
            console.log('add_units_cb with: ', evt.result);
            // Received acknowledgement message for the 'add_units' operation.
            // evt.results is an array of the new units to be created.  Pro-actively
            // add them to the database so they display as soon as possible.
            db.units.add(
                Y.Array.map(evt.result, function(unit_name) {
                    return new models.ServiceUnit(
                        {id:unit_name, agent_state: 'pending', service:
                         service.get('id')});}));
            service.set('unit_count', service.get('unit_count') + evt.result.length);
            db.fire('update');
        };

        var remove_units_cb = function(evt) {
            console.log('remove_units_cb with: ', arguments);
            Y.Array.each(evt.unit_names, function(unit_name) {
                db.units.getById(unit_name).set('agent_state', 'stopping');
            });
            db.fire('update');
        };

        if (!service) {
            console.log('not connected / maybe');
            return this;
        }
        var units = db.units.get_units_for_service(service);
        units.sort(function(a,b) {
            return a.get('number') - b.get('number');
        });
        var unit_ids = units.map(function(u) {
            return u.get('id');
        });
        unit_ids.reverse();

        var charm_name = service.get('charm');
        container.setHTML(this.template(
            {'service': service.getAttrs(),
             'charm': this.renderable_charm(charm_name, db),
             'units': units.map(function(u) {
                 return u.getAttrs();})
        }));
        container.all('div.thumbnail').each(function( el ) {
            el.on('click', function(evt) {
                console.log('Click', this.getData('charm-url'));
                this.fire('showUnit', {unit_id: this.get('id')});
            });
        });

        // Hook up the service-unit-control.
        var add_button = container.one('#add-service-unit');
        if (add_button) {
            add_button.on('click', function(evt) {
                var field = container.one('#num-service-units');
                var existing_value = parseInt(field.get('value'), 10);
                console.log('Click add-service-unit: ', existing_value);
                field.set('value', existing_value + 1);
                app.env.add_unit(service.get('id'), 1, add_units_cb);
            });
            var rm_button = container.one('#rm-service-unit');
            rm_button.on('click', function(evt) {
                var field = container.one('#num-service-units');
                var existing_value = parseInt(field.get('value'), 10);
                if (existing_value > 1) {
                    console.log('Click rm-service-unit');
                    field.set('value', existing_value - 1);
                    app.env.remove_units([unit_ids[0]], remove_units_cb);
                }
            });
            var form = container.one('#service-unit-control');
            form.on('submit', function(evt) {
                evt.preventDefault();
                var field = container.one('#num-service-units');
                var requested = parseInt(field.get('value'), 10);
                var num_delta = requested - service.get('unit_count');
                if (num_delta > 0) {
                    app.env.add_unit(service.get('id'), num_delta, add_units_cb);
                } else if (num_delta < 0) {
                    if (requested < 1) {
                        console.log('Requested number of units < 1: ', requested);
                        // Reset the field to the previous value.
                        // Should show a warning.
                        field.set('value', units.length);
                    } else {
                        app.env.remove_units(
                            unit_ids.slice(0, Math.abs(num_delta)),
                            remove_units_cb);
                    }
                }
            });
        }
        return this;
    }
});

views.service = ServiceView;
}, '0.1.0', {
    requires: ['juju-view-utils',
               'juju-models',
               'd3',
               'base-build',
               'handlebars',
               'node',
               'view',
               'json-stringify']
});
