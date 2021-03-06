import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
//import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
//import { chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';
import { Txdefs, chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';

const openingSchema = new SimpleSchema({
  side: { type: String, allowedValues: ['debit', 'credit'] },
  account: { type: String, autoform: chooseConteerAccount },
// autoform: chooseSubAccount('COA', '??')
});

Transactions.categoryHelpers('opening', {
  makeJournalEntries() {
    const otherSide = oppositeSide(this.side);
    const txdef = Txdefs.findOne(this.defId);
    productionAssert(txdef[otherSide].length === 1, 'Opening tx has cannot have multiple choices for the opposite account');
    const otherAccount = txdef[otherSide][0];
    this[this.side] = [{ account: this.account }];
    this[otherSide] = [{ account: otherAccount }];
    return { debit: this.debit, credit: this.credit };
  },
});

Transactions.attachVariantSchema(openingSchema, { selector: { category: 'opening' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'opening' }).i18n('schemaTransactions');
});

// --- Factory ---

Factory.define('opening', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'opening',
  side: 'debit',
  amount: 1000,
});
