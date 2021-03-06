/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Balances } from './balances.js';

Meteor.publish('balances.ofAccounts', function balancesOfAccounts(params) {
  // Publishing the balances of the Chart of Account -- Current + last 12 months
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('balances.ofAccounts', { communityId })) {
    return this.ready();
  }

  const periodCodes = PeriodBreakdown.nodeCodes(true); // TODO filter for last year
  return Balances.find({ communityId, localizer: { $exists: false } });
});

// Publishing the balances of all individual Parcels -- Current only
Meteor.publishComposite('balances.ofLocalizers', function balancesOfLocalizers(params) {
  new SimpleSchema({
    communityId: { type: String },
    limit: { type: Number, decimal: true, optional: true },
  }).validate(params);
  const { communityId, limit } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('balances.ofLocalizers', { communityId })) {
    return this.ready();
  }

  return {
    find() {
      return Balances.find({ communityId, localizer: { $exists: true }, tag: 'T' },
        { sort: { amount: -1 }, limit });
    },
    children: [{
      find(balance) {
        return Parcels.find({ communityId, ref: Localizer.code2parcelRef(balance.localizer) });
      },
    }],
  };
});

// Everyone has access to all of his own parcels' balances
Meteor.publishComposite('balances.ofSelf', function balancesOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const parcelCodes = user.ownedParcels(communityId).map(p => Localizer.parcelRef2code(p.ref));

  return {
    find() {
      return Balances.find({ communityId, localizer: { $in: parcelCodes }, tag: 'T' });
    },
    children: [{
      find(balance) {
        return Parcels.find({ communityId, ref: Localizer.code2parcelRef(balance.localizer) });
      },
    }],
  };
});
