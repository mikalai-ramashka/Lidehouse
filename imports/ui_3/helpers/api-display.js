import { Template } from 'meteor/templating';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { __ } from '/imports/localization/i18n.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';

export function label(value, color, icon) {
  if (value === undefined) return undefined;
  const iconBadge = icon ? `<i class="fa fa-${icon}"></i> ` : '';
  return `<span class="label label-${color} label-xs">${iconBadge}${value}</span>`;
}

export function checkBoolean(bool) {
  return bool ? '<i class="fa fa-check text-navy"></i>' : '';
}

export function checkmarkBoolean(bool) {
  const icon = bool ? 'fa-check' : 'fa-times';
  const color = bool ? 'navy' : 'danger';
  const title = bool ? 'Reconciled' : 'Unreconciled';
  return `<i class="fa ${icon} text-${color}" title="${__(title)}"></i>`;
}

export function displayMeterService(name) {
  if (!name) return '';
  return label(__('schemaMeters.service.' + name), 'default');
}

export function displayReading(value) {
  return label(value, 'info');
}

export function displayOutstanding(value) {
  return value == 0 ? value : label(value, 'info');
}

export function displayAccountText(account, communityId) {
  if (!account) return '';
  return ChartOfAccounts.get({ communityId }).display(account);
}

export function displayAccount(account, communityId) {
  if (!account) return '';
  return label(displayAccountText(account, communityId), 'success', 'tag');
}

export function displayAccountSet(accounts, communityId) {
  if (!accounts) return '';
  return accounts.map(account => displayAccount(account, communityId)).join('/');
}

export function displayLocalizer(localizer, communityId) {
  const loc = Localizer.get(communityId);
  if (!localizer || !loc) return '';
  const displayText = loc.display(localizer);
  const parcelSuffix = Localizer.leafIsParcel(localizer) ? ('. ' + __('parcel')) : '';
  return label(displayText.substring(1) + parcelSuffix, 'success', 'map-marker');
}

export function displayAccountSpecification(aspec) {
  if (!aspec.accountName) {
    const coa = ChartOfAccounts.get(aspec.communityId);
    if (coa) aspec.accountName = coa.nodeByCode(aspec.account).name;
    // not using this cached name any more
  }
  let html = '';
  html += displayAccount(aspec.account, aspec.communityId);
  if (aspec.localizer) {
    html += displayLocalizer(aspec.localizer, aspec.communityId);
  }
  return html;
}

export function displayTicketType(name) {
  if (!name) return '';
  return label(__('schemaTickets.ticket.type.' + name), 'default');
}

export function displayStatus(name) {
  if (!name) return '';
  let color;
  ['ticket', 'vote'].forEach((cat) => {
    const statusObject = Topics.categories[cat].statuses[name];
    if (statusObject) color = statusObject.color;
  });
  return label(__('schemaTopics.status.' + name), color);
}

export function displayUrgency(name) {
  if (!name) return '';
  const color = Tickets.urgencyColors[name];
  return label(__('schemaTickets.ticket.urgency.' + name), color);
}

export function displayChargeType(name) {
  if (!name) return '';
  return label(__('schemaTickets.ticket.chargeType.' + name), 'default');
}

Template.registerHelper('checkBoolean', checkBoolean);
Template.registerHelper('checkmarkBoolean', checkmarkBoolean);
Template.registerHelper('displayMeterService', displayMeterService);
Template.registerHelper('displayReading', displayReading);
Template.registerHelper('displayAccountText', displayAccountText);
Template.registerHelper('displayAccount', displayAccount);
Template.registerHelper('displayAccountSet', displayAccountSet);
Template.registerHelper('displayLocalizer', displayLocalizer);
Template.registerHelper('displayAccountSpecification', displayAccountSpecification);
Template.registerHelper('displayStatus', displayStatus);
Template.registerHelper('displayTicketType', displayTicketType);
Template.registerHelper('displayUrgency', displayUrgency);
Template.registerHelper('displayChargeType', displayChargeType);

const Renderers = {
  'Topics.status': displayStatus,
  'Tickets.ticket.type': displayTicketType,
  'Tickets.ticket.urgency': displayUrgency,
  'Tickets.ticket.localizer': displayLocalizer,
  'Tickets.ticket.chargeType': displayChargeType,
  'Tickets.ticket.partnerId': id => (Partners.findOne(id) ? Partners.findOne(id).getName() : undefined),
  'Tickets.ticket.contractId': id => (Contracts.findOne(id) ? Contracts.findOne(id).title : undefined),
  //'ticket.txId'
  'Votings.agendaId': id => (Agendas.findOne(id) ? Agendas.findOne(id).title : undefined),
};

// This aims to be a generic display -- works for Tickets only for now
Template.registerHelper('displayKey', function displayKey(key) {
  return __(`schema${key}.label`);
});

Template.registerHelper('displayValue', function displayValue(key, value) {
  if (Renderers[key]) return Renderers[key](value);
  if (_.isDate(value)) return moment(value).format('L');
  if (_.isString(value)) return __(value);
  return value;
});
