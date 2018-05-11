/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Shareddocs } from './shareddocs.js';
import { Sharedfolders } from './sharedfolders.js';
import { checkExists } from '../method-checks.js';

Meteor.publish('sharedfolders.ofCommunity', function (params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('shareddocs.download', communityId)) {
    return this.ready();
  }

  return Sharedfolders.find({ $or: [{ communityId }, { communityId: { $exists: false } }] });
});

Meteor.publish('shareddocs.ofCommunity', function (params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('shareddocs.download', communityId)) {
    return this.ready();
  }

  return Shareddocs.find({ communityId });
});

Meteor.publish('shareddocs.ofTopic', function (params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId, topicId } = params;

  const topic = Topics.findOne(topicId);
  const user = Meteor.users.findOneOrNull(this.userId);
  if (topic) {  // A topic might not be found, while topic is being created, but attachments need to be already disalyed on the insert autoform
    if ((topic.communityId !== communityId) || !user.hasPermission('shareddocs.download', communityId)) {
      return this.ready();
    }
  }

  return Shareddocs.find({ communityId, topicId });
});
