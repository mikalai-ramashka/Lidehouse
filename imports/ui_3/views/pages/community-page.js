import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Fraction } from 'fractional';

import { DatatablesExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { __ } from '/imports/localization/i18n.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { leaderRoles, nonLeaderRoles, officerRoles } from '/imports/api/permissions/roles.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/actions.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import '/imports/api/parcels/actions.js';
import { parcelColumns, highlightMyRow } from '/imports/api/parcels/tables.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/actions.js';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import '/imports/api/parcelships/actions.js';
import { Meters } from '/imports/api/meters/meters.js';
import '/imports/api/meters/actions.js';
import '/imports/api/users/users.js';
import '/imports/api/users/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/active-archive-tabs.js';
import '/imports/ui_3/views/blocks/simple-reactive-datatable.js';
import '/imports/ui_3/views/common/page-heading.js';
import '/imports/ui_3/views/components/action-buttons.html';
import '/imports/ui_3/views/components/contact-long.js';
import '/imports/ui_3/views/blocks/active-period.js';
import '/imports/ui_3/views/blocks/menu-overflow-guard.js';
import './community-page.html';

Template.Roleships_box.viewmodel({
  autorun() {
    const communityId = getActiveCommunityId();
    this.templateInstance.subscribe('memberships.inCommunity', { communityId });
  },
  leaders() {
    const communityId = getActiveCommunityId();
    return Memberships.findActive({ communityId, role: { $in: leaderRoles } }, { sort: { createdAt: 1 } }).fetch();
  },
  nonLeaders() {
    const communityId = getActiveCommunityId();
    return Memberships.findActive({ communityId, role: { $in: nonLeaderRoles } }, { sort: { createdAt: 1 } }).fetch();
  },
  officers() {
    const officers = this.leaders().concat(this.nonLeaders());
    officers.push(officers.shift());  // put admin from front to the end
    return officers;
  },
});

Template.Occupants_table.viewmodel({
  memberships() {
    const selector = this.templateInstance.data.selector;
    return Memberships.find(selector, { sort: { role: -1 } });
  },
  parcelships() {
    const selector = this.templateInstance.data.selector;
    return Parcelships.find(selector);
  },
});

Template.Occupants_box.viewmodel({
  autorun() {
    const data = this.templateInstance.data;
    this.templateInstance.subscribe('parcelships.ofParcel', { parcelId: data.parcelId });
  },
  membershipsContent() {
    const data = this.templateInstance.data;
    const communityId = getActiveCommunityId();
    const selector = { communityId, parcelId: data.parcelId };
    return { collection: 'memberships', selector };
  },
  parcelDisplay() {
    const parcelId = this.templateInstance.data.parcelId;
    const parcel = Parcels.findOne(parcelId);
    return parcel ? parcel.display() : __('unknown');
  },
  parcelshipTitle() {
    const parcelId = this.templateInstance.data.parcelId;
    const parcelship = Parcelships.findOne({ parcelId });
    return parcelship ? ` - ${__('parcelship')}` : '';
  },
});

Template.Meters_table.viewmodel({
  rows() {
    const selector = this.templateInstance.data.selector;
    return Meters.find(selector);
  },
});

Template.Meters_box.viewmodel({
  parcelDisplay() {
    const parcelId = this.templateInstance.data.parcelId;
    const parcel = Parcels.findOne(parcelId);
    return parcel ? parcel.display() : __('unknown');
  },
  metersContent() {
    const communityId = getActiveCommunityId();
    const parcelId = this.templateInstance.data.parcelId;
    const selector = { communityId, parcelId };
    return { collection: 'meters', selector };
  },
});

Template.Parcels_box.viewmodel({
  showAllParcels: false,
  onCreated() {
    const user = Meteor.user();
    const community = getActiveCommunity();
    const showAllParcelsDefault = (
      (user && user.hasPermission('parcels.insert', { communityId: community._id }))
      || (community && community.parcels.flat <= 25)
    );
    this.showAllParcels(!!showAllParcelsDefault);
  },
  autorun() {
    const communityId = getActiveCommunityId();
    this.templateInstance.subscribe('memberships.inCommunity', { communityId });
    if (this.showAllParcels()) {
      this.templateInstance.subscribe('parcels.inCommunity', { communityId });
    } else {
      this.templateInstance.subscribe('parcels.ofSelf', { communityId });
    }
  },
  parcelsTableContent() {
    const self = this;
    const communityId = getActiveCommunityId();
    return {
      collection: 'parcels',
      selector: { communityId },
      options() {
        return () => {
          return {
            columns: parcelColumns(),
            createdRow: highlightMyRow,
            tableClasses: 'display',
            language: datatables_i18n[TAPi18n.getLanguage()],
            lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
            pageLength: 25,
            ...DatatablesExportButtons,
          };
        };
      },
    };
  },
  parcels() {
    const communityId = getActiveCommunityId();
    return Parcels.find({ communityId, approved: true });
  },
  unapprovedParcels() {
    const communityId = getActiveCommunityId();
    return Parcels.find({ communityId, approved: false });
  },
  unapprovedParcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = getActiveCommunityId();
      return Parcels.find({ communityId, approved: false }).fetch();
    };
  },
});

Template.Community_page.viewmodel({
  onCreated() {
    Session.set('activePartnerRelation', 'member');
  },
  onRendered() {
    // Add slimscroll to element
    $('.full-height-scroll').slimscroll({
      height: '100%',
    });
  },
  autorun: [
    function subscription() {
      const communityId = getActiveCommunityId();
      this.templateInstance.subscribe('communities.byId', { _id: communityId });
    },
  ],
  communityId() {
    return getActiveCommunityId();
  },
  community() {
    return getActiveCommunity();
  },
  communities() {
    return Communities;
  },
  title() {
    const community = getActiveCommunity();
    return `${__('Community page')} - ${community ? community.name : ''}`;
  },
  /*  thingsToDisplayWithCounter() {
      const result = [];
      const communityId = Template.instance().getCommunityId();
      result.push({
        name: 'owner',
        count: Memberships.findActive({ communityId, role: 'owner' }).count(),
      });
      Parcels.typeValues.forEach(type =>
        result.push({
          name: type,
          count: Parcels.find({ communityId, type }).count(),
        })
      );
      return result;
    },*/
  activeTabClass(index) {
    return index === 0 ? 'active' : '';
  },
  parcelTypesWithCount() {
    const community = this.community();
    const result = [];
    if (!community) return [];
    Object.keys(community.parcels).forEach(k => {
      result.push({ type: k, count: community.parcels[k] });
    });
    return result;
  },
});

Template.Occupants_box.events({
  'click .js-member'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    const membership = Memberships.findOne(id);
    Meteor.users.actions.view.run({}, membership.partner().user());
  },
  'click .js-occupants'(event, instance) {
    const id = $(event.target).closest('[data-id]').data('id');
    const leadParcel = Parcels.findOne(id);
    Parcels.actions.occupants.run({}, leadParcel);
  },
});

Template.Meters_box.events({
...(actionHandlers(Meters, 'new')),
});

Template.Parcels_box.events({
  'click .parcels .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
});
