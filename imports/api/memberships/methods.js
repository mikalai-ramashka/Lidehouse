import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';

import { Log } from '/imports/utils/log.js';
import { checkExists, checkNotExists, checkModifier, checkAddMemberPermissions } from '/imports/api/method-checks.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from './memberships.js';

function checkSanityOfTotalShare(parcelId, totalShare, representorCount) {
  if (totalShare.numerator > totalShare.denominator) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Ownership share cannot exceed 1',
      `New total shares would become: ${totalShare}, for parcel ${parcelId}`);
  }
  if (representorCount > 1) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Parcel can have only one representor',
      `Trying to set ${representorCount} for parcel ${parcelId}`);
  }
}

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator({ clean: true }),

  run(doc) {
    if (!doc.approved) {
      // Users can submit non-approved membership requests, just for themselves
      if (doc.person.userId && doc.person.userId !== this.userId) {
        throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
            `memberships.insert: ${doc}, user: ${this.userId}`);
      }
      // Nothing else to check. Things will be checked when it gets approved by community admin/manager.
    } else {
      checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
      // This check is not good, if we have activePeriods (same guy can have same role at a different time)
      // checkNotExists(Memberships, { communityId: doc.communityId, role: doc.role, parcelId: doc.parcelId, person: doc.person });
      if (doc.role === 'owner' && doc.active) {
        const parcel = Parcels.findOne({ _id: doc.parcelId });
        const total = parcel.ownedShare();
        const newTotal = total.add(doc.ownership.share);
        const representorCount = parcel.representors().count();
        const newRepresentorCount = representorCount + doc.ownership.representor ? 1 : 0;
        checkSanityOfTotalShare(doc.parcelId, newTotal, newRepresentorCount);
      }
    }
/*    if (doc.person.userId && doc.person.contact && doc.person.contact.email) {
      const user = Meteor.users.findOne(userId);
      if (user && user.emails[0].adddress !== doc.person.contact.email) {
        throw new Meteor.Error('User and conact.email doesnt match', doc.person);
      }
    }*/
    return Memberships.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'memberships.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Memberships, _id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    checkModifier(doc, modifier, Memberships.modifiableFields.concat('approved'));
    const newrole = modifier.$set.role;
    if (newrole && newrole !== doc.role) {
      checkAddMemberPermissions(this.userId, doc.communityId, newrole);
    }
    if (doc.role === 'owner' && modifier.$set.active) {
      const parcel = Parcels.findOne({ _id: doc.parcelId });
      const total = parcel.ownedShare();
      const newTotal = total.subtract(doc.active ? doc.ownership.share : 0).add(modifier.$set['ownership.share']);
      const representorCount = parcel.representors().count();
      const newRepresentorCount = representorCount - (doc.active && doc.ownership.representor ? 1 : 0) + (modifier.$set['ownership.representor'] ? 1 : 0);
      checkSanityOfTotalShare(doc.parcelId, newTotal, newRepresentorCount);
    }
    // This check is not good, if we have activePeriods (same guy can have same role at a different time)
    // checkNotExists(Memberships, { _id: { $ne: doc._id }, communityId: doc.communityId, role: newrole, parcelId: doc.parcelId, person: newPerson });
    Memberships.update({ _id }, modifier);
  },
});

export const linkUser = new ValidatedMethod({
  name: 'memberships.linkUser',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Memberships, _id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    const email = doc.person && doc.person.contact && doc.person.contact.email;
    if (!email) throw new Meteor.Error('No contact email set for this membership', doc);
    if (Meteor.isClient) return;  // Not possible to find and link users on the client side, no user data available

    if (doc.person.userId) {
      // If a user account is already linked, we just resend the accept request - thats all
      Accounts.sendEnrollmentEmail(doc.person.userId);
      return;
    }

    let user = Meteor.users.findOne({ 'emails.0.address': email });
    if (!user) {
      const inviter = Meteor.users.findOne(this.userId);
      Log.info(`Invitation sending to ${email} in '${inviter.language()}', to join community ${doc.community().name}`);
      const userId = Accounts.createUser({ email, password: Random.id(8), language: inviter.language() });
      Accounts.sendEnrollmentEmail(userId);
      user = Meteor.users.findOne(userId);
    }

    const accepted = user.emails[0].verified; // if not verified, acceptance will happen when he verifies
    Memberships.update(doc._id, { $set: { 'person.userId': user._id, accepted } });
  },
});

export const accept = new ValidatedMethod({
  name: 'memberships.accept',
  validate: null,

  run() {
    Memberships.find({ 'person.userId': this.userId }).forEach((membership) => {
      Memberships.update(membership._id, { $set: { accepted: true } });
    });
  },
});

export const remove = new ValidatedMethod({
  name: 'memberships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Memberships, _id);
    checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    if (doc.role === 'admin') {
      const admins = Memberships.find({ communityId: doc.communityId, active: true, role: 'admin' });
      if (admins.count() < 2) {
        throw new Meteor.Error('err_unableToRemove', 'Admin cannot be deleted if no other admin is appointed.',
        `Found: {${admins.count()}}`);
      }
    }
    Memberships.remove(_id);
  },
});

Memberships.methods = {
  insert, update, linkUser, accept, remove,
};
