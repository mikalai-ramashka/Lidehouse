
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { checkExists, checkNotExists, checkPermissions, checkConstraint } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'balances.insert',
  validate: Balances.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Balances, { communityId: doc.communityId, account: doc.account, localizer: doc.localizer, tag: doc.tag });
    checkPermissions(this.userId, 'balances.insert', doc.communityId);
    checkConstraint(doc.tag.startsWith('C-'), 'Only closing balances can be inserted directly');
    // T-balances get automatically updaed by transactions, and P balances are created by balances.publish
    return Balances.insert(doc);
  },
});

export const publish = new ValidatedMethod({
  name: 'balances.publish',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    checkPermissions(this.userId, 'balances.publish', communityId);
    const coa = ChartOfAccounts.get(communityId);
    coa.leafs().forEach((leaf) => {
      // Publish makes a copy of all T-balances, and mark it as a P-balance
      Balances.find({ communityId, account: leaf.code, tag: /^T.*/ })
        .forEach((tBalance) => {
          Balances.update({
            communityId,
            account: leaf.code,
            tag: 'P' + tBalance.tag.substring(1),
          }, {
            $set: {
              debit: tBalance.debit,
              credit: tBalance.credit,
            },
          },
          { upsert: true },
          );
        });
    });
  },
});


Balances.methods = {
  insert, publish,
};
