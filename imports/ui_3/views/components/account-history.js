import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';

import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import './account-history.html';

Template.Account_history.viewmodel({
  sign: +1,
  beginDate: '',
  endDate: '',
  accountSelected: '',
  accountOptions: [],
  localizerSelected: '',
  localizerOptions: [],
  status: 'Reconciled',
  onCreated(instance) {
    const self = this;
    instance.autorun(() => {
      instance.subscribe('transactions.byAccount', this.subscribeParams());
//    const today = moment().format('L');
//    this.endDate(today);
    });
  },
  autorun: [
    function defaultOptionSelect() {
      if (this.accountOptions().length && !this.accountSelected()) {
        this.accountSelected(this.accountOptions()[0].value);
      }
      if (this.localizerOptions().length && !this.localizerSelected()) {
        this.localizerSelected(this.localizerOptions()[0].value);
      }
    },
  ],
  subscribeParams() {
    const communityId = Session.get('activeCommunityId');
    const selector = {
      communityId,
      begin: new Date(this.beginDate()),
      end: new Date(this.endDate()),
    };
    if (this.accountSelected()) selector.account = '\\^' + this.accountSelected() + '\\';
    if (this.localizerSelected()) selector.localizer = '\\^' + this.localizerSelected() + '\\';
    return selector;
  },
  journalEntries() {
    const selector = JournalEntries.makeFilterSelector(this.subscribeParams());
    const entries = JournalEntries.find(selector, { sort: { valueDate: 1 } });
    let total = 0;
    const entriesWithRunningTotal = entries.map(e => {
      total += e.effectiveAmount(this.sign());
      return _.extend(e, { 
        total,
        debitTotal() { return this.total > 0 ? this.total : 0 },
        creditTotal() { return this.total < 0 ? (-1 * this.total) : 0 },
      });
    });
    return entriesWithRunningTotal.reverse();
  },
  negativeClass(entry) {
    return entry.effectiveAmount(this.sign()) < 0 ? 'negative' : '';
  },
});
