import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { __ } from '/imports/localization/i18n.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { ParcelBillings } from './parcel-billings.js';
import './methods.js';

ParcelBillings.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('parcelBillings.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.insert',
        collection: ParcelBillings,
        type: 'method',
        meteormethod: 'parcelBillings.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('parcelBillings.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.view',
        collection: ParcelBillings,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('parcelBillings.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.update',
        collection: ParcelBillings,
        doc,
        type: 'method-update',
        meteormethod: 'parcelBillings.update',
        singleMethodArgument: true,
      });
    },
  },
  apply: {
    name: 'apply',
    icon: () => 'fa fa-calendar-plus-o',
    visible: (options, doc) => currentUserHasPermission('parcelBillings.apply', doc),
    run(options, doc) {
      const communityId = Session.get('activeCommunityId');
      const billing = doc || ParcelBillings.findOne({ communityId, active: true });
      Session.set('activeParcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        description: `${__('schemaParcelBillings.lastAppliedAt.label')} > ${Render.formatDate(billing.lastAppliedAt().date)}`,
        schema: ParcelBillings.applySchema,
        type: 'method',
        meteormethod: 'parcelBillings.apply',
      });
    },
  }, /*
  revert: {
    name: 'revert',
    icon: () => 'fa fa-calendar-times-o',
    visible: (options, doc) => currentUserHasPermission('parcelBillings.revert', doc),
    run(options) {
      Session.set('activeParcelBillingId', doc && doc._id);
      Modal.show('Autoform_modal', {
        id: 'af.parcelBilling.apply',
        schema: ParcelBillings.applySchema,
        type: 'method',
        meteormethod: 'parcelBillings.revert',
      });
    },
  },*/
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('parcelBillings.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(ParcelBillings.methods.remove, { _id: doc._id }, {
        action: 'delete parcelBilling',
        message: 'It will disappear forever',
      });
    },
  },
};

//--------------------------------------------------

AutoForm.addModalHooks('af.parcelBilling.insert');
AutoForm.addModalHooks('af.parcelBilling.update');
AutoForm.addModalHooks('af.parcelBilling.apply');

AutoForm.addHooks('af.parcelBilling.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addHooks('af.parcelBilling.update', {
  formToModifier(modifier) {
    // TODO: nasty hack to trick autoform - AF is trying to $unset these, and then throws error, that these values are mandatory
    delete modifier.$unset['consumption.service'];
    delete modifier.$unset['consumption.charges'];
    return modifier;
  },
});

AutoForm.addHooks('af.parcelBilling.apply', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
