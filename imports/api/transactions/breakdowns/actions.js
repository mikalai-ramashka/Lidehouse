import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { onSuccess, handleError, displayMessage, displayError } from '/imports/ui_3/lib/errors.js';
import { serializeNestable } from '/imports/ui_3/views/modals/nestable-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Breakdowns } from './breakdowns.js';
import './methods.js';

Breakdowns.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('breakdowns.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.breakdown.insert',
        collection: Breakdowns,
        type: 'insert',
        //      type: 'method',
    //      meteormethod: 'breakdowns.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('breakdowns.inCommunity', doc),
    run(options, doc) {
      const modalContext = {
        title: 'View Breakdown',
        body: 'Nestable_edit',
        bodyContext: { json: doc, disabled: true },
      };
      Modal.show('Modal', modalContext);
    },
    run_autoForm(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.breakdown.view',
        collection: Breakdowns,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => currentUserHasPermission('breakdowns.update', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.breakdown.update',
        collection: Breakdowns,
        doc,
        type: 'method-update',
        meteormethod: 'breakdowns.update',
        singleMethodArgument: true,
      });
    },
    run_nestable(options, doc) {
      const modalContext = {
        title: 'Edit Breakdown',
        body: 'Nestable_edit',
        bodyContext: { json: doc },
        btnClose: 'cancel',
        btnOK: 'save',
        onOK() {
          const json = serializeNestable();
          // console.log('saving nestable:', JSON.stringify(json));
          // assert json.length === 1
          // assert json[0].name === breakdown.name
          // assert locked elements are still there 
          Breakdowns.update(doc._id, { $set: { children: json[0].children } },
            onSuccess(res => displayMessage('success', 'Breakdown saved'))
          );
        },
      };
      Modal.show('Modal', modalContext);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('breakdowns.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Breakdowns.remove, { _id: doc._id }, {
        action: 'delete breakdown',
      });
    },
  },
};

//-------------------------------------------------------

AutoForm.addModalHooks('af.breakdown.insert');
AutoForm.addModalHooks('af.breakdown.update');

AutoForm.addHooks('af.breakdown.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
