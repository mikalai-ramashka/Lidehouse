
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { displayError } from '/imports/ui/lib/errors.js';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { roleshipColumns } from '/imports/api/memberships/tables.js';

import './community-roleships.html';

Template.Community_roleships_page.onCreated(function () {
});

Template.Community_roleships_page.helpers({
  collection() {
    return Memberships;
  },
  schema() {
    return Memberships.schemaForRoleship;
  },
  roleships() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId });
  },
  selectedDoc() {
    return Memberships.findOne(Session.get('selectedMemberId'));
  },
  isSelected() {
    return Session.equals('selectedMemberId', this._id);
  },
  formType() {
    if (Session.get('selectedMemberId')) return 'update';
    return 'disabled';
  },
  hasSelection() {
    return !!Session.get('selectedMemberId');
  },
  displayUsername(membership) {
    if (!membership.hasUser()) return '';
    return membership.user().fullName();
  },
  displayRole(roleship) {
    return roleship.role;
  },
  reactiveTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Memberships.find({ communityId }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: roleshipColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Community_roleships_page.events({
  'click .table-row'() {
    Session.set('selectedMemberId', this._id);
  },
  'click .js-new'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    Memberships.insert({ communityId, role: 'guest' }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      const roleshipId = res;
      Session.set('selectedMemberId', roleshipId);
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedMemberId', id);
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Memberships.remove({ _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedMemberId', undefined);
    });
  },
});
