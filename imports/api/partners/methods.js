import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Partners } from './partners.js';


export const insert = new ValidatedMethod({
  name: 'partners.insert',
  validate: Partners.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Partners._transform(doc);
    checkPermissions(this.userId, 'partners.insert', doc.communityId);
    const _id = Partners.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'partners.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Partners, _id);
//    checkModifier(doc, modifier, Partners.modifiableFields);
    checkPermissions(this.userId, 'partners.update', doc.communityId);

    const result = Partners.update({ _id }, modifier);
    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'partners.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Partners, _id);
    checkPermissions(this.userId, 'partners.remove', doc.communityId);
    
    return Partners.remove(_id);
  },
});

Partners.methods = Partners.methods || {};
_.extend(Partners.methods, { insert, update, remove });
_.extend(Partners.methods, crudBatchOps(Partners));