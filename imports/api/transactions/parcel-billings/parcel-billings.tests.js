/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { moment } from 'meteor/momentjs:moment';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Partners } from '/imports/api/transactions/partners/partners.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';

if (Meteor.isServer) {
  let Fixture;

  describe('parcel billings', function () {
    this.timeout(5000);
    before(function () {
    });
    after(function () {
    });

    describe('api', function () {
      let communityId;
      let parcels;
      beforeEach(function () {
        Fixture = freshFixture();
        communityId = Fixture.demoCommunityId;
        parcels = Parcels.find({ communityId }).fetch();
        Meters.remove({});
        Bills.remove({});
        ParcelBillings.remove({});
        Transactions.remove({});
      });

      it('will not apply inactive parcelBilling', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test INACTIVE',
          projection: 'absolute',
          amount: 1000,
          payinType: '4',
          localizer: '@',
          activeTime: {
            begin: moment().subtract(3, 'day').toDate(),
            end: moment().subtract(1, 'day').toDate(),
          },
        });
        const testParcelBilling = ParcelBillings.findOne({ title: 'Test INACTIVE' });
        chai.assert.isDefined(testParcelBilling);
        chai.assert.isFalse(testParcelBilling.active);

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, valueDate: new Date() }, Fixture.builder.getUserWithRole('accountant'));

        const bills = Bills.find({ communityId }).fetch();
        chai.assert.equal(bills.length, 0);
      });

      it('can apply single billing', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test area',
          projection: 'area',
          amount: 78,
          payinType: '3',
          localizer: '@',
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, valueDate: new Date() }, Fixture.builder.getUserWithRole('accountant'));

        const bills = Bills.find({ communityId }).fetch();
        chai.assert.equal(bills.length, parcels.length);
        bills.forEach(bill => {
          chai.assert.isDefined(bill.partnerId);
          const parcel = Memberships.findOne(bill.partnerId).parcel();

          chai.assert.equal(bill.lines.length, 1);
          const line = bill.lines[0];
          chai.assert.equal(line.title, 'Test area');
          chai.assert.equal(line.uom, 'm2');
          chai.assert.equal(line.unitPrice, 78);
          chai.assert.equal(line.quantity, parcel.area);
        });
      });

      it('can apply multiple projections', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test volume',
          projection: 'volume',
          amount: 56,
          payinType: '2',
          localizer: '@',
        });
        Fixture.builder.create('parcelBilling', {
          title: 'Test absolute',
          projection: 'absolute',
          amount: 1000,
          payinType: '4',
          localizer: '@',
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, valueDate: new Date() }, Fixture.builder.getUserWithRole('accountant'));
        
        const bills = Bills.find({ communityId }).fetch();
        chai.assert.equal(bills.length, parcels.length);
        bills.forEach(bill => {
          chai.assert.isDefined(bill.partnerId);
          const parcel = Memberships.findOne(bill.partnerId).parcel();

          chai.assert.equal(bill.lines.length, 2);
          const line0 = bill.lines[0];
          chai.assert.equal(line0.title, 'Test volume');
          chai.assert.equal(line0.uom, 'm3');
          chai.assert.equal(line0.unitPrice, 56);
          chai.assert.equal(line0.quantity, parcel.volume);
          const line1 = bill.lines[1];
          chai.assert.equal(line1.title, 'Test absolute');
          chai.assert.equal(line1.uom, '1');
          chai.assert.equal(line1.unitPrice, 1000);
          chai.assert.equal(line1.quantity, 1);
        });
      });

      it('can apply consumption based billing', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test consumption',
          consumption: 'coldWater',
          uom: 'm3',
          unitPrice: '600',
          projection: 'habitants',
          amount: 5000,
          payinType: '3',
          localizer: '@',
        });
        const meteredParcelId = Fixture.dummyParcels[0];
        const meteredParcel = Parcels.findOne(meteredParcelId);
        const meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-01010101',
          service: 'coldWater',
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, valueDate: new Date() }, Fixture.builder.getUserWithRole('accountant'));

        const bills = Bills.find({ communityId }).fetch();
        chai.assert.equal(bills.length, parcels.length - 1);
        bills.forEach(bill => {
          chai.assert.isDefined(bill.partnerId);
          const parcel = Memberships.findOne(bill.partnerId).parcel();

          chai.assert.equal(bill.lines.length, 1);
          const line = bill.lines[0];
          chai.assert.equal(line.title, 'Test consumption');
          chai.assert.equal(line.uom, 'habitant');
          chai.assert.equal(line.unitPrice, 5000);
          chai.assert.equal(line.quantity, parcel.habitants);
        });

        Bills.remove({});

        Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date(), value: 32, approved: false } });
        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, valueDate: new Date() }, Fixture.builder.getUserWithRole('accountant'));

        const bills2 = Bills.find({ communityId }).fetch();
        chai.assert.equal(bills2.length, parcels.length);
        const bill = Bills.findOne({ partnerId: meteredParcel.payer()._id });
        chai.assert.equal(bill.lines.length, 1);
        const line = bill.lines[0];
        chai.assert.equal(line.title, 'Test consumption');
        chai.assert.equal(line.uom, 'm3');
        chai.assert.equal(line.unitPrice, 600);
        chai.assert.equal(line.quantity, 32);
      });
    });
/*
    xdescribe('apply', function () {
      before(function () {
      });

      xit('calculates correctly per volume', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'volume',
          amount: 78,
          payinType: '5',
          localizer: '@',
          note: 'Test volume',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test volume' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(parcel.volume * testParcelBilling.amount);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });

      xit('calculates correctly per habitants', function () {
        let habitants = 1;
        Fixture.dummyParcels.forEach((parcel) => {
          Parcels.update(parcel, { $set: { habitants }});
          habitants += 1;
        });
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'habitants',
          amount: 155,
          payinType: '6',
          localizer: '@',
          note: 'Test habitants',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test habitants' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.habitants);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });
    });

    xdescribe('value date', function () {
      xit('writes transactions for the right date', function () {
      });
    });

    xdescribe('no values given', function () {
      before(function () {
        const parcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, ref: 'A89', building: 'A', floor: 8, door: 9, units: 20 });
        const extraParcel = Parcels.findOne(parcelId);
        Localizer.addParcel(Fixture.demoCommunityId, extraParcel, 'en');
      });

      it('does not brake when area is missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'area',
          amount: 78,
          payinType: '4',
          localizer: '@',
          note: 'one area is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one area is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.area || 0);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count(); 
        const debitLegs = transaction.debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });
      
      it('does not brake when volume is missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'volume',
          amount: 78,
          payinType: '4',
          localizer: '@',
          note: 'one volume is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one volume is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.volume || 0);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count(); 
        const debitLegs = transaction.debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

      it('does not brake when habitants are missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'habitants',
          amount: 140,
          payinType: '1',
          localizer: '@',
          note: 'one habitant is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one habitant is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.habitants || 0);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count(); 
        const debitLegs = transaction.debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

      it('does not brake when building/floor/door is missing', function () {
        const parcelId2 = Parcels.insert({ communityId: Fixture.demoCommunityId, ref: 'A75', units: 20 });
        const parcelWithoutDetails = Parcels.findOne(parcelId2);
        Localizer.addParcel(Fixture.demoCommunityId, parcelWithoutDetails, 'en');
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'absolute',
          amount: 150,
          payinType: '3',
          localizer: '@',
          note: 'no parcel details',
        });
        const testParcelBilling = ParcelBillings.findOne({ note: 'no parcel details' });
        Parcels.find({ communityId: Fixture.demoCommunityId }).count();
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count();
        const debitLegs = Transactions.findOne({ note: 'no parcel details'}).debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

    });
  */
  });
}
