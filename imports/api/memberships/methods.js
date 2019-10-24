import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { permissionCategoryOf } from '/imports/api/permissions/roles.js';
import { Log } from '/imports/utils/log.js';
import { checkExists, checkNotExists, checkModifier } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from './memberships.js';

function checkAddMemberPermissions(userId, communityId, roleOfNewMember) {
  // Checks that *user* has permission to add new member in given *community*  
  const user = Meteor.users.findOne(userId);
  if (roleOfNewMember === 'guest') return;  // TODO: who can join as guest? or only in Demo house?)
  const permissionName = permissionCategoryOf(roleOfNewMember) + '.update';
  if (!user.hasPermission(permissionName, communityId)) {
    throw new Meteor.Error('err_permissionDenied',
      `No permission to add membership, roleOfNewMember: ${roleOfNewMember}, userId: ${userId}, communityId: ${communityId}`);
  }
}

function checkParcelMembershipsSanity(parcelId) {
  if (!parcelId) return;
  const parcel = Parcels.findOne(parcelId);
  // Parcel cannot be led and have owners at the same time (because led means, the owners are set on the lead parcel)
  if (parcel.isLed() && parcel.owners().count() > 0) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Parcel cannot have lead and owners at the same time',
      `for parcel ${parcel._id}`);
  }
  // Parcel can have only one representor
  const representorsCount = parcel.representors().count();
  if (representorsCount > 1) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Parcel can have only one representor',
      `Trying to set ${representorsCount} for parcel ${parcel._id}`);
  }
  // Ownership share cannot exceed 1
  const ownedShare = parcel.ownedShare();
  if (ownedShare.numerator > ownedShare.denominator) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Ownership share cannot exceed 1',
      `New total shares would become: ${ownedShare}, for parcel ${parcel._id}`);
  }
  // Following check is not good, if we have activePeriods (same guy can have same role at a different time)
  // checkNotExists(Memberships, { communityId: doc.communityId, role: doc.role, parcelId: doc.parcelId, person: doc.person });
}

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator({ clean: true }),

  run(doc) {
    if (!doc.approved) {
      // Users can submit non-approved membership requests, just for themselves
      if (doc.person.userId && doc.person.userId !== this.userId) {
        throw new Meteor.Error('err_permissionDenied',
          `No permission to perform this activity: memberships.insert: ${doc}, user: ${this.userId}`);
      }
      // Nothing else to check. Things will be checked when it gets approved by community admin/manager.
    } else {
      checkAddMemberPermissions(this.userId, doc.communityId, doc.role);
    }

    // Link user if there is one specified
    if (doc.person.userId) {
      const linkedUser = Meteor.users.findOne(doc.person.userId);
      const email = doc.person && doc.person.contact && doc.person.contact.email;
      if (email && linkedUser.emails[0].address !== email) {
        throw new Meteor.Error('err_sanityCheckFailed', 'User and contact email doesnt match', `${linkedUser.emails[0].address} !== ${email}`);
      }
      if (linkedUser.emails[0].verified === false) {
        // maybe we should Accounts.sendEnrollmentEmail(doc.person.userId);
      } else if (doc.accepted === false) {
        // TODO: This is where we should resend acceptance request email - if there was such a thing
        doc.accepted = true; // now we auto-accept it for him (if he is already verified user)
      }
    }

    // Try the operation, and if it produces an insane state, revert it
    const _id = Memberships.insert(doc);
    try {
      checkParcelMembershipsSanity(doc.parcelId);
    } catch (err) {
      Memberships.remove(_id);
      throw err;
    }
    return _id;
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
    checkModifier(doc, modifier, Memberships.modifiableFields.concat('approved'));  // userId not allowed to change!

    // Try the operation, and if it produces an insane state, revert it
    const result = Memberships.update({ _id }, modifier);
    try {
      checkParcelMembershipsSanity(doc.parcelId);
    } catch (err) {
      Mongo.Collection.stripAdministrativeFields(doc);
      Memberships.update({ _id }, { $set: doc });
      throw err;
    }
    return result;
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
    const email = doc.Person().primaryEmail();
    if (!email) throw new Meteor.Error('err_sanityCheckFailed', 'No contact email set for this membership', doc);
    if (this.isSimulation) return;  // Not possible to find and link users on the client side, as no user data available

    if (doc.person.userId) {
      const linkedUser = Meteor.users.findOne(doc.person.userId);
      if (linkedUser.emails[0].verified === false) {
        // Lets resend the enrollment request
        Accounts.sendEnrollmentEmail(doc.person.userId);
      } else if (doc.accepted === false) {
        // TODO: This is where we should resend acceptance request email - if there was such a thing
        doc.accepted = true; // now we auto-accept it for him (if he is already verified user)
      }
      return;   // thats all, user is already linked
    }

    // Else if doc.person.userId is not yet set, we link user here
    let user = Meteor.users.findOne({ 'emails.0.address': email });
    if (!user) {
      const inviter = Meteor.users.findOne(this.userId);
      Log.info(`Invitation sending to ${email} in '${inviter.language()}', to join community ${doc.community().name}`);
      const userId = Accounts.createUser({ email, password: Random.id(8), language: inviter.language() });
      Accounts.sendEnrollmentEmail(userId);
      user = Meteor.users.findOne(userId);
    }

    // TODO: We should ask for acceptance, not auto-accept it like now
    const accepted = user.emails[0].verified; // if not verified, auto-acceptance will happen when he verifies
    Memberships.update(doc._id, { $set: { 'person.userId': user._id, accepted } });
  },
});

export const accept = new ValidatedMethod({
  name: 'memberships.accept',
  validate: null,

  run() {
    Memberships.find({ personId: this.userId }).forEach((membership) => {
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
        throw new Meteor.Error('err_unableToRemove', 'Admin cannot be deleted if no other admin is appointed',
        `Found: {${admins.count()}}`);
      }
    }
    Memberships.remove(_id);
  },
});

Memberships.methods = Memberships.methods || {};
_.extend(Memberships.methods, { insert, update, linkUser, accept, remove });
_.extend(Memberships.methods, crudBatchOps(Memberships));
