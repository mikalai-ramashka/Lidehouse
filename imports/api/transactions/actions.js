import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { debugAssert } from '/imports/utils/assert.js';
import { handleError, onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { BatchAction } from '/imports/api/batch-action.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from './transactions.js';
import './entities.js';
import './methods.js';

function fillMissingOptionParams(options, doc) {
  const mcTxdef = Session.get('modalContext').txdef;
  if (mcTxdef && !options.txdef) options.txdef = mcTxdef; // This happens when new tx action is called from within statementEntry match action
    // TODO: Refactor. - entity data may come from so many places its confusing (options.entity, options.txdef, modalContext.txdef)
  if (typeof options.entity === 'string') options.entity = Transactions.entities[options.txdef.category];
  if (options.txdef && !options.entity) options.entity = Transactions.entities[options.txdef.category];
  debugAssert(options.entity && options.txdef, 'Either entity or txdef needs to come in the options');
}

Transactions.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('transactions.insert', doc),
    run(options, doc, event, instance) {
      fillMissingOptionParams(options, doc);
      Session.update('modalContext', 'txdef', options.txdef);
      const entity = options.entity;
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.insert`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method',
        meteormethod: 'transactions.insert',
        // --- --- --- ---
        size: entity.editForm ? 'lg' : 'md',
        validation: entity.editForm ? 'blur' : undefined,
//        btnOK: `Insert ${entity.name}`,
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('transactions.inCommunity', doc),
    run(options, doc) {
      const entity = Transactions.entities[doc.entityName()];
      Session.update('modalContext', 'txdef', doc.txdef());
      Modal.show('Autoform_modal', {
        body: entity.viewForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.view`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'readonly',
        // --- --- --- ---
        size: entity.viewForm ? 'lg' : 'md',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible(options, doc) {
      if (!doc || doc.isPosted()) return false;
      return currentUserHasPermission('transactions.update', doc);
    },
    run(options, doc) {
      const entity = Transactions.entities[doc.entityName()];
      Session.update('modalContext', 'txdef', doc.txdef());
      Modal.show('Autoform_modal', {
        body: entity.editForm,
        bodyContext: { doc },
        // --- --- --- ---
        id: `af.${entity.name}.update`,
        schema: Transactions.simpleSchema({ category: entity.name }),
        fields: entity.fields,
        omitFields: entity.omitFields && entity.omitFields(),
        doc,
        type: 'method-update',
        meteormethod: 'transactions.update',
        singleMethodArgument: true,
        // --- --- --- ---
        size: entity.editForm ? 'lg' : 'md',
        validation: entity.editForm ? 'blur' : undefined,
      });
    },
  },
  post: {
    name: 'post',
    icon: () => 'fa fa-check-square-o',
    color: (options, doc) => ((doc && !doc.isPosted()) ? 'warning' : undefined),
    visible(options, doc) {
      if (!doc) return false;
      if (doc.isPosted()) return false;
      if (doc.category === 'bill' && !doc.hasConteerData()) return false;
      return currentUserHasPermission('transactions.post', doc);
    },
    run(options, doc) {
      Transactions.methods.post.call({ _id: doc._id }, onSuccess((res) => {
        displayMessage('info', 'Szamla konyvelesbe kuldve');
      }));
    },
  },
  registerPayment: {
    name: 'registerPayment',
    icon: () => 'fa fa-credit-card',
    visible(options, doc) {
      if (!doc) return false;
      if (!doc.isPosted()) return false;
      if (doc.category !== 'bill' || !doc.outstanding) return false;
      return currentUserHasPermission('transactions.insert', doc);
    },
    run(options, doc, event, instance) {
      Session.update('modalContext', 'billId', doc._id);
      const txdef = Txdefs.findOne({ communityId: doc.communityId, category: 'payment', 'data.relation': doc.relation });
      Session.update('modalContext', 'txdef', txdef);
      const paymentOptions = _.extend({}, options, { entity: Transactions.entities.payment });
      Transactions.actions.new.run(paymentOptions, doc);
    },
  },
  registerRemission: {
    name: 'registerRemission',
    icon: () => 'fa fa-minus',
    visible(options, doc) {
      if (!doc) return false;
      if (!doc.isPosted()) return false;
      if (doc.category !== 'bill' || !doc.outstanding) return false;
      return currentUserHasPermission('transactions.insert', doc);
    },
    run(options, doc, event, instance) {
      Session.update('modalContext', 'billId', doc._id);
      const txdef = Txdefs.findOne({ communityId: doc.communityId, category: 'remission', 'data.relation': doc.relation });
      Session.update('modalContext', 'txdef', txdef);
      const remissionOptions = _.extend({}, options, { entity: Transactions.entities.remission });
      Transactions.actions.new.run(remissionOptions, doc);
    },
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => currentUserHasPermission('transactions.remove', doc),
    run(options, doc) {
      Modal.confirmAndCall(Transactions.methods.remove, { _id: doc._id }, {
        action: 'delete transaction',
        message: doc.isSolidified() ? 'Remove not possible after 24 hours' : '',
      });
    },
  },
};

Transactions.batchActions = {
  post: new BatchAction(Transactions.actions.post, Transactions.methods.batch.post),
  delete: new BatchAction(Transactions.actions.delete, Transactions.methods.batch.remove),
};

//-------------------------------------------------

Transactions.categoryValues.forEach(category => {
  AutoForm.addModalHooks(`af.${category}.view`);
  AutoForm.addModalHooks(`af.${category}.insert`);
  AutoForm.addModalHooks(`af.${category}.update`);

  AutoForm.addHooks(`af.${category}.insert`, {
    formToDoc(doc) {
      doc.communityId = Session.get('activeCommunityId');
      doc.category = category;
      const txdef = Session.get('modalContext').txdef;
      doc.defId = txdef._id;
      _.each(txdef.data, (value, key) => doc[key] = value);
      if (category === 'bill') {
        doc.valueDate = doc.deliveryDate;
        doc.lines = _.without(doc.lines, undefined);
      } else if (category === 'receipt') {
        doc.lines = _.without(doc.lines, undefined);
      } else if (category === 'payment' || category === 'remission') {
        const billId = Session.get('modalContext').billId;
        if (billId) {
          const bill = Transactions.findOne(billId);
          doc.relation = bill.relation;
          doc.partnerId = bill.partnerId;
          doc.contractId = bill.contractId;
          doc.bills = [{ id: billId, amount: doc.amount }];
        }
      }
      return doc;
    },
  });
});
