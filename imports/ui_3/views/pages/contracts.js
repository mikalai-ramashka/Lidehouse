import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { $ } from 'meteor/jquery';

import { Partners } from '/imports/api/partners/partners.js';
import '/imports/api/partners/actions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import '/imports/api/contracts/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import '/imports/ui_3/views/components/ticket-list.js';
import '/imports/ui_3/views/components/new-ticket.js';
import './contracts.html';

Template.Contracts.viewmodel({
  activePartnerRelation: 'supplier',
  onCreated(instance) {
    instance.autorun(() => {
      const communityId = Session.get('activeCommunityId');
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('partners.inCommunity', { communityId });
    });
  },
  autorun() {
    Session.set('activePartnerRelation', this.activePartnerRelation());
  },
  partnerRelations() {
    return ['supplier', 'customer'];
  },
  activeClass(partnerRelation) {
    return (this.activePartnerRelation() === partnerRelation) && 'btn-primary active';
  },
  contracts() {
    const communityId = Session.get('activeCommunityId');
    const relation = Session.get('activePartnerRelation');
    return Contracts.find({ communityId }).fetch().filter(c => c.partner().relation === relation);
  },
  ticketStatuses() {
    return Object.values(Tickets.statuses);
  },
  ticketTypes() {
    return Tickets.typeValues;
  },
});

Template.Contracts.events({
  ...(actionHandlers(Partners,'new')),
  ...(actionHandlers(Contracts, 'new')),
  'click .topics .js-new, .topics .js-import'(event) {
    const entityName = $(event.target).closest('[data-entity]').data('entity');
    const entity = Topics.entities[entityName];
    const contractId = $(event.target).closest('[data-id]').data('id');
    const partnerId = Contracts.findOne(contractId).partnerId;
    Session.update('modalContext', 'contractId', contractId);
    Session.update('modalContext', 'partnerId', partnerId);
    Session.update('modalContext', 'omitFields', ['ticket.contractId', 'ticket.partnerId']);
    Topics.actions.new.run({ entity });
  },
  'click .js-relation-filter'(event, instance) {
    const partnerRelation = $(event.target).closest('[data-value]').data('value');
    instance.viewmodel.activePartnerRelation(partnerRelation);
  },
});
