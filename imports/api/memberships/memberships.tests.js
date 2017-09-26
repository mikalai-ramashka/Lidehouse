/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { insert as insertMembership, update as updateMembership, remove as removeMembership  } from '/imports/api/memberships/methods.js';
import { everybody } from '/imports/api/permissions/config.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('memberships', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {

      it('sends all memberships.inCommunity', function (done) {
        const collector = new PublicationCollector();
        collector.collect(
          'memberships.inCommunity',
          { communityId: Fixture.demoCommunityId },
          (collections) => {
            chai.assert.equal(collections.memberships.length, 11);
            chai.assert.equal(collections.parcels.length, 5);
            done();
          }
        );
      });

      it('sends all memberships.ofUser', function (done) {
        const collector = new PublicationCollector();
        collector.collect(
          'memberships.ofUser',
          { userId: Fixture.demoUserId },
          (collections) => {
            chai.assert.equal(collections.memberships.length, 2);
            chai.assert.equal(collections.communities.length, 1);
            done();
          }
        );
      });
    });

    describe('representor', function () {
      let parcelId;
      let ownership1Id, ownership2Id, ownership3Id;
      beforeEach(function () {
        parcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, serial: 45, units: 0 });
        ownership1Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[1],
          role: 'owner',
          ownership: { share: new Fraction(1, 4), representor: false }
        });
        ownership2Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[2],
          role: 'owner',
          ownership: { share: new Fraction(1, 4), representor: true }
        });
        ownership3Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[3],
          role: 'owner',
          ownership: { share: new Fraction(1, 4) }
        });
      });

      it('selects representor when specified', function (done) {
        const parcel = Parcels.findOne(parcelId);
        chai.assert.equal(parcel.representorId(), Fixture.dummyUsers[2]);
        done();
      });

      it('selects representor when not specified', function (done) {
        Memberships.update(ownership2Id, { $set: { 'ownership.representor': false } });
        const parcel = Parcels.findOne(parcelId);
        chai.assert.equal(parcel.representorId(), Fixture.dummyUsers[1]);
        done();
      });
    });

    describe('permissions', function () {
      let testMembershipId;
      const randomRole = _.sample(everybody);
      const createMembership = function (newrole) {
        const newMembership = {
          communityId: Fixture.demoCommunityId,
          userId: Fixture.demoUserId,
          role: newrole,
        };
        if (newrole === 'owner') {
          _.extend(newMembership, {
            parcelId: Parcels.insert({ communityId: Fixture.demoCommunityId, serial: 45, units: 0 }),
            ownership: { share: new Fraction(1, 1) },
          });
        }
        return newMembership;
      };

      it('admin can add/update/remove member', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoAdminId }, 
          createMembership(randomRole));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isDefined(testMembership);
        chai.assert.equal(testMembership.role, randomRole);
        updateMembership._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId, modifier: { $set: { role: 'treasurer' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'treasurer');
        removeMembership._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isUndefined(testMembership);
        done();
      });

<<<<<<< HEAD
      it('owner can only add/update?/remove tenant', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoUserId }, 
          createMembership('tenant'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'tenant');
        updateMembership._execute({ userId: Fixture.demoUserId },
          { _id: testMembershipId, modifier: { $set: { role: 'tenant' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'tenant');
        chai.assert.throws(() => {
          updateMembership._execute({ userId: Fixture.demoUserId }, 
            { _id: testMembershipId, modifier: { $set: { role: 'manager' } } });
        });
=======
      it('owner can add only benefactor', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoUserId }, createMembership('benefactor'));
        chai.assert.isDefined(testMembershipId);
        const testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'benefactor');
>>>>>>> refs/remotes/edemo/master
        chai.assert.throws(() => {
          insertMembership._execute({ userId: Fixture.demoUserId }, createMembership('manager'));
        });
        removeMembership._execute({ userId: Fixture.demoUserId },{ _id: testMembershipId });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isUndefined(testMembership);
        done();
      });

      it('manager can only add/update?/remove owner', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoManagerId }, 
          createMembership('owner'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'owner');
        updateMembership._execute({ userId: Fixture.demoManagerId },
          { _id: testMembershipId, modifier: { $set: { role: 'owner' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'owner');
        chai.assert.throws(() => {
          updateMembership._execute({ userId: Fixture.demoManagerId }, 
            { _id: testMembershipId, modifier: { $set: { role: 'manager' } } });
        });
        chai.assert.throws(() => {
          insertMembership._execute({ userId: Fixture.demoManagerId }, createMembership('manager'));
        });
        removeMembership._execute({ userId: Fixture.demoManagerId }, { _id: testMembershipId });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isUndefined(testMembership);
        done();
      });

<<<<<<< HEAD
      it('total ownership shares cannot exceed 1', function (done) {
        const createMembershipWithShare = function (parcelId, share) {
          const newMembership = {
            communityId: Fixture.demoCommunityId,
            userId: Fixture.demoUserId,
            role: 'owner',
            parcelId, 
            ownership: { share },
          };
          return newMembership;
        };
        const testParcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, serial: 45, units: 0 });
        chai.assert.throws(() => {
          insertMembership._execute({ userId: Fixture.demoAdminId }, 
            createMembershipWithShare(testParcelId, new Fraction(2, 1)));
        });
        let testParcel = Parcels.findOne(testParcelId);
        chai.assert.equal(testParcel.ownedShare(), 0);
        
        testMembershipId = insertMembership._execute({ userId: Fixture.demoAdminId }, 
          createMembershipWithShare(testParcelId, new Fraction(2, 3)));
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembershipWithShare(testParcelId, new Fraction(1, 3)));
        testParcel = Parcels.findOne(testParcelId);
        chai.assert.equal(testParcel.ownedShare(), 1);
        updateMembership._execute({ userId: Fixture.demoAdminId }, 
          { _id: testMembershipId, modifier: { $set: { 'ownership.share': new Fraction(1, 3) } } });
        testParcel = Parcels.findOne(testParcelId);
        /* .normalize() method does not work on fraction here, the multiplied denominator stays the result*/
        chai.assert.equal(testParcel.ownedShare().toString(), '6/9');
        chai.assert(testParcel.ownedShare().numerator / testParcel.ownedShare().denominator <= 1);
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembershipWithShare(testParcelId, new Fraction(2, 6)));
        testParcel = Parcels.findOne(testParcelId);
        chai.assert.equal(testParcel.ownedShare(), 1);
=======
      it('admin can update member\'s role', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership('benefactor'));
        updateMembership._execute({ userId: Fixture.demoAdminId },
           { _id: testMembershipId, modifier: { $set: { role: 'treasurer' } } });
        const testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'treasurer');
        done();
      });

      it('owner cannot update member\'s role', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership('accountant'));
>>>>>>> refs/remotes/edemo/master
        chai.assert.throws(() => {
          updateMembership._execute({ userId: Fixture.demoAdminId }, 
            { _id: testMembershipId, modifier: { $set: { 'ownership.share': new Fraction(3, 8) } } });
        });
        done();
      });
    });
  });
};