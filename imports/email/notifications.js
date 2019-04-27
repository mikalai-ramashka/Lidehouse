
import { Meteor } from 'meteor/meteor';
import { Mailer } from 'meteor/lookback:emails';
import { TAPi18n } from 'meteor/tap:i18n';
import { moment } from 'meteor/momentjs:moment';
import { Topics } from '/imports/api/topics/topics.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';

function sendNotifications(user) {
  user.communities().forEach((community) => {
    const topics = Topics.topicsNeedingAttention(user._id, community._id, Meteor.users.SEEN_BY.NOTI);
    if (topics.length > 0) {
      Mailer.send({
        to: user.getPrimaryEmail(),
        bcc: 'Honline <noreply@honline.hu>',
        subject: TAPi18n.__('email.NotificationTitle', { name: community.name }, user.settings.language),
        template: 'Notification_Email',
        data: {
          userId: user._id,
          communityId: community._id,
        },
      });
      topics.forEach((topic) => {
        const lastSeenInfo = { timestamp: new Date() };
        updateMyLastSeen._execute({ userId: user._id }, { topicId: topic._id, lastSeenInfo, seenType: Meteor.users.SEEN_BY.NOTI });
      });
    }
  });
}

export function processNotifications(frequency) {
  const usersToBeNotified = Meteor.users.find({ 'settings.notiFrequency': frequency });
  // console.log(usersToBeNotified.fetch());
  usersToBeNotified.forEach(user => sendNotifications(user));
}

export function sendVoteexpiresNoti() {
  const users = Meteor.users.find({ 'settings.notiFrequency': { $ne: 'never' } });
  users.forEach((user) => {
    user.communities().forEach((community) => {
      const userVoteIndirect = 'voteCastsIndirect.' + user._id;
      const votes = Topics.find({
        communityId: community._id,
        category: 'vote',
        closed: false,
        'vote.closesAt': { $gte: moment().add(4, 'day').toDate(), $lt: moment().add(5, 'day').toDate() },
        [userVoteIndirect]: { $exists: false },
      }).fetch();
      if (votes.length > 0) {
        Mailer.send({
          to: user.getPrimaryEmail(),
          bcc: 'Honline <noreply@honline.hu>',
          subject: TAPi18n.__('email.NotificationTitle', { name: community.name }, user.settings.language),
          template: 'Voteexpires_Email',
          data: {
            userId: user._id,
            communityId: community._id,
            alertColor: 'alert-warning',
          },
        });
      }
    });
  });
}
