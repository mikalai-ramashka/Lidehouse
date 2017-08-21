/* eslint-disable dot-notation */

import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

import '/imports/api/users/users.js';
import { Topics } from './topics.js';
// In order for Topics.simpleSchema to be the full schema to validate against, we need all subtype schema
import './votings/votings.js';
import './tickets/tickets.js';
import './rooms/rooms.js';
import './feedbacks/feedbacks.js';

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.simpleSchema().validator({ clean: true }),

  run(doc) {
    const existingDoc = doc._id ? Topics.findOne(doc._id) : undefined;
    if (existingDoc) {
      throw new Meteor.Error('err_duplicateId', 'This id is already used',
        `Method: topics.insert, Collection: topics, id: ${doc._id}`
      );
    }

    const user = Meteor.users.findOne(this.userId);
    if (!user.hasPermission(doc.category + '.insert', doc.communityId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.insert, Collection: topics, topic: {${doc}}`)
    }

    return Topics.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'topics.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {

    // TODO: how to check that only allowed fields are modified

    const topic = Topics.findOne(_id);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.update, Collection: topics, id: ${_id}`
      );
    }

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.update, userId: ${this.userId}, topicId: ${_id}`);
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data


    Topics.update({ _id }, modifier);
  },
});

const TOPIC_ID_ONLY = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id },
}).validator();

export const remove = new ValidatedMethod({
  name: 'topics.remove',
  validate: TOPIC_ID_ONLY,

  run({ _id }) {
    const topic = Topics.findOne(_id);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.remove, Collection: topics, id: ${_id}`
      );
    }

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.remove, userId: ${this.userId}, id: ${_id}`);
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data

    Topics.remove(_id);
  },
});

// Get list of all method names on Topics
const TOPICS_METHOD_NAMES = _.pluck([
  insert,
  update,
  remove,
], 'name');

if (Meteor.isServer) {
  // Only allow 5 topic operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(TOPICS_METHOD_NAMES, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
