/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';
import { Fraction } from 'fractional';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests

import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { insert as insertParcel } from '/imports/api/parcels/methods.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import '/imports/api/users/users.js';

import { Email } from 'meteor/email';   // We will be mocking it over
import { Partners } from './partners';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;
  let parcelId;

  describe('person', function () {
    this.timeout(150000);
    before(function () {
      sinon.stub(Email);          // Mocking the Email sending
      Fixture = freshFixture();
      parcelId = insertParcel._execute({ userId: Fixture.demoManagerId }, {
        communityId: Fixture.demoCommunityId,
        serial: 1001,
        ref: '1001',
        units: 0,
        floor: 'I',
        door: '11',
        type: 'flat',
      });
      sinon.resetHistory();     // Clearing emails sent during fixture initialization
    });

    describe('onboarding', function () {

      // scenario A1: 1. user creates (and verifies) account, 2. user asks to join community, 3. manager approves (no certification yet) 4. later certification happens
      // scenario A2: 1. user creates (and verifies) account, 2. user meets with manager and there he adds him to community (certified)
      // scenario B1: 1. manager creates an identity to be used in the system
      //                 (no intention to create user account later - can be used to list parcel owner or register in person votes)
      // scenario B2: 1. manager creates an identity and an account for user 2. adds him to community 3. invites him to this account 4. user later accepts
      // scenario B3:
      // scenario BONUS: user changes his email address after all this, or during the process

      describe('Scenario A1: Person creates user account, submits join community request', function () {
        let membershipId;
        let partnerId;
        let userId;
        after(function () {
          Memberships.remove(membershipId);
          Partners.remove(partnerId);
          Meteor.users.remove(userId);
        });

        it('[1] user creates an account for himself', function (done) {
          userId = Accounts.createUser({ email: 'newuser@honline.hu', password: 'password' });
          Meteor.users.methods.update._execute({ userId }, { _id: userId, modifier: { $set: { profile: { firstName: 'Jimmy', lastName: 'Boyy' } } } });
          done();
        });

        it('[x] user has no permission to create approved membership', function (done) {
          chai.assert.throws(() => {
/*            partnerId = Partners.methods.insert._execute({ userId }, {
              communityId: Fixture.demoCommunityId,
              relation: 'member',
              userId,
              idCard: { type: 'natural', name: 'Mr New' },
              contact: { email: 'newuser@honline.hu' },
            });*/
            Memberships.methods.insert._execute({ userId }, {   // he is not admin/manager
              communityId: Fixture.demoCommunityId,
              approved: true, // tries to create approved membership
              userId,
              role: 'owner',
              parcelId,
              ownership: { share: new Fraction(1, 1) },
            });
          }, 'err_permissionDenied');
          done();
        });

        it('[2] user asks to join community', function (done) {
/*          partnerId = Partners.methods.insert._execute({ userId }, {
            communityId: Fixture.demoCommunityId,
            relation: 'member',
            userId,
            idCard: { type: 'natural', name: 'Mr New' },
            contact: { email: 'newuser@honline.hu' },
          });*/
          membershipId = Memberships.methods.insert._execute({ userId }, {
            communityId: Fixture.demoCommunityId,
            approved: false, // tries to create non-approved membership
            userId,
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          const membership = Memberships.findOne(membershipId);
          partnerId = membership.partnerId;

          chai.assert.equal(membership.partner().id(), userId);
          const user = Meteor.users.findOne(userId);
          // This user has no privileges in the community, until not approved
          chai.assert.isFalse(user.hasRole('owner', Fixture.demoCommunityId));
          chai.assert.isFalse(user.hasPermission('vote.cast', { communityId: Fixture.demoCommunityId }));

          done();
        });

        it('[x] user has no permission to approve himself', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.update._execute({ userId }, {
              _id: membershipId,
              modifier: { $set: { approved: true } },
            });
          }, 'err_permissionDenied');
          done();
        });

        it('[3] manager approves the membership (no certification yet)', function (done) {
          Memberships.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: membershipId,
            modifier: { $set: { approved: true } },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.partner().id(), userId);
          chai.assert.equal(membership.partner().displayName(), 'Jimmy Boyy');    // Only has profile name
          const user = Meteor.users.findOne(userId);
          // Now he has privileges
          chai.assert.isTrue(user.hasRole('owner', Fixture.demoCommunityId));
          chai.assert.isTrue(user.hasPermission('vote.cast', { communityId: Fixture.demoCommunityId }));

          done();
        });

        it('[4] later manager certifies the person', function (done) {
          Partners.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: partnerId,
            modifier: { $set: { idCard: { type: 'natural', identifier: 'JIMS_ID_NUMBER', name: 'Jim Smith' } } },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.partner().id(), userId);    // userId binds stronger than idCard.identifier
          chai.assert.equal(membership.partner().displayName(), 'Jim Smith');    // Certified name binds stronger than profile name

          done();
        });

        it('[x] user has no permission to change his certification details', function (done) {
          chai.assert.throws(() => {
            Partners.methods.update._execute({ userId }, {
              _id: partnerId,
              modifier: { $set: { idCard: { type: 'natural', identifier: 'CHANGED_ID_NUMBER' } } },
            });
          }, 'err_permissionDenied');
          done();
        });
      });

      describe('Scenario A2: Person creates user account, admin adds him to the community', function () {
        let membershipId;
        let partnerId;
        let userId;
        after(function () {
          Memberships.remove(membershipId);
          Partners.remove(partnerId);
          Meteor.users.remove(userId);
        });
        
        it('[1] user creates an account for himself', function (done) {
          userId = Accounts.createUser({ email: 'newuser@honline.hu', password: 'password' });
          done();
        });

        it('[2] admin adds him with a role', function (done) {
          partnerId = Partners.methods.insert._execute({ userId: Fixture.demoAdminId }, {
            communityId: Fixture.demoCommunityId,
            relation: 'member',
            userId,
              // no contact email
          });
          membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            userId,
            partnerId,
            role: 'accountant',
          });

          const membership = Memberships.findOne(membershipId);
          const user = Meteor.users.findOne(userId);
          chai.assert.equal(membership.partner().id(), userId);
          chai.assert.equal(membership.partner().primaryEmail(), user.getPrimaryEmail());
          chai.assert.isTrue(user.hasRole('accountant', Fixture.demoCommunityId));

          done();
        });

      });

      describe('Scenario B1: manager links person, who will never be a user', function () {
        let membershipId;
        let partnerId;
        after(function () {
          Memberships.remove(membershipId);
          Partners.remove(partnerId);
        });

        it('[1] manager creates identifed person, and links it to the parcel with an ownership', function (done) {
          partnerId = Partners.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            relation: 'member',
            idCard: { type: 'natural', name: 'Jim', identifier: 'JIMS_ID_NUMBER' },
            contact: { phone: '+3630 3334445' },
          });
          membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            partnerId,
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.partner().id(), 'JIMS_ID_NUMBER');

          done();
        });

        it('[x] cannot link user, when no email address supplied', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });
          }, 'err_sanityCheckFailed');
          done();
        });
      });

      describe('Scenario B2: manager links person, who is not yet a user, but will be', function () {
        let membershipId, membershipId2, membershipId3;
        let partnerId;
        let userId, user;
        after(function () {
          Memberships.remove(membershipId);
          Memberships.remove(membershipId2);
          Memberships.remove(membershipId3);
          Partners.remove(partnerId);
          Meteor.users.remove(userId);
        });
/*
        it('[x] manager unable to create person, with mismatched email', function (done) {
          chai.assert.throws(() => {
            partnerId = Partners.methods.insert._execute({ userId: Fixture.demoManagerId }, {
              communityId: Fixture.demoCommunityId,
              relation: 'member',
              userId: Fixture.demoUserId,
              idCard: { type: 'natural', name: 'Jim' },
              contact: { name: 'Jimmy', email: 'jim@honline.hu' }, // mismatched contact email supplied
            });
            Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
              communityId: Fixture.demoCommunityId,
              approved: true,
              userId: Fixture.demoUserId, // immediately link him
              partnerId,
              role: 'owner',
              parcelId,
              ownership: { share: new Fraction(1, 1) },
            });
          }, 'err_sanityCheckFailed');
          done();
        });
*/
        it('[1] manager creates approved person, and links it to the parcel with an ownership', function (done) {
          partnerId = Partners.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            relation: 'member',
            idCard: { type: 'natural', name: 'Jim' },
            contact: { email: 'jim@honline.hu' },
          });
          membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            partnerId,
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          let membership = Memberships.findOne(membershipId);
          chai.assert.isUndefined(membership.partner().userId);
          chai.assert.isUndefined(membership.partner().id());

          Partners.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: partnerId,
            modifier: { $set: { 'idCard.identifier': 'JIMS_ID_NUMBER' } },
          });

          membership = Memberships.findOne(membershipId);
          chai.assert.isUndefined(membership.partner().userId);
          chai.assert.equal(membership.partner().id(), 'JIMS_ID_NUMBER');

          done();
        });

        it('[2] manager connects an email adress to the ownership - this triggers an enrollment/invitation email', function (done) {
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });

          const membership = Memberships.findOne(membershipId);
          chai.assert.isDefined(membership.partner().userId);
          userId = membership.partner().userId;
          user = Meteor.users.findOne(userId);
          chai.assert.equal(membership.partner().id(), userId);
          chai.assert.isFalse(membership.accepted);

          sinon.assert.calledOnce(Email.send);
          const emailOptions = Email.send.getCall(0).args[0];
          chai.assert.equal(emailOptions.to, user.getPrimaryEmail());
          chai.assert.match(emailOptions.text, /enroll/);

          done();
        });

        it('[x] cannot change the linked userId under an existing person', function (done) {
          chai.assert.throws(() => {
            Partners.methods.update._execute({ userId: Fixture.demoManagerId }, {
              _id: partnerId,
              modifier: { $set: { userId: Fixture.demoUserId } },
            });
          }, 'err_permissionDenied');
          done();
        });

        it('[o] manager re-links to re-trigger enrollment/invitation email', function (done) {
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.partner().id(), userId);
          chai.assert.isFalse(membership.accepted);

          sinon.assert.calledTwice(Email.send);
          const emailOptions = Email.send.getCall(1).args[0];
          const emailOptionsPrevious = Email.send.getCall(0).args[0];
          chai.assert.equal(emailOptions.to, user.getPrimaryEmail());
          chai.assert.match(emailOptions.text, /enroll/);
          chai.assert.notEqual(emailOptions.text, emailOptionsPrevious.text);  // new link

          done();
        });

        it('[3] admin gives another role to the same user', function (done) {
          membershipId2 = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            partnerId,
            role: 'overseer',
          });

          sinon.assert.calledTwice(Email.send); // no further emails were sent
          const membership2 = Memberships.findOne(membershipId2);
          chai.assert.equal(membership2.partner().id(), userId);
          chai.assert.isFalse(membership2.accepted);

          done();
        });

        it('[4] user accepts enrollment (and verifies account)', function (done) {
          Memberships.methods.accept._execute({ userId });

          const membership = Memberships.findOne(membershipId);
          chai.assert.isDefined(membership.partner().userId);
          chai.assert.equal(membership.partner().id(), userId);
          chai.assert.isTrue(membership.accepted);    // now he is accepted state

          const membership2 = Memberships.findOne(membershipId2);
          chai.assert.isTrue(membership2.accepted);    // accepted on both roles

          done();
        });

        it('[5] Further roles can be given to the same user, after invitation is accepted', function (done) {
          membershipId3 = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            partnerId,
            role: 'treasurer',
          });

          sinon.assert.calledTwice(Email.send); // no further emails sent

          const membership3 = Memberships.findOne(membershipId3);
          // TODO: chai.assert.isTrue(membership3.accepted);    // what makes him into accepted state, should we send him a noti, which he approves with a click, or by not objecting to it?

          done();
        });
      });

      describe('Scenario B3: manager links person, who is already a user', function () {
        let alreadyUserId;
        before(function () {
          alreadyUserId = Accounts.createUser({ email: 'alreadyuser@honline.hu', password: 'password' });
        });
        after(function () {
          Meteor.users.remove(alreadyUserId);
        });

        it('B3a: creating membership and linking in same step', function (done) {
          const partnerId = Partners.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            relation: 'member',
            userId: alreadyUserId, // immediately link him
            idCard: { type: 'natural', name: 'Mr Already' },
            // no contact email
          });
          const membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            partnerId,
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          const membership = Memberships.findOne(membershipId);
          const alreadyUser = Meteor.users.findOne(alreadyUserId);
          chai.assert.equal(membership.partner().id(), alreadyUserId);
          chai.assert.equal(membership.partner().primaryEmail(), alreadyUser.getPrimaryEmail());

          Partners.methods.remove._execute({ userId: Fixture.demoManagerId }, { _id: partnerId });
          Memberships.methods.remove._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });
          done();
        });

        it('B3b: creating membership and linking in two steps', function (done) {
          const partnerId = Partners.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            relation: 'member',
            // no userId yet
            idCard: { type: 'natural', name: 'Mr Already' },
            contact: { name: 'Already User', email: 'alreadyuser@honline.hu' },
          });
          const membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            partnerId,
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });

          const membership = Memberships.findOne(membershipId);
          const alreadyUser = Meteor.users.findOne(alreadyUserId);
          chai.assert.equal(membership.partner().id(), alreadyUserId);
          chai.assert.equal(membership.partner().primaryEmail(), alreadyUser.getPrimaryEmail());

          Partners.remove(partnerId);
          Memberships.remove(membershipId);
          done();
        });
      });
    });
  });
}
