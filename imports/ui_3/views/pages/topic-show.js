

import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { __ } from '/imports/localization/i18n.js';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

import '../common/error.js';
import '../common/page-heading.js';
import '../components/topic-box.js';
import '../components/topic-ticket-box.js';
import '../components/topic-vote-box.js';
import '../components/revision-history.js';
import './topic-show.html';

Template.Topic_show.onCreated(function topicShowOnCreated() {
  const topicId = FlowRouter.getParam('_tid');
  this.subscribe('topics.byId', { _id: topicId });  // brings all comments with it
});

Template.Topic_show.helpers({
  topic() {
    const topic = Topics.findOne(FlowRouter.getParam('_tid'));
    return topic;
  },
  pageTitle() {
    return __('topic_' + this.category) + ' ' + __('details');
  },
  smallTitle() {
    return this.title;
  },
  pageCrumbs() {
    switch (this.category) {
      case 'vote': {
        return [{
          title: __('Votings'),
          url: FlowRouter.path('Votings'),
        }];
      }
      case 'forum': {
        return [{
          title: __('Forum'),
          url: FlowRouter.path('Forum'),
        }];
      }
      case 'ticket': {
        return [{
          title: __('Worksheets'),
          url: FlowRouter.path('Worksheets'),
//          title: __('Tickets'),
//          url: FlowRouter.path('Tickets'),
        }];
      }
      default: return [];
    }
  },
});
