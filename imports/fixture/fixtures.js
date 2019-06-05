import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';
import { _ } from 'meteor/underscore';

import { Accounts } from 'meteor/accounts-base';
import { Communities } from '/imports/api/communities/communities.js';
import { update as updateCommunity } from '/imports/api/communities/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { defaultRoles } from '/imports/api/permissions/roles.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { insert as insertParcelBilling } from '/imports/api/transactions/batches/methods.js';
import { FixtureBuilder } from './fixture-builder.js';

import '/imports/api/topics/votings/votings.js';
import '/imports/api/topics/tickets/tickets.js';
import '/imports/api/topics/rooms/rooms.js';
import '/imports/api/transactions/txdefs/methods.js';


export function insertDemoFixture(lang) {
  const __ = function translate(text) { return TAPi18n.__(text, {}, lang); };

  // if Demo house data already populated, no need to do anything
  if (Communities.findOne({ name: __('demo.house') })) {
    return;
  }

  // ===== Communities =====

  const demoCommunityId = Communities.insert({
    name: __('demo.house'),
    zip: '1144',
    city: __('demo.city'),
    street: __('demo.street'),
    number: '86',
    lot: '123456/1234',
    avatar: 'http://4narchitects.hu/wp-content/uploads/2016/07/LEPKE-1000x480.jpg',
    totalunits: 100,
  });

// ===== Parcels =====
  const fixtureBuilder = new FixtureBuilder(demoCommunityId, lang);

  const dummyParcels = [];
  dummyParcels[0] = fixtureBuilder.createParcel({
    units: 0,
    floor: 'P',
    door: '02',
    type: 'parking',
    area: 6,
  });
  dummyParcels[1] = fixtureBuilder.createParcel({
    units: 10,
    floor: '1',
    door: '12',
    type: 'flat',
    area: 65,
  });
  dummyParcels[2] = fixtureBuilder.createParcel({
    units: 20,
    floor: '2',
    door: '23',
    type: 'flat',
    area: 142,
  });
  dummyParcels[3] = fixtureBuilder.createParcel({
    units: 30,
    floor: '3',
    door: '34',
    type: 'flat',
    area: 98.4,
  });
  dummyParcels[4] = fixtureBuilder.createParcel({
    units: 40,
    floor: '4',
    door: '45',
    type: 'flat',
    area: 70,
  });

  // ===== Demo Users with Memberships =====

  // Someone can log in as the demo user, if he doesn't want to register
  const com = { en: 'com', hu: 'hu' }[lang];
  let demoUserId;
  let demoManagerId;
  let demoAdminId;
  let demoAccountantId;
  defaultRoles.forEach(function (role) {
    const boyNames = __('demo.user.boyNames').split('\n');
    const girlNames = __('demo.user.girlNames').split('\n');
    const firstNames = boyNames.concat(girlNames);
    const avatarBoys = ['http://www.mycustomer.com/sites/all/themes/pp/img/default-user.png',
      'http://pannako.hu/wp-content/uploads/avatar-1.png',
      'http://pannako.hu/wp-content/uploads/avatar-2.png',
      'http://pannako.hu/wp-content/uploads/avatar-5.png',
      'http://pannako.hu/wp-content/uploads/avatar-7.png'];
    const avatarGirls = ['http://www.mycustomer.com/sites/all/themes/pp/img/default-user.png',
      'http://pannako.hu/wp-content/uploads/avatar-3.png',
      'http://pannako.hu/wp-content/uploads/avatar-4.png',
      'http://pannako.hu/wp-content/uploads/avatar-6.png',
      'http://pannako.hu/wp-content/uploads/avatar-8.png'];
    const userWithRoleId = Accounts.createUser({ email: role.name + `@demo.${com}`, password: 'password',
      profile: { lastName: role.name.charAt(0).toUpperCase() + role.name.slice(1), firstName: _.sample(firstNames) } });
    const user = Meteor.users.findOne(userWithRoleId);
    if (boyNames.includes(user.profile.firstName)) {
      Meteor.users.update({ _id: userWithRoleId }, { $set: { 'emails.0.verified': true, avatar: _.sample(avatarBoys), 'settings.language': lang } });
    } else {
      Meteor.users.update({ _id: userWithRoleId }, { $set: { 'emails.0.verified': true, avatar: _.sample(avatarGirls), 'settings.language': lang } });
    }
    if (role.name === 'owner') {
      Memberships.insert({ communityId: demoCommunityId, person: { userId: userWithRoleId }, role: role.name,
        parcelId: dummyParcels[0], ownership: { share: new Fraction(1, 10) } });
      demoUserId = userWithRoleId;
    } else if (role.name === 'benefactor') {
      Memberships.insert({ communityId: demoCommunityId, person: { userId: userWithRoleId }, role: role.name,
        parcelId: dummyParcels[0], benefactorship: { type: 'rental' } });
    } else {
      Memberships.insert({ communityId: demoCommunityId, person: { userId: userWithRoleId }, role: role.name });
    }
    if (role.name === 'manager') demoManagerId = userWithRoleId;
    if (role.name === 'admin') demoAdminId = userWithRoleId;
    if (role.name === 'accountant') demoAccountantId = userWithRoleId;
  });

  // ===== Dummy Users =====

  const dummyUsers = [];
  for (let userNo = 0; userNo <= 5; userNo++) {
    dummyUsers[userNo] = fixtureBuilder.createDummyUser();
  }

  // ===== Memberships =====

  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[0] },
    role: 'manager',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[1] },
    role: 'admin',
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[1] },
    role: 'owner',
    parcelId: dummyParcels[1],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    // no userId -- This person is benefactor of parcel[1], but he is not a registered user of the app
    person: { idCard: {
      type: 'natural',
      name: __('demo.user.1.benefactor.name'),
      address: __('demo.user.1.benefactor.address'),
      identifier: '987201NA',
      dob: new Date(1951, 1, 5),
      mothersName: __('demo.user.1.benefactor.mothersName'),
    } },
    role: 'benefactor',
    parcelId: dummyParcels[1],
    benefactorship: {
      type: 'rental',
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    // no userId -- This parcel is owned by a legal entity, and the representor for them is user[2]
    person: { idCard: {
      type: 'legal',
      name: __('demo.user.3.company.name'),
      address: __('demo.user.3.company.address'),
      identifier: 'Cg.123456-89',
    } },
    role: 'owner',
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[2] },
    role: 'owner',
    parcelId: dummyParcels[2],
    ownership: {
      share: new Fraction(0),
      representor: true,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[3] },
    role: 'owner',
    parcelId: dummyParcels[3],
    ownership: {
      share: new Fraction(1, 1),
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[3] },
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 2),
      representor: false,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[4] },
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
      representor: true,
    },
  });
  Memberships.insert({
    communityId: demoCommunityId,
    person: { userId: dummyUsers[5] },
    role: 'owner',
    parcelId: dummyParcels[4],
    ownership: {
      share: new Fraction(1, 4),
      representor: false,
    },
  });

  // ===== Forum =====

  // The dummy users comment one after the other, round robin style
  let nextUserIndex = 1;
  function sameUser() {
    return dummyUsers[nextUserIndex];
  }
  function nextUser() {
    nextUserIndex += 7; // relative prime
    nextUserIndex %= dummyUsers.length;
    return dummyUsers[nextUserIndex];
  }

  ['0', '1', '2'].forEach((topicNo) => {
    const topicId = Topics.insert({
      communityId: demoCommunityId,
      userId: nextUser(),
      category: 'forum',
      title: __(`demo.topic.${topicNo}.title`),
      text: __(`demo.topic.${topicNo}.text`),
    });

    ['0', '1', '2'].forEach((commentNo) => {
      const path = `demo.topic.${topicNo}.comment.${commentNo}`;
      const commentText = __(path);
      if (commentText !== path) {
        Comments.insert({
          topicId,
          userId: (topicNo == 2 && commentNo == 2) ? sameUser() : nextUser(),
          text: commentText,
        });
      }
    });
  });

  // ===== News =====

  ['0', '1', '2'].forEach((newsNo) => {
    const newsId = Topics.insert({
      communityId: demoCommunityId,
      userId: dummyUsers[0],
      category: 'news',
      title: __(`demo.news.${newsNo}.title`),
      text: __(`demo.news.${newsNo}.text`),
    });

    if (newsNo == 2) {
      Topics.update(newsId, {
        $set: {
          text: 'Doctor: <span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +36 (1) 345-562 <br>' +
                'Polizei: <small class="text-alt">07</small> <br>' +
                'Information: <small class="text-alt"><span class="glyphicon glyphicon-phone" aria-hidden="true"></span> +3630 6545621' +
                ' / <span class="glyphicon glyphicon-envelope" aria-hidden="true"></span> baltazar.imre@demo.com</small>',
          sticky: true,
        },
      });
    }
  });

  // ===== Votes =====

  const ownerships = Memberships.find({ communityId: demoCommunityId, active: true, role: 'owner', 'person.userId': { $exists: true } }).fetch();

  const voteTopic0 = Topics.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    category: 'vote',
    title: __('demo.vote.0.title'),
    text: __('demo.vote.0.text'),
    vote: {
      closesAt: moment().subtract(10, 'day').toDate(),  // its past close date
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  castVote._execute({ userId: ownerships[0].person.userId }, { topicId: voteTopic0, castedVote: [2] });  // no
  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic0, castedVote: [1] });  // yes
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic0, castedVote: [2] });  // no
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic0, castedVote: [0] });  // abstain

  closeVote._execute({ userId: demoManagerId }, { topicId: voteTopic0 }); // This vote is already closed

  const voteTopic1 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: __('demo.vote.1.title'),
    text: __('demo.vote.1.text'),
    vote: {
      closesAt: moment().add(2, 'week').toDate(),
      procedure: 'online',
      effect: 'legal',
      type: 'yesno',
    },
  });

  // No one voted on this yet

  const voteTopic2 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'vote',
    title: __('demo.vote.2.title'),
    text: __('demo.vote.2.text'),
    vote: {
      closesAt: moment().add(1, 'month').toDate(),
      type: 'preferential',
      procedure: 'online',
      effect: 'legal',
      choices: [
        __('demo.vote.2.choice.0'),
        __('demo.vote.2.choice.1'),
        __('demo.vote.2.choice.2'),
        __('demo.vote.2.choice.3'),
      ],
    },
  });

  castVote._execute({ userId: ownerships[1].person.userId }, { topicId: voteTopic2, castedVote: [1, 2, 3, 4] });
  castVote._execute({ userId: ownerships[2].person.userId }, { topicId: voteTopic2, castedVote: [2, 3, 4, 1] });
  castVote._execute({ userId: ownerships[3].person.userId }, { topicId: voteTopic2, castedVote: [3, 4, 1, 2] });

  ['0', '1'].forEach(commentNo =>
    Comments.insert({
      topicId: voteTopic2,
      userId: nextUser(),
      text: __(`demo.vote.2.comment.${commentNo}`),
    })
  );

  const agenda = Agendas.insert({
    communityId: demoCommunityId,
    title: __('demo.agenda.0.title'),
    topicIds: [voteTopic0, voteTopic1, voteTopic2],
  });

  // ===== Tickets =====

  const ticket0 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.0.title'),
    text: __('demo.ticket.0.text'),
    ticket: {
      category: 'building',
      urgency: 'high',
      status: 'progressing',
    },
  });

  const ticket1 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.1.title'),
    text: __('demo.ticket.1.text'),
    ticket: {
      category: 'building',
      urgency: 'normal',
      status: 'closed',
    },
  });

  const ticket2 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.2.title'),
    text: __('demo.ticket.2.text'),
    ticket: {
      category: 'service',
      urgency: 'normal',
      status: 'reported',
    },
  });

  Comments.insert({
    topicId: ticket2,
    userId: nextUser(),
    text: __('demo.ticket.2.comment.0'),
  });

  const ticket3 = Topics.insert({
    communityId: demoCommunityId,
    userId: nextUser(),
    category: 'ticket',
    title: __('demo.ticket.3.title'),
    text: __('demo.ticket.3.text'),
    ticket: {
      category: 'building',
      urgency: 'low',
      status: 'closed',
    },
  });

  // ===== Rooms =====

  const demoMessageRoom = Topics.insert({
    communityId: demoCommunityId,
    userId: demoUserId,
    category: 'room',
    title: 'private chat',
    text: 'private chat',
    participantIds: [demoUserId, dummyUsers[2]],
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: dummyUsers[2],
    text: __('demo.messages.0'),
  });

  Comments.insert({
    topicId: demoMessageRoom,
    userId: demoUserId,
    text: __('demo.messages.1'),
  });

  // ===== Breakdowns =====

  // ===== Breakdowns =====
  const breakdownsToClone = ['Owner payin types', 'Incomes', 'Expenses', 'Assets', 'Liabilities', 'COA', 'Places', 'Localizer'];
  breakdownsToClone.forEach((breakdownName) => {
    Breakdowns.methods.clone._execute(
      { userId: demoAccountantId },
      { name: breakdownName, communityId: demoCommunityId },
    );
  });
  const txDefsToClone = TxDefs.find({ communityId: null }).map(td => td.name);  // TODO select whats needed
  txDefsToClone.forEach((txDefName) => {
    TxDefs.methods.clone._execute(
      { userId: demoAccountantId },
      { name: txDefName, communityId: demoCommunityId },
    );
  });
  Localizer.generateParcels(demoCommunityId, lang);

  // ===== Transactions =====

  // ===== Returning a bunch of pointers, for easy direct access

  return {
    demoCommunityId,
    demoUserId,
    demoAdminId,
    demoManagerId,
    demoAccountantId,
    dummyUsers,
    dummyParcels,
  };
}
